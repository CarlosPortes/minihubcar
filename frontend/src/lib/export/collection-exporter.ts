export interface ExportableExemplar {
  id: string;
  status: string;
  notes: string | null;
  acquisitionDate: string | null;
  purchasePrice?: string | null;
  purchaseLocation?: string | null;
  createdAt: string;
  variation: {
    id: string;
    name: string;
    releaseYear: number | null;
    color: string | null;
  };
  casting: { id: string; name: string };
  brand: { id: string; name: string };
  series?: { id: string; name: string } | null;
  automaker?: { id: string; name: string } | null;
  vehicleModel?: { id: string; name: string } | null;
  condition: { id: string; code: string; name: string };
  location?: {
    id: string;
    name: string;
    hasGrid?: boolean;
    gridRow?: number | null;
    gridColumn?: number | null;
  } | null;
}

export function exportCollectionToCSV(exemplars: ExportableExemplar[], filename?: string) {
  const headers = [
    'Miniatura / Variação',
    'Casting / Modelo',
    'Marca Miniatura',
    'Montadora Real',
    'Veículo Real',
    'Série / Linha',
    'Ano',
    'Cor',
    'Estado de Conservação',
    'Localização Física',
    'Posição (Linha x Coluna)',
    'Valor Pago (R$)',
    'Local de Compra',
    'Data de Aquisição',
    'Status',
    'Observações',
    'Cadastrado Em',
  ];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = exemplars.map((ex) => {
    const gridPos =
      ex.location?.hasGrid && ex.location.gridRow && ex.location.gridColumn
        ? `Linha ${ex.location.gridRow} × Coluna ${ex.location.gridColumn}`
        : '';

    const statusLabel =
      ex.status === 'ACTIVE'
        ? 'Ativo'
        : ex.status === 'SOLD'
        ? 'Vendido'
        : ex.status === 'DISCARDED'
        ? 'Baixa (Perda/Quebra)'
        : ex.status;

    return [
      escapeCSV(ex.variation.name),
      escapeCSV(ex.casting.name),
      escapeCSV(ex.brand.name),
      escapeCSV(ex.automaker?.name || ''),
      escapeCSV(ex.vehicleModel?.name || ''),
      escapeCSV(ex.series?.name || ''),
      escapeCSV(ex.variation.releaseYear || ''),
      escapeCSV(ex.variation.color || ''),
      escapeCSV(ex.condition.name),
      escapeCSV(ex.location?.name || 'Sem localização definida'),
      escapeCSV(gridPos),
      escapeCSV(ex.purchasePrice ? parseFloat(ex.purchasePrice).toFixed(2).replace('.', ',') : ''),
      escapeCSV(ex.purchaseLocation || ''),
      escapeCSV(ex.acquisitionDate || ''),
      escapeCSV(statusLabel),
      escapeCSV(ex.notes || ''),
      escapeCSV(ex.createdAt ? new Date(ex.createdAt).toLocaleDateString('pt-BR') : ''),
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens with proper accents and Portuguese characters
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `minihubcar_colecao_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadImportTemplate() {
  downloadCollectionTemplate();
}

export function downloadCollectionTemplate() {
  const headers = [
    'Codigo_Identificador',
    'Quantidade',
    'Condicao',
    'Localizacao',
    'Linha_Grade',
    'Coluna_Grade',
    'Preco_Pago',
    'Data_Aquisicao',
    'Observacoes',
  ];

  const sampleRows = [
    [
      'HKG34',
      '1',
      'MINT',
      'Prateleira 1',
      '1',
      '1',
      '15.90',
      '2024-05-10',
      'Exemplo: Código Mattel gravado na cartela e nicho na grade',
    ],
    [
      'JBC92',
      '1',
      'CARDED',
      'Expositor Parede Sala',
      '2',
      '4',
      '29.90',
      '2024-06-15',
      'Exemplo: Lacrado na cartela original em nicho específico',
    ],
    [
      '027084120134',
      '2',
      'LOOSE',
      '',
      '',
      '',
      '10.00',
      '2024-01-20',
      'Exemplo: Por Código de Barras (EAN/UPC) sem localização',
    ],
  ];

  const escapeCSV = (val: string): string => `"${val.replace(/"/g, '""')}"`;
  const rows = sampleRows.map((r) => r.map(escapeCSV).join(';'));
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_colecao_minihubcar.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadLocationsTemplate() {
  const headers = ['Nome', 'Local_Pai', 'Tipo', 'Tem_Grade', 'Linhas', 'Colunas'];

  const sampleRows = [
    ['Estante Principal', '', 'ESTANTE', 'NAO', '', ''],
    ['Prateleira 1', 'Estante Principal', 'PRATELEIRA', 'SIM', '5', '10'],
    ['Prateleira 2', 'Estante Principal', 'PRATELEIRA', 'SIM', '5', '10'],
    ['Expositor Parede Sala', '', 'EXPOSITOR', 'SIM', '10', '10'],
    ['Caixa Organizadora A', '', 'CAIXA', 'NAO', '', ''],
  ];

  const escapeCSV = (val: string): string => `"${val.replace(/"/g, '""')}"`;
  const rows = sampleRows.map((r) => r.map(escapeCSV).join(';'));
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_locais_minihubcar.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFailureReportToCSV(
  failures: Array<{
    line: number;
    code?: string | null;
    name?: string | null;
    locationName?: string | null;
    reason: string;
  }>,
  type: 'collection' | 'locations' = 'collection',
  filename?: string
) {
  const headers =
    type === 'collection'
      ? ['Linha_Arquivo', 'Codigo_Identificador', 'Local_Informado', 'Motivo_Falha']
      : ['Linha_Arquivo', 'Nome_Local', 'Motivo_Falha'];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = failures.map((f) => {
    if (type === 'collection') {
      return [
        escapeCSV(f.line),
        escapeCSV(f.code || ''),
        escapeCSV(f.locationName || ''),
        escapeCSV(f.reason),
      ].join(';');
    } else {
      return [escapeCSV(f.line), escapeCSV(f.name || ''), escapeCSV(f.reason)].join(';');
    }
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    filename || `relatorio_falhas_${type}_${dateStr}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRejectionsToCSV(
  rejectedItems: Array<{
    code?: string | null;
    name?: string | null;
    year?: number | null;
    conditionCode?: string | null;
    cost?: number | null;
    sourceName?: string | null;
    acquisitionDate?: string | null;
    notes?: string | null;
    reason: string;
  }>,
  filename?: string
) {
  const failures = rejectedItems.map((r, idx) => ({
    line: idx + 2,
    code: r.code || r.name,
    name: r.name,
    locationName: r.sourceName,
    reason: r.reason,
  }));
  exportFailureReportToCSV(failures, 'collection', filename || `minihubcar_rejeicoes_${new Date().toISOString().split('T')[0]}.csv`);
}



