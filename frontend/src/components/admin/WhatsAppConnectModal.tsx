'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from '@/lib/api/whatsapp';
import {
  X,
  MessageCircle,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  LogOut,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppConnectModal({ isOpen, onClose }: WhatsAppConnectModalProps) {
  const queryClient = useQueryClient();
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);

  // Status Query (polls every 4 seconds while modal is open)
  const {
    data: status,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['admin-whatsapp-status'],
    queryFn: whatsappApi.getStatus,
    enabled: isOpen,
    refetchInterval: (query) => (isOpen && !query.state.data?.connected ? 4000 : false),
  });

  // QR Code Query (polls every 3s if base64 is not ready yet)
  const {
    data: qrData,
    isLoading: isLoadingQR,
    refetch: refetchQR,
    isRefetching: isRefetchingQR,
  } = useQuery({
    queryKey: ['admin-whatsapp-qr'],
    queryFn: whatsappApi.getQRCode,
    enabled: isOpen && !status?.connected,
    refetchInterval: (query) => (isOpen && !query.state.data?.base64 && !status?.connected ? 3000 : false),
    retry: 2,
  });

  // Test Message Mutation
  const testMutation = useMutation({
    mutationFn: whatsappApi.sendTest,
    onSuccess: (data) => {
      setTestSuccessMessage(data.message);
      setTestErrorMessage(null);
    },
    onError: (err: any) => {
      setTestErrorMessage(err.message || 'Erro ao enviar mensagem de teste');
      setTestSuccessMessage(null);
    },
  });

  // Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-qr'] });
      setTestSuccessMessage(null);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setTestSuccessMessage(null);
      setTestErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = status?.connected === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Conexão WhatsApp (Evolution API)</h2>
              <p className="text-xs text-muted-foreground">
                Notificações instantâneas de novos colecionadores cadastrados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          {isLoadingStatus ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Verificando status do WhatsApp...</p>
            </div>
          ) : isConnected ? (
            /* CONECTADO */
            <div className="space-y-4 text-center py-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">WhatsApp Conectado com Sucesso!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  O bot do MiniHub Car está ativo na sua VPS. Você receberá um alerta automático toda vez que um novo
                  colecionador se registrar.
                </p>
              </div>

              {/* Admin Phone Box */}
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-left flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">Número de Notificação do Administrador:</p>
                  <p className="text-emerald-500 font-mono font-bold">
                    {status?.adminPhone ? `+${status.adminPhone}` : 'Não identificado (configure em seu Perfil)'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Os alertas serão disparados automaticamente para este número.
                  </p>
                </div>
              </div>

              {/* Success / Error alerts */}
              {testSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold text-left">
                  ✅ {testSuccessMessage}
                </div>
              )}
              {testErrorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-left">
                  ❌ {testErrorMessage}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {testMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Enviar Mensagem de Teste
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
                      disconnectMutation.mutate();
                    }
                  }}
                  disabled={disconnectMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            /* DESCONECTADO - MOSTRAR QR CODE */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-bold border border-amber-500/20">
                  <QrCode className="h-3.5 w-3.5" /> Aguardando Leitura do QR Code
                </span>
                <p className="text-xs text-muted-foreground pt-1">
                  Escaneie com o WhatsApp que fará o envio das notificações
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner border border-border w-64 h-64 mx-auto relative">
                {isLoadingQR || isRefetchingQR ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-medium">Gerando QR Code...</span>
                  </div>
                ) : qrData?.base64 ? (
                  <img
                    src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 text-center p-3">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <p className="text-xs font-semibold text-zinc-800">Aguardando geração do QR Code...</p>
                    <button
                      type="button"
                      onClick={() => refetchQR()}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer mt-1"
                    >
                      Gerar QR Code Agora
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border space-y-2 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Como conectar:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>
                    Toque em <strong>Aparelhos conectados</strong> no menu
                  </li>
                  <li>
                    Toque em <strong>Conectar um aparelho</strong>
                  </li>
                  <li>Aponte a câmera para o QR Code acima</li>
                </ol>
              </div>

              {/* Refresh QR */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => refetchQR()}
                  disabled={isRefetchingQR}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefetchingQR ? 'animate-spin' : ''}`} />
                  Recarregar QR Code
                </button>

                <button
                  type="button"
                  onClick={() => refetchStatus()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Verificar Conexão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
