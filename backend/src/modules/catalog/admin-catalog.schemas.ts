import { z } from 'zod';

export const createAutomakerSchema = z.object({
  name: z.string().min(1, 'Nome da montadora é obrigatório').max(150),
  country: z.string().max(100).optional().nullable(),
});
export type CreateAutomakerInput = z.infer<typeof createAutomakerSchema>;

export const createVehicleModelSchema = z.object({
  automakerId: z.string().uuid('ID da montadora inválido'),
  name: z.string().min(1, 'Nome do modelo é obrigatório').max(150),
  description: z.string().optional().nullable(),
});
export type CreateVehicleModelInput = z.infer<typeof createVehicleModelSchema>;

export const createMiniatureBrandSchema = z.object({
  name: z.string().min(1, 'Nome da marca é obrigatório').max(150),
  description: z.string().optional().nullable(),
});
export type CreateMiniatureBrandInput = z.infer<typeof createMiniatureBrandSchema>;

export const createSeriesSchema = z.object({
  miniatureBrandId: z.string().uuid('ID da marca de miniatura inválido'),
  name: z.string().min(1, 'Nome da série é obrigatório').max(150),
  description: z.string().optional().nullable(),
});
export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;

export const createScaleSchema = z.object({
  name: z.string().min(1, 'Nome da escala é obrigatório (ex: 1:87)').max(50),
  numerator: z.coerce.number().int().min(1).default(1),
  denominator: z.coerce.number().int().min(1, 'Denominador deve ser positivo (ex: 87)'),
});
export type CreateScaleInput = z.infer<typeof createScaleSchema>;

export const createCatalogVariationSchema = z.object({
  miniatureBrandId: z.string().uuid('Marca da miniatura é obrigatória'),
  castingName: z.string().min(1, 'Nome do molde (casting) é obrigatório').max(200),
  fantasyFlag: z.boolean().optional().default(false),
  automakerId: z.string().uuid().optional().nullable(),
  vehicleModelId: z.string().uuid().optional().nullable(),
  seriesId: z.string().uuid().optional().nullable(),
  scaleId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Nome da variação é obrigatório').max(200),
  releaseYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  finish: z.string().max(100).optional().nullable(),
  packaging: z.string().max(100).optional().nullable(),
  edition: z.string().max(100).optional().nullable(),
  seriesNumber: z.string().max(50).optional().nullable(), // Ex: '4/5'
  collectorNumber: z.string().max(50).optional().nullable(), // Ex: '142/250' ou 'MGT00038'
  lineType: z.string().max(50).optional().nullable(), // MAINLINE, PREMIUM, EXCLUSIVE
  rarity: z.string().max(50).optional().nullable(), // REGULAR, TH, STH, CHASE, RLC, ZAMAC
  description: z.string().optional().nullable(),
  photoUrl: z.string().max(1000).optional().nullable(),
  productCode: z.string().max(150).optional().nullable(),
});
export type CreateCatalogVariationInput = z.infer<typeof createCatalogVariationSchema>;

export const updateCatalogVariationSchema = createCatalogVariationSchema.partial();
export type UpdateCatalogVariationInput = z.infer<typeof updateCatalogVariationSchema>;

export const updateAutomakerSchema = createAutomakerSchema.partial();
export type UpdateAutomakerInput = z.infer<typeof updateAutomakerSchema>;

export const updateVehicleModelSchema = createVehicleModelSchema.partial();
export type UpdateVehicleModelInput = z.infer<typeof updateVehicleModelSchema>;

export const updateMiniatureBrandSchema = createMiniatureBrandSchema.partial();
export type UpdateMiniatureBrandInput = z.infer<typeof updateMiniatureBrandSchema>;

export const updateSeriesSchema = createSeriesSchema.partial();
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;

export const updateScaleSchema = createScaleSchema.partial();
export type UpdateScaleInput = z.infer<typeof updateScaleSchema>;

