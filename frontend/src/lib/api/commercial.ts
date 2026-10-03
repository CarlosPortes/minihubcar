import { apiClient } from './client';

export interface MarketplaceVariationItem {
  variationId: string;
  variationName: string;
  photoUrl: string | null;
  releaseYear: number | null;
  brandName: string | null;
  castingName: string | null;
  offersCount: number;
  minPrice: string;
  maxPrice: string;
  sellersCount: number;
}

export interface OfferDetail {
  id: string;
  title: string;
  price: string;
  condition: string;
  packagingState: string | null;
  description: string | null;
  status?: string;
  photos: string[];
  createdAt: string;
  availableStock?: number;
  inventory?: {
    available: number;
    onHand: number;
  };
  seller: {
    id: string;
    storeName: string;
    slug: string;
    city: string | null;
    state: string | null;
    reputationScore: string;
  };
  isPreOrder?: boolean;
  preOrderEstimatedArrival?: string | null;
  allowDepositAndBalance?: boolean;
  depositAmount?: string | null;
  allowFullOnArrival?: boolean;
  allowInstallments?: boolean;
  maxInstallments?: number;
  packageWeightGrams?: number | null;
  shippingAddressId?: string | null;
  variation?: {
    id: string;
    name: string;
    photoUrl: string | null;
    brandName: string | null;
    castingName: string | null;
    releaseYear: number | null;
  };
}

export interface CartItemResponse {
  id: string;
  cartId: string;
  offerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAvailable: boolean;
  offer: {
    id: string;
    title: string;
    price: string;
    condition: string;
    packagingState: string | null;
    status: string;
    photos: string[];
  };
  inventory: {
    available: number;
  };
  variation: {
    id: string;
    name: string;
    photoUrl: string | null;
    brandName: string;
    castingName: string;
  };
  seller: {
    id: string;
    storeName: string;
    slug: string;
    city: string | null;
    state: string | null;
    isApproved: boolean;
  };
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItemResponse[];
  subtotal: string;
  totalItems: number;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  offerId: string;
  sellerId: string;
  variationId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  variationSnapshot: {
    variationId: string;
    name: string;
    brandName?: string;
    castingName?: string;
    photoUrl?: string | null;
  };
  sellerSnapshot: {
    sellerId: string;
    storeName: string;
    slug: string;
    city?: string | null;
    state?: string | null;
  };
  fulfillmentStatus?: 'NA_GARAGEM' | 'AGUARDANDO_ENVIO' | 'ENTREGUE' | 'CANCELADO' | string;
  buyer?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    deliveryMode?: string;
    fulfillmentStatus?: string;
    createdAt: string;
    shippingAddressSnapshot?: any;
  };
}

export interface OrderResponse {
  id: string;
  userId: string;
  orderNumber: string;
  status: string;
  totalItems: number;
  subtotal: string;
  freightAmount: string;
  discountAmount: string;
  totalAmount: string;
  deliveryMode?: string;
  fulfillmentStatus?: string;
  shippingAddressSnapshot: any;
  createdAt: string;
  items?: OrderItem[];
}

export interface SellerProfileResponse {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  bio: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string | null;
  state: string | null;
  phone?: string | null;
  reputationScore: string;
  totalSalesCount: number;
  isActive: boolean;
  createdAt: string;
  authorizationStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  authorizationNotes?: string | null;
  reviewedAt?: string | null;
}

export interface SellerShippingAddressItem {
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
  updatedAt?: string;
}

