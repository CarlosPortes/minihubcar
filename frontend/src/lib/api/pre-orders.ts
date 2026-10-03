import { apiClient } from './client';

export type PaymentPlan = 'DEPOSIT_AND_BALANCE' | 'FULL_ON_ARRIVAL' | 'INSTALLMENTS';

export type PreOrderStatus =
  | 'PENDING_APPROVAL'
  | 'RESERVED'
  | 'AWAITING_ARRIVAL'
  | 'ARRIVED'
  | 'READY_FOR_DISPATCH'
  | 'COMPLETED'
  | 'CANCELLED';

export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'TRANSFERENCIA' | 'CARTAO' | 'OUTRO';

export type FulfillmentStatus = 'NA_GARAGEM' | 'ENTREGUE';

export type CollectorHealthStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface CollectorHealthItem {
  collectorId: string;
  name: string;
  email: string;
  whatsapp: string | null;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  status: CollectorHealthStatus;
  maxOverdueDays: number;
  sellerPreOrdersCount: number;
  totalPreOrdersCount: number;
  openInstallmentsCount: number;
  openInstallmentsAmount: number;
  overdueInstallmentsCount: number;
  overdueInstallmentsAmount: number;
  pendingApprovalCount: number;
}

export interface CollectorsHealthResponse {
  summary?: {
    totalCollectors: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    pendingApprovalsCount?: number;
    totalPendingApprovals?: number;
  };
  metrics?: {
    totalCollectors: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    pendingApprovalsCount?: number;
    totalPendingApprovals?: number;
  };
  collectors: CollectorHealthItem[];
}

export interface CollectorFinancialSummaryPreOrder {
  id: string;
  preOrderNumber: string;
  status: string;
  sellerId: string;
  sellerStoreName: string;
  isCurrentSeller: boolean;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  requiresApproval: boolean;
  approvalReason: string | null;
  createdAt: string;
  miniatureName: string;
}

export interface CollectorFinancialSummaryInstallment {
  id: string;
  preOrderId: string;
  installmentNumber: number;
  totalInstallments: number;
  description: string;
  amount: string;
  dueDate: string | null;
  status: string;
  paidAt: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  isCurrentSeller: boolean;
}

export interface CollectorFinancialSummaryResponse {
  collector: {
    id: string;
    name: string;
    email: string;
    whatsapp: string | null;
    city: string | null;
    state: string | null;
    avatarUrl: string | null;
  };
  healthStatus: CollectorHealthStatus;
  maxOverdueDays: number;
  preOrders: CollectorFinancialSummaryPreOrder[];
  installments: CollectorFinancialSummaryInstallment[];
}

export interface PreOrderInstallmentItem {
  id: string;
  preOrderId: string;
  installmentNumber: number;
  totalInstallments: number;
  description: string;
  amount: string;
  dueDate: string | null;
  status: InstallmentStatus;
  paidAmount: string | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | string | null;
  settledBy?: string | null;
  notes: string | null;
  isOverdue?: boolean;
}

export interface SellerPreOrderItem {
  id: string;
  offerId?: string;
  preOrderNumber: string;
  status: PreOrderStatus;
  paymentPlan: PaymentPlan;
  quantity: number;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  estimatedArrival: string | null;
  hasArrived: boolean;
  arrivedAt: string | null;
  fulfillmentStatus: FulfillmentStatus | string;
  notes: string | null;
  requiresApproval?: boolean;
  approvalReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: {
    id: string;
    name: string;
    email: string;
    whatsapp: string | null;
  };
  variation: {
    id: string;
    name: string;
    photoUrl: string | null;
    brandName: string | null;
    castingName: string | null;
  };
  installments: PreOrderInstallmentItem[];
}

export interface BuyerPreOrderItem {
  id: string;
  offerId?: string;
  preOrderNumber: string;
  status: PreOrderStatus;
  paymentPlan: PaymentPlan;
  quantity: number;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  estimatedArrival: string | null;
  hasArrived: boolean;
  arrivedAt: string | null;
  fulfillmentStatus: FulfillmentStatus | string;
  notes: string | null;
  requiresApproval?: boolean;
  approvalReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  seller: {
    id: string;
    storeName: string;
    slug: string;
    city: string | null;
    state: string | null;
  };
  variation: {
    id: string;
    name: string;
    photoUrl: string | null;
    brandName: string | null;
    castingName: string | null;
  };
  installments: PreOrderInstallmentItem[];
}

export interface SellerPreOrderCampaignItem {
  id: string;
  offerId?: string;
  title: string;
  price: string;
  status: string;
  isPreOrder: boolean;
  preOrderEstimatedArrival: string | null;
  hasArrived: boolean;
  arrivedAt: string | null;
  totalQuota: number;
  reservedCount: number;
  availableStock: number;
  isOpenAndAvailable: boolean;
  isClosedQuotaFilled: boolean;
  isClosedByQuota?: boolean;
  isArrived: boolean;
  variation: {
    id: string;
    name: string;
    photoUrl: string | null;
    brandName: string | null;
    castingName: string | null;
    scale?: string | null;
  };
  createdAt: string;
  reservations: SellerPreOrderItem[];
}

