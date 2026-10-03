import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  variation,
  casting,
  miniatureBrand,
  series,
  scale,
  productIdentifier,
  castingVehicle,
  vehicleModel,
  automaker,
} from '../../database/schema';
import { CatalogSearchQuery } from './catalog.schemas';

export class CatalogRepository {
  async search(params: CatalogSearchQuery) {
    const { q, brandId, automakerId, scaleId, seriesId, year, rarity, color, page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [eq(variation.status, 'ACTIVE')];

    if (brandId) {
      conditions.push(eq(casting.miniatureBrandId, brandId));
    }
    if (scaleId) {
      conditions.push(eq(variation.scaleId, scaleId));
    }
    if (seriesId) {
      conditions.push(eq(variation.seriesId, seriesId));
    }
    if (automakerId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${castingVehicle} cv
          JOIN ${vehicleModel} vm ON cv.vehicle_model_id = vm.id
          WHERE cv.casting_id = ${casting.id} AND vm.automaker_id = ${automakerId}
        )`
      );
    }
    if (year) {
      conditions.push(eq(variation.releaseYear, year));
    }
    if (rarity) {
      conditions.push(eq(variation.rarity, rarity));
    }
    if (color) {
      conditions.push(ilike(variation.color, `%${color}%`));
    }
    if (q) {
      const searchPattern = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(variation.name, searchPattern),
          ilike(casting.name, searchPattern),
          ilike(miniatureBrand.name, searchPattern),
          ilike(variation.color, searchPattern),
          ilike(variation.edition, searchPattern),
          ilike(variation.collectorNumber, searchPattern),
          ilike(series.name, searchPattern),
          sql`EXISTS (
            SELECT 1 FROM ${productIdentifier} pi
            WHERE pi.variation_id = ${variation.id} AND (pi.code ILIKE ${searchPattern} OR pi.normalized_code ILIKE ${searchPattern})
          )`
        )
      );
    }

    // Main query
    const items = await db
      .select({
        id: variation.id,
        name: variation.name,
        releaseYear: variation.releaseYear,
        color: variation.color,
        finish: variation.finish,
        packaging: variation.packaging,
        edition: variation.edition,
        seriesNumber: variation.seriesNumber,
        collectorNumber: variation.collectorNumber,
        lineType: variation.lineType,
        rarity: variation.rarity,
        description: variation.description,
        photoUrl: variation.photoUrl,
        casting: {
          id: casting.id,
          name: casting.name,
        },
        brand: {
          id: miniatureBrand.id,
          name: miniatureBrand.name,
        },
        series: {
          id: series.id,
          name: series.name,
        },
        scale: {
          id: scale.id,
          name: scale.name,
        },
      })
      .from(variation)
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(series, eq(variation.seriesId, series.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset);

    // Total count query
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(variation)
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(series, eq(variation.seriesId, series.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
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

  async getVariationById(id: string) {
    const rows = await db
      .select({
        id: variation.id,
        name: variation.name,
        releaseYear: variation.releaseYear,
        color: variation.color,
        finish: variation.finish,
        packaging: variation.packaging,
        edition: variation.edition,
        seriesNumber: variation.seriesNumber,
        collectorNumber: variation.collectorNumber,
        lineType: variation.lineType,
        rarity: variation.rarity,
        description: variation.description,
        photoUrl: variation.photoUrl,
        status: variation.status,
        createdAt: variation.createdAt,
        updatedAt: variation.updatedAt,
        casting: {
          id: casting.id,
          name: casting.name,
          description: casting.description,
          fantasyFlag: casting.fantasyFlag,
          automakerId: casting.automakerId,
        },
        brand: {
          id: miniatureBrand.id,
          name: miniatureBrand.name,
        },
        series: {
          id: series.id,
          name: series.name,
        },
        scale: {
          id: scale.id,
          name: scale.name,
        },
      })
      .from(variation)
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(series, eq(variation.seriesId, series.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(eq(variation.id, id))
      .limit(1);

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    const item = rows[0];

    // Fetch product identifiers
    const identifiers = await db
      .select({
        id: productIdentifier.id,
        code: productIdentifier.code,
        isPrimary: productIdentifier.isPrimary,
      })
      .from(productIdentifier)
      .where(eq(productIdentifier.variationId, id));

    // Fetch related vehicles / automaker
    const vehicles = await db
      .select({
        modelId: vehicleModel.id,
        modelName: vehicleModel.name,
        automakerId: automaker.id,
        automakerName: automaker.name,
        relationshipType: castingVehicle.relationshipType,
      })
      .from(castingVehicle)
      .innerJoin(vehicleModel, eq(castingVehicle.vehicleModelId, vehicleModel.id))
      .innerJoin(automaker, eq(vehicleModel.automakerId, automaker.id))
      .where(eq(castingVehicle.castingId, item.casting.id));

    let castingAutomaker = null;
    if (item.casting.automakerId) {
      const [am] = await db
        .select({ id: automaker.id, name: automaker.name })
        .from(automaker)
        .where(eq(automaker.id, item.casting.automakerId))
        .limit(1);
      castingAutomaker = am || null;
    }

    return {
      ...item,
      casting: {
        ...item.casting,
        automaker: castingAutomaker,
      },
      identifiers,
      vehicles,
    };
  }

  async getVehicleModels(automakerId?: string) {
    const conditions = [eq(vehicleModel.status, 'ACTIVE')];
    if (automakerId) {
      conditions.push(eq(vehicleModel.automakerId, automakerId));
    }
    return db
      .select({
        id: vehicleModel.id,
        name: vehicleModel.name,
        automakerId: vehicleModel.automakerId,
      })
      .from(vehicleModel)
      .where(and(...conditions))
      .orderBy(vehicleModel.name);
  }

  async getBrands() {
    return db
      .select({
        id: miniatureBrand.id,
        name: miniatureBrand.name,
      })
      .from(miniatureBrand)
      .where(eq(miniatureBrand.status, 'ACTIVE'))
      .orderBy(miniatureBrand.name);
  }

  async getAutomakers() {
    return db
      .select({
        id: automaker.id,
        name: automaker.name,
        country: automaker.country,
      })
      .from(automaker)
      .where(eq(automaker.status, 'ACTIVE'))
      .orderBy(automaker.name);
  }

  async getScales() {
    return db
      .select({
        id: scale.id,
        name: scale.name,
        numerator: scale.numerator,
        denominator: scale.denominator,
      })
      .from(scale)
      .where(eq(scale.status, 'ACTIVE'))
      .orderBy(scale.denominator);
  }

  async getSeries(brandId?: string) {
    const conditions = [eq(series.status, 'ACTIVE')];
    if (brandId) {
      conditions.push(eq(series.miniatureBrandId, brandId));
    }
    return db
      .select({
        id: series.id,
        name: series.name,
        brandId: series.miniatureBrandId,
      })
      .from(series)
      .where(and(...conditions))
      .orderBy(series.name);
  }

  async getYears() {
    const rows = await db
      .selectDistinct({ year: variation.releaseYear })
      .from(variation)
      .where(sql`${variation.releaseYear} IS NOT NULL`)
      .orderBy(sql`${variation.releaseYear} DESC`);
    return rows.map((r) => r.year).filter((y): y is number => y !== null);
  }

  async getRarities() {
    const rows = await db
      .selectDistinct({ rarity: variation.rarity })
      .from(variation)
      .where(sql`${variation.rarity} IS NOT NULL AND ${variation.rarity} != ''`)
      .orderBy(variation.rarity);
    return rows.map((r) => r.rarity).filter((r): r is string => r !== null);
  }
}
