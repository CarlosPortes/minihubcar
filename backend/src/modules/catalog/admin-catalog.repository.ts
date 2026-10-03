import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  automaker,
  vehicleModel,
  miniatureBrand,
  series,
  scale,
  casting,
  castingVehicle,
  variation,
  productIdentifier,
  identifierType,
} from '../../database/schema';
import {
  CreateAutomakerInput,
  UpdateAutomakerInput,
  CreateVehicleModelInput,
  UpdateVehicleModelInput,
  CreateMiniatureBrandInput,
  UpdateMiniatureBrandInput,
  CreateSeriesInput,
  UpdateSeriesInput,
  CreateScaleInput,
  UpdateScaleInput,
  CreateCatalogVariationInput,
  UpdateCatalogVariationInput,
} from './admin-catalog.schemas';


export class AdminCatalogRepository {
  // --- Automakers ---
  async listAutomakers() {
    return db.select().from(automaker).where(eq(automaker.status, 'ACTIVE')).orderBy(asc(automaker.name));
  }

  async createAutomaker(input: CreateAutomakerInput) {
    const normalizedName = input.name.trim().toLowerCase();
    const [created] = await db
      .insert(automaker)
      .values({
        name: input.name.trim(),
        normalizedName,
        country: input.country?.trim() || null,
        status: 'ACTIVE',
      })
      .returning();
    return created;
  }

  // --- Vehicle Models ---
  async listVehicleModels(automakerId?: string) {
    const conditions = [eq(vehicleModel.status, 'ACTIVE')];
    if (automakerId) {
      conditions.push(eq(vehicleModel.automakerId, automakerId));
    }

    return db
      .select({
        id: vehicleModel.id,
        name: vehicleModel.name,
        automakerId: vehicleModel.automakerId,
        automakerName: automaker.name,
        description: vehicleModel.description,
        status: vehicleModel.status,
      })
      .from(vehicleModel)
      .innerJoin(automaker, eq(vehicleModel.automakerId, automaker.id))
      .where(and(...conditions))
      .orderBy(asc(vehicleModel.name));
  }

  async createVehicleModel(input: CreateVehicleModelInput) {
    const normalizedName = input.name.trim().toLowerCase();
    const [created] = await db
      .insert(vehicleModel)
      .values({
        automakerId: input.automakerId,
        name: input.name.trim(),
        normalizedName,
        description: input.description?.trim() || null,
        status: 'ACTIVE',
      })
      .returning();
    return created;
  }

  // --- Miniature Brands ---
  async listMiniatureBrands() {
    return db.select().from(miniatureBrand).where(eq(miniatureBrand.status, 'ACTIVE')).orderBy(asc(miniatureBrand.name));
  }

  async createMiniatureBrand(input: CreateMiniatureBrandInput) {
    const normalizedName = input.name.trim().toLowerCase();
    const [created] = await db
      .insert(miniatureBrand)
      .values({
        name: input.name.trim(),
        normalizedName,
        description: input.description?.trim() || null,
        status: 'ACTIVE',
      })
      .returning();
    return created;
  }

  // --- Series ---
  async listSeries(brandId?: string) {
    const conditions = [eq(series.status, 'ACTIVE')];
    if (brandId) {
      conditions.push(eq(series.miniatureBrandId, brandId));
    }

    return db
      .select({
        id: series.id,
        name: series.name,
        miniatureBrandId: series.miniatureBrandId,
        brandName: miniatureBrand.name,
        description: series.description,
        status: series.status,
      })
      .from(series)
      .innerJoin(miniatureBrand, eq(series.miniatureBrandId, miniatureBrand.id))
      .where(and(...conditions))
      .orderBy(asc(series.name));
  }

  async createSeries(input: CreateSeriesInput) {
    const normalizedName = input.name.trim().toLowerCase();
    const [created] = await db
      .insert(series)
      .values({
        miniatureBrandId: input.miniatureBrandId,
        name: input.name.trim(),
        normalizedName,
        description: input.description?.trim() || null,
        status: 'ACTIVE',
      })
      .returning();
    return created;
  }

