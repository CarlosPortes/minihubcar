import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  customList,
  customListItem,
  variation,
  collectionExemplar,
  miniatureBrand,
  casting,
} from '../../database/schema';
import { AddListItemInput, CreateListInput } from './lists.schemas';

export class ListsRepository {
  async listByUser(userId: string) {
    return db
      .select()
      .from(customList)
      .where(eq(customList.userId, userId))
      .orderBy(desc(customList.createdAt));
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await db
      .select()
      .from(customList)
      .where(and(eq(customList.id, id), eq(customList.userId, userId)))
      .limit(1);

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    const list = rows[0];

    // Fetch items
    const items = await db
      .select({
        id: customListItem.id,
        sortOrder: customListItem.sortOrder,
        variationId: customListItem.variationId,
        exemplarId: customListItem.exemplarId,
        variationName: variation.name,
        photoUrl: variation.photoUrl,
      })
      .from(customListItem)
      .leftJoin(variation, eq(customListItem.variationId, variation.id))
      .where(eq(customListItem.listId, id))
      .orderBy(customListItem.sortOrder);

    return {
      ...list,
      items,
    };
  }

  async create(userId: string, input: CreateListInput) {
    const [created] = await db
      .insert(customList)
      .values({
        userId,
        name: input.name.trim(),
        description: input.description || null,
      })
      .returning();

    return created;
  }

  async addItem(listId: string, input: AddListItemInput) {
    const [item] = await db
      .insert(customListItem)
      .values({
        listId,
        variationId: input.variationId || null,
        exemplarId: input.exemplarId || null,
        sortOrder: input.sortOrder,
      })
      .returning();

    return item;
  }

  async removeItem(listId: string, itemId: string) {
    const [deleted] = await db
      .delete(customListItem)
      .where(and(eq(customListItem.id, itemId), eq(customListItem.listId, listId)))
      .returning();

    return deleted;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await db
      .delete(customList)
      .where(and(eq(customList.id, id), eq(customList.userId, userId)))
      .returning();

    return deleted;
  }
}
