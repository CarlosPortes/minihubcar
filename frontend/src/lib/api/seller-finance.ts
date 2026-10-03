import { apiClient } from './client';
import * as XLSX from 'xlsx';

export interface SellerFinanceMetrics {
  grossSales: number;
  totalRealizedInflow: number;
  totalReceivables: number;
  overdueReceivablesAmount: number;
  overdueReceivablesCount: number;
  receivablesDueThisMonth: number;
  totalCosts: number;
  estimatedProfit: number;
  profitMargin: number;
  totalSalesCount: number;
  averageTicket: number;
}

export interface SellerFinanceSaleItem {
  id: string;
  type: 'PRONTA_ENTREGA' | 'PRE_VENDA';
  referenceNumber: string;
  date: string;
  rawDate: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string | null;
  miniatureName: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  paymentPlan: string;
  status: string;
  fulfillmentStatus: string;
}

export interface SellerFinanceReceivableItem {
  id: string;
  source: 'PARCELA_PRE_VENDA' | 'SALDO_CHEGADA' | 'PEDIDO_DIRETO';
  referenceNumber: string;
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string | null;
  miniatureName: string;
  amount: number;
  dueDate: string | null;
  rawDueDate: string | null;
  status: 'PENDING' | 'OVERDUE' | 'PAID';
  isOverdue: boolean;
  daysOverdue: number;
  paidAt: string | null;
  paymentMethod: string | null;
}

export interface SellerFinancePayableItem {
  id: string;
  type: string;
  date: string;
  rawDate: string;
  sourceName: string;
  miniatureName: string;
  brandName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
}

export interface SellerFinanceForecastItem {
  month: string;
  expectedInflow: number;
  realizedInflow: number;
  expectedOutflow: number;
}

export interface SellerFinanceBrandItem {
  brand: string;
  units: number;
  revenue: number;
  percentage: number;
}

export interface SellerFinanceReportResponse {
  storeName: string;
  slug: string;
  metrics: SellerFinanceMetrics;
  sales: SellerFinanceSaleItem[];
  receivables: SellerFinanceReceivableItem[];
  payables: SellerFinancePayableItem[];
  forecast: SellerFinanceForecastItem[];
  byBrand: SellerFinanceBrandItem[];
}

export async function getSellerFinancialReport(params?: {
  startDate?: string;
  endDate?: string;
  type?: 'ALL' | 'ORDERS' | 'PRE_ORDERS';
}) {
  const res = await apiClient<{ data: SellerFinanceReportResponse }>('/sellers/me/finance/report', {
    params: params as any,
  });
  return res.data;
}

