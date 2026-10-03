import { apiClient } from './client';

export interface GarageItemView {
  id: string;
  sourceType: 'ORDER' | 'PRE_ORDER';
  orderId?: string;
  orderNumber?: string;
  preOrderId?: string;
  preOrderNumber?: string;
  title: string;
  variationName: string;
  brandName: string;
  castingName: string;
  scaleName: string;
  photoUrl: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  packageWeightGrams: number | null;
  fulfillmentStatus: 'NA_GARAGEM' | 'AGUARDANDO_ENVIO' | 'ENTREGUE' | 'CANCELLED' | string;
  hasArrived: boolean;
  canCancel: boolean;
  canDispatch: boolean;
  createdAt: string;
}

export interface SellerGarageGroup {
  sellerId: string;
  storeName: string;
  slug: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  dispatchAddressLabel: string | null;
  items: GarageItemView[];
  totalItems: number;
  totalValue: number;
  readyForDispatchCount: number;
}

export interface MyGarageResponse {
  summary: {
    totalItems: number;
    totalValue: number;
    totalSellers: number;
    readyForDispatchCount: number;
  };
  sellers: SellerGarageGroup[];
}

export interface PackagingDetails {
  miniaturesCount: number;
  weightGrams: number;
  weightKg: number;
  dimensions: {
    height: number;
    width: number;
    length: number;
  };
  declaredValue: number;
  isCustomWeight: boolean;
  includeInsurance?: boolean;
  insuranceAmount?: number;
}

export interface ShippingOption {
  id: string;
  carrier: string;
  serviceName: string;
  price: number;
  basePrice?: number;
  insuranceCost?: number;
  currency: string;
  deliveryDays: number;
  deliveryEstimate: string;
  badge?: string;
  companyLogo?: string;
}

export interface ShippingQuoteResult {
  originPostalCode: string;
  originCity: string;
  originState: string;
  originLabel: string;
  destinationPostalCode: string;
  package: PackagingDetails;
  declaredValue?: number;
  includeInsurance?: boolean;
  insuranceEstimate?: number;
  options: ShippingOption[];
}

export interface ShippingQuoteInput {
  sellerId: string;
  itemIds: string[];
  destinationZip: string;
  customWeightGrams?: number | null;
  includeInsurance?: boolean;
}

export interface DispatchGarageInput {
  sellerId: string;
  itemIds: string[];
  customWeightGrams?: number | null;
  includeInsurance?: boolean;
  insuranceAmount?: number;
  shippingMethod: {
    carrier: string;
    serviceName: string;
    price: number;
    basePrice?: number;
    insuranceCost?: number;
    deliveryDays: number;
  };
  shippingAddress: {
    recipientName: string;
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    phone?: string;
  };
}

export interface SellerShippingAddress {
  id: string;
  sellerId: string;
  label: string;
  contactName: string | null;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const garageApi = {
  async getMyGarage(): Promise<MyGarageResponse> {
    const res = await apiClient<{ data: MyGarageResponse }>('/garage/mine');
    return res.data;
  },

  async cancelGarageItem(orderItemId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient<{ data: { success: boolean; message: string } }>(
      `/garage/items/${orderItemId}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return res.data;
  },

  async getShippingQuote(input: ShippingQuoteInput): Promise<ShippingQuoteResult> {
    const res = await apiClient<{ data: ShippingQuoteResult }>('/garage/shipping/quote', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async dispatchGarage(input: DispatchGarageInput): Promise<{ success: boolean; message: string }> {
    const res = await apiClient<{ data: { success: boolean; message: string } }>('/garage/dispatch', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async listSellerAddresses(): Promise<SellerShippingAddress[]> {
    const res = await apiClient<{ data: SellerShippingAddress[] }>('/sellers/me/addresses');
    return res.data;
  },

  async createSellerAddress(input: Partial<SellerShippingAddress>): Promise<SellerShippingAddress> {
    const res = await apiClient<{ data: SellerShippingAddress }>('/sellers/me/addresses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateSellerAddress(addressId: string, input: Partial<SellerShippingAddress>): Promise<SellerShippingAddress> {
    const res = await apiClient<{ data: SellerShippingAddress }>(`/sellers/me/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async deleteSellerAddress(addressId: string): Promise<void> {
    await apiClient(`/sellers/me/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },

  async listShippingIntegrations(): Promise<SellerShippingIntegration[]> {
    const res = await apiClient<{ data: SellerShippingIntegration[] }>('/sellers/me/shipping-integrations');
    return res.data;
  },

  async saveShippingIntegration(provider: string, input: SaveShippingIntegrationInput): Promise<SellerShippingIntegration> {
    const res = await apiClient<{ data: SellerShippingIntegration }>(`/sellers/me/shipping-integrations/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async deleteShippingIntegration(provider: string): Promise<void> {
    await apiClient(`/sellers/me/shipping-integrations/${provider}`, {
      method: 'DELETE',
    });
  },
};

export interface SellerShippingIntegration {
  id: string;
  sellerId: string;
  provider: 'SUPERFRETE' | 'FRETE_RAPIDO' | 'MELHOR_ENVIO';
  hasToken: boolean;
  maskedApiKey: string;
  extraConfig: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveShippingIntegrationInput {
  apiKey: string;
  extraConfig?: Record<string, any>;
  isActive?: boolean;
}

