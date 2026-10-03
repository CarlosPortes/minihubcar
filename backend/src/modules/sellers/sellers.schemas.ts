import { z } from 'zod';

export const applySellerSchema = z.object({
  storeName: z.string().min(3, 'Nome da loja deve ter pelo menos 3 caracteres').max(150),
  slug: z.string().min(3).max(150).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens').optional(),
  bio: z.string().max(1000).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  number: z.string().max(50).optional().nullable(),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});

export type ApplySellerInput = z.infer<typeof applySellerSchema>;

export const updateSellerProfileSchema = z.object({
  storeName: z.string().min(3).max(150).optional(),
  bio: z.string().max(1000).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  number: z.string().max(50).optional().nullable(),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});

export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;

export const reviewSellerSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  notes: z.string().max(500).optional().nullable(),
});

export type ReviewSellerInput = z.infer<typeof reviewSellerSchema>;

export const sellerParamSchema = z.object({
  id: z.string().uuid(),
});

export const sellerSlugParamSchema = z.object({
  slug: z.string().min(1),
});

export const createSellerShippingAddressSchema = z.object({
  label: z.string().min(2, 'Identificador obrigatório (ex: Loja Física, Galpão)').max(100),
  contactName: z.string().max(150).optional().nullable(),
  postalCode: z.string().min(8, 'CEP inválido').max(20),
  street: z.string().min(2, 'Logradouro obrigatório').max(255),
  number: z.string().min(1, 'Número obrigatório').max(50),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().min(1, 'Bairro obrigatório').max(100),
  city: z.string().min(2, 'Cidade obrigatória').max(100),
  state: z.string().min(2, 'Estado/UF obrigatório').max(50),
  phone: z.string().max(30).optional().nullable(),
  isDefault: z.boolean().default(false).optional(),
});

export type CreateSellerShippingAddressInput = z.infer<typeof createSellerShippingAddressSchema>;

export const updateSellerShippingAddressSchema = createSellerShippingAddressSchema.partial();
export type UpdateSellerShippingAddressInput = z.infer<typeof updateSellerShippingAddressSchema>;

export const shippingAddressParamSchema = z.object({
  addressId: z.string().uuid(),
});

export const shippingProviderEnum = z.enum(['SUPERFRETE', 'FRETE_RAPIDO', 'MELHOR_ENVIO']);
export type ShippingProvider = z.infer<typeof shippingProviderEnum>;

export const saveShippingIntegrationSchema = z.object({
  apiKey: z.string().min(5, 'Token/Chave de API deve ter pelo menos 5 caracteres').max(500),
  extraConfig: z.record(z.any()).default({}).optional(),
  isActive: z.boolean().default(true).optional(),
});
export type SaveShippingIntegrationInput = z.infer<typeof saveShippingIntegrationSchema>;

export const providerParamSchema = z.object({
  provider: shippingProviderEnum,
});
export type ProviderParam = z.infer<typeof providerParamSchema>;

// Seller Quick Create Catalog Item (Pre-orders / Offers)
export const quickCreateVariationSchema = z.object({
  brandId: z.string().uuid().optional(),
  brandName: z.string().max(150).optional(),
  automakerId: z.string().uuid().optional().nullable(),
  automakerName: z.string().max(150).optional().nullable(),
  vehicleModelId: z.string().uuid().optional().nullable(),
  vehicleModelName: z.string().max(150).optional().nullable(),
  scaleId: z.string().uuid().optional().nullable(),
  scaleDenominator: z.number().int().min(1).max(500).optional().default(64),
  name: z.string().min(2, 'Nome da miniatura é obrigatório').max(200),
  castingName: z.string().max(200).optional(),
  releaseYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  photoUrl: z.string().max(1000).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export type QuickCreateVariationInput = z.infer<typeof quickCreateVariationSchema>;

