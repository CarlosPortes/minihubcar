export const ROLES = {
  COLLECTOR: 'COLLECTOR',
  CATALOG_ADMIN: 'CATALOG_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;

export type RoleCode = keyof typeof ROLES;

export const ITEM_CONDITIONS = {
  MINT: 'MINT',
  NEAR_MINT: 'NEAR_MINT',
  GOOD: 'GOOD',
  LOOSE: 'LOOSE',
  DAMAGED: 'DAMAGED',
  CARDED: 'CARDED',
} as const;

export const ACQUISITION_TYPES = {
  PURCHASE: 'PURCHASE',
  GIFT: 'GIFT',
  TRADE: 'TRADE',
  PRIZE: 'PRIZE',
  OTHER: 'OTHER',
} as const;

export const CATALOG_REQUEST_STATUS = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const WISHLIST_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
