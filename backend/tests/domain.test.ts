import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../src/modules/auth/auth.schemas';
import { addExemplarSchema, moveExemplarSchema } from '../src/modules/collection/collection.schemas';
import { createLocationSchema } from '../src/modules/locations/locations.schemas';
import { recordSaleSchema } from '../src/modules/acquisitions-sales/acquisitions-sales.schemas';
import {
  createCatalogVariationSchema,
  createAutomakerSchema,
  createVehicleModelSchema,
} from '../src/modules/catalog/admin-catalog.schemas';

describe('Domain Rules & Validation', () => {
  it('validates registration input correctly', () => {
    const valid = registerSchema.safeParse({
      name: 'Ayrton Senna',
      email: 'senna@minihubcar.com.br',
      password: 'password123',
    });
    expect(valid.success).toBe(true);

    const invalidEmail = registerSchema.safeParse({
      name: 'Ayrton Senna',
      email: 'invalid-email',
      password: 'password123',
    });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = registerSchema.safeParse({
      name: 'Ayrton Senna',
      email: 'senna@minihubcar.com.br',
      password: '123',
    });
    expect(shortPassword.success).toBe(false);
  });

  it('validates exemplar condition and acquisition constraints', () => {
    const valid = addExemplarSchema.safeParse({
      variationId: '11111111-1111-1111-1111-111111111111',
      conditionCode: 'MINT',
      notes: 'Miniatura perfeita',
    });
    expect(valid.success).toBe(true);

    const invalidUuid = addExemplarSchema.safeParse({
      variationId: 'not-a-uuid',
      conditionCode: 'MINT',
    });
    expect(invalidUuid.success).toBe(false);
  });

  it('validates sale records and prices', () => {
    const valid = recordSaleSchema.safeParse({
      exemplarId: '11111111-1111-1111-1111-111111111111',
      saleDate: '2026-09-11',
      buyerName: 'Colecionador Amigo',
      salePrice: 150.0,
    });
    expect(valid.success).toBe(true);

    const negativePrice = recordSaleSchema.safeParse({
      exemplarId: '11111111-1111-1111-1111-111111111111',
      saleDate: '2026-09-11',
      salePrice: -10,
    });
    expect(negativePrice.success).toBe(false);
  });

  it('calculates patrimonial result correctly', () => {
    const cost = 85.0;
    const salePrice = 140.0;
    const profit = salePrice - cost;
    const profitMargin = (profit / cost) * 100;

    expect(profit).toBe(55.0);
    expect(profitMargin).toBeCloseTo(64.7, 1);
  });

  it('validates location with customizable grid dimensions', () => {
    const valid = createLocationSchema.safeParse({
      name: 'Expositor Parede 01',
      locationType: 'DISPLAY',
      hasGrid: true,
      gridRows: 10,
      gridColumns: 20,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.gridRows).toBe(10);
      expect(valid.data.gridColumns).toBe(20);
    }

    const invalidNegative = createLocationSchema.safeParse({
      name: 'Expositor Inválido',
      hasGrid: true,
      gridRows: 0,
      gridColumns: -5,
    });
    expect(invalidNegative.success).toBe(false);
  });

  it('validates exemplar movement with grid slot coordinates', () => {
    const valid = moveExemplarSchema.safeParse({
      toLocationId: '11111111-1111-1111-1111-111111111111',
      toGridRow: 5,
      toGridColumn: 12,
      notes: 'Movido para o meio da vitrine',
    });
    expect(valid.success).toBe(true);

    const invalidSlot = moveExemplarSchema.safeParse({
      toLocationId: '11111111-1111-1111-1111-111111111111',
      toGridRow: -1,
      toGridColumn: 0,
    });
    expect(invalidSlot.success).toBe(false);
  });

  it('validates canonical catalog variation creation with collector attributes', () => {
    const valid = createCatalogVariationSchema.safeParse({
      miniatureBrandId: '11111111-1111-1111-1111-111111111111',
      castingName: "'71 Datsun 510",
      name: "'71 Datsun 510 STH",
      releaseYear: 2024,
      seriesNumber: '4/5',
      collectorNumber: '142/250',
      lineType: 'MAINLINE',
      rarity: 'STH',
      color: 'Spectraflame Blue',
      finish: 'Spectraflame',
    });
    expect(valid.success).toBe(true);

    const invalidMissingName = createCatalogVariationSchema.safeParse({
      miniatureBrandId: '11111111-1111-1111-1111-111111111111',
      castingName: "'71 Datsun 510",
      releaseYear: 2024,
      rarity: 'STH',
    });
    expect(invalidMissingName.success).toBe(false);
  });


  it('validates auxiliary catalog schemas (automaker and vehicle model)', () => {
    const validAutomaker = createAutomakerSchema.safeParse({
      name: 'Porsche',
      country: 'Alemanha',
    });
    expect(validAutomaker.success).toBe(true);

    const invalidAutomaker = createAutomakerSchema.safeParse({
      name: '',
    });
    expect(invalidAutomaker.success).toBe(false);

    const validModel = createVehicleModelSchema.safeParse({
      automakerId: '11111111-1111-1111-1111-111111111111',
      name: '911 GT3 RS',
      category: 'Esportivo',
    });
    expect(validModel.success).toBe(true);
  });
});

