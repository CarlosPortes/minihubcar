import { eq, and, sql, ilike, or, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  collectionExemplar,
  variation,
  casting,
  miniatureBrand,
  conditionType,
  location,
  exemplarLocation,
  locationMovement,
  acquisition,
  acquisitionItem,
  scale,
  series,
  automaker,
  vehicleModel,
  castingVehicle,
  customListItem,
  exemplarPhoto,
  saleItem,
  writeOff,
  productIdentifier,
} from '../../database/schema';
import { AddExemplarInput, CollectionFilterQuery, UpdateExemplarInput, ImportCollectionItemInput } from './collection.schemas';

export class CollectionRepository {
  async getConditionTypeByCode(code: string) {
    const rows = await db
      .select()
      .from(conditionType)
      .where(eq(conditionType.code, code))
      .limit(1);

    return rows[0] || null;
  }

  async listByUser(userId: string, filter: CollectionFilterQuery) {
    const { status, conditionCode, locationId, brandId, automakerId, q, page, pageSize } = filter;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [
      eq(collectionExemplar.userId, userId),
      eq(collectionExemplar.status, status),
    ];

    if (conditionCode) {
      conditions.push(eq(conditionType.code, conditionCode));
    }

    if (brandId) {
      conditions.push(eq(casting.miniatureBrandId, brandId));
    }

    if (locationId) {
      conditions.push(eq(exemplarLocation.locationId, locationId));
    }

    if (automakerId) {
      conditions.push(
        sql`COALESCE(
          ${collectionExemplar.automakerId},
          ${casting.automakerId},
          (SELECT vm.automaker_id FROM ${castingVehicle} cv 
           JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
           WHERE cv.casting_id = ${casting.id} LIMIT 1)
        ) = ${automakerId}::uuid`
      );
    }

    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(
        or(
          ilike(variation.name, searchPattern),
          ilike(casting.name, searchPattern),
          ilike(miniatureBrand.name, searchPattern),
          sql`EXISTS (
            SELECT 1 FROM ${productIdentifier} pi
            WHERE pi.variation_id = ${variation.id}
            AND (pi.code ILIKE ${searchPattern} OR pi.normalized_code ILIKE ${searchPattern})
          )`
        )
      );
    }

