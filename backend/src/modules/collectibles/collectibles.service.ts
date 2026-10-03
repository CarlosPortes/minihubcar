import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import { db } from '../../database/client';
import { customCollectible, location } from '../../database/schema';
import {
  CreateCollectibleInput,
  UpdateCollectibleInput,
  CollectibleFilterQuery,
} from './collectibles.schemas';
import { subscriptionsService } from '../subscriptions/subscriptions.service';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/api-error';

export class CollectiblesService {
  async listUserCollectibles(userId: string, filter: CollectibleFilterQuery) {
    const conditions = [
      eq(customCollectible.userId, userId),
      eq(customCollectible.status, filter.status),
    ];

    if (filter.category) {
      conditions.push(eq(customCollectible.category, filter.category));
    }

    if (filter.locationId) {
      conditions.push(eq(customCollectible.locationId, filter.locationId));
    }

    if (filter.franchise) {
      conditions.push(ilike(customCollectible.franchise, `%${filter.franchise}%`));
    }

    if (filter.q) {
      conditions.push(
        sql`(${customCollectible.name} ILIKE ${`%${filter.q}%`} OR ${customCollectible.characterOrSubject} ILIKE ${`%${filter.q}%`} OR ${customCollectible.manufacturer} ILIKE ${`%${filter.q}%`})`
      );
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 24;
    const offset = (page - 1) * pageSize;

    const items = await db
      .select({
        id: customCollectible.id,
        name: customCollectible.name,
        category: customCollectible.category,
        manufacturer: customCollectible.manufacturer,
        franchise: customCollectible.franchise,
        characterOrSubject: customCollectible.characterOrSubject,
        releaseYear: customCollectible.releaseYear,
        edition: customCollectible.edition,
        scale: customCollectible.scale,
        conditionCode: customCollectible.conditionCode,
        purchasePrice: customCollectible.purchasePrice,
        purchaseLocation: customCollectible.purchaseLocation,
        acquisitionDate: customCollectible.acquisitionDate,
        gridRow: customCollectible.gridRow,
        gridColumn: customCollectible.gridColumn,
        photoUrl: customCollectible.photoUrl,
        notes: customCollectible.notes,
        status: customCollectible.status,
        createdAt: customCollectible.createdAt,
        location: {
          id: location.id,
          name: location.name,
          hasGrid: location.hasGrid,
          gridRows: location.gridRows,
          gridColumns: location.gridColumns,
        },
      })
      .from(customCollectible)
      .leftJoin(location, eq(customCollectible.locationId, location.id))
      .where(and(...conditions))
      .orderBy(desc(customCollectible.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customCollectible)
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

  async getCollectibleDetail(id: string, userId: string) {
    const [item] = await db
      .select({
        id: customCollectible.id,
        name: customCollectible.name,
        category: customCollectible.category,
        manufacturer: customCollectible.manufacturer,
        franchise: customCollectible.franchise,
        characterOrSubject: customCollectible.characterOrSubject,
        releaseYear: customCollectible.releaseYear,
        edition: customCollectible.edition,
        scale: customCollectible.scale,
        conditionCode: customCollectible.conditionCode,
        purchasePrice: customCollectible.purchasePrice,
        purchaseLocation: customCollectible.purchaseLocation,
        acquisitionDate: customCollectible.acquisitionDate,
        gridRow: customCollectible.gridRow,
        gridColumn: customCollectible.gridColumn,
        photoUrl: customCollectible.photoUrl,
        notes: customCollectible.notes,
        status: customCollectible.status,
        createdAt: customCollectible.createdAt,
        updatedAt: customCollectible.updatedAt,
        location: {
          id: location.id,
          name: location.name,
          hasGrid: location.hasGrid,
          gridRows: location.gridRows,
          gridColumns: location.gridColumns,
        },
      })
      .from(customCollectible)
      .leftJoin(location, eq(customCollectible.locationId, location.id))
      .where(and(eq(customCollectible.id, id), eq(customCollectible.userId, userId)))
      .limit(1);

    if (!item) {
      throw new NotFoundError('Colecionável não encontrado no seu acervo');
    }

    return item;
  }

  async createCollectible(userId: string, input: CreateCollectibleInput) {
    // 1. Quota limit check
    const limits = await subscriptionsService.checkUserLimits(userId);
    if (!limits.otherCollectibles.canAdd) {
      throw new BadRequestError(
        `Você atingiu o limite de ${limits.otherCollectibles.max} outros colecionáveis do plano ${limits.plan.name}. Faça upgrade do seu plano para cadastrar mais peças.`
      );
    }

    // 2. Validate location if specified
    if (input.locationId) {
      const [loc] = await db
        .select()
        .from(location)
        .where(and(eq(location.id, input.locationId), eq(location.userId, userId)))
        .limit(1);

      if (!loc) {
        throw new NotFoundError('Localização informada não foi encontrada no seu cadastro.');
      }

      if (loc.hasGrid) {
        if (input.gridRow && (input.gridRow < 1 || input.gridRow > (loc.gridRows || 0))) {
          throw new BadRequestError(`Linha inválida para este expositor (máximo: ${loc.gridRows})`);
        }
        if (input.gridColumn && (input.gridColumn < 1 || input.gridColumn > (loc.gridColumns || 0))) {
          throw new BadRequestError(`Coluna inválida para este expositor (máximo: ${loc.gridColumns})`);
        }

        // Check if slot occupied by another custom collectible
        if (input.gridRow && input.gridColumn) {
          const [occupied] = await db
            .select({ id: customCollectible.id })
            .from(customCollectible)
            .where(
              and(
                eq(customCollectible.locationId, loc.id),
                eq(customCollectible.gridRow, input.gridRow),
                eq(customCollectible.gridColumn, input.gridColumn),
                eq(customCollectible.status, 'ACTIVE')
              )
            )
            .limit(1);

          if (occupied) {
            throw new ConflictError(
              `O nicho Linha ${input.gridRow}, Coluna ${input.gridColumn} em '${loc.name}' já está ocupado por outro colecionável.`
            );
          }
        }
      } else {
        input.gridRow = null;
        input.gridColumn = null;
      }
    }

    const priceStr = input.purchasePrice != null ? input.purchasePrice.toFixed(2) : null;
    const acqDate = input.acquisitionDate || new Date().toISOString().split('T')[0]!;

    const [created] = await db
      .insert(customCollectible)
      .values({
        userId,
        name: input.name.trim(),
        category: input.category,
        manufacturer: input.manufacturer?.trim() || null,
        franchise: input.franchise?.trim() || null,
        characterOrSubject: input.characterOrSubject?.trim() || null,
        releaseYear: input.releaseYear || null,
        edition: input.edition?.trim() || null,
        scale: input.scale?.trim() || null,
        conditionCode: input.conditionCode || 'MINT',
        purchasePrice: priceStr,
        purchaseLocation: input.purchaseLocation?.trim() || null,
        acquisitionDate: acqDate,
        locationId: input.locationId || null,
        gridRow: input.gridRow || null,
        gridColumn: input.gridColumn || null,
        photoUrl: input.photoUrl?.trim() || null,
        notes: input.notes?.trim() || null,
        status: 'ACTIVE',
      })
      .returning();

    return created;
  }

  async updateCollectible(id: string, userId: string, input: UpdateCollectibleInput) {
    const existing = await this.getCollectibleDetail(id, userId);

    const targetLocationId = input.locationId !== undefined ? input.locationId : existing.location?.id;
    let targetRow = input.gridRow !== undefined ? input.gridRow : existing.gridRow;
    let targetCol = input.gridColumn !== undefined ? input.gridColumn : existing.gridColumn;

    if (targetLocationId) {
      const [loc] = await db
        .select()
        .from(location)
        .where(and(eq(location.id, targetLocationId), eq(location.userId, userId)))
        .limit(1);

      if (!loc) {
        throw new NotFoundError('Localização informada não encontrada.');
      }

      if (loc.hasGrid) {
        if (targetRow && (targetRow < 1 || targetRow > (loc.gridRows || 0))) {
          throw new BadRequestError(`Linha inválida (máximo: ${loc.gridRows})`);
        }
        if (targetCol && (targetCol < 1 || targetCol > (loc.gridColumns || 0))) {
          throw new BadRequestError(`Coluna inválida (máximo: ${loc.gridColumns})`);
        }

        if (targetRow && targetCol) {
          const [occupied] = await db
            .select({ id: customCollectible.id })
            .from(customCollectible)
            .where(
              and(
                eq(customCollectible.locationId, loc.id),
                eq(customCollectible.gridRow, targetRow),
                eq(customCollectible.gridColumn, targetCol),
                eq(customCollectible.status, 'ACTIVE'),
                sql`${customCollectible.id} != ${id}`
              )
            )
            .limit(1);

          if (occupied) {
            throw new ConflictError(`O nicho Linha ${targetRow}, Coluna ${targetCol} já está ocupado.`);
          }
        }
      } else {
        targetRow = null;
        targetCol = null;
      }
    }

    const priceStr =
      input.purchasePrice !== undefined
        ? input.purchasePrice != null
          ? input.purchasePrice.toFixed(2)
          : null
        : undefined;

    const [updated] = await db
      .update(customCollectible)
      .set({
        name: input.name !== undefined ? input.name.trim() : undefined,
        category: input.category,
        manufacturer: input.manufacturer !== undefined ? input.manufacturer?.trim() || null : undefined,
        franchise: input.franchise !== undefined ? input.franchise?.trim() || null : undefined,
        characterOrSubject: input.characterOrSubject !== undefined ? input.characterOrSubject?.trim() || null : undefined,
        releaseYear: input.releaseYear,
        edition: input.edition !== undefined ? input.edition?.trim() || null : undefined,
        scale: input.scale !== undefined ? input.scale?.trim() || null : undefined,
        conditionCode: input.conditionCode,
        purchasePrice: priceStr,
        purchaseLocation: input.purchaseLocation !== undefined ? input.purchaseLocation?.trim() || null : undefined,
        acquisitionDate: input.acquisitionDate,
        locationId: targetLocationId,
        gridRow: targetRow,
        gridColumn: targetCol,
        photoUrl: input.photoUrl !== undefined ? input.photoUrl?.trim() || null : undefined,
        notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(customCollectible.id, id), eq(customCollectible.userId, userId)))
      .returning();

    return updated;
  }

  async deleteCollectible(id: string, userId: string) {
    const existing = await this.getCollectibleDetail(id, userId);
    await db
      .delete(customCollectible)
      .where(and(eq(customCollectible.id, existing.id), eq(customCollectible.userId, userId)));
    return { success: true, message: 'Colecionável removido com sucesso' };
  }

  async getAcervoSummary(userId: string) {
    const categoryCounts = await db
      .select({
        category: customCollectible.category,
        count: sql<number>`count(*)::int`,
        totalInvested: sql<number>`COALESCE(SUM(purchase_price), 0)::float`,
      })
      .from(customCollectible)
      .where(and(eq(customCollectible.userId, userId), eq(customCollectible.status, 'ACTIVE')))
      .groupBy(customCollectible.category);

    const [totalRes] = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        totalInvested: sql<number>`COALESCE(SUM(purchase_price), 0)::float`,
      })
      .from(customCollectible)
      .where(and(eq(customCollectible.userId, userId), eq(customCollectible.status, 'ACTIVE')));

    return {
      totalCount: totalRes?.totalCount || 0,
      totalInvested: totalRes?.totalInvested || 0,
      byCategory: categoryCounts,
    };
  }
}

export const collectiblesService = new CollectiblesService();