export interface SellerPreOrdersDashboardMetrics {
  openAndAvailableCount: number;
  closedQuotaFilledCount: number;
  closedByQuotaCount?: number;
  arrivedCount: number;
  totalCampaigns: number;
  totalReservations: number;
  totalContracted: number;
  inGarageCount: number;
  deliveredCount: number;
}

export interface SellerPreOrdersDashboardResponse {
  metrics: SellerPreOrdersDashboardMetrics;
  financialMetrics?: PreOrdersReportMetrics;
  campaigns: SellerPreOrderCampaignItem[];
}

export interface PreOrdersReportMetrics {
  totalContracted: number;
  totalPaid: number;
  totalRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  totalPreOrders: number;
}

export interface PreOrdersReportRow {
  preOrderNumber: string;
  createdAt: string;
  status: string;
  paymentPlan: string;
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  estimatedArrival: string | null;
  hasArrived?: boolean;
  arrivedAt?: string | null;
  fulfillmentStatus?: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string | null;
  miniatureName: string;
  brandName: string | null;
  installmentNumber: number;
  totalInstallments: number;
  installmentDescription: string;
  installmentAmount: number;
  dueDate: string | null;
  installmentStatus: string;
  paidAt: string | null;
  paidAmountInst: number | null;
  paymentMethod: string | null;
  notes: string | null;
}

export interface PreOrdersReportResponse {
  metrics: PreOrdersReportMetrics;
  rows: PreOrdersReportRow[];
}

export interface CreatePreOrderReservationInput {
  offerId: string;
  paymentPlan: PaymentPlan;
  quantity?: number;
  installmentsCount?: number;
  dueDateDay?: number;
  notes?: string | null;
  customInstallments?: Array<{
    installmentNumber: number;
    description: string;
    amount: string;
    dueDate?: string | null;
  }>;
}