  // --- Scales ---
  async listScales() {
    return db.select().from(scale).where(eq(scale.status, 'ACTIVE')).orderBy(asc(scale.denominator));
  }

  async createScale(input: CreateScaleInput) {
    const normalizedVal = (input.numerator / input.denominator).toFixed(6);
    const [created] = await db
      .insert(scale)
      .values({
        name: input.name.trim(),
        numerator: input.numerator,
        denominator: input.denominator,
        normalizedValue: normalizedVal,
        status: 'ACTIVE',
      })
      .returning();
    return created;
  }

  // --- Create Canonical Variation (Transaction) ---
  async createCatalogVariation(input: CreateCatalogVariationInput) {
    return db.transaction(async (tx) => {
      const normalizedCastingName = input.castingName.trim().toLowerCase();

      // Find or create casting
      let [c] = await tx
        .select()
        .from(casting)
        .where(
          and(
            eq(casting.miniatureBrandId, input.miniatureBrandId),
            eq(casting.normalizedName, normalizedCastingName)
          )
        )
        .limit(1);

      if (!c) {
        [c] = await tx
          .insert(casting)
          .values({
            miniatureBrandId: input.miniatureBrandId,
            automakerId: input.automakerId || null,
            name: input.castingName.trim(),
            normalizedName: normalizedCastingName,
            fantasyFlag: input.fantasyFlag || false,
            status: 'ACTIVE',
          })
          .returning();
      } else if (input.automakerId && !c.automakerId) {
        await tx
          .update(casting)
          .set({ automakerId: input.automakerId, updatedAt: new Date() })
          .where(eq(casting.id, c.id));
      }

      if (!c) {
        throw new Error('Falha ao processar molde da miniatura');
      }

      // Link casting to vehicle model if provided
      if (input.vehicleModelId) {
        const [existingLink] = await tx
          .select()
          .from(castingVehicle)
          .where(
            and(
              eq(castingVehicle.castingId, c.id),
              eq(castingVehicle.vehicleModelId, input.vehicleModelId)
            )
          )
          .limit(1);

        if (!existingLink) {
          await tx.insert(castingVehicle).values({
            castingId: c.id,
            vehicleModelId: input.vehicleModelId,
            relationshipType: 'EXACT',
          });
        }
      }

      // Insert variation
      const [newVariation] = await tx
        .insert(variation)
        .values({
          castingId: c.id,
          seriesId: input.seriesId || null,
          scaleId: input.scaleId || null,
          name: input.name.trim(),
          releaseYear: input.releaseYear || null,
          color: input.color?.trim() || null,
          finish: input.finish?.trim() || null,
          packaging: input.packaging?.trim() || null,
          edition: input.edition?.trim() || null,
          seriesNumber: input.seriesNumber?.trim() || null,
          collectorNumber: input.collectorNumber?.trim() || null,
          lineType: input.lineType?.trim() || null,
          rarity: input.rarity?.trim() || 'REGULAR',
          description: input.description?.trim() || null,
          photoUrl: input.photoUrl?.trim() || null,
          status: 'ACTIVE',
        })
        .returning();

      // If product code is provided, register product identifier
      if (input.productCode && newVariation) {
        let [idType] = await tx
          .select()
          .from(identifierType)
          .where(eq(identifierType.code, 'PRODUCT_CODE'))
          .limit(1);

        if (!idType) {
          [idType] = await tx
            .insert(identifierType)
            .values({
              code: 'PRODUCT_CODE',
              name: 'Código de Produto / SKU',
              status: 'ACTIVE',
            })
            .returning();
        }

        if (idType) {
          await tx.insert(productIdentifier).values({
            variationId: newVariation.id,
            identifierTypeId: idType.id,
            code: input.productCode.trim(),
            normalizedCode: input.productCode.trim().toLowerCase(),
            isPrimary: true,
          });
        }
      }

      return {
        variation: newVariation,
        casting: c,
      };
    });
  }

