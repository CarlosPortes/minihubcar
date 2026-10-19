'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SwitchCamera,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  Layers,
  Search,
} from 'lucide-react';
import {
  aiIdentifierApi,
  IdentifyMiniatureResponse,
  MiniatureMatchResult,
} from '@/lib/api/ai-identifier';

interface MiniatureCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVariation?: (variationId: string) => void;
}

export function MiniatureCameraScannerModal({
  isOpen,
  onClose,
  onSelectVariation,
}: MiniatureCameraScannerModalProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [textHint, setTextHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('Analisando contornos e geometria...');
  const [result, setResult] = useState<IdentifyMiniatureResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Iniciar câmera do dispositivo
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador não suporta acesso direto à câmera.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      setCameraActive(false);
      setCameraError(
        'Não foi possível acessar a câmera. Você pode selecionar uma foto da galeria ou arquivo.'
      );
      setMode('upload');
    }
  }, [facingMode]);

  // Parar stream da câmera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Efeito para ligar/desligar câmera ao abrir/fechar modal
  useEffect(() => {
    if (isOpen && mode === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, capturedImage, startCamera, stopCamera]);

  // Reset ao fechar
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setResult(null);
    setErrorMsg(null);
    setTextHint('');
    onClose();
  };

  // Capturar frame atual do vídeo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Upload de arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Executar identificação via IA
  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setResult(null);

    // Mensagens de progresso dinâmico
    const msgs = [
      'Analisando linhas da carroceria e pintura...',
      'Identificando fabricante, marca e escala...',
      'Lendo cartela, série e detalhes gráficos...',
      'Cruzando com catálogo oficial do MiniHub Car...',
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setAnalysisProgress(msgs[msgIdx]);
    }, 900);

    try {
      const data = await aiIdentifierApi.identifyMiniature({
        imageBase64: capturedImage,
        textHint: textHint.trim() || undefined,
      });

      setResult(data);
    } catch (err: any) {
      console.error('Falha ao identificar miniatura:', err);
      setErrorMsg(
        err.message || 'Falha ao analisar a imagem. Tente novamente com uma foto mais nítida ou iluminada.'
      );
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  // Resetar captura para tirar outra foto
  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    setErrorMsg(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-primary/30 bg-card text-card-foreground shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Scanner de Miniaturas por IA
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Multimodal
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Aponte a câmera para a miniatura ou cartela para identificar no catálogo
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Caso 1: Ainda não tirou a foto (Viewfinder ou Upload Dropzone) */}
          {!capturedImage && !result && (
            <div className="space-y-4">
              {/* Seletor de Modo (Câmera vs Upload) */}
              <div className="flex rounded-xl bg-muted/60 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setMode('camera');
                    startCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'camera'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  Câmera ao Vivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('upload');
                    stopCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'upload'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Enviar Foto / Galeria
                </button>
              </div>

              {/* Viewfinder da Câmera */}
              {mode === 'camera' && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-primary/40 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Retículo Holográfico / Visor de Scanner */}
                  <div className="absolute inset-4 pointer-events-none border border-primary/30 rounded-xl flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="text-[10px] tracking-widest uppercase font-mono text-primary/80 bg-black/60 px-2 py-0.5 rounded">
                        MINIHUB IA // 1:64 SCAN
                      </div>
                      <div className="w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                    </div>

                    {/* Linha laser de varredura animada */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-bounce" />

                    <div className="flex justify-between items-end">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="text-[10px] font-sans text-white/70 bg-black/60 px-2 py-0.5 rounded">
                        Enquadre o modelo ou a cartela
                      </div>
                      <div className="w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                    </div>
                  </div>

                  {/* Controles sobre o vídeo */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFacingMode((prev) =>
                          prev === 'environment' ? 'user' : 'environment'
                        )
                      }
                      title="Alternar Câmera"
                      className="p-3 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105"
                    >
                      <SwitchCamera className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={capturePhoto}
                      title="Capturar Foto"
                      className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-white/20 transition-all active:scale-95 hover:scale-105"
                    >
                      <Camera className="h-7 w-7" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('upload');
                        stopCamera();
                      }}
                      title="Usar arquivo da galeria"
                      className="p-3 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Modo Upload de Imagem */}
              {mode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-2xl p-8 text-center bg-card/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Clique para escolher ou tire uma foto
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aceita JPG, PNG, WebP de miniaturas soltas ou em cartela lacrada
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Caso 2: Imagem Capturada (Prévia & Ajustes antes de Identificar) */}
          {capturedImage && !result && (
            <div className="space-y-4">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-border">
                {/* Imagem de preview */}
                <img
                  src={capturedImage}
                  alt="Prévia capturada"
                  className="w-full h-full object-contain"
                />

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center p-6 animate-in fade-in">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-bold text-foreground">
                        IA do MiniHub em Ação
                      </p>
                      <p className="text-xs text-muted-foreground font-medium animate-pulse">
                        {analysisProgress}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Campo para Dica Opcional */}
              {!isAnalyzing && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Dica opcional para auxiliar a IA (opcional):
                    </label>
                    <input
                      type="text"
                      value={textHint}
                      onChange={(e) => setTextHint(e.target.value)}
                      placeholder="Ex: Datsun 510, Boulevard, Matchbox, ano 2024..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted font-medium text-xs text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Tirar Outra Foto
                    </button>

                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      Identificar Miniatura com IA
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Caso 3: Resultados Encontrados pela IA */}
          {result && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Card de Diagnóstico da IA */}
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                        Diagnóstico da Inteligência Artificial
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        {result.analysis.modelName}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {Math.round(result.analysis.confidence * 100)}% Confiança
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {result.engineUsed === 'gemini-vision'
                        ? 'Google Gemini Multimodal'
                        : 'Motor Heurístico'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Fabricante:</span>
                    <span className="font-semibold text-foreground">
                      {result.analysis.manufacturer}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Cor Principal:</span>
                    <span className="font-semibold text-foreground">
                      {result.analysis.primaryColor || 'Não especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Série / Linha:</span>
                    <span className="font-semibold text-foreground">
                      {result.analysis.series || 'Geral'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Ano:</span>
                    <span className="font-semibold text-foreground">
                      {result.analysis.year || 'N/D'}
                    </span>
                  </div>
                </div>

                {result.analysis.observations && (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40 italic">
                    "{result.analysis.observations}"
                  </p>
                )}
              </div>

              {/* Lista de Variações Correspondentes no Catálogo Oficial */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Correspondências no Catálogo Oficial ({result.matches.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Clique para ver ou catalogar
                  </span>
                </div>

                {result.matches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Nenhuma miniatura idêntica encontrada no banco local com esses termos.
                    Você pode refinar adicionando uma dica ou solicitar a inclusão no catálogo.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {result.matches.map((item) => (
                      <div
                        key={item.variationId}
                        className="rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/50 transition-all p-3 flex flex-col sm:flex-row items-center gap-3 justify-between group shadow-sm"
                      >
                        {/* Foto & Info */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.castingName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-xs text-muted-foreground font-mono">1:64</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {item.castingName}
                              </h5>
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/20 text-primary">
                                {item.confidenceScore}% Match
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.brandName || 'Hot Wheels'} • {item.seriesName || 'Mainline'} •{' '}
                              {item.releaseYear || ''} • {item.color || ''}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.matchedReasons.slice(0, 2).map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded"
                                >
                                  ✓ {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                          <Link
                            href={`/catalog/${item.variationId}`}
                            onClick={handleClose}
                            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
                            title="Ver detalhes da miniatura"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver
                          </Link>

                          <Link
                            href={`/collection?addVariationId=${item.variationId}`}
                            onClick={handleClose}
                            className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Adicionar à Coleção
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão para Nova Varredura */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Escanear Outra Miniatura
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