// Client-side Excel (.xlsx) Multi-sheet Generator
export function exportFinancialReportToExcel(
  report: SellerFinanceReportResponse,
  filename = 'relatorio-financeiro-vendas.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // SHEET 1: Resumo & DRE Executivo
  const dreData = [
    ['MINIHUB CAR - RELATÓRIO DE GESTÃO FINANCEIRA E VENDAS'],
    ['Loja:', report.storeName || 'Minha Loja'],
    ['Data de Emissão:', new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR')],
    [],
    ['INDICADORES PRINCIPAIS (KPIs)', 'VALOR (R$) / QUANTIDADE'],
    ['Faturamento Total Contratado (Vendas Brutas)', report.metrics.grossSales],
    ['Total Recebido (Caixa Realizado)', report.metrics.totalRealizedInflow],
    ['Total a Receber (Saldo em Aberto)', report.metrics.totalReceivables],
    ['Recebíveis Vencidos (Inadimplência)', report.metrics.overdueReceivablesAmount],
    ['Parcelas em Atraso (Qtd)', report.metrics.overdueReceivablesCount],
    ['Previsão a Receber no Mês Atual', report.metrics.receivablesDueThisMonth],
    ['Custos de Aquisição de Estoque (CMV)', report.metrics.totalCosts],
    ['Lucro Bruto Estimado', report.metrics.estimatedProfit],
    ['Margem de Lucro Estimada (%)', `${report.metrics.profitMargin.toFixed(1)}%`],
    ['Total de Vendas / Transações', report.metrics.totalSalesCount],
    ['Ticket Médio por Venda (R$)', report.metrics.averageTicket],
    [],
    ['PROJEÇÃO MENSAL DE FLUXO DE CAIXA (FORECAST)'],
    ['Mês (Ano-Mês)', 'Entradas Previstas (R$)', 'Entradas Realizadas (R$)', 'Custos / Saídas (R$)'],
    ...report.forecast.map((f) => [f.month, f.expectedInflow, f.realizedInflow, f.expectedOutflow]),
  ];

  const wsDre = XLSX.utils.aoa_to_sheet(dreData);
  wsDre['!cols'] = [{ wch: 45 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsDre, 'Resumo & DRE');

  // SHEET 2: Vendas Realizadas
  const salesHeaders = [
    'Código Pedido / Pré-Venda',
    'Data Venda',
    'Tipo',
    'Cliente',
    'WhatsApp',
    'Email',
    'Miniatura',
    'Fabricante',
    'Qtd',
    'Valor Unitário (R$)',
    'Valor Total (R$)',
    'Valor Pago (R$)',
    'Saldo Restante (R$)',
    'Plano de Pagamento',
    'Status Venda',
    'Situação Envio',
  ];

  const salesRows = report.sales.map((s) => [
    s.referenceNumber,
    s.date,
    s.type === 'PRONTA_ENTREGA' ? 'Pronta Entrega' : 'Pré-Venda',
    s.buyerName,
    s.buyerWhatsapp || '-',
    s.buyerEmail,
    s.miniatureName,
    s.brandName,
    s.quantity,
    s.unitPrice,
    s.totalPrice,
    s.paidAmount,
    s.remainingAmount,
    s.paymentPlan,
    s.status,
    s.fulfillmentStatus,
  ]);

  const wsSales = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesRows]);
  wsSales['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 15 },
    { wch: 25 },
    { wch: 16 },
    { wch: 25 },
    { wch: 35 },
    { wch: 18 },
    { wch: 6 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSales, 'Gestão de Vendas');

  // SHEET 3: Contas a Receber
  const recHeaders = [
    'Origem',
    'Código',
    'Descrição Parcela / Recebível',
    'Cliente',
    'WhatsApp',
    'Miniatura',
    'Valor a Receber (R$)',
    'Data Vencimento',
    'Situação',
    'Dias em Atraso',
    'Data Baixa',
    'Meio de Pagamento',
  ];

  const recRows = report.receivables.map((r) => [
    r.source === 'PARCELA_PRE_VENDA' ? 'Parcela Pré-Venda' : r.source === 'SALDO_CHEGADA' ? 'Saldo na Chegada' : 'Pedido Direto',
    r.referenceNumber,
    r.description,
    r.buyerName,
    r.buyerWhatsapp || '-',
    r.miniatureName,
    r.amount,
    r.dueDate || 'A definir',
    r.isOverdue ? 'ATRASADO' : r.status === 'PAID' ? 'Quitado' : 'Em Aberto',
    r.daysOverdue > 0 ? `${r.daysOverdue} dias` : '-',
    r.paidAt || '-',
    r.paymentMethod || '-',
  ]);

  const wsRec = XLSX.utils.aoa_to_sheet([recHeaders, ...recRows]);
  wsRec['!cols'] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 25 },
    { wch: 25 },
    { wch: 16 },
    { wch: 32 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRec, 'Contas a Receber');

  // SHEET 4: Contas a Pagar & Custos de Estoque
  const payHeaders = [
    'Data Aquisição',
    'Tipo Entrada',
    'Fornecedor / Origem',
    'Miniatura',
    'Fabricante',
    'Quantidade',
    'Custo Unitário (R$)',
    'Custo Total (R$)',
    'Observações',
  ];

  const payRows = report.payables.map((p) => [
    p.date,
    p.type,
    p.sourceName,
    p.miniatureName,
    p.brandName,
    p.quantity,
    p.unitCost,
    p.totalCost,
    p.notes || '',
  ]);

  const wsPay = XLSX.utils.aoa_to_sheet([payHeaders, ...payRows]);
  wsPay['!cols'] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 25 },
    { wch: 32 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPay, 'Custos & Aquisições');

  // SHEET 5: Desempenho por Marca
  const brandHeaders = ['Fabricante', 'Unidades Vendidas', 'Faturamento Total (R$)', 'Participação no Faturamento (%)'];
  const brandRows = report.byBrand.map((b) => [b.brand, b.units, b.revenue, `${b.percentage.toFixed(1)}%`]);

  const wsBrand = XLSX.utils.aoa_to_sheet([brandHeaders, ...brandRows]);
  wsBrand['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 24 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsBrand, 'Desempenho por Marca');

  // Write and trigger download
  XLSX.writeFile(wb, filename);
}

