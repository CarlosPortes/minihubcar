'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Layers,
  MapPin,
  RefreshCw,
  FileText,
  HelpCircle,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import {
  downloadLocationsTemplate,
  downloadCollectionTemplate,
  exportFailureReportToCSV,
} from '@/lib/export/collection-exporter';
import {
  importExportApi,
  LocationImportResult,
  CollectionImportResult,
} from '@/lib/api/import-export';

type ImportTab = 'collection' | 'locations';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportTab>('collection');

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewLines, setFilePreviewLines] = useState<string[]>([]);
  const [fileTotalLines, setFileTotalLines] = useState<number>(0);
  const [fileContentText, setFileContentText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results state
  const [collectionResult, setCollectionResult] = useState<CollectionImportResult | null>(null);
  const [locationsResult, setLocationsResult] = useState<LocationImportResult | null>(null);
  const [resultSubTab, setResultSubTab] = useState<'failures' | 'successes'>('failures');

  const handleTabChange = (tab: ImportTab) => {
    setActiveTab(tab);
    resetUpload();
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setFilePreviewLines([]);
    setFileTotalLines(0);
    setFileContentText('');
    setErrorMessage(null);
    setCollectionResult(null);
    setLocationsResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setErrorMessage('Por favor, selecione um arquivo em formato CSV (.csv).');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setCollectionResult(null);
    setLocationsResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setFileContentText(text);

      const lines = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      setFileTotalLines(Math.max(0, lines.length - 1)); // subtract header
      setFilePreviewLines(lines.slice(0, 4)); // header + 3 preview rows
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o conteúdo do arquivo.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]!);
    }
  };

  const handleStartImport = async () => {
    if (!fileContentText) {
      setErrorMessage('Nenhum conteúdo de arquivo para processar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (activeTab === 'collection') {
        const res = await importExportApi.importCollectionText(fileContentText);
        setCollectionResult(res);
        setResultSubTab(res.failedCount > 0 ? 'failures' : 'successes');
      } else {
        const res = await importExportApi.importLocationsText(fileContentText);
        setLocationsResult(res);
        setResultSubTab(res.failedCount > 0 ? 'failures' : 'successes');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Falha ao processar importação. Verifique o formato do arquivo.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card/90 to-primary/10 border border-border p-6 md:p-8">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            Carga de Dados & Migração em Massa
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Importação de Coleção e Estrutura de Locais
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-3xl leading-relaxed">
            Cadastre rapidamente centenas de miniaturas ou a árvore física das suas prateleiras e expositores.
            Baixe nossos modelos padronizados no Excel/CSV, preencha seus dados e receba uma validação detalhada
            com relatório de logs linha a linha.
          </p>
        </div>
      </div>

      {/* Two-step Recommended Workflow Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border/70 p-5 space-y-2 relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Passo 1: Estrutura de Locais (Opcional)</h2>
              <p className="text-xs text-muted-foreground">
                Crie seus armários, expositores com nichos ou caixas numeradas.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/90 pl-11">
            Se deseja vincular suas miniaturas a locais físicos específicos logo na importação, cadastre
            ou importe a estrutura de locais primeiro.
          </p>
        </div>

        <div className="rounded-xl bg-card border border-border/70 p-5 space-y-2 relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Passo 2: Carga da Coleção</h2>
              <p className="text-xs text-muted-foreground">
                Importe por SKU, Código Mattel ou Código de Barras (EAN).
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/90 pl-11">
            A miniatura deve constar no catálogo oficial e o local deve existir no seu cadastro para ser validado.
          </p>
        </div>
      </div>

      {/* Download Templates Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Modelos Oficiais para Preenchimento</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Locais */}
          <div className="rounded-xl bg-card border border-border p-5 space-y-4 hover:border-border/80 transition-all shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Template de Locais Físicos</h3>
                  <span className="text-[11px] text-muted-foreground font-mono">template_locais_minihubcar.csv</span>
                </div>
              </div>
              <button
                onClick={downloadLocationsTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar CSV
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1.5 bg-secondary/40 p-3 rounded-lg border border-border/40">
              <p className="font-medium text-foreground">Colunas inclusas:</p>
              <p className="font-mono text-[11px] text-amber-500">
                Nome; Local_Pai; Tipo; Tem_Grade; Linhas; Colunas
              </p>
              <p className="text-[11px] text-muted-foreground">
                Permite hierarquia (ex: Prateleira 1 com pai &quot;Estante Principal&quot;) e expositores com grade (Linhas × Colunas).
              </p>
            </div>
          </div>

          {/* Card 2: Coleção */}
          <div className="rounded-xl bg-card border border-border p-5 space-y-4 hover:border-border/80 transition-all shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Template de Miniaturas da Coleção</h3>
                  <span className="text-[11px] text-muted-foreground font-mono">template_colecao_minihubcar.csv</span>
                </div>
              </div>
              <button
                onClick={downloadCollectionTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar CSV
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1.5 bg-secondary/40 p-3 rounded-lg border border-border/40">
              <p className="font-medium text-foreground">Colunas inclusas:</p>
              <p className="font-mono text-[11px] text-primary">
                Codigo_Identificador; Quantidade; Condicao; Localizacao; Linha_Grade; Coluna_Grade; Preco_Pago; Data_Aquisicao; Observacoes
              </p>
              <p className="text-[11px] text-muted-foreground">
                Validação estrita de Código no catálogo oficial e da Localização na sua conta.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Upload Section */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-secondary/20">
          <button
            onClick={() => handleTabChange('collection')}
            className={`flex-1 py-3.5 px-4 text-center font-semibold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'collection'
                ? 'border-primary text-primary bg-background/50'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            Importar Miniaturas da Coleção
          </button>
          <button
            onClick={() => handleTabChange('locations')}
            className={`flex-1 py-3.5 px-4 text-center font-semibold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'locations'
                ? 'border-amber-500 text-amber-500 bg-background/50'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Importar Estrutura de Locais Físicos
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Informative Note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              {activeTab === 'collection' ? (
                <span>
                  <strong>Atenção:</strong> No arquivo da coleção, o campo <code>Codigo_Identificador</code>{' '}
                  (Código Mattel como HKG34, SKU ou Código de barras) será validado contra o catálogo oficial.
                  Se o código não existir ou se a <code>Localizacao</code> informada não estiver previamente
                  cadastrada na sua conta, a linha será rejeitada com log explicativo.
                </span>
              ) : (
                <span>
                  <strong>Dica de Locais:</strong> Locais sem <code>Local_Pai</code> serão criados como
                  raízes (ex: Estante Sala). Locais com <code>Local_Pai</code> serão vinculados automaticamente.
                  Caso o local já exista pelo mesmo nome, ele será reaproveitado com segurança.
                </span>
              )}
            </div>
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-primary/50 bg-primary/5'
                : 'border-border/80 hover:border-primary/50 hover:bg-secondary/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".csv,.txt"
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div>
                  <p className="font-semibold text-foreground text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {fileTotalLines} linhas de dados detectadas
                  </p>
                  <p className="text-xs text-primary font-medium mt-2">Clique ou arraste outro para substituir</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    Arraste o arquivo CSV aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato aceito: .CSV delimitado por ponto-e-vírgula (;) ou vírgula (,)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File Preview */}
          {selectedFile && filePreviewLines.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                  Prévia das primeiras linhas do arquivo:
                </span>
                <span>{fileTotalLines} linhas para importar</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/60 bg-secondary/20 p-3 font-mono text-[11px] space-y-1 text-muted-foreground">
                {filePreviewLines.map((line, idx) => (
                  <div key={idx} className={idx === 0 ? 'font-bold text-foreground pb-1 border-b border-border/40' : ''}>
                    {idx === 0 ? 'Cabeçalho: ' : `Linha ${idx + 1}: `}
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {selectedFile && (
              <button
                type="button"
                onClick={resetUpload}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Limpar
              </button>
            )}

            <button
              type="button"
              onClick={handleStartImport}
              disabled={!selectedFile || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando & Validando...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Iniciar Carga e Validação
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results & Logs Section */}
      {(collectionResult || locationsResult) && (
        <div className="rounded-2xl bg-card border border-border p-6 md:p-8 space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Relatório Detalhado de Processamento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confira os itens que foram importados com sucesso e as inconsistências encontradas
              </p>
            </div>

            {/* Export Rejections Button if there are failures */}
            {((collectionResult && collectionResult.failedCount > 0) ||
              (locationsResult && locationsResult.failedCount > 0)) && (
              <button
                onClick={() => {
                  if (activeTab === 'collection' && collectionResult) {
                    exportFailureReportToCSV(collectionResult.failures, 'collection');
                  } else if (locationsResult) {
                    exportFailureReportToCSV(locationsResult.failures, 'locations');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar Planilha com Falhas para Correção
              </button>
            )}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total */}
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <span className="text-xs font-medium text-muted-foreground">Linhas Analisadas</span>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {activeTab === 'collection' ? collectionResult?.total : locationsResult?.total}
              </p>
            </div>

            {/* Success */}
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Importados com Sucesso
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {activeTab === 'collection'
                  ? collectionResult?.successCount
                  : locationsResult?.successCount}
              </p>
            </div>

            {/* Failures */}
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  Itens com Falha / Inconsistência
                </span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {activeTab === 'collection'
                  ? collectionResult?.failedCount
                  : locationsResult?.failedCount}
              </p>
            </div>
          </div>

          {/* Subtabs for Results: Failures vs Successes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <button
                onClick={() => setResultSubTab('failures')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  resultSubTab === 'failures'
                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Falhas e Inconsistências (
                {activeTab === 'collection'
                  ? collectionResult?.failedCount
                  : locationsResult?.failedCount}
                )
              </button>

              <button
                onClick={() => setResultSubTab('successes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  resultSubTab === 'successes'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sucessos (
                {activeTab === 'collection'
                  ? collectionResult?.successCount
                  : locationsResult?.successCount}
                )
              </button>
            </div>

            {/* TAB CONTENT: FAILURES */}
            {resultSubTab === 'failures' && (
              <div className="space-y-3">
                {((activeTab === 'collection' && collectionResult?.failedCount === 0) ||
                  (activeTab === 'locations' && locationsResult?.failedCount === 0)) ? (
                  <div className="p-8 text-center rounded-xl bg-secondary/20 border border-border/50 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    Parabéns! Todas as linhas do arquivo foram validadas e importadas sem nenhuma inconsistência.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-16">Linha</th>
                          <th className="py-2.5 px-3">
                            {activeTab === 'collection' ? 'Código Informado' : 'Nome do Local'}
                          </th>
                          {activeTab === 'collection' && (
                            <th className="py-2.5 px-3">Local Informado</th>
                          )}
                          <th className="py-2.5 px-4">Motivo da Inconsistência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {activeTab === 'collection'
                          ? collectionResult?.failures.map((f, idx) => (
                              <tr key={idx} className="hover:bg-rose-500/5 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                                  #{f.line}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-rose-500">
                                  {f.code || '(vazio)'}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {f.locationName || '—'}
                                </td>
                                <td className="py-2.5 px-4 text-foreground leading-relaxed">
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    {f.reason}
                                  </span>
                                </td>
                              </tr>
                            ))
                          : locationsResult?.failures.map((f, idx) => (
                              <tr key={idx} className="hover:bg-rose-500/5 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                                  #{f.line}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-rose-500">{f.name}</td>
                                <td className="py-2.5 px-4 text-foreground leading-relaxed">
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    {f.reason}
                                  </span>
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SUCCESSES */}
            {resultSubTab === 'successes' && (
              <div className="space-y-3">
                {((activeTab === 'collection' && collectionResult?.successCount === 0) ||
                  (activeTab === 'locations' && locationsResult?.successCount === 0)) ? (
                  <div className="p-8 text-center rounded-xl bg-secondary/20 border border-border/50 text-sm text-muted-foreground">
                    Nenhum item importado nesta execução.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground border-b border-border font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-16">Linha</th>
                          {activeTab === 'collection' ? (
                            <>
                              <th className="py-2.5 px-3">Código</th>
                              <th className="py-2.5 px-3">Miniatura Identificada</th>
                              <th className="py-2.5 px-3">Condição</th>
                              <th className="py-2.5 px-3">Localização Vinculada</th>
                              <th className="py-2.5 px-3">Posição</th>
                              <th className="py-2.5 px-3 text-right">Qtd</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2.5 px-3">Nome do Local</th>
                              <th className="py-2.5 px-3">Local Pai</th>
                              <th className="py-2.5 px-3">Tipo</th>
                              <th className="py-2.5 px-3">Dimensões Grade</th>
                              <th className="py-2.5 px-3">Ação</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {activeTab === 'collection'
                          ? collectionResult?.successes.map((s, idx) => (
                              <tr key={idx} className="hover:bg-emerald-500/5 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                                  #{s.line}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                                  {s.code}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-foreground">{s.name}</div>
                                  {s.brand && (
                                    <div className="text-[10px] text-muted-foreground">{s.brand}</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {s.condition}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {s.locationName || <span className="italic text-muted-foreground/60">Sem local</span>}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {s.slot || '—'}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                                  {s.quantity}
                                </td>
                              </tr>
                            ))
                          : locationsResult?.successes.map((s, idx) => (
                              <tr key={idx} className="hover:bg-emerald-500/5 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                                  #{s.line}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-foreground">{s.name}</td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {s.parentName || '— (Raiz)'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                                    {s.locationType || 'ESTANTE'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {s.dimensions || 'Sem grade'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      s.status === 'CREATED'
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                    }`}
                                  >
                                    {s.status === 'CREATED' ? 'Criado' : 'Reaproveitado'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