export interface SettleInstallmentInput {
  paidAmount?: string;
  paidAt?: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export interface UpdatePreOrderStatusInput {
  status: PreOrderStatus;
  notes?: string | null;
}

// API functions
export async function createPreOrderReservation(data: CreatePreOrderReservationInput) {
  const res = await apiClient<{ data: any }>('/pre-orders/reserve', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function listSellerPreOrders(params?: { status?: PreOrderStatus; installmentStatus?: string }) {
  const res = await apiClient<{ data: SellerPreOrderItem[] }>('/sellers/me/pre-orders', {
    params: params as any,
  });
  return res.data;
}

export async function getSellerPreOrdersDashboard(filter?: 'ALL' | 'OPEN' | 'CLOSED' | 'ARRIVED') {
  const res = await apiClient<{ data: SellerPreOrdersDashboardResponse }>('/sellers/me/pre-orders/dashboard', {
    params: filter ? { filter } : undefined,
  });
  return res.data;
}

export async function markCampaignArrival(offerId: string, arrivedAt?: string | null) {
  const res = await apiClient<{ data: any }>(`/sellers/me/pre-orders/campaigns/${offerId}/arrival`, {
    method: 'POST',
    body: JSON.stringify({ arrivedAt }),
  });
  return res.data;
}

export async function updatePreOrderFulfillment(
  preOrderId: string,
  data: {
    fulfillmentStatus: FulfillmentStatus;
    hasArrived?: boolean;
    arrivedAt?: string | null;
  }
) {
  const res = await apiClient<{ data: SellerPreOrderItem }>(`/sellers/me/pre-orders/${preOrderId}/fulfillment`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getSellerPreOrdersReport() {
  const res = await apiClient<{ data: PreOrdersReportResponse }>('/sellers/me/pre-orders/report');
  return res.data;
}

export async function settlePreOrderInstallment(
  preOrderId: string,
  installmentId: string,
  data: SettleInstallmentInput
) {
  const res = await apiClient<{ data: { preOrder: any; installment: PreOrderInstallmentItem } }>(
    `/sellers/me/pre-orders/${preOrderId}/installments/${installmentId}/settle`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return res.data;
}

export async function updatePreOrderStatus(preOrderId: string, data: UpdatePreOrderStatusInput) {
  const res = await apiClient<{ data: any }>(`/sellers/me/pre-orders/${preOrderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export interface UpdateInstallmentInput {
  dueDate?: string | null;
  amount?: string;
  description?: string;
}

export async function updatePreOrderInstallment(
  preOrderId: string,
  installmentId: string,
  data: UpdateInstallmentInput
) {
  const res = await apiClient<{ data: PreOrderInstallmentItem }>(
    `/sellers/me/pre-orders/${preOrderId}/installments/${installmentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
  return res.data;
}

export async function listBuyerPreOrders() {
  const res = await apiClient<{ data: BuyerPreOrderItem[] }>('/buyers/me/pre-orders');
  return res.data;
}

export async function listCollectorsStatus(params?: {
  scope?: 'my' | 'all';
  status?: 'ALL' | 'GREEN' | 'YELLOW' | 'RED';
  search?: string;
}) {
  const res = await apiClient<{ data: CollectorsHealthResponse }>('/sellers/me/pre-orders/collectors', {
    params: params as any,
  });
  return res.data;
}

export async function getCollectorFinancialSummary(collectorId: string) {
  const res = await apiClient<{ data: CollectorFinancialSummaryResponse }>(
    `/sellers/me/pre-orders/collectors/${collectorId}/summary`
  );
  return res.data;
}

export async function approvePreOrderReservation(preOrderId: string, notes?: string) {
  const res = await apiClient<{ data: any }>(`/sellers/me/pre-orders/${preOrderId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
  return res.data;
}

export async function rejectPreOrderReservation(preOrderId: string, reason?: string) {
  const res = await apiClient<{ data: any }>(`/sellers/me/pre-orders/${preOrderId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

// Client-side CSV generator with UTF-8 BOM
export function exportPreOrdersToCsv(rows: PreOrdersReportRow[], filename = 'relatorio-pre-vendas.csv') {
  if (!rows || rows.length === 0) {
    return;
  }

  const headers = [
    'Código Pré-Venda',
    'Data Reserva',
    'Status Pré-Venda',
    'Miniatura Chegou?',
    'Data Chegada',
    'Situação (Garagem / Entregue)',
    'Modalidade',
    'Quantidade (un.)',
    'Total Miniatura (R$)',
    'Total Pago (R$)',
    'Saldo Restante (R$)',
    'Previsão Chegada',
    'Cliente',
    'Email Cliente',
    'WhatsApp Cliente',
    'Miniatura',
    'Fabricante',
    'Parcela Nº',
    'Total Parcelas',
    'Descrição Parcela',
    'Valor Parcela (R$)',
    'Data Vencimento',
    'Status Parcela',
    'Data Baixa',
    'Valor Baixado (R$)',
    'Meio de Pagamento',
    'Observações',
  ];

  const paymentPlanLabels: Record<string, string> = {
    DEPOSIT_AND_BALANCE: 'Sinal + Saldo na Chegada',
    FULL_ON_ARRIVAL: 'Integral na Chegada',
    INSTALLMENTS: 'Parcelado',
  };

  const statusLabels: Record<string, string> = {
    PENDING_APPROVAL: 'Aguardando Aprovação',
    RESERVED: 'Reservado',
    AWAITING_ARRIVAL: 'Aguardando Chegada',
    ARRIVED: 'Chegou na Loja',
    READY_FOR_DISPATCH: 'Pronto para Envio',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
  };

  const instStatusLabels: Record<string, string> = {
    PENDING: 'Em Aberto',
    PAID: 'Quitada',
    OVERDUE: 'Atrasada',
  };

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [
    headers.join(';'),
    ...rows.map((r) =>
      [
        escapeCell(r.preOrderNumber),
        escapeCell(r.createdAt),
        escapeCell(statusLabels[r.status] || r.status),
        escapeCell(r.hasArrived ? 'Sim' : 'Não'),
        escapeCell(r.arrivedAt || '-'),
        escapeCell(r.fulfillmentStatus || 'Na Garagem'),
        escapeCell(paymentPlanLabels[r.paymentPlan] || r.paymentPlan),
        escapeCell(r.quantity || 1),
        escapeCell(r.totalAmount.toFixed(2).replace('.', ',')),
        escapeCell(r.paidAmount.toFixed(2).replace('.', ',')),
        escapeCell(r.remainingAmount.toFixed(2).replace('.', ',')),
        escapeCell(r.estimatedArrival || '-'),
        escapeCell(r.buyerName),
        escapeCell(r.buyerEmail),
        escapeCell(r.buyerWhatsapp || '-'),
        escapeCell(r.miniatureName),
        escapeCell(r.brandName || '-'),
        escapeCell(r.installmentNumber),
        escapeCell(r.totalInstallments),
        escapeCell(r.installmentDescription),
        escapeCell(r.installmentAmount.toFixed(2).replace('.', ',')),
        escapeCell(r.dueDate || '-'),
        escapeCell(instStatusLabels[r.installmentStatus] || r.installmentStatus),
        escapeCell(r.paidAt || '-'),
        escapeCell(r.paidAmountInst !== null ? r.paidAmountInst.toFixed(2).replace('.', ',') : '-'),
        escapeCell(r.paymentMethod || '-'),
        escapeCell(r.notes || ''),
      ].join(';')
    ),
  ];

  // \uFEFF ensures Excel properly opens UTF-8 encoded accented characters
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