export interface SellerApplicationAdminItem {
  id: string;
  sellerId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  seller: {
    id: string;
    storeName: string;
    slug: string;
    city: string | null;
    state: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export const commercialApi = {
  // Marketplace
  async searchMarketplace(params?: {
    q?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    pageSize?: number;
  }) {
    return apiClient<{
      items: MarketplaceVariationItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>('/marketplace/search', { params });
  },

  async getVariationOffers(variationId: string) {
    const res = await apiClient<{
      data: {
        variation: {
          id: string;
          name: string;
          photoUrl: string | null;
          brandName: string | null;
          castingName: string | null;
          releaseYear: number | null;
        };
        offers: OfferDetail[];
      };
    }>(`/marketplace/variations/${variationId}/offers`);
    return res.data;
  },

  // Cart
  async getCart() {
    return apiClient<{ data: CartResponse }>('/cart');
  },

  async addToCart(offerId: string, quantity: number = 1) {
    return apiClient<{ data: any }>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ offerId, quantity }),
    });
  },

  async updateCartQuantity(cartItemId: string, quantity: number) {
    return apiClient<{ data: any }>(`/cart/items/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  async removeFromCart(cartItemId: string) {
    return apiClient<{ message: string }>(`/cart/items/${cartItemId}`, {
      method: 'DELETE',
    });
  },

  async clearCart() {
    return apiClient<{ message: string }>('/cart', {
      method: 'DELETE',
    });
  },

  // Orders & Checkout
  async checkout(payload: {
    items?: Array<{ offerId: string; quantity: number }>;
    deliveryMode?: 'DELIVERY' | 'GARAGE';
    shippingAddressSnapshot?: {
      recipientName: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood?: string;
      city: string;
      state: string;
      zipCode: string;
    };
  }) {
    const body: any = {
      deliveryMode: payload.deliveryMode || 'DELIVERY',
    };
    if (payload.shippingAddressSnapshot) {
      body.shippingAddress = payload.shippingAddressSnapshot;
    }
    return apiClient<{ data: OrderResponse }>('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getMyOrders() {
    return apiClient<{ data: OrderResponse[] }>('/orders/mine');
  },

  async getOrderById(orderId: string) {
    return apiClient<{ data: OrderResponse }>(`/orders/${orderId}`);
  },

  // Sellers
  async getMySellerProfile() {
    return apiClient<{ data: SellerProfileResponse | null }>('/sellers/me');
  },

  async applyToSeller(payload: {
    storeName: string;
    slug?: string;
    bio?: string;
    postalCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    phone?: string;
  }) {
    return apiClient<{ data: SellerProfileResponse }>('/sellers/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateMySellerProfile(payload: {
    storeName?: string;
    bio?: string | null;
    postalCode?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
  }) {
    return apiClient<{ data: SellerProfileResponse }>('/sellers/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getMyShippingAddresses() {
    return apiClient<{ data: SellerShippingAddressItem[] }>('/sellers/me/addresses');
  },

  async createShippingAddress(payload: {
    label: string;
    contactName?: string | null;
    postalCode: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    phone?: string | null;
    isDefault?: boolean;
  }) {
    return apiClient<{ data: SellerShippingAddressItem }>('/sellers/me/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateShippingAddress(
    addressId: string,
    payload: {
      label?: string;
      contactName?: string | null;
      postalCode?: string;
      street?: string;
      number?: string;
      complement?: string | null;
      neighborhood?: string;
      city?: string;
      state?: string;
      phone?: string | null;
      isDefault?: boolean;
    }
  ) {
    return apiClient<{ data: SellerShippingAddressItem }>(`/sellers/me/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteShippingAddress(addressId: string) {
    return apiClient<{ success: boolean; message: string }>(`/sellers/me/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },

  async listMySellerOffers() {
    return apiClient<{ data: OfferDetail[] }>('/sellers/me/offers');
  },

  async createSellerOffer(payload: {
    variationId: string;
    title: string;
    price: string;
    condition?: string;
    packagingState?: string;
    description?: string;
    initialStock?: number;
    photos?: string[];
    packageWeightGrams?: number;
    shippingAddressId?: string;
    isPreOrder?: boolean;
    preOrderEstimatedArrival?: string | null;
    allowDepositAndBalance?: boolean;
    depositAmount?: string | null;
    allowFullOnArrival?: boolean;
    allowInstallments?: boolean;
    maxInstallments?: number;
  }) {
    return apiClient<{ data: OfferDetail }>('/sellers/me/offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSellerOffer(
    offerId: string,
    payload: {
      title?: string;
      price?: string;
      condition?: string;
      packagingState?: string;
      description?: string;
      status?: 'ACTIVE' | 'PAUSED' | 'SOLD_OUT' | 'CANCELLED';
      packageWeightGrams?: number;
      shippingAddressId?: string;
      isPreOrder?: boolean;
      preOrderEstimatedArrival?: string | null;
      allowDepositAndBalance?: boolean;
      depositAmount?: string | null;
      allowFullOnArrival?: boolean;
      allowInstallments?: boolean;
      maxInstallments?: number;
    }
  ) {
    return apiClient<{ data: OfferDetail }>(`/sellers/me/offers/${offerId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async adjustOfferStock(
    offerId: string,
    payload: {
      type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
      quantity: number;
      reason?: string;
    }
  ) {
    return apiClient<{ data: any }>(`/sellers/me/offers/${offerId}/inventory/adjust`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listMySellerSales() {
    return apiClient<{ data: OrderItem[] }>('/sellers/me/sales');
  },

  async updateSaleFulfillment(orderItemId: string, fulfillmentStatus: 'NA_GARAGEM' | 'AGUARDANDO_ENVIO' | 'ENTREGUE') {
    return apiClient<{ data: any }>(`/sellers/me/sales/${orderItemId}/fulfillment`, {
      method: 'PATCH',
      body: JSON.stringify({ fulfillmentStatus }),
    });
  },

  // Admin Sellers
  async adminListSellerApplications(status?: string) {
    return apiClient<{ data: SellerApplicationAdminItem[] }>('/admin/sellers', {
      params: status ? { status } : undefined,
    });
  },

  async adminReviewSellerApplication(
    sellerId: string,
    payload: {
      status: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
      notes?: string;
    }
  ) {
    return apiClient<{ data: any }>(`/admin/sellers/${sellerId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async sellerQuickCreateMiniature(payload: {
    brandId?: string;
    brandName?: string;
    automakerId?: string | null;
    automakerName?: string | null;
    vehicleModelId?: string | null;
    vehicleModelName?: string | null;
    scaleId?: string | null;
    scaleDenominator?: number;
    name: string;
    castingName?: string;
    releaseYear?: number | null;
    color?: string | null;
    photoUrl?: string | null;
    description?: string | null;
  }) {
    return apiClient<{
      data: {
        id: string;
        name: string;
        photoUrl: string | null;
        releaseYear: number | null;
        color: string | null;
        brandName: string;
        automakerName: string;
        modelName: string;
        commercialProductId: string;
        castingId: string;
      };
    }>('/sellers/catalog/quick-create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