// Client-side CSV Generator with UTF-8 BOM and Brazilian Excel Formatting (;)
export function exportFinancialDataToCsv(
  type: 'sales' | 'receivables' | 'payables',
  data: any[],
  filename?: string
) {
  if (!data || data.length === 0) return;

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const formatMoney = (num: number) => {
    return (num || 0).toFixed(2).replace('.', ',');
  };

  let headers: string[] = [];
  let rows: string[][] = [];
  let defaultFilename = '';

  if (type === 'sales') {
    defaultFilename = 'relatorio-vendas-minihubcar.csv';
    headers = [
      'Código',
      'Data Venda',
      'Tipo Venda',
      'Cliente',
      'WhatsApp',
      'Email',
      'Miniatura',
      'Fabricante',
      'Quantidade',
      'Valor Unitário (R$)',
      'Valor Total (R$)',
      'Valor Pago (R$)',
      'Saldo Restante (R$)',
      'Plano Pagamento',
      'Status Venda',
      'Situação Entrega',
    ];

    rows = data.map((s: SellerFinanceSaleItem) => [
      escapeCell(s.referenceNumber),
      escapeCell(s.date),
      escapeCell(s.type === 'PRONTA_ENTREGA' ? 'Pronta Entrega' : 'Pré-Venda'),
      escapeCell(s.buyerName),
      escapeCell(s.buyerWhatsapp || '-'),
      escapeCell(s.buyerEmail),
      escapeCell(s.miniatureName),
      escapeCell(s.brandName),
      escapeCell(s.quantity),
      escapeCell(formatMoney(s.unitPrice)),
      escapeCell(formatMoney(s.totalPrice)),
      escapeCell(formatMoney(s.paidAmount)),
      escapeCell(formatMoney(s.remainingAmount)),
      escapeCell(s.paymentPlan),
      escapeCell(s.status),
      escapeCell(s.fulfillmentStatus),
    ]);
  } else if (type === 'receivables') {
    defaultFilename = 'contas-a-receber-minihubcar.csv';
    headers = [
      'Origem',
      'Código',
      'Descrição',
      'Cliente',
      'WhatsApp',
      'Miniatura',
      'Valor a Receber (R$)',
      'Data Vencimento',
      'Situação',
      'Dias em Atraso',
      'Data Baixa',
      'Meio de Pagamento',
    ];

    rows = data.map((r: SellerFinanceReceivableItem) => [
      escapeCell(r.source === 'PARCELA_PRE_VENDA' ? 'Parcela Pré-Venda' : r.source === 'SALDO_CHEGADA' ? 'Saldo Chegada' : 'Pedido'),
      escapeCell(r.referenceNumber),
      escapeCell(r.description),
      escapeCell(r.buyerName),
      escapeCell(r.buyerWhatsapp || '-'),
      escapeCell(r.miniatureName),
      escapeCell(formatMoney(r.amount)),
      escapeCell(r.dueDate || 'A definir'),
      escapeCell(r.isOverdue ? 'Atrasada' : r.status === 'PAID' ? 'Quitada' : 'Em Aberto'),
      escapeCell(r.daysOverdue > 0 ? String(r.daysOverdue) : '0'),
      escapeCell(r.paidAt || '-'),
      escapeCell(r.paymentMethod || '-'),
    ]);
  } else if (type === 'payables') {
    defaultFilename = 'custos-aquisicoes-minihubcar.csv';
    headers = [
      'Data Aquisição',
      'Tipo Entrada',
      'Fornecedor / Origem',
      'Miniatura',
      'Fabricante',
      'Quantidade',
      'Custo Unitário (R$)',
      'Custo Total (R$)',
      'Observações',
    ];

    rows = data.map((p: SellerFinancePayableItem) => [
      escapeCell(p.date),
      escapeCell(p.type),
      escapeCell(p.sourceName),
      escapeCell(p.miniatureName),
      escapeCell(p.brandName),
      escapeCell(p.quantity),
      escapeCell(formatMoney(p.unitCost)),
      escapeCell(formatMoney(p.totalCost)),
      escapeCell(p.notes || ''),
    ]);
  }

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  // UTF-8 BOM ensures Brazilian characters open seamlessly in Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
