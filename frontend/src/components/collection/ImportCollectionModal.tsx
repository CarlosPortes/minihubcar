'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { downloadImportTemplate, exportRejectionsToCSV } from '@/lib/export/collection-exporter';

interface RejectedItem {
  code?: string | null;
  name?: string | null;
  year?: number | null;
  conditionCode?: string | null;
  cost?: number | null;
  sourceName?: string | null;
  acquisitionDate?: string | null;
  notes?: string | null;
  reason: string;
}

interface ImportResult {
  totalCount: number;
  importedCount: number;
  rejectedCount: number;
  imported: Array<{
    code?: string | null;
    name?: string | null;
    variationName: string;
    exemplarId: string;
  }>;
  rejected: RejectedItem[];
}

interface ImportCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportCollectionModal({ isOpen, onClose, onSuccess }: ImportCollectionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!isOpen) return null;

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

        const rows = parseCSV(text);
        if (rows.length === 0) {
          throw new Error('Nenhuma linha de dados encontrada após o cabeçalho.');
        }

        setParsedItems(rows);
      } catch (err: any) {
        setParseError(err.message || 'Falha ao interpretar arquivo CSV.');
        setParsedItems([]);
      }
    };
    reader.onerror = () => setParseError('Erro ao ler o arquivo.');
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (content: string) => {
    // Remove BOM if present
    const cleaned = content.replace(/^\uFEFF/, '');
    const rawLines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length < 2) return [];

    // Detect delimiter (; or ,)
    const firstLine = rawLines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
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
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(rawLines[0]).map((h) =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
    );

    const findCol = (keys: string[]) => {
      return headers.findIndex((h) => keys.some((k) => h.includes(k)));
    };

    const codeIdx = findCol(['codigo', 'code', 'identificador', 'sku']);
    const nameIdx = findCol(['nome', 'name', 'modelo', 'variacao']);
    const yearIdx = findCol(['ano', 'year']);
    const condIdx = findCol(['conservacao', 'condicao', 'condition']);
    const costIdx = findCol(['valor', 'custo', 'preco', 'price', 'cost']);
    const storeIdx = findCol(['local', 'loja', 'store', 'source', 'fonte']);
    const dateIdx = findCol(['data', 'date', 'aquisicao']);
    const notesIdx = findCol(['obs', 'nota', 'notes']);

    const items = [];

    for (let i = 1; i < rawLines.length; i++) {
      const cols = parseLine(rawLines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const code = codeIdx >= 0 ? cols[codeIdx] : undefined;
      const name = nameIdx >= 0 ? cols[nameIdx] : undefined;

      if (!code && !name) continue; // Skip lines with no identifier or name

      const yearRaw = yearIdx >= 0 ? cols[yearIdx] : undefined;
      const year = yearRaw && /^\d{4}$/.test(yearRaw) ? parseInt(yearRaw, 10) : undefined;

      const condRaw = condIdx >= 0 ? cols[condIdx]?.toUpperCase() : undefined;
      let conditionCode = 'MINT';
      if (condRaw) {
        if (condRaw.includes('NEAR')) conditionCode = 'NEAR_MINT';
        else if (condRaw.includes('CARD')) conditionCode = 'CARDED';
        else if (condRaw.includes('LOOSE')) conditionCode = 'LOOSE';
        else if (condRaw.includes('GOOD') || condRaw.includes('BOM')) conditionCode = 'GOOD';
        else if (condRaw.includes('DAMAG') || condRaw.includes('AVAR')) conditionCode = 'DAMAGED';
      }

      const costRaw = costIdx >= 0 ? cols[costIdx]?.replace(',', '.') : undefined;
      const cost = costRaw && !isNaN(parseFloat(costRaw)) ? parseFloat(costRaw) : undefined;

      const sourceName = storeIdx >= 0 ? cols[storeIdx] || undefined : undefined;
      const acqDateRaw = dateIdx >= 0 ? cols[dateIdx] : undefined;
      const notes = notesIdx >= 0 ? cols[notesIdx] || undefined : undefined;

      items.push({
        code: code || undefined,
        name: name || undefined,
        year,
        conditionCode,
        cost,
        sourceName,
        acquisitionDate: acqDateRaw || undefined,
        notes,
      });
    }

    return items;
  };

  const handleStartImport = async () => {
    if (parsedItems.length === 0) return;

    setIsProcessing(true);
    setParseError(null);

    try {
      const res = await apiClient<{ data: ImportResult }>('/collection/import', {
        method: 'POST',
        body: JSON.stringify({ items: parsedItems }),
      });

      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setParseError(err.message || 'Erro ao processar importação no servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadRejections = () => {
    if (!result || result.rejected.length === 0) return;
    exportRejectionsToCSV(result.rejected);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedItems([]);
    setParseError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Importar Coleção em Lote</h2>
              <p className="text-xs text-muted-foreground">
                Carregue suas miniaturas através de uma planilha Excel / CSV padronizada
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!result ? (
            <>
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Passo 1: Obter Planilha Modelo
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Baixe o modelo com cabeçalhos pré-formatados e exemplos preenchidos para não errar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadImportTemplate}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 transition-all shrink-0"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar Modelo (.csv)
                </button>
              </div>

              {/* Step 2: Select CSV file */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">
                  Passo 2: Selecione o Arquivo Preenchido (.csv)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-secondary/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileSpreadsheet className={`h-8 w-8 ${selectedFile ? 'text-primary' : 'text-muted-foreground'}`} />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-foreground">{selectedFile.name}</p>
                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                          ✓ {parsedItems.length} miniaturas detectadas no arquivo
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-foreground">Clique para selecionar seu arquivo .csv</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Suporta separador por vírgula ou ponto e vírgula
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Pre-validation Instructions */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-[11px] text-muted-foreground space-y-1.5">
                <span className="font-bold text-foreground block">💡 Dica para Melhor Precisão:</span>
                <p>
                  O sistema valida no catálogo oficial preferencialmente pelo <strong>Código Identificador</strong> (ex:{' '}
                  <code>JJH83</code>, <code>HKJ72</code>) gravado na base do carrinho ou na cartela.
                </p>
                <p>
                  Caso não tenha o código, você pode preencher o <strong>Nome do Modelo</strong> e <strong>Ano</strong>.
                  Miniaturas que não forem encontradas serão apontadas no arquivo de rejeição para sua conferência.
                </p>
              </div>
            </>
          ) : (
            /* Results Step */
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Importadas com Sucesso
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{result.importedCount}</p>
                  <span className="text-[10px] text-muted-foreground">Já adicionadas à sua coleção</span>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    result.rejectedCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-secondary/50 border-border'
                  }`}
                >
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      result.rejectedCount > 0 ? 'text-amber-400' : 'text-muted-foreground'
                    }`}
                  >
                    <AlertOctagon className="h-4 w-4" /> Não Importadas
                  </span>
                  <p
                    className={`text-2xl font-black mt-1 ${
                      result.rejectedCount > 0 ? 'text-amber-400' : 'text-muted-foreground'
                    }`}
                  >
                    {result.rejectedCount}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Miniaturas não localizadas</span>
                </div>
              </div>

              {/* Rejection Notice & Button */}
              {result.rejectedCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        {result.rejectedCount} miniaturas precisam da sua atenção
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Baixe a planilha de rejeição contendo os motivos para cada miniatura não importada.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadRejections}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 shadow-glow transition-all shrink-0"
                    >
                      <Download className="h-4 w-4" /> Baixar Rejeições (.csv)
                    </button>
                  </div>

                  {/* Rejected preview table */}
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background/50">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-secondary text-muted-foreground font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">Código</th>
                          <th className="p-2">Nome</th>
                          <th className="p-2">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.rejected.slice(0, 10).map((r, i) => (
                          <tr key={i} className="hover:bg-secondary/30">
                            <td className="p-2 font-mono font-bold text-foreground">{r.code || '-'}</td>
                            <td className="p-2 text-foreground truncate max-w-[150px]">{r.name || '-'}</td>
                            <td className="p-2 text-rose-400 font-medium">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.rejected.length > 10 && (
                      <div className="p-2 text-center text-[10px] text-muted-foreground bg-secondary/20">
                        + {result.rejected.length - 10} outros itens no arquivo baixado
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/20">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={parsedItems.length === 0 || isProcessing}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow-glow transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importando {parsedItems.length} miniaturas...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Iniciar Importação ({parsedItems.length})
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Importar Outro Arquivo
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow-glow transition-all"
              >
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
