'use client';

import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Layers,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Users,
  Coins,
} from 'lucide-react';
import {
  importPreOrdersBatch,
  CreateManualPreOrderInput,
  ImportPreOrdersBatchResponse,
} from '@/lib/api/pre-orders';

interface ImportPreOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sellerStoreName?: string;
}

export function ImportPreOrdersModal({
  isOpen,
  onClose,
  onSuccess,
  sellerStoreName = 'Loja Oficial',
}: ImportPreOrdersModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<CreateManualPreOrderInput[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPreOrdersBatchResponse | null>(null);

  // Download template CSV directly
  const handleDownloadTemplate = () => {
    const headers = [
      'Nome Cliente',
      'Email Cliente',
      'WhatsApp Cliente',
      'Miniatura',
      'Fabricante',
      'Data Previsão Chegada',
      'Quantidade',
      'Total Miniatura (R$)',
      'Modalidade',
      'Parcela Nº',
      'Total Parcelas',
      'Valor Parcela (R$)',
      'Data Vencimento',
      'Status Parcela',
      'Data Baixa',
      'Valor Baixado (R$)',
      'Meio de Pagamento',
      'Observações',
    ];

    const examples = [
      [
        'João da Silva',
        'joao.silva@exemplo.com.br',
        '11987654321',
        'Nissan Skyline GT-R R34 Kaido House #12',
        'Kaido House',
        '2026-12-15',
        '1',
        '180,00',
        'Parcelado',
        '1',
        '3',
        '60,00',
        '2026-10-10',
        'PAGA',
        '2026-10-01',
        '60,00',
        'PIX',
        'Sinal pago via PIX',
      ],
      [
        'João da Silva',
        'joao.silva@exemplo.com.br',
        '11987654321',
        'Nissan Skyline GT-R R34 Kaido House #12',
        'Kaido House',
        '2026-12-15',
        '1',
        '180,00',
        'Parcelado',
        '2',
        '3',
        '60,00',
        '2026-11-10',
        'PENDENTE',
        '',
        '',
        '',
        '',
      ],
      [
        'João da Silva',
        'joao.silva@exemplo.com.br',
        '11987654321',
        'Nissan Skyline GT-R R34 Kaido House #12',
        'Kaido House',
        '2026-12-15',
        '1',
        '180,00',
        'Parcelado',
        '3',
        '3',
        '60,00',
        '2026-12-10',
        'PENDENTE',
        '',
        '',
        '',
        '',
      ],
      [
        'Mariana Oliveira',
        'mariana.oliveira@exemplo.com.br',
        '21998877665',
        'Porsche 911 GT3 R Test Edition Almost Real',
        'Almost Real',
        '2027-01-20',
        '1',
        '220,00',
        'Sinal + Saldo na Chegada',
        '1',
        '2',
        '50,00',
        '2026-10-05',
        'PAGA',
        '2026-10-02',
        '50,00',
        'PIX',
        'Entrada paga',
      ],
      [
        'Mariana Oliveira',
        'mariana.oliveira@exemplo.com.br',
        '21998877665',
        'Porsche 911 GT3 R Test Edition Almost Real',
        'Almost Real',
        '2027-01-20',
        '1',
        '220,00',
        'Sinal + Saldo na Chegada',
        '2',
        '2',
        '170,00',
        '2027-01-20',
        'PENDENTE',
        '',
        '',
        '',
        'Saldo na chegada',
      ],
    ];

    const lines = [
      headers.join(';'),
      ...examples.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')),
    ];

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_importacao_pre_vendas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Robust CSV parser
  const parseCSV = (content: string): CreateManualPreOrderInput[] => {
    const cleaned = content.replace(/^\uFEFF/, '');
    const rawLines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length < 2) return [];

    const firstLine = rawLines[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const parts: string[] = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === delimiter && !insideQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      return parts;
    };

    const header = parseLine(firstLine).map((h) =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    const getIdx = (terms: string[]) => {
      return header.findIndex((h) => terms.some((t) => h.includes(t)));
    };

    const idxName = getIdx(['nome cliente', 'cliente', 'comprador', 'nome']);
    const idxEmail = getIdx(['email cliente', 'email', 'e-mail']);
    const idxPhone = getIdx(['whatsapp', 'telefone', 'celular', 'fone']);
    const idxMiniature = getIdx(['miniatura', 'modelo', 'casting']);
    const idxBrand = getIdx(['fabricante', 'marca']);
    const idxArrival = getIdx(['previsao', 'chegada', 'data chegada']);
    const idxQty = getIdx(['quantidade', 'qtd', 'unidade']);
    const idxTotal = getIdx(['total miniatura', 'total', 'valor total', 'preco']);
    const idxPlan = getIdx(['modalidade', 'plano', 'forma']);

    // Installments columns
    const idxInstNum = getIdx(['parcela no', 'parcela numero', 'parcela nº', 'n parcela']);
    const idxInstTotal = getIdx(['total parcelas', 'qtd parcelas', 'total de parcelas']);
    const idxInstAmount = getIdx(['valor parcela', 'valor da parcela']);
    const idxInstDue = getIdx(['data vencimento', 'vencimento']);
    const idxInstStatus = getIdx(['status parcela', 'situacao parcela']);
    const idxInstPaidDate = getIdx(['data baixa', 'data pagamento']);
    const idxInstPaidAmount = getIdx(['valor baixado', 'valor pago']);
    const idxInstMethod = getIdx(['meio de pagamento', 'forma pagamento', 'meio pagamento']);
    const idxNotes = getIdx(['observacoes', 'observacao', 'obs']);

    // Map rows grouped by buyer email + miniature
    const groups: Record<string, {
      collector: { name: string; email: string; whatsapp?: string };
      miniature: { name: string; brandName?: string; estimatedArrival?: string; quantity: number };
      totalAmount: number;
      paymentPlan: 'INSTALLMENTS' | 'DEPOSIT_AND_BALANCE' | 'FULL_ON_ARRIVAL';
      notes?: string;
      installments: any[];
    }> = {};

    for (let r = 1; r < rawLines.length; r++) {
      const line = rawLines[r];
      if (!line) continue;
      const cols = parseLine(line);
      if (cols.length < 3) continue;

      const cName = idxName >= 0 && cols[idxName] ? cols[idxName].trim() : 'Colecionador';
      const cEmail = idxEmail >= 0 && cols[idxEmail] ? cols[idxEmail].trim().toLowerCase() : '';
      if (!cEmail || !cEmail.includes('@')) continue;

      const cPhone = idxPhone >= 0 && cols[idxPhone] ? cols[idxPhone].replace(/[^\d+]/g, '') : undefined;
      const mName = idxMiniature >= 0 && cols[idxMiniature] ? cols[idxMiniature].trim() : 'Miniatura 1:64';
      const mBrand = idxBrand >= 0 && cols[idxBrand] ? cols[idxBrand].trim() : undefined;
      const mArrival = idxArrival >= 0 && cols[idxArrival] ? cols[idxArrival].trim() : undefined;
      const mQty = idxQty >= 0 && cols[idxQty] ? parseInt(cols[idxQty], 10) || 1 : 1;

      const parseMoney = (val?: string) => {
        if (!val) return 0;
        const clean = val.replace(/[^\d,.-]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
      };

      const mTotal = idxTotal >= 0 ? parseMoney(cols[idxTotal]) : 0;
      const planRaw = idxPlan >= 0 && cols[idxPlan] ? cols[idxPlan].toLowerCase() : '';
      const paymentPlan: 'INSTALLMENTS' | 'DEPOSIT_AND_BALANCE' | 'FULL_ON_ARRIVAL' =
        planRaw.includes('sinal')
          ? 'DEPOSIT_AND_BALANCE'
          : planRaw.includes('integral')
          ? 'FULL_ON_ARRIVAL'
          : 'INSTALLMENTS';

      const key = `${cEmail}__${mName}`.toLowerCase();

      if (!groups[key]) {
        groups[key] = {
          collector: { name: cName, email: cEmail, whatsapp: cPhone },
          miniature: { name: mName, brandName: mBrand, estimatedArrival: mArrival, quantity: mQty },
          totalAmount: mTotal,
          paymentPlan,
          notes: idxNotes >= 0 && cols[idxNotes] ? cols[idxNotes].trim() : undefined,
          installments: [],
        };
      } else {
        if (mTotal > 0 && groups[key].totalAmount === 0) {
          groups[key].totalAmount = mTotal;
        }
      }

      // Read installment if present
      const instNum = idxInstNum >= 0 && cols[idxInstNum] ? parseInt(cols[idxInstNum], 10) || 1 : groups[key].installments.length + 1;
      const instTot = idxInstTotal >= 0 && cols[idxInstTotal] ? parseInt(cols[idxInstTotal], 10) || 1 : 1;
      const instAmt = idxInstAmount >= 0 ? parseMoney(cols[idxInstAmount]) : (mTotal > 0 ? mTotal / instTot : 0);

      // Date parsing helper
      const parseDate = (d?: string) => {
        if (!d) return new Date().toISOString().slice(0, 10);
        // DD/MM/YYYY or YYYY-MM-DD
        if (d.includes('/')) {
          const [day, mon, yr] = d.split('/');
          if (day && mon && yr) {
            return `${yr}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
        return d.slice(0, 10);
      };

      const instDueDate = idxInstDue >= 0 ? parseDate(cols[idxInstDue]) : new Date().toISOString().slice(0, 10);
      const statusRaw = idxInstStatus >= 0 && cols[idxInstStatus] ? cols[idxInstStatus].toUpperCase() : '';
      const isPaid = statusRaw.includes('PAG') || statusRaw.includes('BAIXAD') || statusRaw.includes('SIM');
      const paidDate = idxInstPaidDate >= 0 && cols[idxInstPaidDate] ? parseDate(cols[idxInstPaidDate]) : isPaid ? instDueDate : null;
      const paidVal = idxInstPaidAmount >= 0 ? parseMoney(cols[idxInstPaidAmount]) : (isPaid ? instAmt : null);
      const methodRaw = idxInstMethod >= 0 && cols[idxInstMethod] ? cols[idxInstMethod].toUpperCase() : 'PIX';

      groups[key].installments.push({
        installmentNumber: instNum,
        totalInstallments: instTot,
        amount: instAmt.toFixed(2),
        dueDate: instDueDate,
        status: isPaid ? 'PAID' : 'PENDING',
        paidAt: paidDate,
        settledAmount: paidVal ? paidVal.toFixed(2) : undefined,
        paymentMethod: methodRaw.includes('CART') ? 'CARTAO' : methodRaw.includes('DIN') ? 'DINHEIRO' : 'PIX',
        description: instNum === 1 && isPaid ? '1ª Parcela (Sinal / Entrada)' : `Parcela ${instNum} de ${instTot}`,
      });
    }

    // Convert groups into CreateManualPreOrderInput array
    const output: CreateManualPreOrderInput[] = [];

    for (const key of Object.keys(groups)) {
      const g = groups[key]!;
      let total = g.totalAmount;
      if (total <= 0) {
        total = g.installments.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
      }
      if (total <= 0) continue;

      // Normalize totalInstallments in all items
      const count = Math.max(g.installments.length, 1);
      const insts = g.installments.map((inst, idx) => ({
        ...inst,
        installmentNumber: inst.installmentNumber || idx + 1,
        totalInstallments: count,
      }));

      // If no installments were in lines, generate 1 single installment
      if (insts.length === 0) {
        insts.push({
          installmentNumber: 1,
          totalInstallments: 1,
          amount: total.toFixed(2),
          dueDate: new Date().toISOString().slice(0, 10),
          status: 'PENDING',
          paymentMethod: 'PIX',
          description: 'Pagamento Único',
        });
      }

      output.push({
        collector: g.collector,
        miniature: {
          ...g.miniature,
          scaleDenominator: 64,
        },
        financial: {
          totalAmount: total.toFixed(2),
          paymentPlan: g.paymentPlan,
          installments: insts,
          notes: g.notes,
        },
      });
    }

    return output;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('O arquivo selecionado está vazio.');

        const items = parseCSV(text);
        if (items.length === 0) {
          throw new Error('Nenhuma pré-venda válida encontrada. Verifique se o e-mail do cliente e os valores estão preenchidos.');
        }

        setParsedItems(items);
      } catch (err: any) {
        setParseError(err.message || 'Falha ao interpretar arquivo CSV.');
        setParsedItems([]);
      }
    };
    reader.onerror = () => setParseError('Erro ao ler arquivo.');
    reader.readAsText(file, 'UTF-8');
  };

  // Mutation: Import Batch
  const importMutation = useMutation({
    mutationFn: async () => {
      if (parsedItems.length === 0) {
        throw new Error('Nenhum item válido para importar.');
      }
      return importPreOrdersBatch(parsedItems);
    },
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['seller-collectors-status'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setParseError(err.message || 'Falha ao processar importação em lote.');
    },
  });

  const handleClose = () => {
    setSelectedFile(null);
    setParsedItems([]);
    setParseError(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  // Compute preview stats
  const previewTotalAmount = parsedItems.reduce((acc, p) => acc + (parseFloat(p.financial.totalAmount) || 0), 0);
  const previewPaidAmount = parsedItems.reduce((acc, p) => {
    const paid = p.financial.installments
      .filter((i) => i.status === 'PAID')
      .reduce((a, i) => a + (parseFloat(i.settledAmount || i.amount) || 0), 0);
    return acc + paid;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Importar Planilha de Pré-Vendas
              </h3>
              <p className="text-xs text-muted-foreground">
                Importe dezenas de pré-vendas com parcelas já pagas e pendentes em lote.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {!result ? (
            <>
              {/* Instructions and Download Template Strip */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-400" /> Modelo Oficial de Importação
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baixe a planilha modelo (.CSV) com os cabeçalhos corretos e exemplos preenchidos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold border border-border/80 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  <Download className="h-4 w-4 text-primary" />
                  <span>Baixar Modelo (.CSV)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-border/80 hover:border-primary/60 bg-secondary/20 hover:bg-secondary/40'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-400">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Clique para trocar de arquivo
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Clique para selecionar ou arraste o arquivo .CSV
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Compatível com Excel, Google Sheets ou arquivos exportados com delimitador ponto e vírgula (;)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parse Error */}
              {parseError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview Table if rows parsed */}
              {parsedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Pré-Visualização ({parsedItems.length} pré-venda{parsedItems.length > 1 ? 's' : ''} identificada{parsedItems.length > 1 ? 's' : ''})
                    </h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span>Total: <strong className="text-foreground">R$ {previewTotalAmount.toFixed(2)}</strong></span>
                      <span className="text-emerald-400 font-medium">Já Baixado: <strong>R$ {previewPaidAmount.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card overflow-hidden text-xs max-h-60 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-secondary/40 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Miniatura</th>
                          <th className="py-2.5 px-3">Previsão</th>
                          <th className="py-2.5 px-3">Parcelas</th>
                          <th className="py-2.5 px-3 text-right">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {parsedItems.map((item, idx) => {
                          const paidCount = item.financial.installments.filter((i) => i.status === 'PAID').length;
                          const totalCount = item.financial.installments.length;

                          return (
                            <tr key={idx} className="hover:bg-secondary/30">
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-foreground">{item.collector.name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.collector.email}</p>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-foreground">
                                {item.miniature.name}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">
                                {item.miniature.estimatedArrival || '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  paidCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {paidCount}/{totalCount} pagas
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                R$ {parseFloat(item.financial.totalAmount).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Result Summary Screen */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-foreground">
                  Importação Concluída com Sucesso!
                </h4>
                <p className="text-xs text-muted-foreground">
                  Todas as pré-vendas e parcelas foram processadas e salvas no seu painel.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Vendas Criadas</span>
                  <strong className="text-lg font-black text-foreground">{result.successCount}</strong>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-[10px] text-primary uppercase font-bold block">Novos Colecionadores</span>
                  <strong className="text-lg font-black text-primary">{result.newCollectorsCount}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Receita Baixada</span>
                  <strong className="text-lg font-black text-emerald-400">R$ {parseFloat(result.totalPaidAmount).toFixed(2)}</strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Saldo Futuro</span>
                  <strong className="text-lg font-black text-amber-400">R$ {parseFloat(result.totalRemainingAmount).toFixed(2)}</strong>
                </div>
              </div>

              {/* Collectors list with direct WhatsApp action */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Colecionadores Importados & Contato
                </h5>
                <div className="rounded-xl border border-border/40 bg-card overflow-hidden text-xs max-h-56 overflow-y-auto divide-y divide-border/20">
                  {result.results.map((r, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{r.collectorName}</span>
                          {r.isNewUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/20 text-primary">
                              Novo Acesso
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{r.miniatureName} — {r.preOrderNumber}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {r.whatsappShareUrl ? (
                          <a
                            href={r.whatsappShareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Sem telefone</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-secondary/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>

          {!result && (
            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending || parsedItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {importMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Importando Pré-Vendas...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirmar Importação ({parsedItems.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