  // --- Update Canonical Variation ---
  async updateCatalogVariation(variationId: string, input: UpdateCatalogVariationInput) {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(variation)
        .where(eq(variation.id, variationId))
        .limit(1);

      if (!existing) {
        throw new Error('Miniatura não encontrada no catálogo');
      }

      // Update casting if castingName is provided
      let currentCastingId = existing.castingId;
      if (input.castingName || input.miniatureBrandId) {
        const [currCasting] = await tx
          .select()
          .from(casting)
          .where(eq(casting.id, existing.castingId))
          .limit(1);

        const targetBrandId = input.miniatureBrandId || currCasting?.miniatureBrandId;
        const targetCastingName = input.castingName?.trim() || currCasting?.name;

        if (targetBrandId && targetCastingName) {
          const normalized = targetCastingName.toLowerCase();
          let [foundCasting] = await tx
            .select()
            .from(casting)
            .where(
              and(
                eq(casting.miniatureBrandId, targetBrandId),
                eq(casting.normalizedName, normalized)
              )
            )
            .limit(1);

          if (!foundCasting) {
            [foundCasting] = await tx
              .insert(casting)
              .values({
                miniatureBrandId: targetBrandId,
                name: targetCastingName,
                normalizedName: normalized,
                fantasyFlag: input.fantasyFlag ?? currCasting?.fantasyFlag ?? false,
                status: 'ACTIVE',
              })
              .returning();
          }

          if (foundCasting) {
            currentCastingId = foundCasting.id;
          }
        }
      }

      // Update casting automaker if provided
      if (input.automakerId !== undefined) {
        await tx
          .update(casting)
          .set({ automakerId: input.automakerId || null, updatedAt: new Date() })
          .where(eq(casting.id, currentCastingId));
      }

      // Link or unlink vehicle model if provided
      if (input.vehicleModelId !== undefined) {
        // Clear previous vehicle links for this casting
        await tx.delete(castingVehicle).where(eq(castingVehicle.castingId, currentCastingId));

        if (input.vehicleModelId) {
          await tx.insert(castingVehicle).values({
            castingId: currentCastingId,
            vehicleModelId: input.vehicleModelId,
            relationshipType: 'EXACT',
          });

          // Also ensure casting has automakerId set from vehicleModel if not explicitly set
          if (input.automakerId === undefined) {
            const [vm] = await tx
              .select({ automakerId: vehicleModel.automakerId })
              .from(vehicleModel)
              .where(eq(vehicleModel.id, input.vehicleModelId))
              .limit(1);
            if (vm?.automakerId) {
              await tx
                .update(casting)
                .set({ automakerId: vm.automakerId, updatedAt: new Date() })
                .where(eq(casting.id, currentCastingId));
            }
          }
        }
      }

      // Update variation fields
      const updateData: Partial<typeof variation.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (currentCastingId !== existing.castingId) updateData.castingId = currentCastingId;
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.releaseYear !== undefined) updateData.releaseYear = input.releaseYear;
      if (input.color !== undefined) updateData.color = input.color?.trim() || null;
      if (input.finish !== undefined) updateData.finish = input.finish?.trim() || null;
      if (input.packaging !== undefined) updateData.packaging = input.packaging?.trim() || null;
      if (input.edition !== undefined) updateData.edition = input.edition?.trim() || null;
      if (input.seriesNumber !== undefined) updateData.seriesNumber = input.seriesNumber?.trim() || null;
      if (input.collectorNumber !== undefined) updateData.collectorNumber = input.collectorNumber?.trim() || null;
      if (input.lineType !== undefined) updateData.lineType = input.lineType?.trim() || null;
      if (input.rarity !== undefined) updateData.rarity = input.rarity?.trim() || 'REGULAR';
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl?.trim() || null;
      if (input.seriesId !== undefined) updateData.seriesId = input.seriesId;
      if (input.scaleId !== undefined) updateData.scaleId = input.scaleId;