    const items = await db
      .select({
        id: collectionExemplar.id,
        status: collectionExemplar.status,
        notes: collectionExemplar.notes,
        acquisitionDate: collectionExemplar.acquisitionDate,
        purchasePrice: collectionExemplar.purchasePrice,
        purchaseLocation: collectionExemplar.purchaseLocation,
        createdAt: collectionExemplar.createdAt,
        primaryCode: sql<string | null>`(
          SELECT pi.code FROM ${productIdentifier} pi
          WHERE pi.variation_id = ${variation.id}
          ORDER BY pi.is_primary DESC, pi.created_at ASC
          LIMIT 1
        )`,
        collectionCode: sql<string | null>`(
          SELECT CONCAT(
            CASE WHEN ${miniatureBrand.name} ILIKE 'Mini GT' THEN 'MINI GT' ELSE ${miniatureBrand.name} END,
            ' - ',
            pi.code
          )
          FROM ${productIdentifier} pi
          WHERE pi.variation_id = ${variation.id}
          ORDER BY pi.is_primary DESC, pi.created_at ASC
          LIMIT 1
        )`,
        variation: {
          id: variation.id,
          name: variation.name,
          releaseYear: variation.releaseYear,
          color: variation.color,
          photoUrl: variation.photoUrl,
          code: sql<string | null>`(
            SELECT pi.code FROM ${productIdentifier} pi
            WHERE pi.variation_id = ${variation.id}
            ORDER BY pi.is_primary DESC, pi.created_at ASC
            LIMIT 1
          )`,
        },
        casting: {
          id: casting.id,
          name: casting.name,
        },
        brand: {
          id: miniatureBrand.id,
          name: miniatureBrand.name,
        },
        scale: {
          id: scale.id,
          name: scale.name,
        },
        condition: {
          id: conditionType.id,
          code: conditionType.code,
          name: conditionType.name,
        },
        series: {
          id: series.id,
          name: series.name,
        },
        automaker: {
          id: sql<string | null>`COALESCE(${collectionExemplar.automakerId}, ${casting.automakerId}, (
            SELECT vm.automaker_id FROM ${castingVehicle} cv 
            JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
            WHERE cv.casting_id = ${casting.id} LIMIT 1
          ))`,
          name: sql<string | null>`COALESCE(
            (SELECT a.name FROM ${automaker} a WHERE a.id = ${collectionExemplar.automakerId}),
            (SELECT a.name FROM ${automaker} a WHERE a.id = ${casting.automakerId}),
            (SELECT a.name FROM ${castingVehicle} cv 
             JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
             JOIN ${automaker} a ON vm.automaker_id = a.id 
             WHERE cv.casting_id = ${casting.id} LIMIT 1)
          )`,
        },
        vehicleModel: {
          id: sql<string | null>`COALESCE(${collectionExemplar.vehicleModelId}, (
            SELECT cv.vehicle_model_id FROM ${castingVehicle} cv 
            WHERE cv.casting_id = ${casting.id} LIMIT 1
          ))`,
          name: sql<string | null>`COALESCE(
            (SELECT vm.name FROM ${vehicleModel} vm WHERE vm.id = ${collectionExemplar.vehicleModelId}),
            (SELECT vm.name FROM ${castingVehicle} cv 
             JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
             WHERE cv.casting_id = ${casting.id} LIMIT 1)
          )`,
        },
        location: {
          id: location.id,
          name: location.name,
          locationType: location.locationType,
          hasGrid: location.hasGrid,
          gridRows: location.gridRows,
          gridColumns: location.gridColumns,
          gridRow: exemplarLocation.gridRow,
          gridColumn: exemplarLocation.gridColumn,
        },
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(conditionType, eq(collectionExemplar.conditionTypeId, conditionType.id))
      .leftJoin(series, eq(variation.seriesId, series.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .leftJoin(
        exemplarLocation,
        and(
          eq(exemplarLocation.exemplarId, collectionExemplar.id),
          eq(exemplarLocation.isCurrent, true)
        )
      )
      .leftJoin(location, eq(exemplarLocation.locationId, location.id))
      .where(and(...conditions))
      .orderBy(desc(collectionExemplar.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(conditionType, eq(collectionExemplar.conditionTypeId, conditionType.id))
      .leftJoin(
        exemplarLocation,
        and(
          eq(exemplarLocation.exemplarId, collectionExemplar.id),
          eq(exemplarLocation.isCurrent, true)
        )
      )
      .where(and(...conditions));

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await db
      .select({
        id: collectionExemplar.id,
        status: collectionExemplar.status,
        notes: collectionExemplar.notes,
        acquisitionDate: collectionExemplar.acquisitionDate,
        purchasePrice: collectionExemplar.purchasePrice,
        purchaseLocation: collectionExemplar.purchaseLocation,
        createdAt: collectionExemplar.createdAt,
        updatedAt: collectionExemplar.updatedAt,
        primaryCode: sql<string | null>`(
          SELECT pi.code FROM ${productIdentifier} pi
          WHERE pi.variation_id = ${variation.id}
          ORDER BY pi.is_primary DESC, pi.created_at ASC
          LIMIT 1
        )`,
        collectionCode: sql<string | null>`(
          SELECT CONCAT(
            CASE WHEN ${miniatureBrand.name} ILIKE 'Mini GT' THEN 'MINI GT' ELSE ${miniatureBrand.name} END,
            ' - ',
            pi.code
          )
          FROM ${productIdentifier} pi
          WHERE pi.variation_id = ${variation.id}
          ORDER BY pi.is_primary DESC, pi.created_at ASC
          LIMIT 1
        )`,
        variation: {
          id: variation.id,
          name: variation.name,
          releaseYear: variation.releaseYear,
          color: variation.color,
          finish: variation.finish,
          packaging: variation.packaging,
          edition: variation.edition,
          description: variation.description,
          photoUrl: variation.photoUrl,
          code: sql<string | null>`(
            SELECT pi.code FROM ${productIdentifier} pi
            WHERE pi.variation_id = ${variation.id}
            ORDER BY pi.is_primary DESC, pi.created_at ASC
            LIMIT 1
          )`,
        },
        casting: {
          id: casting.id,
          name: casting.name,
        },
        brand: {
          id: miniatureBrand.id,
          name: miniatureBrand.name,
        },
        condition: {
          id: conditionType.id,
          code: conditionType.code,
          name: conditionType.name,
        },
        series: {
          id: series.id,
          name: series.name,
        },
        automaker: {
          id: sql<string | null>`COALESCE(${collectionExemplar.automakerId}, ${casting.automakerId}, (
            SELECT vm.automaker_id FROM ${castingVehicle} cv 
            JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
            WHERE cv.casting_id = ${casting.id} LIMIT 1
          ))`,
          name: sql<string | null>`COALESCE(
            (SELECT a.name FROM ${automaker} a WHERE a.id = ${collectionExemplar.automakerId}),
            (SELECT a.name FROM ${automaker} a WHERE a.id = ${casting.automakerId}),
            (SELECT a.name FROM ${castingVehicle} cv 
             JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
             JOIN ${automaker} a ON vm.automaker_id = a.id 
             WHERE cv.casting_id = ${casting.id} LIMIT 1)
          )`,
        },
        vehicleModel: {
          id: sql<string | null>`COALESCE(${collectionExemplar.vehicleModelId}, (
            SELECT cv.vehicle_model_id FROM ${castingVehicle} cv 
            WHERE cv.casting_id = ${casting.id} LIMIT 1
          ))`,
          name: sql<string | null>`COALESCE(
            (SELECT vm.name FROM ${vehicleModel} vm WHERE vm.id = ${collectionExemplar.vehicleModelId}),
            (SELECT vm.name FROM ${castingVehicle} cv 
             JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id 
             WHERE cv.casting_id = ${casting.id} LIMIT 1)
          )`,
        },
        currentLocation: {
          id: location.id,
          name: location.name,
          locationType: location.locationType,
          hasGrid: location.hasGrid,
          gridRows: location.gridRows,
          gridColumns: location.gridColumns,
          gridRow: exemplarLocation.gridRow,
          gridColumn: exemplarLocation.gridColumn,
        },
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(conditionType, eq(collectionExemplar.conditionTypeId, conditionType.id))
      .leftJoin(series, eq(variation.seriesId, series.id))
      .leftJoin(
        exemplarLocation,
        and(
          eq(exemplarLocation.exemplarId, collectionExemplar.id),
          eq(exemplarLocation.isCurrent, true)
        )
      )
      .leftJoin(location, eq(exemplarLocation.locationId, location.id))
      .where(and(eq(collectionExemplar.id, id), eq(collectionExemplar.userId, userId)))
      .limit(1);

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    const item = rows[0];

    // Location movement history
    const movements = await db
      .select({
        id: locationMovement.id,
        movedAt: locationMovement.movedAt,
        notes: locationMovement.notes,
        fromLocationName: sql<string>`from_loc.name`,
        toLocationName: sql<string>`to_loc.name`,
        fromGridRow: locationMovement.fromGridRow,
        fromGridColumn: locationMovement.fromGridColumn,
        toGridRow: locationMovement.toGridRow,
        toGridColumn: locationMovement.toGridColumn,
      })
      .from(locationMovement)
      .leftJoin(location, eq(locationMovement.fromLocationId, location.id))
      .innerJoin(sql`location to_loc`, sql`location_movement.to_location_id = to_loc.id`)
      .leftJoin(sql`location from_loc`, sql`location_movement.from_location_id = from_loc.id`)
      .where(eq(locationMovement.exemplarId, id))
      .orderBy(desc(locationMovement.movedAt));

    // Acquisition item history
    const acq = await db
      .select({
        acquisitionId: acquisition.id,
        type: acquisition.acquisitionType,
        date: acquisition.acquisitionDate,
        source: acquisition.sourceName,
        unitCost: acquisitionItem.unitCost,
      })
      .from(acquisitionItem)
      .innerJoin(acquisition, eq(acquisitionItem.acquisitionId, acquisition.id))
      .where(eq(acquisitionItem.exemplarId, id))
      .limit(1);

    return {
      ...item,
      movements,
      acquisition: acq[0] || null,
    };
  }

  async createExemplar(userId: string, input: AddExemplarInput, conditionTypeId: string) {
    return db.transaction(async (tx) => {
      const priceStr = input.cost != null && input.cost !== undefined ? Number(input.cost).toFixed(2) : null;
      const [newExemplar] = await tx
        .insert(collectionExemplar)
        .values({
          userId,
          variationId: input.variationId,
          conditionTypeId,
          notes: input.notes || null,
          acquisitionDate: input.acquisitionDate || null,
          purchasePrice: priceStr,
          purchaseLocation: input.sourceName || null,
          status: 'ACTIVE',
        })
        .returning();

      if (!newExemplar) {
        throw new Error('Falha ao adicionar exemplar à coleção');
      }

      // If location is provided, register initial location
      if (input.locationId) {
        await tx.insert(exemplarLocation).values({
          userId,
          exemplarId: newExemplar.id,
          locationId: input.locationId,
          gridRow: input.gridRow || null,
          gridColumn: input.gridColumn || null,
          isCurrent: true,
        });

        await tx.insert(locationMovement).values({
          userId,
          exemplarId: newExemplar.id,
          fromLocationId: null,
          toLocationId: input.locationId,
          fromGridRow: null,
          fromGridColumn: null,
          toGridRow: input.gridRow || null,
          toGridColumn: input.gridColumn || null,
          notes: 'Posicionamento inicial ao adicionar à coleção',
        });
      }

      // If acquisition details are provided, register acquisition
      if (input.acquisitionType && input.acquisitionDate) {
        const costStr = (input.cost || 0).toFixed(2);
        const [acq] = await tx
          .insert(acquisition)
          .values({
            userId,
            acquisitionType: input.acquisitionType,
            acquisitionDate: input.acquisitionDate,
            sourceName: input.sourceName || null,
            notes: input.notes || null,
          })
          .returning();

        if (acq) {
          await tx.insert(acquisitionItem).values({
            acquisitionId: acq.id,
            exemplarId: newExemplar.id,
            quantity: 1,
            unitCost: costStr,
            totalCost: costStr,
          });
        }
      }

      return newExemplar;
    });
  }

  async moveExemplar(
    userId: string,
    exemplarId: string,
    toLocationId: string,
    toGridRow?: number | null,
    toGridColumn?: number | null,
    notes?: string | null
  ) {
    return db.transaction(async (tx) => {
      // Find current active location
      const [currentLoc] = await tx
        .select()
        .from(exemplarLocation)
        .where(
          and(
            eq(exemplarLocation.exemplarId, exemplarId),
            eq(exemplarLocation.isCurrent, true)
          )
        )
        .limit(1);

      const fromLocationId = currentLoc?.locationId || null;

      // End previous location
      if (currentLoc) {
        await tx
          .update(exemplarLocation)
          .set({ isCurrent: false, endedAt: new Date() })
          .where(eq(exemplarLocation.id, currentLoc.id));
      }

      // Create new current location
      const [newLoc] = await tx
        .insert(exemplarLocation)
        .values({
          userId,
          exemplarId,
          locationId: toLocationId,
          gridRow: toGridRow || null,
          gridColumn: toGridColumn || null,
          isCurrent: true,
        })
        .returning();

      // Register movement history
      await tx.insert(locationMovement).values({
        userId,
        exemplarId,
        fromLocationId,
        toLocationId,
        fromGridRow: currentLoc?.gridRow || null,
        fromGridColumn: currentLoc?.gridColumn || null,
        toGridRow: toGridRow || null,
        toGridColumn: toGridColumn || null,
        notes: notes || null,
      });

      return newLoc;
    });
  }

  async updateExemplar(
    id: string,
    userId: string,
    input: UpdateExemplarInput,
    conditionTypeId?: string
  ) {
    const values: any = { updatedAt: new Date() };

    if (conditionTypeId) {
      values.conditionTypeId = conditionTypeId;
    }
    if (input.notes !== undefined) {
      values.notes = input.notes;
    }
    if (input.status !== undefined) {
      values.status = input.status;
    }
    if (input.purchasePrice !== undefined) {
      values.purchasePrice = input.purchasePrice != null ? Number(input.purchasePrice).toFixed(2) : null;
    }
    if (input.purchaseLocation !== undefined) {
      values.purchaseLocation = input.purchaseLocation?.trim() || null;
    }
    if (input.automakerId !== undefined) {
      values.automakerId = input.automakerId || null;
    }
    if (input.vehicleModelId !== undefined) {
      values.vehicleModelId = input.vehicleModelId || null;
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(collectionExemplar)
        .set(values)
        .where(and(eq(collectionExemplar.id, id), eq(collectionExemplar.userId, userId)))
        .returning();

      // If purchasePrice or purchaseLocation was updated, sync to acquisition if exists
      if (input.purchasePrice !== undefined || input.purchaseLocation !== undefined) {
        const acqItems = await tx
          .select({
            id: acquisitionItem.id,
            acquisitionId: acquisitionItem.acquisitionId,
          })
          .from(acquisitionItem)
          .where(eq(acquisitionItem.exemplarId, id));

        if (acqItems.length > 0) {
          if (input.purchasePrice !== undefined && values.purchasePrice !== null) {
            await tx
              .update(acquisitionItem)
              .set({
                unitCost: values.purchasePrice,
                totalCost: values.purchasePrice,
              })
              .where(eq(acquisitionItem.exemplarId, id));
          }

          if (input.purchaseLocation !== undefined) {
            for (const item of acqItems) {
              await tx
                .update(acquisition)
                .set({ sourceName: values.purchaseLocation })
                .where(eq(acquisition.id, item.acquisitionId));
            }
          }
        }
      }

      return updated;
    });
  }

  async deleteExemplar(id: string, userId: string) {
    return db.transaction(async (tx) => {
      // 1. Delete references in custom lists
      await tx.delete(customListItem).where(eq(customListItem.exemplarId, id));
      // 2. Delete user photos attached to exemplar
      await tx.delete(exemplarPhoto).where(eq(exemplarPhoto.exemplarId, id));
      // 3. Delete location movements and current location
      await tx.delete(locationMovement).where(eq(locationMovement.exemplarId, id));
      await tx.delete(exemplarLocation).where(eq(exemplarLocation.exemplarId, id));
      // 4. Delete write off, acquisition item and sale item if any
      await tx.delete(writeOff).where(eq(writeOff.exemplarId, id));

      const acqItems = await tx
        .select({ acquisitionId: acquisitionItem.acquisitionId })
        .from(acquisitionItem)
        .where(eq(acquisitionItem.exemplarId, id));

      await tx.delete(acquisitionItem).where(eq(acquisitionItem.exemplarId, id));
      await tx.delete(saleItem).where(eq(saleItem.exemplarId, id));

      // Clean up orphaned acquisitions if they have no other items
      for (const item of acqItems) {
        const remaining = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(acquisitionItem)
          .where(eq(acquisitionItem.acquisitionId, item.acquisitionId));
        if ((remaining[0]?.count || 0) === 0) {
          await tx.delete(acquisition).where(eq(acquisition.id, item.acquisitionId));
        }
      }

      // 5. Delete the exemplar itself strictly scoped to the logged-in user
      const [deleted] = await tx
        .delete(collectionExemplar)
        .where(and(eq(collectionExemplar.id, id), eq(collectionExemplar.userId, userId)))
        .returning();

      return deleted;
    });
  }

  async importExemplars(userId: string, items: ImportCollectionItemInput[]) {
    // 1. Fetch condition types map by code
    const conditionTypes = await db.select().from(conditionType);
    const conditionMap = new Map<string, string>();
    conditionTypes.forEach((c) => {
      conditionMap.set(c.code.toUpperCase(), c.id);
    });
    const defaultConditionId = conditionMap.get('MINT') || conditionTypes[0]?.id;

    const imported: Array<{
      code?: string | null;
      name?: string | null;
      variationName: string;
      exemplarId: string;
    }> = [];

    const rejected: Array<ImportCollectionItemInput & { reason: string }> = [];

    // Process row by row so failures don't roll back the valid ones
    for (const item of items) {
      const code = item.code?.trim() || null;
      const name = item.name?.trim() || null;

      if (!code && !name) {
        rejected.push({
          ...item,
          reason: 'Linha sem Código Identificador e sem Nome de Modelo.',
        });
        continue;
      }

      let matchedVariationId: string | null = null;
      let matchedVariationName = '';

      // A) Try matching by product identifier code
      if (code) {
        const normalized = code.toLowerCase();
        const [foundCode] = await db
          .select({
            variationId: productIdentifier.variationId,
            variationName: variation.name,
          })
          .from(productIdentifier)
          .innerJoin(variation, eq(productIdentifier.variationId, variation.id))
          .where(eq(productIdentifier.normalizedCode, normalized))
          .limit(1);

        if (foundCode) {
          matchedVariationId = foundCode.variationId;
          matchedVariationName = foundCode.variationName;
        }
      }

      // B) If not found by code, try matching by name (+ optional year)
      if (!matchedVariationId && name) {
        const conditions = [ilike(variation.name, name)];
        if (item.year) {
          conditions.push(eq(variation.releaseYear, item.year));
        }

        const [foundName] = await db
          .select({
            variationId: variation.id,
            variationName: variation.name,
          })
          .from(variation)
          .where(and(...conditions))
          .limit(1);

        if (foundName) {
          matchedVariationId = foundName.variationId;
          matchedVariationName = foundName.variationName;
        }
      }

      if (!matchedVariationId) {
        rejected.push({
          ...item,
          reason: code
            ? `Miniatura com código '${code}' não encontrada no catálogo oficial.`
            : `Miniatura '${name}' não encontrada no catálogo oficial.`,
        });
        continue;
      }

      // Found variation! Insert exemplar and acquisition in a sub-transaction
      try {
        const condId = (item.conditionCode && conditionMap.get(item.conditionCode.toUpperCase())) || defaultConditionId;
        const priceStr = item.cost != null && item.cost !== undefined ? Number(item.cost).toFixed(2) : null;
        const acqDate: string = (item.acquisitionDate && item.acquisitionDate.trim())
          ? item.acquisitionDate.trim()
          : new Date().toISOString().split('T')[0]!;

        const res = await db.transaction(async (tx) => {
          const [newExemplar] = await tx
            .insert(collectionExemplar)
            .values({
              userId,
              variationId: matchedVariationId!,
              conditionTypeId: condId!,
              notes: item.notes || null,
              acquisitionDate: acqDate,
              purchasePrice: priceStr,
              purchaseLocation: item.sourceName?.trim() || null,
              status: 'ACTIVE',
            })
            .returning();

          if (!newExemplar) {
            throw new Error('Erro ao inserir exemplar');
          }

          // Register acquisition
          const [acq] = await tx
            .insert(acquisition)
            .values({
              userId,
              acquisitionType: 'PURCHASE',
              acquisitionDate: acqDate,
              sourceName: item.sourceName?.trim() || null,
              notes: item.notes || null,
            })
            .returning();

          if (acq) {
            const costStr = (item.cost || 0).toFixed(2);
            await tx.insert(acquisitionItem).values({
              acquisitionId: acq.id,
              exemplarId: newExemplar.id,
              quantity: 1,
              unitCost: costStr,
              totalCost: costStr,
            });
          }

          return newExemplar;
        });

        imported.push({
          code: item.code,
          name: item.name,
          variationName: matchedVariationName,
          exemplarId: res.id,
        });
      } catch (err: any) {
        rejected.push({
          ...item,
          reason: `Erro interno ao salvar exemplar: ${err.message || 'Falha ao persistir'}`,
        });
      }
    }

    return {
      totalCount: items.length,
      importedCount: imported.length,
      rejectedCount: rejected.length,
      imported,
      rejected,
    };
  }
}
