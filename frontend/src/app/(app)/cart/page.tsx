'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/auth-context';
import { commercialApi, CartItemResponse } from '@/lib/api/commercial';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  MapPin,
  Warehouse,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [checkoutMode, setCheckoutMode] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'DELIVERY' | 'GARAGE'>('DELIVERY');
  const [recipientName, setRecipientName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-cart', user?.id],
    queryFn: async () => {
      const res = await commercialApi.getCart();
      return res.data;
    },
    enabled: !!user?.id,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      commercialApi.updateCartQuantity(itemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-cart'] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => commercialApi.removeFromCart(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-cart'] }),
  });

  const clearCartMutation = useMutation({
    mutationFn: () => commercialApi.clearCart(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-cart'] }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      return commercialApi.checkout({
        deliveryMode,
        shippingAddressSnapshot:
          deliveryMode === 'DELIVERY'
            ? {
                recipientName,
                street,
                number,
                complement: complement || undefined,
                neighborhood,
                city,
                state,
                zipCode,
              }
            : undefined,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-cart'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      router.push(`/orders?newOrder=${res.data.orderNumber}`);
    },
  });

  if (isLoading) {

    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  const items = data?.items || [];
  const subtotal = parseFloat(data?.subtotal || '0');

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-card rounded-2xl border border-border p-8 space-y-4">
        <div className="h-16 w-16 mx-auto rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Seu Carrinho está Vazio</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Explore o marketplace da comunidade e adquira miniaturas raras diretamente de colecionadores autorizados.
        </p>
        <div className="pt-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover shadow-glow transition-all"
          >
            Explorar Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Meu Carrinho</h1>
          <p className="text-xs text-muted-foreground">
            {data?.totalItems} item(s) selecionado(s) de colecionadores
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Tem certeza que deseja esvaziar o carrinho?')) {
              clearCartMutation.mutate();
            }
          }}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
        >
          Esvaziar Carrinho
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items Column */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item: CartItemResponse) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-border bg-card hover:border-border/80 transition-all"
            >
              {/* Image */}
              <div className="h-24 w-24 shrink-0 rounded-lg bg-secondary/40 border border-border flex items-center justify-center overflow-hidden">
                {item.variation.photoUrl ? (
                  <img
                    src={item.variation.photoUrl}
                    alt={item.variation.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>

              {/* Information */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {item.variation.brandName}
                  </span>
                  <button
                    onClick={() => removeItemMutation.mutate(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Remover do carrinho"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-foreground leading-tight">
                  {item.variation.name}
                </h3>

                <p className="text-xs text-muted-foreground">
                  Vendedor: <span className="font-semibold text-foreground">{item.seller.storeName}</span>
                </p>

                <div className="pt-2 flex items-center justify-between">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden">
                    <button
                      disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                      onClick={() =>
                        updateQuantityMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                      }
                      className="p-1.5 hover:bg-secondary disabled:opacity-30 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-foreground">{item.quantity}</span>
                    <button
                      disabled={
                        item.quantity >= item.inventory.available || updateQuantityMutation.isPending
                      }
                      onClick={() =>
                        updateQuantityMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                      }
                      className="p-1.5 hover:bg-secondary disabled:opacity-30 transition-colors"
                      title={
                        item.quantity >= item.inventory.available
                          ? 'Estoque máximo atingido'
                          : undefined
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">
                      R$ {item.unitPrice.toFixed(2)} cada
                    </span>
                    <span className="text-base font-black text-foreground">
                      R$ {item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Checkout Box */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-base font-bold text-foreground">Resumo do Pedido</h3>

            <div className="space-y-2 text-sm text-muted-foreground border-b border-border/60 pb-3">
              <div className="flex justify-between">
                <span>Subtotal ({data?.totalItems} itens)</span>
                <span className="font-semibold text-foreground">
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span className="font-semibold text-emerald-500">Grátis (Promoção)</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-2xl font-black text-foreground">
                R$ {subtotal.toFixed(2)}
              </span>
            </div>

            {!checkoutMode ? (
              <button
                onClick={() => setCheckoutMode(true)}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-hover shadow-glow flex items-center justify-center gap-2 transition-all"
              >
                Prosseguir para Checkout <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="space-y-4 pt-2">
                {/* Delivery Mode Selector */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Forma de Recebimento
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('DELIVERY')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                        deliveryMode === 'DELIVERY'
                          ? 'border-primary bg-primary/10 text-foreground font-bold shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <Truck className="h-3.5 w-3.5 text-primary" /> Entrega Direta
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Enviar para o meu endereço
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMode('GARAGE')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                        deliveryMode === 'GARAGE'
                          ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-bold shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <Warehouse className="h-3.5 w-3.5 text-emerald-500" /> Na Garagem
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Guardar na loja p/ consolidar
                      </span>
                    </button>
                  </div>
                </div>

                {deliveryMode === 'GARAGE' ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                      <Warehouse className="h-4 w-4" /> Garagem do Colecionador Ativada
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Sua miniatura ficará guardada com segurança no estoque do vendedor. Você poderá fazer novas compras ou participar de pré-vendas e solicitar um único envio combinado no futuro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Endereço de Entrega
                    </p>

                    <input
                      type="text"
                      placeholder="Nome de quem vai receber"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="CEP (ex: 01310-100)"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Estado (UF)"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Rua / Logradouro"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="col-span-2 h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Nº"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Complemento (Apt, Bloco)"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="w-full h-8 px-2.5 rounded bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {checkoutMutation.error && (
                  <div className="p-2 text-xs text-destructive bg-destructive/10 rounded border border-destructive/20">
                    {(checkoutMutation.error as any).message || 'Falha ao processar checkout.'}
                  </div>
                )}

                <button
                  disabled={
                    (deliveryMode === 'DELIVERY' &&
                      (!recipientName || !street || !number || !city || !state)) ||
                    checkoutMutation.isPending
                  }
                  onClick={() => checkoutMutation.mutate()}
                  className={`w-full h-11 rounded-lg text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                    deliveryMode === 'GARAGE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {checkoutMutation.isPending
                    ? 'Confirmando Pedido...'
                    : deliveryMode === 'GARAGE'
                    ? 'Confirmar e Guardar na Garagem'
                    : 'Finalizar Pedido com Envio'}
                </button>

                <button
                  onClick={() => setCheckoutMode(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-1"
                >
                  Voltar à edição dos itens
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