      const [updated] = await tx
        .update(variation)
        .set(updateData)
        .where(eq(variation.id, variationId))
        .returning();

      // If product code is provided, update or insert product identifier
      if (input.productCode !== undefined && input.productCode) {
        let [idType] = await tx
          .select()
          .from(identifierType)
          .where(eq(identifierType.code, 'PRODUCT_CODE'))
          .limit(1);

        if (!idType) {
          [idType] = await tx
            .insert(identifierType)
            .values({
              code: 'PRODUCT_CODE',
              name: 'Código de Produto / SKU',
              status: 'ACTIVE',
            })
            .returning();
        }

        if (idType) {
          const [existingIdent] = await tx
            .select()
            .from(productIdentifier)
            .where(
              and(
                eq(productIdentifier.variationId, variationId),
                eq(productIdentifier.identifierTypeId, idType.id)
              )
            )
            .limit(1);

          if (existingIdent) {
            await tx
              .update(productIdentifier)
              .set({
                code: input.productCode.trim(),
                normalizedCode: input.productCode.trim().toLowerCase(),
              })
              .where(eq(productIdentifier.id, existingIdent.id));
          } else {
            await tx.insert(productIdentifier).values({
              variationId,
              identifierTypeId: idType.id,
              code: input.productCode.trim(),
              normalizedCode: input.productCode.trim().toLowerCase(),
              isPrimary: true,
            });
          }
        }
      }

      return updated;
    });
  }

  // --- Auxiliary Updates ---
  async updateAutomaker(id: string, input: UpdateAutomakerInput) {
    const updateData: any = {};
    if (input.name) {
      updateData.name = input.name.trim();
      updateData.normalizedName = input.name.trim().toLowerCase();
    }
    if (input.country !== undefined) {
      updateData.country = input.country?.trim() || null;
    }
    const [updated] = await db
      .update(automaker)
      .set(updateData)
      .where(eq(automaker.id, id))
      .returning();
    return updated;
  }

  async updateVehicleModel(id: string, input: UpdateVehicleModelInput) {
    const updateData: any = {};
    if (input.name) {
      updateData.name = input.name.trim();
      updateData.normalizedName = input.name.trim().toLowerCase();
    }
    if (input.automakerId) updateData.automakerId = input.automakerId;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    const [updated] = await db
      .update(vehicleModel)
      .set(updateData)
      .where(eq(vehicleModel.id, id))
      .returning();
    return updated;
  }

  async updateMiniatureBrand(id: string, input: UpdateMiniatureBrandInput) {
    const updateData: any = {};
    if (input.name) {
      updateData.name = input.name.trim();
      updateData.normalizedName = input.name.trim().toLowerCase();
    }
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    const [updated] = await db
      .update(miniatureBrand)
      .set(updateData)
      .where(eq(miniatureBrand.id, id))
      .returning();
    return updated;
  }

  async updateSeries(id: string, input: UpdateSeriesInput) {
    const updateData: any = {};
    if (input.name) updateData.name = input.name.trim();
    if (input.miniatureBrandId) updateData.miniatureBrandId = input.miniatureBrandId;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    const [updated] = await db
      .update(series)
      .set(updateData)
      .where(eq(series.id, id))
      .returning();
    return updated;
  }

  async updateScale(id: string, input: UpdateScaleInput) {
    const updateData: any = {};
    if (input.name) updateData.name = input.name.trim();
    if (input.numerator) updateData.numerator = input.numerator;
    if (input.denominator) {
      updateData.denominator = input.denominator;
      updateData.normalizedValue = ((input.numerator || 1) / input.denominator).toFixed(6);
    }
    const [updated] = await db
      .update(scale)
      .set(updateData)
      .where(eq(scale.id, id))
      .returning();
    return updated;
  }
}

