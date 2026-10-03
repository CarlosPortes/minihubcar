import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  sale,
  saleItem,
  acquisition,
  acquisitionItem,
  writeOff,
  collectionExemplar,
  variation,
  casting,
  miniatureBrand,
  exemplarLocation,
} from '../../database/schema';
import { RecordAcquisitionInput, RecordSaleInput, RecordWriteOffInput } from './acquisitions-sales.schemas';

export class AcquisitionsSalesRepository {
  async listSales(userId: string) {
    return db
      .select({
        id: sale.id,
        saleDate: sale.saleDate,
        buyerName: sale.buyerName,
        notes: sale.notes,
        createdAt: sale.createdAt,
        exemplarId: saleItem.exemplarId,
        unitPrice: saleItem.unitPrice,
        totalPrice: saleItem.totalPrice,
        purchasePrice: collectionExemplar.purchasePrice,
        purchaseLocation: collectionExemplar.purchaseLocation,
        variationName: variation.name,
        brandName: miniatureBrand.name,
        photoUrl: variation.photoUrl,
      })
      .from(sale)
      .innerJoin(saleItem, eq(saleItem.saleId, sale.id))
      .innerJoin(collectionExemplar, eq(saleItem.exemplarId, collectionExemplar.id))
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(sale.userId, userId))
      .orderBy(desc(sale.saleDate), desc(sale.createdAt));
  }

  async listAcquisitions(userId: string) {
    return db
      .select({
        id: acquisition.id,
        acquisitionType: acquisition.acquisitionType,
        acquisitionDate: acquisition.acquisitionDate,
        sourceName: acquisition.sourceName,
        notes: acquisition.notes,
        createdAt: acquisition.createdAt,
        exemplarId: acquisitionItem.exemplarId,
        exemplarStatus: collectionExemplar.status,
        writeOffId: writeOff.id,
        writeOffReason: writeOff.reason,
        writeOffDate: writeOff.writeOffDate,
        unitCost: acquisitionItem.unitCost,
        totalCost: acquisitionItem.totalCost,
        variationName: variation.name,
        brandName: miniatureBrand.name,
        photoUrl: variation.photoUrl,
      })
      .from(acquisition)
      .innerJoin(acquisitionItem, eq(acquisitionItem.acquisitionId, acquisition.id))
      .innerJoin(collectionExemplar, eq(acquisitionItem.exemplarId, collectionExemplar.id))
      .leftJoin(writeOff, eq(writeOff.exemplarId, collectionExemplar.id))
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(acquisition.userId, userId))
      .orderBy(desc(acquisition.acquisitionDate), desc(acquisition.createdAt));
  }

  async recordSale(userId: string, input: RecordSaleInput) {
    return db.transaction(async (tx) => {
      // 1. Update exemplar status to SOLD
      await tx
        .update(collectionExemplar)
        .set({ status: 'SOLD', updatedAt: new Date() })
        .where(
          and(
            eq(collectionExemplar.id, input.exemplarId),
            eq(collectionExemplar.userId, userId)
          )
        );

      // 2. End current active location of this exemplar
      await tx
        .update(exemplarLocation)
        .set({ isCurrent: false, endedAt: new Date() })
        .where(
          and(
            eq(exemplarLocation.exemplarId, input.exemplarId),
            eq(exemplarLocation.isCurrent, true)
          )
        );

      // 3. Create sale record
      const [newSale] = await tx
        .insert(sale)
        .values({
          userId,
          saleDate: input.saleDate,
          buyerName: input.buyerName || null,
          notes: input.notes || null,
        })
        .returning();

      if (!newSale) {
        throw new Error('Falha ao registrar venda');
      }

      // 4. Create sale item
      const priceStr = input.salePrice.toFixed(2);
      const [item] = await tx
        .insert(saleItem)
        .values({
          saleId: newSale.id,
          exemplarId: input.exemplarId,
          quantity: 1,
          unitPrice: priceStr,
          totalPrice: priceStr,
        })
        .returning();

      return {
        sale: newSale,
        item,
      };
    });
  }

  async recordAcquisition(userId: string, input: RecordAcquisitionInput) {
    return db.transaction(async (tx) => {
      const costStr = input.unitCost.toFixed(2);

      const [newAcq] = await tx
        .insert(acquisition)
        .values({
          userId,
          acquisitionType: input.acquisitionType,
          acquisitionDate: input.acquisitionDate,
          sourceName: input.sourceName || null,
          notes: input.notes || null,
        })
        .returning();

      if (!newAcq) {
        throw new Error('Falha ao registrar aquisição');
      }

      const [item] = await tx
        .insert(acquisitionItem)
        .values({
          acquisitionId: newAcq.id,
          exemplarId: input.exemplarId,
          quantity: 1,
          unitCost: costStr,
          totalCost: costStr,
        })
        .returning();

      return {
        acquisition: newAcq,
        item,
      };
    });
  }

  async listWriteOffs(userId: string) {
    return db
      .select({
        id: writeOff.id,
        writeOffDate: writeOff.writeOffDate,
        reason: writeOff.reason,
        notes: writeOff.notes,
        createdAt: writeOff.createdAt,
        exemplarId: writeOff.exemplarId,
        purchasePrice: collectionExemplar.purchasePrice,
        purchaseLocation: collectionExemplar.purchaseLocation,
        variationName: variation.name,
        brandName: miniatureBrand.name,
        photoUrl: variation.photoUrl,
      })
      .from(writeOff)
      .innerJoin(collectionExemplar, eq(writeOff.exemplarId, collectionExemplar.id))
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(writeOff.userId, userId))
      .orderBy(desc(writeOff.writeOffDate), desc(writeOff.createdAt));
  }

  async recordWriteOff(userId: string, input: RecordWriteOffInput) {
    return db.transaction(async (tx) => {
      // 1. Check exemplar ownership
      const [existing] = await tx
        .select()
        .from(collectionExemplar)
        .where(
          and(
            eq(collectionExemplar.id, input.exemplarId),
            eq(collectionExemplar.userId, userId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Exemplar não encontrado ou não pertence ao usuário');
      }

      // 2. Update exemplar status to DISCARDED
      await tx
        .update(collectionExemplar)
        .set({ status: 'DISCARDED', updatedAt: new Date() })
        .where(
          and(
            eq(collectionExemplar.id, input.exemplarId),
            eq(collectionExemplar.userId, userId)
          )
        );

      // 3. End current active location of this exemplar
      await tx
        .update(exemplarLocation)
        .set({ isCurrent: false, endedAt: new Date() })
        .where(
          and(
            eq(exemplarLocation.exemplarId, input.exemplarId),
            eq(exemplarLocation.isCurrent, true)
          )
        );

      // 4. Create write off record
      const [newWriteOff] = await tx
        .insert(writeOff)
        .values({
          userId,
          exemplarId: input.exemplarId,
          reason: input.reason,
          writeOffDate: input.writeOffDate,
          notes: input.notes || null,
        })
        .returning();

      if (!newWriteOff) {
        throw new Error('Falha ao registrar baixa de exemplar');
      }

      return newWriteOff;
    });
  }
}
