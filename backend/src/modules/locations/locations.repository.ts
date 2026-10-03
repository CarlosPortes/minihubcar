import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  location,
  exemplarLocation,
  collectionExemplar,
  variation,
  casting,
  miniatureBrand,
  conditionType,
} from '../../database/schema';
import { CreateLocationInput, UpdateLocationInput } from './locations.schemas';

export interface LocationNode {
  id: string;
  name: string;
  locationType: string | null;
  parentLocationId: string | null;
  hasGrid: boolean;
  gridRows: number | null;
  gridColumns: number | null;
  status: string;
  children: LocationNode[];
  itemCount?: number;
  occupiedCount: number;
  totalCapacity: number | null;
  availableCount: number | null;
  occupancyPercent: number | null;
  availabilityPercent: number | null;
}

export class LocationsRepository {
  async listByUser(userId: string) {
    return db
      .select()
      .from(location)
      .where(and(eq(location.userId, userId), eq(location.status, 'ACTIVE')))
      .orderBy(location.name);
  }

  async listByUserWithCounts(userId: string) {
    const locations = await db
      .select()
      .from(location)
      .where(and(eq(location.userId, userId), eq(location.status, 'ACTIVE')))
      .orderBy(location.name);

    // Count occupied slots per location
    const counts = await db
      .select({
        locationId: exemplarLocation.locationId,
        count: sql<number>`count(${exemplarLocation.id})::int`,
      })
      .from(exemplarLocation)
      .innerJoin(collectionExemplar, eq(exemplarLocation.exemplarId, collectionExemplar.id))
      .where(
        and(
          eq(exemplarLocation.userId, userId),
          eq(exemplarLocation.isCurrent, true),
          eq(collectionExemplar.status, 'ACTIVE')
        )
      )
      .groupBy(exemplarLocation.locationId);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c.locationId, Number(c.count) || 0);
    }

    return locations.map((loc) => {
      const occupiedCount = countMap.get(loc.id) || 0;
      const totalCapacity = loc.hasGrid && loc.gridRows && loc.gridColumns ? loc.gridRows * loc.gridColumns : null;
      const availableCount = totalCapacity !== null ? Math.max(0, totalCapacity - occupiedCount) : null;
      const occupancyPercent = totalCapacity && totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : null;
      const availabilityPercent = occupancyPercent !== null ? Math.max(0, 100 - occupancyPercent) : null;

      return {
        ...loc,
        occupiedCount,
        totalCapacity,
        availableCount,
        occupancyPercent,
        availabilityPercent,
      };
    });
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await db
      .select()
      .from(location)
      .where(and(eq(location.id, id), eq(location.userId, userId)))
      .limit(1);

    return rows[0] || null;
  }

  async create(userId: string, data: CreateLocationInput, normalizedName: string) {
    const hasGrid = Boolean(data.hasGrid);
    const [created] = await db
      .insert(location)
      .values({
        userId,
        name: data.name.trim(),
        normalizedName,
        parentLocationId: data.parentLocationId || null,
        locationType: data.locationType || null,
        hasGrid,
        gridRows: hasGrid ? data.gridRows || null : null,
        gridColumns: hasGrid ? data.gridColumns || null : null,
        status: 'ACTIVE',
      })
      .returning();

    return created;
  }

  async update(id: string, userId: string, data: UpdateLocationInput, normalizedName?: string) {
    const valuesToUpdate: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      valuesToUpdate.name = data.name.trim();
      valuesToUpdate.normalizedName = normalizedName;
    }
    if (data.parentLocationId !== undefined) {
      valuesToUpdate.parentLocationId = data.parentLocationId;
    }
    if (data.locationType !== undefined) {
      valuesToUpdate.locationType = data.locationType;
    }
    if (data.hasGrid !== undefined) {
      valuesToUpdate.hasGrid = data.hasGrid;
      if (!data.hasGrid) {
        valuesToUpdate.gridRows = null;
        valuesToUpdate.gridColumns = null;
      }
    }
    if (data.gridRows !== undefined) {
      valuesToUpdate.gridRows = data.gridRows;
    }
    if (data.gridColumns !== undefined) {
      valuesToUpdate.gridColumns = data.gridColumns;
    }
    if (data.status !== undefined) {
      valuesToUpdate.status = data.status;
    }

    const [updated] = await db
      .update(location)
      .set(valuesToUpdate)
      .where(and(eq(location.id, id), eq(location.userId, userId)))
      .returning();

    return updated;
  }

  async isSlotOccupied(locationId: string, row: number, column: number, excludeExemplarId?: string) {
    const conditions = [
      eq(exemplarLocation.locationId, locationId),
      eq(exemplarLocation.gridRow, row),
      eq(exemplarLocation.gridColumn, column),
      eq(exemplarLocation.isCurrent, true),
    ];

    if (excludeExemplarId) {
      conditions.push(sql`${exemplarLocation.exemplarId} != ${excludeExemplarId}`);
    }

    const rows = await db
      .select({ id: exemplarLocation.id })
      .from(exemplarLocation)
      .where(and(...conditions))
      .limit(1);

    return rows.length > 0;
  }

  async getLocationGrid(locationId: string, userId: string) {
    const loc = await this.findByIdAndUser(locationId, userId);
    if (!loc) {
      return null;
    }

    const occupiedSlots = await db
      .select({
        exemplarId: collectionExemplar.id,
        gridRow: exemplarLocation.gridRow,
        gridColumn: exemplarLocation.gridColumn,
        notes: collectionExemplar.notes,
        status: collectionExemplar.status,
        variation: {
          id: variation.id,
          name: variation.name,
          color: variation.color,
          releaseYear: variation.releaseYear,
          photoUrl: variation.photoUrl,
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
          code: conditionType.code,
          name: conditionType.name,
        },
      })
      .from(exemplarLocation)
      .innerJoin(collectionExemplar, eq(exemplarLocation.exemplarId, collectionExemplar.id))
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(conditionType, eq(collectionExemplar.conditionTypeId, conditionType.id))
      .where(
        and(
          eq(exemplarLocation.locationId, locationId),
          eq(exemplarLocation.userId, userId),
          eq(exemplarLocation.isCurrent, true),
          eq(collectionExemplar.status, 'ACTIVE')
        )
      )
      .orderBy(exemplarLocation.gridRow, exemplarLocation.gridColumn);

    return {
      location: loc,
      occupiedSlots,
    };
  }

  async archive(id: string, userId: string) {
    const [archived] = await db
      .update(location)
      .set({ status: 'INACTIVE', updatedAt: new Date() })
      .where(and(eq(location.id, id), eq(location.userId, userId)))
      .returning();

    return archived;
  }
}
