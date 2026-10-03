'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commercialApi, SellerProfileResponse, OfferDetail } from '@/lib/api/commercial';
import { garageApi, SellerShippingIntegration } from '@/lib/api/garage';
import {
  listSellerPreOrders,
  getSellerPreOrdersReport,
  getSellerPreOrdersDashboard,
  markCampaignArrival,
  updatePreOrderFulfillment,
  settlePreOrderInstallment,
  updatePreOrderInstallment,
  updatePreOrderStatus,
  exportPreOrdersToCsv,
  listCollectorsStatus,
  getCollectorFinancialSummary,
  approvePreOrderReservation,
  rejectPreOrderReservation,
  SellerPreOrderItem,
  SellerPreOrderCampaignItem,
  SellerPreOrdersDashboardResponse,
  PreOrderInstallmentItem,
  PreOrderStatus,
  PaymentMethod,
  FulfillmentStatus,
  CollectorHealthStatus,
  CollectorHealthItem,
  CollectorsHealthResponse,
  CollectorFinancialSummaryResponse,
} from '@/lib/api/pre-orders';
import { calculateInstallmentSchedule } from '@/lib/utils/installments';
import {
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Package,
  TrendingUp,
  Tag,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Calendar,
  DollarSign,
  Download,
  CreditCard,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  Filter,
  Pause,
  Play,
  XCircle,
  Edit3,
  Warehouse,
  Truck,
  Users,
  ShieldAlert,
  UserCheck,
  UserX,
  Eye,
  MapPin,
  Trash2,
  Building,
  Scale,
  Navigation,
  Loader2,
  Key,
  Link2,
  Unlink,
  Globe,
  ExternalLink,
} from 'lucide-react';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import { SellerFinanceReportsTab } from '@/components/seller/SellerFinanceReportsTab';
import { QuickCreateMiniatureModal } from '@/components/seller/QuickCreateMiniatureModal';

export default function SellerPortalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'OFFERS' | 'PRE_ORDERS' | 'FINANCE_REPORTS' | 'COLLECTORS_STATUS' | 'SHIPPING_SETTINGS'>('OFFERS');

  // Application form states
  const [storeName, setStoreName] = useState('');
  const [bio, setBio] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Auto-fill registration address via ViaCEP
  const handleRegisterCepBlur = async () => {
    const clean = postalCode.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        setIsSearchingCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const json = await res.json();
        if (!json.erro) {
          if (json.logradouro) setStreet(json.logradouro);
          if (json.bairro) setNeighborhood(json.bairro);
          if (json.localidade) setCity(json.localidade);
          if (json.uf) setState(json.uf);
        }
      } catch (err) {
        console.error('ViaCEP lookup failed', err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  // Offer creation states
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerCondition, setOfferCondition] = useState('LACRADO');
  const [offerPackaging, setOfferPackaging] = useState('PERFEITO');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerStock, setOfferStock] = useState('1');
  const [packageWeightGrams, setPackageWeightGrams] = useState('150'); // 150g padrão p/ blister 1:64
  const [shippingAddressId, setShippingAddressId] = useState<string>('');

  // Quick create miniature modal state
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

  // Pre-Order offer fields
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [preOrderEstimatedArrival, setPreOrderEstimatedArrival] = useState('');
  const [allowDepositAndBalance, setAllowDepositAndBalance] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [allowFullOnArrival, setAllowFullOnArrival] = useState(true);
  const [allowInstallments, setAllowInstallments] = useState(true);
  const [installmentsCount, setInstallmentsCount] = useState('4');
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [customFirstInstallment, setCustomFirstInstallment] = useState('');

  // Installment schedule calculation for seller offer
  const parsedOfferPrice = parseFloat(offerPrice) || 0;
  const parsedInstallmentCount = Math.max(1, Math.min(10, parseInt(installmentsCount, 10) || 1));
  const parsedFirstVal = customFirstInstallment && !isNaN(parseFloat(customFirstInstallment))
    ? parseFloat(customFirstInstallment)
    : undefined;

  const installmentSchedule = calculateInstallmentSchedule(
    parsedOfferPrice,
    parsedInstallmentCount,
    firstDueDate,
    parsedFirstVal
  );

  const isCustomFirstInvalid = parsedFirstVal !== undefined && parsedInstallmentCount > 1 && parsedFirstVal >= parsedOfferPrice;

  // Stock adjust modal state
  const [adjustingOffer, setAdjustingOffer] = useState<OfferDetail | null>(null);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');

  // Pre-Orders management state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [installmentFilter, setInstallmentFilter] = useState<string>('ALL');
  const [expandedPreOrders, setExpandedPreOrders] = useState<Record<string, boolean>>({});

  // Pre-Order Campaign Dashboard state
  const [campaignFilter, setCampaignFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'ARRIVED'>('ALL');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [arrivalModal, setArrivalModal] = useState<{
    isOpen: boolean;
    campaign: SellerPreOrderCampaignItem | null;
    arrivedAt: string;
  }>({
    isOpen: false,
    campaign: null,
    arrivedAt: new Date().toISOString().split('T')[0],
  });

  // Manual settlement (baixa) modal state
  const [settleModal, setSettleModal] = useState<{
    isOpen: boolean;
    preOrder: SellerPreOrderItem | null;
    installment: PreOrderInstallmentItem | null;
  }>({ isOpen: false, preOrder: null, installment: null });
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState('');
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('PIX');
  const [settleNotes, setSettleNotes] = useState('');

  // Edit installment modal state
  const [editInstallmentModal, setEditInstallmentModal] = useState<{
    isOpen: boolean;
    preOrder: SellerPreOrderItem | null;
    installment: PreOrderInstallmentItem | null;
  }>({ isOpen: false, preOrder: null, installment: null });
  const [editDueDate, setEditDueDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Collectors Status Grid & Drilldown state
  const [collectorScope, setCollectorScope] = useState<'my' | 'all'>('my');
  const [collectorHealthFilter, setCollectorHealthFilter] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
  const [collectorSearch, setCollectorSearch] = useState('');
  const [selectedCollectorId, setSelectedCollectorId] = useState<string | null>(null);

  // Pre-order approval / rejection action modal state
  const [approvalActionModal, setApprovalActionModal] = useState<{
    isOpen: boolean;
    preOrder: SellerPreOrderItem | any | null;
    type: 'APPROVE' | 'REJECT';
    reasonOrNotes: string;
  }>({
    isOpen: false,
    preOrder: null,
    type: 'APPROVE',
    reasonOrNotes: '',
  });

  // 1. Fetch seller profile
  const { data: profileRes, isLoading: isProfileLoading } = useQuery({
    queryKey: ['my-seller-profile', user?.id],
    queryFn: () => commercialApi.getMySellerProfile(),
    enabled: !!user?.id,
  });

  const profile = profileRes?.data;

  // 2. Fetch seller offers if approved
  const { data: offersRes } = useQuery({
    queryKey: ['my-seller-offers', user?.id],
    queryFn: () => commercialApi.listMySellerOffers(),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  const offers = offersRes?.data || [];

  // 3. Fetch seller sales
  const { data: salesRes } = useQuery({
    queryKey: ['my-seller-sales', user?.id],
    queryFn: () => commercialApi.listMySellerSales(),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  const sales = salesRes?.data || [];

  // 4. Catalog search for new offer
  const { data: catalogResults } = useQuery({
    queryKey: ['catalog-search-for-offer', user?.id, catalogSearch],
    queryFn: async () => {
      if (!catalogSearch || catalogSearch.length < 2) return [];
      const res = await apiClient<any>('/catalog/search', {
        params: { q: catalogSearch, pageSize: 6 },
      });
      return res.data || [];
    },
    enabled: showCreateOffer && catalogSearch.length >= 2,
  });

  // 5. Pre-orders list query
  const { data: preOrdersRes, isLoading: isPreOrdersLoading } = useQuery({
    queryKey: ['seller-pre-orders', user?.id, statusFilter, installmentFilter],
    queryFn: () =>
      listSellerPreOrders({
        status: statusFilter !== 'ALL' ? (statusFilter as PreOrderStatus) : undefined,
        installmentStatus: installmentFilter !== 'ALL' ? installmentFilter : undefined,
      }),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  const preOrders: SellerPreOrderItem[] = preOrdersRes || [];

  // 6. Pre-orders report query
  const { data: reportData } = useQuery({
    queryKey: ['seller-pre-orders-report', user?.id],
    queryFn: () => getSellerPreOrdersReport(),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  // 7. Pre-orders dashboard query (3 cards + campaigns + buyer reservations)
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['seller-pre-orders-dashboard', user?.id, campaignFilter],
    queryFn: () => getSellerPreOrdersDashboard(campaignFilter),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  // 8. Collectors health & status query
  const { data: collectorsData, isLoading: isCollectorsLoading } = useQuery({
    queryKey: ['seller-collectors-status', user?.id, collectorScope, collectorHealthFilter, collectorSearch],
    queryFn: () =>
      listCollectorsStatus({
        scope: collectorScope,
        status: collectorHealthFilter !== 'ALL' ? collectorHealthFilter : undefined,
        search: collectorSearch || undefined,
      }),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  // 9. Collector financial summary (drilldown modal)
  const { data: collectorSummaryData, isLoading: isCollectorSummaryLoading } = useQuery({
    queryKey: ['collector-summary', user?.id, selectedCollectorId],
    queryFn: () => getCollectorFinancialSummary(selectedCollectorId!),
    enabled: !!selectedCollectorId,
  });

  // 10. Seller dispatch addresses query (multi-origem)
  const { data: addressesRes, isLoading: isAddressesLoading } = useQuery({
    queryKey: ['my-seller-addresses', profile?.id],
    queryFn: () => commercialApi.getMyShippingAddresses(),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });
  const shippingAddresses = addressesRes?.data || [];

  // 11. Seller shipping integrations query (BYOK: SuperFrete, Frete Rápido, Melhor Envio)
  const { data: shippingIntegrations = [], isLoading: isIntegrationsLoading } = useQuery({
    queryKey: ['seller-shipping-integrations', profile?.id],
    queryFn: () => garageApi.listShippingIntegrations(),
    enabled: profile?.authorizationStatus === 'APPROVED' && !!user?.id,
  });

  const [integrationModal, setIntegrationModal] = useState<{
    isOpen: boolean;
    provider: 'SUPERFRETE' | 'FRETE_RAPIDO' | 'MELHOR_ENVIO';
    apiKey: string;
    extraConfig: Record<string, any>;
    isActive: boolean;
  }>({
    isOpen: false,
    provider: 'SUPERFRETE',
    apiKey: '',
    extraConfig: {},
    isActive: true,
  });

  // Profile settings state (for approved sellers)
  const [editProfileStoreName, setEditProfileStoreName] = useState('');
  const [editProfileBio, setEditProfileBio] = useState('');
  const [editProfilePostalCode, setEditProfilePostalCode] = useState('');
  const [editProfileStreet, setEditProfileStreet] = useState('');
  const [editProfileNumber, setEditProfileNumber] = useState('');
  const [editProfileComplement, setEditProfileComplement] = useState('');
  const [editProfileNeighborhood, setEditProfileNeighborhood] = useState('');
  const [editProfileCity, setEditProfileCity] = useState('');
  const [editProfileState, setEditProfileState] = useState('');
  const [editProfilePhone, setEditProfilePhone] = useState('');
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [isSearchingProfileCep, setIsSearchingProfileCep] = useState(false);

  // Sync profile data to edit fields once loaded
  React.useEffect(() => {
    if (profile && !profileInitialized) {
      setEditProfileStoreName(profile.storeName || '');
      setEditProfileBio(profile.bio || '');
      setEditProfilePostalCode(profile.postalCode || '');
      setEditProfileStreet(profile.street || '');
      setEditProfileNumber(profile.number || '');
      setEditProfileComplement(profile.complement || '');
      setEditProfileNeighborhood(profile.neighborhood || '');
      setEditProfileCity(profile.city || '');
      setEditProfileState(profile.state || '');
      setEditProfilePhone(profile.phone || '');
      setProfileInitialized(true);
    }
  }, [profile, profileInitialized]);

  const handleProfileCepBlur = async () => {
    const clean = editProfilePostalCode.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        setIsSearchingProfileCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const json = await res.json();
        if (!json.erro) {
          if (json.logradouro) setEditProfileStreet(json.logradouro);
          if (json.bairro) setEditProfileNeighborhood(json.bairro);
          if (json.localidade) setEditProfileCity(json.localidade);
          if (json.uf) setEditProfileState(json.uf);
        }
      } catch (err) {
        console.error('ViaCEP lookup failed', err);
      } finally {
        setIsSearchingProfileCep(false);
      }
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      commercialApi.updateMySellerProfile({
        storeName: editProfileStoreName,
        bio: editProfileBio || null,
        postalCode: editProfilePostalCode || null,
        street: editProfileStreet || null,
        number: editProfileNumber || null,
        complement: editProfileComplement || null,
        neighborhood: editProfileNeighborhood || null,
        city: editProfileCity || null,
        state: editProfileState || null,
        phone: editProfilePhone || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-profile'] });
      alert('Dados cadastrais atualizados com sucesso!');
    },
  });

  // Modal and mutations for multiple shipping addresses (origins)
  const [addressModal, setAddressModal] = useState<{
    isOpen: boolean;
    addressId?: string;
    label: string;
    contactName: string;
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    phone: string;
    isDefault: boolean;
  }>({
    isOpen: false,
    label: '',
    contactName: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    phone: '',
    isDefault: false,
  });
  const [isSearchingAddressCep, setIsSearchingAddressCep] = useState(false);

  const handleAddressCepBlur = async () => {
    const clean = addressModal.postalCode.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        setIsSearchingAddressCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const json = await res.json();
        if (!json.erro) {
          setAddressModal((prev) => ({
            ...prev,
            street: json.logradouro || prev.street,
            neighborhood: json.bairro || prev.neighborhood,
            city: json.localidade || prev.city,
            state: json.uf || prev.state,
          }));
        }
      } catch (err) {
        console.error('ViaCEP lookup failed', err);
      } finally {
        setIsSearchingAddressCep(false);
      }
    }
  };

  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      if (addressModal.addressId) {
        return commercialApi.updateShippingAddress(addressModal.addressId, {
          label: addressModal.label,
          contactName: addressModal.contactName || null,
          postalCode: addressModal.postalCode,
          street: addressModal.street,
          number: addressModal.number,
          complement: addressModal.complement || null,
          neighborhood: addressModal.neighborhood,
          city: addressModal.city,
          state: addressModal.state,
          phone: addressModal.phone || null,
          isDefault: addressModal.isDefault,
        });
      } else {
        return commercialApi.createShippingAddress({
          label: addressModal.label,
          contactName: addressModal.contactName || null,
          postalCode: addressModal.postalCode,
          street: addressModal.street,
          number: addressModal.number,
          complement: addressModal.complement || null,
          neighborhood: addressModal.neighborhood,
          city: addressModal.city,
          state: addressModal.state,
          phone: addressModal.phone || null,
          isDefault: addressModal.isDefault,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-addresses'] });
      setAddressModal({
        isOpen: false,
        label: '',
        contactName: '',
        postalCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        phone: '',
        isDefault: false,
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => commercialApi.deleteShippingAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-addresses'] });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: (id: string) => commercialApi.updateShippingAddress(id, { isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-addresses'] });
    },
  });

  const saveIntegrationMutation = useMutation({
    mutationFn: ({ provider, input }: { provider: string; input: any }) =>
      garageApi.saveShippingIntegration(provider, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-shipping-integrations'] });
      setIntegrationModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: (provider: string) => garageApi.deleteShippingIntegration(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-shipping-integrations'] });
    },
  });

  // Mutations
  const applyMutation = useMutation({
    mutationFn: () =>
      commercialApi.applyToSeller({
        storeName,
        bio: bio || undefined,
        postalCode: postalCode || undefined,
        street: street || undefined,
        number: number || undefined,
        complement: complement || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
        phone: phone || undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-seller-profile'] }),
  });

  const createOfferMutation = useMutation({
    mutationFn: () => {
      if (isPreOrder && allowInstallments && isCustomFirstInvalid) {
        throw new Error('O valor da 1ª parcela deve ser menor que o valor total da miniatura.');
      }

      // Schedule summary to attach to offer description
      const scheduleSummary = isPreOrder && allowInstallments && installmentSchedule.length > 1
        ? `Cronograma de Parcelamento (${parsedInstallmentCount}x):\n` +
          installmentSchedule
            .map((s) => `• Parcela ${s.installmentNumber}: ${s.dueDateFormatted} — R$ ${s.amount}${s.isFirst ? ' (Entrada)' : ''}`)
            .join('\n')
        : (isPreOrder && allowInstallments && installmentSchedule.length === 1
          ? `Parcelamento: 1x de R$ ${parsedOfferPrice.toFixed(2)} em ${installmentSchedule[0]?.dueDateFormatted}`
          : '');

      const finalDescription = [
        offerDescription?.trim(),
        scheduleSummary,
      ].filter(Boolean).join('\n\n');

      return commercialApi.createSellerOffer({
        variationId: selectedVariation.id,
        title: offerTitle || `${selectedVariation.name} - ${isPreOrder ? 'Pré-Venda' : 'Pronta Entrega'}`,
        price: offerPrice,
        condition: offerCondition,
        packagingState: offerPackaging || undefined,
        description: finalDescription || undefined,
        initialStock: parseInt(offerStock, 10) || 1,
        packageWeightGrams: parseInt(packageWeightGrams, 10) || 150,
        shippingAddressId: shippingAddressId || undefined,
        isPreOrder,
        preOrderEstimatedArrival: isPreOrder && preOrderEstimatedArrival ? preOrderEstimatedArrival : undefined,
        allowDepositAndBalance: isPreOrder ? allowDepositAndBalance : undefined,
        depositAmount: isPreOrder && allowInstallments && installmentSchedule[0]
          ? installmentSchedule[0].amount
          : (isPreOrder && allowDepositAndBalance && depositAmount ? depositAmount : undefined),
        allowFullOnArrival: isPreOrder ? allowFullOnArrival : undefined,
        allowInstallments: isPreOrder ? allowInstallments : undefined,
        maxInstallments: isPreOrder && allowInstallments ? parsedInstallmentCount : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-offers'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      setShowCreateOffer(false);
      setSelectedVariation(null);
      setOfferTitle('');
      setOfferPrice('');
      setOfferStock('1');
      setPackageWeightGrams('150');
      setShippingAddressId('');
      setIsPreOrder(false);
      setPreOrderEstimatedArrival('');
      setDepositAmount('');
      setInstallmentsCount('4');
      setCustomFirstInstallment('');
    },
  });

  const updateOfferStatusMutation = useMutation({
    mutationFn: ({ offerId, status }: { offerId: string; status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' }) =>
      commercialApi.updateSellerOffer(offerId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-offers'] });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: () => {
      if (!adjustingOffer) throw new Error('Nenhuma oferta selecionada');
      return commercialApi.adjustOfferStock(adjustingOffer.id, {
        type: adjustType,
        quantity: parseInt(adjustQuantity, 10) || 1,
        reason: adjustReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-offers'] });
      setAdjustingOffer(null);
      setAdjustQuantity('1');
      setAdjustReason('');
    },
  });

  const settleMutation = useMutation({
    mutationFn: () => {
      if (!settleModal.preOrder || !settleModal.installment) throw new Error('Dados inválidos');
      return settlePreOrderInstallment(settleModal.preOrder.id, settleModal.installment.id, {
        paidAmount: settleAmount ? settleAmount : undefined,
        paidAt: settleDate ? new Date(settleDate).toISOString() : undefined,
        paymentMethod: settleMethod,
        notes: settleNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      setSettleModal({ isOpen: false, preOrder: null, installment: null });
      setSettleAmount('');
      setSettleNotes('');
    },
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: () => {
      if (!editInstallmentModal.preOrder || !editInstallmentModal.installment) throw new Error('Dados inválidos');
      return updatePreOrderInstallment(
        editInstallmentModal.preOrder.id,
        editInstallmentModal.installment.id,
        {
          dueDate: editDueDate || null,
          amount: editAmount || undefined,
          description: editDescription || undefined,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      setEditInstallmentModal({ isOpen: false, preOrder: null, installment: null });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ preOrderId, status }: { preOrderId: string; status: PreOrderStatus }) =>
      updatePreOrderStatus(preOrderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
    },
  });

  const markArrivalMutation = useMutation({
    mutationFn: () => {
      if (!arrivalModal.campaign) throw new Error('Campanha não selecionada');
      return markCampaignArrival(
        arrivalModal.campaign.offerId || arrivalModal.campaign.id,
        arrivalModal.arrivedAt ? new Date(arrivalModal.arrivedAt).toISOString() : undefined
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['my-seller-offers'] });
      setArrivalModal({ isOpen: false, campaign: null, arrivedAt: '' });
    },
  });

  const updatePreOrderFulfillmentMutation = useMutation({
    mutationFn: ({ preOrderId, fulfillmentStatus }: { preOrderId: string; fulfillmentStatus: FulfillmentStatus }) =>
      updatePreOrderFulfillment(preOrderId, { fulfillmentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
    },
  });

  const updateSaleFulfillmentMutation = useMutation({
    mutationFn: ({ orderItemId, fulfillmentStatus }: { orderItemId: string; fulfillmentStatus: 'NA_GARAGEM' | 'ENTREGUE' }) =>
      commercialApi.updateSaleFulfillment(orderItemId, fulfillmentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-sales'] });
    },
  });

  const approveReservationMutation = useMutation({
    mutationFn: ({ preOrderId, notes }: { preOrderId: string; notes?: string }) =>
      approvePreOrderReservation(preOrderId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['seller-collectors-status'] });
      queryClient.invalidateQueries({ queryKey: ['collector-summary'] });
      setApprovalActionModal({ isOpen: false, preOrder: null, type: 'APPROVE', reasonOrNotes: '' });
    },
  });

  const rejectReservationMutation = useMutation({
    mutationFn: ({ preOrderId, reason }: { preOrderId: string; reason?: string }) =>
      rejectPreOrderReservation(preOrderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['seller-collectors-status'] });
      queryClient.invalidateQueries({ queryKey: ['collector-summary'] });
      queryClient.invalidateQueries({ queryKey: ['my-seller-offers'] });
      setApprovalActionModal({ isOpen: false, preOrder: null, type: 'REJECT', reasonOrNotes: '' });
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedPreOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandCampaign = (offerId: string) => {
    setExpandedCampaigns((prev) => ({ ...prev, [offerId]: !prev[offerId] }));
  };

  const openSettleModal = (po: SellerPreOrderItem, inst: PreOrderInstallmentItem) => {
    setSettleModal({ isOpen: true, preOrder: po, installment: inst });
    setSettleAmount(parseFloat(inst.amount).toFixed(2));
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleMethod('PIX');
    setSettleNotes('');
  };

  const openEditInstallmentModal = (po: SellerPreOrderItem, inst: PreOrderInstallmentItem) => {
    setEditInstallmentModal({ isOpen: true, preOrder: po, installment: inst });
    setEditDueDate(inst.dueDate ? inst.dueDate.split('T')[0] : '');
    setEditAmount(parseFloat(inst.amount).toFixed(2));
    setEditDescription(inst.description || '');
  };

  if (isProfileLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  // --- STATE 1: NOT REGISTERED AS SELLER ---
  if (!profile || profile.authorizationStatus === 'NONE') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-6 md:p-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary border border-primary/30">
            <Store className="h-3.5 w-3.5" /> Programa de Vendedores
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            Venda Miniaturas no Marketplace
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Torne-se um vendedor verificado no MiniHub Car. Anuncie peças da sua coleção,
            crie pré-vendas com parcelamento controlado e conte com gestão de estoques, baixas manuais e relatórios.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Formulário de Credenciamento</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nome da sua Loja ou Garagem *
              </label>
              <input
                type="text"
                placeholder="Ex: Garagem Diecast Brasil"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Endereço de Origem para Cálculo de Frete */}
            <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> Endereço de Despacho (Cálculo de Frete)
                </span>
                <span className="text-[10px] text-muted-foreground">Necessário para cálculo exato de Correios/Jadlog</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">CEP *</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="00000-000"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      onBlur={handleRegisterCepBlur}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                    {isSearchingCep && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-3" />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">Logradouro / Rua *</label>
                  <input
                    type="text"
                    placeholder="Av. Paulista, Rua das Flores..."
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Número *</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Complemento</label>
                  <input
                    type="text"
                    placeholder="Apto 42, Bloco B (opcional)"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Bairro *</label>
                  <input
                    type="text"
                    placeholder="Centro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Cidade *</label>
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Estado (UF) *</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Biografia / Especialidade da Loja
              </label>
              <textarea
                rows={3}
                placeholder="Conte sobre sua coleção, especialidade (ex: Hot Wheels RLC, Matchbox, Tarmac Works, etc.)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {applyMutation.error && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                {(applyMutation.error as any).message || 'Erro ao enviar solicitação.'}
              </div>
            )}

            <button
              disabled={!storeName || applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {applyMutation.isPending ? 'Enviando...' : 'Enviar Solicitação para Moderação'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STATE 2: PENDING APPROVAL ---
  if (profile.authorizationStatus === 'PENDING') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4 p-8 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <Clock className="h-12 w-12 text-amber-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-bold text-foreground">Solicitação em Análise</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sua loja <strong className="text-foreground">{profile.storeName}</strong> foi enviada para a equipe de moderação do MiniHub Car. Assim que for aprovada, você receberá acesso total para criar anúncios e pré-vendas.
        </p>
      </div>
    );
  }

  // --- STATE 3: APPROVED SELLER DASHBOARD ---
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Vendedor Verificado
            </span>
            <span className="text-xs text-muted-foreground">
              {profile.city ? `${profile.city}, ${profile.state}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-black text-foreground">{profile.storeName}</h1>
          <p className="text-xs text-muted-foreground">{profile.bio || 'Gerencie seus anúncios, estoque e pré-vendas'}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateOffer(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow transition-all"
          >
            <Plus className="h-4 w-4" /> Criar Novo Anúncio
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('OFFERS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'OFFERS'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Package className="h-4 w-4" /> Pronta Entrega & Estoque ({offers.length})
        </button>

        <button
          onClick={() => setActiveTab('PRE_ORDERS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'PRE_ORDERS'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Clock className="h-4 w-4" /> Gestão de Pré-Vendas & Parcelas ({reportData?.metrics.totalPreOrders || 0})
          {(reportData?.metrics.overdueCount || 0) > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black animate-pulse">
              {reportData?.metrics.overdueCount} em atraso
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('FINANCE_REPORTS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'FINANCE_REPORTS'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <DollarSign className="h-4 w-4 text-emerald-500" /> Financeiro & Relatórios
        </button>

        <button
          onClick={() => setActiveTab('COLLECTORS_STATUS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'COLLECTORS_STATUS'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> Status dos Colecionadores
          {(collectorsData?.summary?.pendingApprovalsCount || 0) > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black animate-pulse">
              {collectorsData?.summary?.pendingApprovalsCount} pendente(s)
            </span>
          ) : (collectorsData?.summary?.redCount || 0) > 0 ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-destructive/90 text-white">
              {collectorsData?.summary?.redCount} inadimplente(s)
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('SHIPPING_SETTINGS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'SHIPPING_SETTINGS'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <MapPin className="h-4 w-4" /> Endereços & Envio ({shippingAddresses.length})
        </button>
      </div>

      {/* TAB 1: PRONTA ENTREGA & ESTOQUE */}
      {activeTab === 'OFFERS' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Ofertas Ativas</span>
              <p className="text-2xl font-black text-foreground">
                {offers.filter((o) => o.status === 'ACTIVE' || !o.status).length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Total de Vendas Concluídas</span>
              <p className="text-2xl font-black text-foreground">{sales.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Reputação na Comunidade</span>
              <p className="text-2xl font-black text-amber-500">
                ★ {parseFloat(profile.reputationScore).toFixed(1)} / 5.0
              </p>
            </div>
          </div>

          {/* Offers Table */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Meus Anúncios no Marketplace ({offers.length})</h3>
            </div>

            {offers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Você ainda não cadastrou anúncios para venda. Clique em "Criar Novo Anúncio" para começar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Miniatura</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Status Anúncio</th>
                      <th className="py-2.5 px-3">Preço</th>
                      <th className="py-2.5 px-3 text-center">Físico</th>
                      <th className="py-2.5 px-3 text-center">Disponível</th>
                      <th className="py-2.5 px-3 text-right">Ações do Vendedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {offers.map((off: OfferDetail) => {
                      const currentStatus = off.status || 'ACTIVE';
                      const isActive = currentStatus === 'ACTIVE';
                      const isPaused = currentStatus === 'PAUSED';
                      const isCancelled = currentStatus === 'CANCELLED';

                      return (
                        <tr key={off.id} className="hover:bg-secondary/20">
                          <td className="py-3 px-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                                {off.variation?.photoUrl ? (
                                  <img src={off.variation.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Layers className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold">{off.title}</p>
                                <p className="text-[10px] text-muted-foreground">{off.variation?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {off.isPreOrder ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-500 px-2 py-0.5 font-bold border border-amber-500/20 text-[10px]">
                                <Clock className="h-3 w-3" /> Pré-Venda
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-500 px-2 py-0.5 font-bold border border-emerald-500/20 text-[10px]">
                                <Check className="h-3 w-3" /> Pronta Entrega
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-500 px-2 py-0.5 font-bold text-[10px] border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                              </span>
                            ) : isPaused ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-500 px-2 py-0.5 font-bold text-[10px] border border-amber-500/20">
                                <Pause className="h-3 w-3" /> Pausado
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1 rounded bg-destructive/10 text-destructive px-2 py-0.5 font-bold text-[10px] border border-destructive/20">
                                <XCircle className="h-3 w-3" /> Cancelado
                              </span>
                            ) : (
                              <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                                {currentStatus}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground">
                            R$ {parseFloat(off.price).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {off.inventory?.onHand ?? 0}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-500">
                            {off.inventory?.available ?? off.availableStock ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => setAdjustingOffer(off)}
                                className="px-2.5 py-1 rounded bg-secondary hover:bg-primary/20 hover:text-primary text-xs font-semibold border border-border transition-colors"
                              >
                                Estoque
                              </button>

                              {/* Action to Pause or Reactivate */}
                              {isActive && (
                                <button
                                  onClick={() =>
                                    updateOfferStatusMutation.mutate({ offerId: off.id, status: 'PAUSED' })
                                  }
                                  title="Pausar anúncio no Marketplace"
                                  className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold border border-amber-500/20 transition-colors flex items-center gap-1"
                                >
                                  <Pause className="h-3 w-3" /> Pausar
                                </button>
                              )}

                              {(isPaused || isCancelled) && (
                                <button
                                  onClick={() =>
                                    updateOfferStatusMutation.mutate({ offerId: off.id, status: 'ACTIVE' })
                                  }
                                  title="Reativar anúncio no Marketplace"
                                  className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/20 transition-colors flex items-center gap-1"
                                >
                                  <Play className="h-3 w-3" /> Reativar
                                </button>
                              )}

                              {/* Action to Cancel Offer */}
                              {!isCancelled && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Deseja realmente cancelar o anúncio "${off.title}"? Ele deixará de ser exibido no Marketplace.`)) {
                                      updateOfferStatusMutation.mutate({ offerId: off.id, status: 'CANCELLED' });
                                    }
                                  }}
                                  title="Cancelar anúncio de vendas"
                                  className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold border border-destructive/20 transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="h-3 w-3" /> Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Minhas Vendas Realizadas (Pronta Entrega & Garagem) */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Minhas Vendas Realizadas (Pronta Entrega) ({sales.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Acompanhe a expedição dos pedidos vendidos: entrega direta ou armazenamento na garagem do colecionador.
                </p>
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border/80 rounded-xl">
                Nenhuma venda de pronta entrega realizada até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground uppercase text-[10px] bg-secondary/20">
                    <tr>
                      <th className="py-2.5 px-3">Pedido / Data</th>
                      <th className="py-2.5 px-3">Miniatura</th>
                      <th className="py-2.5 px-3">Comprador</th>
                      <th className="py-2.5 px-3">Qtd / Total</th>
                      <th className="py-2.5 px-3">Modalidade</th>
                      <th className="py-2.5 px-3">Status Expedição</th>
                      <th className="py-2.5 px-3 text-right">Ação de Entrega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sales.map((sale: any) => {
                      const isGarage = sale.order?.deliveryMode === 'GARAGE' || sale.fulfillmentStatus === 'NA_GARAGEM';
                      const isAwaitingDispatch = sale.fulfillmentStatus === 'AGUARDANDO_ENVIO';
                      const isCancelled = sale.fulfillmentStatus === 'CANCELADO' || sale.order?.status === 'CANCELLED';
                      const isDelivered = sale.fulfillmentStatus === 'ENTREGUE';

                      return (
                        <tr key={sale.id} className="hover:bg-secondary/20">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-primary block">
                              #{sale.order?.orderNumber || sale.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {sale.order?.createdAt
                                ? new Date(sale.order.createdAt).toLocaleDateString('pt-BR')
                                : '-'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 rounded bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                                {sale.variation?.photoUrl ? (
                                  <img src={sale.variation.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs line-clamp-1">
                                  {sale.variation?.name || 'Miniatura'}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {sale.variation?.brandName}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-semibold text-foreground text-xs">
                              {sale.buyer?.name || 'Colecionador'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {sale.buyer?.email}
                            </p>
                            {sale.buyer?.phone && (
                              <p className="text-[10px] text-muted-foreground">
                                {sale.buyer.phone}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-3 font-semibold">
                            <span className="text-foreground">{sale.quantity || 1}x</span>
                            <p className="font-bold text-foreground text-xs">
                              R$ {parseFloat(sale.subtotal || sale.unitPrice || '0').toFixed(2)}
                            </p>
                          </td>

                          <td className="py-3 px-3">
                            {isGarage ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Warehouse className="h-3.5 w-3.5" />
                                Na Garagem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Truck className="h-3.5 w-3.5" />
                                Entrega Direta
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                <XCircle className="h-3 w-3" /> Cancelado (Estoque Reativado)
                              </span>
                            ) : isDelivered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Entregue ao Colecionador
                              </span>
                            ) : isAwaitingDispatch ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                                <Truck className="h-3 w-3" /> Frete Pago - Despacho Solicitado
                              </span>
                            ) : isGarage ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Warehouse className="h-3 w-3" /> Guardado na Garagem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Clock className="h-3 w-3" /> Pendente de Expedição
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {isCancelled ? (
                              <span className="text-[11px] text-muted-foreground italic">Cancelado</span>
                            ) : isDelivered ? (
                              <button
                                onClick={() =>
                                  updateSaleFulfillmentMutation.mutate({
                                    orderItemId: sale.id,
                                    fulfillmentStatus: 'NA_GARAGEM',
                                  })
                                }
                                disabled={updateSaleFulfillmentMutation.isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary hover:bg-purple-500/20 hover:text-purple-400 text-xs font-semibold border border-border transition-colors"
                                title="Mover miniatura de volta para a Garagem do Colecionador"
                              >
                                <Warehouse className="h-3 w-3" />
                                Mover p/ Garagem
                              </button>
                            ) : isAwaitingDispatch ? (
                              <button
                                onClick={() =>
                                  updateSaleFulfillmentMutation.mutate({
                                    orderItemId: sale.id,
                                    fulfillmentStatus: 'ENTREGUE',
                                  })
                                }
                                disabled={updateSaleFulfillmentMutation.isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 text-xs font-extrabold shadow-sm transition-colors"
                                title="Confirmar que o pacote foi postado/despachado ao cliente"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                Confirmar Postagem
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  updateSaleFulfillmentMutation.mutate({
                                    orderItemId: sale.id,
                                    fulfillmentStatus: 'ENTREGUE',
                                  })
                                }
                                disabled={updateSaleFulfillmentMutation.isPending}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold shadow-sm transition-colors"
                                title="Confirmar que o item foi despachado/entregue ao cliente"
                              >
                                <Check className="h-3 w-3" />
                                Marcar como Entregue
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAINEL DE GESTÃO DE PRÉ-VENDAS & CARDS INTERATIVOS */}
      {activeTab === 'PRE_ORDERS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-sm">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Painel de Gestão de Pré-Vendas
              </h2>
              <p className="text-xs text-muted-foreground">
                Acompanhe cotas, parcelamentos de colecionadores e preveja chegadas de lotes
              </p>
            </div>
            <button
              onClick={() => {
                setIsPreOrder(true);
                setShowCreateOffer(true);
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow transition-all shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Lançar Nova Pré-Venda
            </button>
          </div>

          {/* THE 3 INTERACTIVE PRE-ORDER CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: Pré-Vendas Abertas e Disponíveis */}
            <div
              onClick={() => setCampaignFilter((prev) => (prev === 'OPEN' ? 'ALL' : 'OPEN'))}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden group shadow-sm hover:shadow-md ${
                campaignFilter === 'OPEN'
                  ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40'
                  : 'border-border bg-card hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Abertas & Disponíveis
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    campaignFilter === 'OPEN'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}
                >
                  {campaignFilter === 'OPEN' ? 'Filtro Ativo' : 'Vagas Abertas'}
                </span>
              </div>
              <p className="text-3xl font-black text-foreground mb-1">
                {dashboardData?.metrics.openAndAvailableCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Campanhas com vagas de reserva ainda disponíveis para colecionadores.
              </p>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-emerald-500">
                <span>{campaignFilter === 'OPEN' ? 'Exibindo abertas (clique p/ ver todas)' : 'Clique para filtrar na lista'}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 2: Pré-Vendas Encerradas por Limite Máximo */}
            <div
              onClick={() => setCampaignFilter((prev) => (prev === 'CLOSED' ? 'ALL' : 'CLOSED'))}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden group shadow-sm hover:shadow-md ${
                campaignFilter === 'CLOSED'
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                  : 'border-border bg-card hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Encerradas (Esgotadas)
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    campaignFilter === 'CLOSED'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}
                >
                  {campaignFilter === 'CLOSED' ? 'Filtro Ativo' : '100% Reservadas'}
                </span>
              </div>
              <p className="text-3xl font-black text-foreground mb-1">
                {dashboardData?.metrics.closedByQuotaCount ?? dashboardData?.metrics.closedQuotaFilledCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Campanhas que atingiram a cota máxima de reservas e foram encerradas.
              </p>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-amber-500">
                <span>{campaignFilter === 'CLOSED' ? 'Exibindo esgotadas (clique p/ ver todas)' : 'Clique para filtrar na lista'}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 3: Pré-Vendas que Já Chegaram */}
            <div
              onClick={() => setCampaignFilter((prev) => (prev === 'ARRIVED' ? 'ALL' : 'ARRIVED'))}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden group shadow-sm hover:shadow-md ${
                campaignFilter === 'ARRIVED'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/40'
                  : 'border-border bg-card hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-500" />
                  Chegaram na Loja
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    campaignFilter === 'ARRIVED'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}
                >
                  {campaignFilter === 'ARRIVED' ? 'Filtro Ativo' : 'Em Estoque Físico'}
                </span>
              </div>
              <p className="text-3xl font-black text-foreground mb-1">
                {dashboardData?.metrics.arrivedCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Miniaturas físicas já recebidas e prontas para entrega ou garagem.
              </p>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-blue-500">
                <span>{campaignFilter === 'ARRIVED' ? 'Exibindo chegadas (clique p/ ver todas)' : 'Clique para filtrar na lista'}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Filter Bar & Financial Strip */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                  <Filter className="h-3.5 w-3.5" /> Filtrar Campanhas:
                </span>
                <button
                  onClick={() => setCampaignFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    campaignFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todas ({dashboardData?.metrics.totalCampaigns ?? 0})
                </button>
                <button
                  onClick={() => setCampaignFilter('OPEN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    campaignFilter === 'OPEN'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-secondary hover:bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  Abertas & Disponíveis ({dashboardData?.metrics.openAndAvailableCount ?? 0})
                </button>
                <button
                  onClick={() => setCampaignFilter('CLOSED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    campaignFilter === 'CLOSED'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-secondary hover:bg-amber-500/10 text-amber-500'
                  }`}
                >
                  Esgotadas ({dashboardData?.metrics.closedByQuotaCount ?? dashboardData?.metrics.closedQuotaFilledCount ?? 0})
                </button>
                <button
                  onClick={() => setCampaignFilter('ARRIVED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    campaignFilter === 'ARRIVED'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-secondary hover:bg-blue-500/10 text-blue-500'
                  }`}
                >
                  Chegaram ({dashboardData?.metrics.arrivedCount ?? 0})
                </button>
              </div>

              <button
                onClick={() => {
                  if (reportData?.rows) {
                    exportPreOrdersToCsv(reportData.rows);
                  }
                }}
                disabled={!reportData?.rows?.length}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-secondary hover:bg-primary/20 hover:text-primary text-xs font-bold border border-border transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Exportar Relatório (.csv)
              </button>
            </div>

            {/* Financial Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Contratado</span>
                <p className="text-base font-black text-foreground">
                  R$ {(reportData?.metrics.totalContracted ?? dashboardData?.metrics.totalContracted ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {reportData?.metrics.totalPreOrders ?? dashboardData?.metrics.totalReservations ?? 0} reserva(s)
                </p>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Total Recebido</span>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  R$ {(reportData?.metrics.totalPaid ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">Baixas confirmadas</p>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Saldo em Aberto</span>
                <p className="text-base font-black text-amber-500">
                  R$ {(reportData?.metrics.totalRemaining ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">A receber dos clientes</p>
              </div>

              <div className={`p-3 rounded-xl border ${
                (reportData?.metrics.overdueCount ?? 0) > 0
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border bg-card'
              }`}>
                <span className="text-[10px] text-destructive uppercase font-bold block">Parcelas em Atraso</span>
                <p className="text-base font-black text-destructive">
                  {reportData?.metrics.overdueCount ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  R$ {(reportData?.metrics.overdueAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencidos
                </p>
              </div>
            </div>
          </div>

          {/* LISTA DE CAMPANHAS DE PRÉ-VENDA */}
          <div className="space-y-4">
            {isDashboardLoading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Carregando campanhas de pré-venda...
              </div>
            ) : !dashboardData?.campaigns || dashboardData.campaigns.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 text-muted-foreground text-sm space-y-2">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="font-semibold text-foreground">
                  Nenhuma campanha de pré-venda encontrada para o filtro selecionado.
                </p>
                <p className="text-xs">
                  Crie um anúncio marcando a opção "Pré-Venda" para que ela apareça neste painel.
                </p>
              </div>
            ) : (
              dashboardData.campaigns.map((camp) => {
                const campaignKey = camp.offerId || camp.id;
                const isExpanded = expandedCampaigns[campaignKey] ?? true;
                const quotaPercent = camp.totalQuota > 0 ? Math.min(100, Math.round((camp.reservedCount / camp.totalQuota) * 100)) : 0;
                const isClosed = camp.isClosedByQuota ?? camp.isClosedQuotaFilled;

                return (
                  <div
                    key={campaignKey}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all space-y-0"
                  >
                    {/* Header da Campanha */}
                    <div className="p-5 border-b border-border/60 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          {camp.variation?.photoUrl ? (
                            <img src={camp.variation.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Layers className="h-7 w-7 text-muted-foreground" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                              Pré-Venda
                            </span>
                            {camp.variation?.brandName && (
                              <span className="text-xs text-muted-foreground font-semibold">
                                {camp.variation.brandName}
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-foreground text-base leading-tight">
                            {camp.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {camp.variation?.name}
                          </p>

                          <p className="text-sm font-black text-foreground pt-0.5">
                            R$ {parseFloat(camp.price).toFixed(2)}
                            <span className="text-xs font-normal text-muted-foreground ml-1">por unidade</span>
                          </p>
                        </div>
                      </div>

                      {/* Center: Quota Meter */}
                      <div className="w-full xl:w-64 p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {camp.reservedCount} de {camp.totalQuota} reservadas
                          </span>
                          <span className={`font-black text-[11px] ${
                            isClosed ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {quotaPercent}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isClosed
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                          {isClosed ? (
                            <span className="text-amber-500 font-bold flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Cota Esgotada / Encerrada
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> {camp.availableStock} vagas restantes
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Arrival Status & Actions */}
                      <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end border-t xl:border-t-0 pt-3 xl:pt-0 border-border/60">
                        {/* Arrival Status Badge */}
                        <div>
                          {camp.hasArrived ? (
                            <div className="space-y-0.5 text-left xl:text-right">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Miniatura Chegou na Loja!
                              </span>
                              {camp.arrivedAt && (
                                <p className="text-[10px] text-muted-foreground block">
                                  Chegou em: <strong className="text-foreground">{new Date(camp.arrivedAt).toLocaleDateString('pt-BR')}</strong>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-start xl:items-end gap-1.5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Clock className="h-3.5 w-3.5" />
                                Aguardando Fornecedor
                              </span>
                              <button
                                onClick={() =>
                                  setArrivalModal({
                                    isOpen: true,
                                    campaign: camp,
                                    arrivedAt: new Date().toISOString().split('T')[0],
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-bold shadow-sm transition-all"
                              >
                                <Package className="h-3.5 w-3.5" />
                                Informar Chegada
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expand / Collapse Button */}
                        <button
                          onClick={() => toggleExpandCampaign(campaignKey)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                            isExpanded
                              ? 'bg-secondary border-border text-foreground'
                              : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          <span>Reservas ({camp.reservations.length})</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* RESERVAS DOS COLECIONADORES (QUEM RESERVOU) */}
                    {isExpanded && (
                      <div className="bg-secondary/15 p-4 space-y-3 border-t border-border/40">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Colecionadores que Reservaram ({camp.reservations.length})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {camp.hasArrived ? 'Miniaturas já recebidas: gerencie entrega ou guarda na garagem' : 'Acompanhe pagamentos de parcelas até a chegada'}
                          </span>
                        </div>

                        {camp.reservations.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground text-xs rounded-xl bg-card border border-border/80">
                            Nenhum colecionador realizou reserva nesta pré-venda até o momento.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {camp.reservations.map((po) => {
                              const isSubExpanded = expandedPreOrders[po.id] ?? true;
                              const overdueInstallments = po.installments.filter((i) => i.status === 'OVERDUE' || i.isOverdue);
                              const isGarage = po.fulfillmentStatus === 'NA_GARAGEM';
                              const isDelivered = po.fulfillmentStatus === 'ENTREGUE';
                              const isPendingApproval = po.status === 'PENDING_APPROVAL' || po.requiresApproval;

                              return (
                                <div
                                  key={po.id}
                                  className={`rounded-xl border p-4 space-y-3 shadow-sm transition-all ${
                                    isPendingApproval
                                      ? 'border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30'
                                      : 'border-border bg-card hover:border-primary/30'
                                  }`}
                                >
                                  {/* Top Row: Buyer info & Financials & Fulfillment Toggle */}
                                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
                                    {/* Buyer Details */}
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                          {po.preOrderNumber}
                                        </span>
                                        {isPendingApproval && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black animate-pulse">
                                            <AlertTriangle className="h-3 w-3" /> Aguardando Sua Aprovação
                                          </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(po.createdAt).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="text-xs font-bold text-foreground">
                                          {po.quantity || 1} un.
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 text-xs flex-wrap">
                                        <span className="font-bold text-foreground text-sm">
                                          {po.buyer.name}
                                        </span>
                                        <span className="text-muted-foreground">({po.buyer.email})</span>
                                        {po.buyer.whatsapp && (
                                          <a
                                            href={`https://wa.me/55${po.buyer.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold text-[10px] border border-emerald-500/20"
                                          >
                                            <MessageCircle className="h-3 w-3" /> WhatsApp
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    {/* Financial Status */}
                                    <div className="flex items-center gap-4 text-xs">
                                      <div className="text-left lg:text-right">
                                        <span className="text-[10px] text-muted-foreground block">Total Contratado</span>
                                        <span className="font-black text-foreground">
                                          R$ {parseFloat(po.totalAmount).toFixed(2)}
                                        </span>
                                      </div>

                                      <div className="text-left lg:text-right">
                                        <span className="text-[10px] text-muted-foreground block">Pago</span>
                                        <span className="font-black text-emerald-500">
                                          R$ {parseFloat(po.paidAmount).toFixed(2)}
                                        </span>
                                      </div>

                                      <div className="text-left lg:text-right">
                                        <span className="text-[10px] text-muted-foreground block">Saldo Restante</span>
                                        <span className="font-black text-amber-500">
                                          R$ {parseFloat(po.remainingAmount).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* GARAGEM DO COLECIONADOR VS ENTREGA */}
                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-border/40">
                                      {/* Fulfillment Badge */}
                                      {isGarage ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                          <Warehouse className="h-3.5 w-3.5" />
                                          Na Garagem do Colecionador
                                        </span>
                                      ) : isDelivered ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                          <Truck className="h-3.5 w-3.5" />
                                          Entregue ao Colecionador
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-secondary text-muted-foreground border border-border">
                                          <Clock className="h-3.5 w-3.5" />
                                          Pendente
                                        </span>
                                      )}

                                      {/* Fulfillment Toggle Button */}
                                      {isGarage ? (
                                        <button
                                          onClick={() =>
                                            updatePreOrderFulfillmentMutation.mutate({
                                              preOrderId: po.id,
                                              fulfillmentStatus: 'ENTREGUE',
                                            })
                                          }
                                          disabled={updatePreOrderFulfillmentMutation.isPending}
                                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold shadow-sm transition-all"
                                          title="Confirmar entrega ao colecionador"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                          Marcar como Entregue
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            updatePreOrderFulfillmentMutation.mutate({
                                              preOrderId: po.id,
                                              fulfillmentStatus: 'NA_GARAGEM',
                                            })
                                          }
                                          disabled={updatePreOrderFulfillmentMutation.isPending}
                                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-secondary hover:bg-purple-500/20 hover:text-purple-400 text-xs font-bold border border-border transition-all"
                                          title="Mover de volta para a Garagem do Colecionador"
                                        >
                                          <Warehouse className="h-3.5 w-3.5" />
                                          Mover p/ Garagem
                                        </button>
                                      )}

                                      {/* Toggle Sub-Expand (Installments) */}
                                      <button
                                        onClick={() => toggleExpand(po.id)}
                                        className="p-1 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
                                        title="Ver Cronograma de Parcelas"
                                      >
                                        {isSubExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* PENDING APPROVAL ALERT & ACTIONS BANNER */}
                                  {isPendingApproval && (
                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                                          <AlertTriangle className="h-4 w-4 shrink-0" />
                                          <span>Aprovação do Vendedor Obrigatória</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                          {po.approvalReason || 'Colecionador possui parcela com atraso superior a 10 dias em outra pré-venda da plataforma.'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                        <button
                                          onClick={() =>
                                            setApprovalActionModal({
                                              isOpen: true,
                                              preOrder: po,
                                              type: 'APPROVE',
                                              reasonOrNotes: '',
                                            })
                                          }
                                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                                        >
                                          <Check className="h-3.5 w-3.5" /> Aprovar Reserva
                                        </button>
                                        <button
                                          onClick={() =>
                                            setApprovalActionModal({
                                              isOpen: true,
                                              preOrder: po,
                                              type: 'REJECT',
                                              reasonOrNotes: '',
                                            })
                                          }
                                          className="px-3.5 py-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-white font-bold text-xs border border-destructive/30 flex items-center gap-1.5 transition-all"
                                        >
                                          <XCircle className="h-3.5 w-3.5" /> Recusar e Estornar
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Installments Table */}
                                  {isSubExpanded && (
                                    <div className="bg-secondary/30 p-3 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-foreground flex items-center gap-1.5">
                                          <CreditCard className="h-3.5 w-3.5 text-primary" /> Cronograma de Parcelas
                                        </span>
                                        {overdueInstallments.length > 0 && (
                                          <span className="text-destructive font-bold flex items-center gap-1 text-[11px]">
                                            <AlertTriangle className="h-3 w-3" /> {overdueInstallments.length} parcela(s) em atraso
                                          </span>
                                        )}
                                      </div>

                                      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
                                        <table className="w-full text-left text-xs">
                                          <thead className="border-b border-border/60 text-muted-foreground uppercase text-[10px] bg-secondary/30">
                                            <tr>
                                              <th className="py-2 px-3">Parcela</th>
                                              <th className="py-2 px-3">Descrição</th>
                                              <th className="py-2 px-3">Vencimento</th>
                                              <th className="py-2 px-3">Valor</th>
                                              <th className="py-2 px-3">Status</th>
                                              <th className="py-2 px-3">Baixa Manual / Pagamento</th>
                                              <th className="py-2 px-3 text-right">Ações</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border/40">
                                            {po.installments.map((inst) => {
                                              const isPaid = inst.status === 'PAID';
                                              const isOverdue = inst.status === 'OVERDUE' || inst.isOverdue;

                                              return (
                                                <tr key={inst.id} className="hover:bg-secondary/20">
                                                  <td className="py-2 px-3 font-mono font-bold">
                                                    {inst.installmentNumber}/{inst.totalInstallments}
                                                  </td>
                                                  <td className="py-2 px-3 font-semibold text-foreground">
                                                    {inst.description}
                                                  </td>
                                                  <td className="py-2 px-3 text-muted-foreground">
                                                    {inst.dueDate ? (
                                                      <span className={isOverdue ? 'text-destructive font-bold' : ''}>
                                                        {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                                                        {isOverdue && ' (Vencida)'}
                                                      </span>
                                                    ) : (
                                                      'Na Chegada'
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 font-bold text-foreground">
                                                    R$ {parseFloat(inst.amount).toFixed(2)}
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    {isPaid ? (
                                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-500 px-2 py-0.5 font-bold text-[10px] border border-emerald-500/20">
                                                        <Check className="h-3 w-3" /> Quitada
                                                      </span>
                                                    ) : isOverdue ? (
                                                      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 text-destructive px-2 py-0.5 font-bold text-[10px] border border-destructive/20">
                                                        <AlertTriangle className="h-3 w-3" /> Atrasada
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-500 px-2 py-0.5 font-bold text-[10px] border border-amber-500/20">
                                                        <Clock className="h-3 w-3" /> Em Aberto
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 text-[11px] text-muted-foreground">
                                                    {isPaid ? (
                                                      <div>
                                                        <p className="font-semibold text-foreground">
                                                          R$ {parseFloat(inst.paidAmount || inst.amount).toFixed(2)} via {inst.paymentMethod || 'PIX'}
                                                        </p>
                                                        <p className="text-[10px]">
                                                          Em {inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('pt-BR') : '-'}
                                                          {inst.notes ? ` • ${inst.notes}` : ''}
                                                        </p>
                                                      </div>
                                                    ) : (
                                                      <span className="italic text-muted-foreground">Pendente de quitação</span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 text-right">
                                                    {!isPaid && (
                                                      <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                          onClick={() => openEditInstallmentModal(po, inst)}
                                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary/20 hover:text-primary font-bold text-xs border border-border transition-all"
                                                          title="Editar vencimento ou valor"
                                                        >
                                                          <Edit3 className="h-3 w-3" /> Editar
                                                        </button>

                                                        <button
                                                          onClick={() => openSettleModal(po, inst)}
                                                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs shadow-sm transition-all"
                                                          title="Dar baixa manual de pagamento"
                                                        >
                                                          <CheckCircle2 className="h-3.5 w-3.5" /> Dar Baixa
                                                        </button>
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STATUS DOS COLECIONADORES & GRID DE RISCO DE PRÉ-VENDAS */}
      {activeTab === 'COLLECTORS_STATUS' && (
        <div className="space-y-6">
          {/* Header Description & Platform Policy */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Painel de Adimplência dos Colecionadores
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Acompanhe em tempo real a pontualidade no pagamento de parcelas de pré-vendas. Se um colecionador tiver parcelas com <strong>mais de 10 dias de atraso</strong> em qualquer loja da plataforma, novas reservas ficam retidas para aprovação manual do vendedor.
              </p>
            </div>

            {/* Platform Health Legend Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Em Dia (0 atraso)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Alerta (Até 10 dias)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Inadimplente (&gt; 10 dias)
              </span>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total */}
            <div
              onClick={() => setCollectorHealthFilter('ALL')}
              className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md ${
                collectorHealthFilter === 'ALL'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" /> Total Avaliados
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                  {collectorScope === 'my' ? 'Sua Loja' : 'Marketplace'}
                </span>
              </div>
              <p className="text-3xl font-black text-foreground mb-1">
                {collectorsData?.summary?.totalCollectors ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Colecionadores participantes de pré-vendas.
              </p>
            </div>

            {/* Card 2: 🟢 Em Dia */}
            <div
              onClick={() => setCollectorHealthFilter((prev) => (prev === 'GREEN' ? 'ALL' : 'GREEN'))}
              className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md ${
                collectorHealthFilter === 'GREEN'
                  ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40'
                  : 'border-border bg-card hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Pagamento em Dia
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Verde
                </span>
              </div>
              <p className="text-3xl font-black text-emerald-500 mb-1">
                {collectorsData?.summary?.greenCount ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Sem nenhuma parcela vencida. Reservas aprovadas automaticamente.
              </p>
            </div>

            {/* Card 3: 🟡 Alerta (<= 10 dias) */}
            <div
              onClick={() => setCollectorHealthFilter((prev) => (prev === 'YELLOW' ? 'ALL' : 'YELLOW'))}
              className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md ${
                collectorHealthFilter === 'YELLOW'
                  ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/40'
                  : 'border-border bg-card hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Alerta Moderado
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Amarelo (&le; 10d)
                </span>
              </div>
              <p className="text-3xl font-black text-amber-500 mb-1">
                {collectorsData?.summary?.yellowCount ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Parcela em aberto com atraso de tolerância de até 10 dias.
              </p>
            </div>

            {/* Card 4: 🔴 Inadimplente (> 10 dias) */}
            <div
              onClick={() => setCollectorHealthFilter((prev) => (prev === 'RED' ? 'ALL' : 'RED'))}
              className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md ${
                collectorHealthFilter === 'RED'
                  ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/40'
                  : 'border-border bg-card hover:border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Inadimplente
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Vermelho (&gt; 10d)
                </span>
              </div>
              <p className="text-3xl font-black text-rose-500 mb-1">
                {collectorsData?.summary?.redCount ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Atraso superior a 10 dias. <strong>Bloqueia aprovação automática</strong> de novas pré-vendas.
              </p>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Scope Switcher: Meus Colecionadores vs Todos */}
              <div className="flex items-center bg-secondary/40 p-1 rounded-xl border border-border shrink-0">
                <button
                  onClick={() => setCollectorScope('my')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    collectorScope === 'my'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Meus Clientes ({collectorsData?.summary?.totalCollectors || 0})
                </button>
                <button
                  onClick={() => setCollectorScope('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    collectorScope === 'all'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todos da Plataforma
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar colecionador por nome ou e-mail..."
                  value={collectorSearch}
                  onChange={(e) => setCollectorSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 rounded-xl bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                />
                {collectorSearch && (
                  <button
                    onClick={() => setCollectorSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Health Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border/50 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filtrar Status:
              </span>
              <button
                onClick={() => setCollectorHealthFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  collectorHealthFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setCollectorHealthFilter('GREEN')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  collectorHealthFilter === 'GREEN'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                🟢 Em Dia ({collectorsData?.summary?.greenCount ?? 0})
              </button>
              <button
                onClick={() => setCollectorHealthFilter('YELLOW')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  collectorHealthFilter === 'YELLOW'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                🟡 Alerta &le; 10d ({collectorsData?.summary?.yellowCount ?? 0})
              </button>
              <button
                onClick={() => setCollectorHealthFilter('RED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  collectorHealthFilter === 'RED'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                🔴 Inadimplente &gt; 10d ({collectorsData?.summary?.redCount ?? 0})
              </button>
            </div>
          </div>

          {/* Collectors Table / Grid */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Grid de Colecionadores ({collectorsData?.collectors?.length || 0})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Classificação baseada no histórico de quitação de parcelas de pré-vendas em toda a rede MiniHub Car.
                </p>
              </div>
            </div>

            {isCollectorsLoading ? (
              <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
                <Clock className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p>Carregando status dos colecionadores...</p>
              </div>
            ) : !collectorsData?.collectors || collectorsData.collectors.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-sm">Nenhum colecionador encontrado</p>
                <p>Tente alterar o filtro ou o termo de busca pesquisado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground uppercase text-[10px] bg-secondary/30">
                    <tr>
                      <th className="py-3 px-4">Colecionador</th>
                      <th className="py-3 px-3 text-center">Status Pagamento</th>
                      <th className="py-3 px-3 text-center">Pré-Vendas</th>
                      <th className="py-3 px-3 text-center">Parcelas Abertas</th>
                      <th className="py-3 px-3 text-center">Atrasos</th>
                      <th className="py-3 px-3 text-center">Aprovações Pendentes</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {collectorsData.collectors.map((c: CollectorHealthItem) => {
                      const isGreen = c.status === 'GREEN';
                      const isYellow = c.status === 'YELLOW';
                      const isRed = c.status === 'RED';

                      return (
                        <tr key={c.collectorId} className="hover:bg-secondary/25 transition-colors">
                          {/* 1. Collector Identity */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-black text-sm text-foreground shrink-0 border border-border overflow-hidden">
                                {c.avatarUrl ? (
                                  <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  c.name.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <p className="font-bold text-foreground text-xs">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground">{c.email}</p>
                                <div className="flex items-center gap-2 pt-0.5">
                                  {c.city && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {c.city}{c.state ? `, ${c.state}` : ''}
                                    </span>
                                  )}
                                  {c.whatsapp && (
                                    <a
                                      href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:underline"
                                    >
                                      <MessageCircle className="h-3 w-3" /> WhatsApp
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Visual Health Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {isGreen && (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Em Dia
                                </span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  0 atrasos
                                </span>
                              </div>
                            )}

                            {isYellow && (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                  Alerta Moderado
                                </span>
                                <span className="text-[10px] text-amber-500 font-bold">
                                  Atraso: {c.maxOverdueDays} dia(s)
                                </span>
                              </div>
                            )}

                            {isRed && (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                                  Inadimplente
                                </span>
                                <span className="text-[10px] text-rose-500 font-bold">
                                  Atraso: {c.maxOverdueDays} dia(s)
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 3. Pre-Orders Count */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-foreground block">
                              {c.sellerPreOrdersCount} na sua loja
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {c.totalPreOrdersCount} na plataforma
                            </span>
                          </td>

                          {/* 4. Open Installments */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-foreground block">
                              {c.openInstallmentsCount} parcela(s)
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              R$ {c.openInstallmentsAmount.toFixed(2)}
                            </span>
                          </td>

                          {/* 5. Overdue Installments */}
                          <td className="py-3 px-3 text-center">
                            {c.overdueInstallmentsCount > 0 ? (
                              <div className="space-y-0.5">
                                <span className="font-black text-rose-500 block">
                                  {c.overdueInstallmentsCount} parcela(s)
                                </span>
                                <span className="text-[10px] font-bold text-rose-500 block">
                                  R$ {c.overdueInstallmentsAmount.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-500 font-bold text-xs">
                                Nenhum
                              </span>
                            )}
                          </td>

                          {/* 6. Pending Approvals */}
                          <td className="py-3 px-3 text-center">
                            {c.pendingApprovalCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500 text-black animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                {c.pendingApprovalCount} p/ aprovar
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>

                          {/* 7. Action Button */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedCollectorId(c.collectorId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary/15 hover:text-primary font-bold text-xs border border-border transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Raio-X Financeiro
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FINANCEIRO & RELATÓRIOS */}
      {activeTab === 'FINANCE_REPORTS' && (
        <SellerFinanceReportsTab />
      )}

      {/* TAB 4: ENDEREÇOS DE DESPACHO E DADOS CADASTRAIS */}
      {activeTab === 'SHIPPING_SETTINGS' && (
        <div className="space-y-6">
          {/* Section 1: Pontos de Saída e Despacho (Multi-Origem) */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Pontos de Saída & Despacho de Encomendas
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cadastre múltiplos locais de saída (ex: Loja Física, Galpão, Centro de Distribuição). O frete (Correios / Jadlog) é calculado exatamente a partir do CEP de origem de cada ponto.
                </p>
              </div>

              <button
                onClick={() =>
                  setAddressModal({
                    isOpen: true,
                    label: '',
                    contactName: '',
                    postalCode: '',
                    street: '',
                    number: '',
                    complement: '',
                    neighborhood: '',
                    city: '',
                    state: '',
                    phone: '',
                    isDefault: shippingAddresses.length === 0,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow transition-all shrink-0"
              >
                <Plus className="h-4 w-4" /> Adicionar Endereço de Saída
              </button>
            </div>

            {/* Address List */}
            {isAddressesLoading ? (
              <div className="py-8 text-center text-muted-foreground text-xs animate-pulse">
                Carregando endereços de despacho...
              </div>
            ) : shippingAddresses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border/80 rounded-xl space-y-3">
                <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="font-semibold text-foreground">Nenhum ponto de saída adicional cadastrado</p>
                <p className="text-xs max-w-md mx-auto text-muted-foreground">
                  No momento, suas encomendas utilizarão os dados cadastrais principais da sua loja como ponto de postagem.
                  Cadastre um ou mais endereços específicos caso você despache de galpões, estoques externos ou filiais.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shippingAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`rounded-xl border p-4 space-y-3 relative transition-all ${
                      addr.isDefault
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-border bg-secondary/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-primary-foreground">
                            Padrão
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!addr.isDefault && (
                          <button
                            onClick={() => setDefaultAddressMutation.mutate(addr.id)}
                            disabled={setDefaultAddressMutation.isPending}
                            className="px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Tornar endereço padrão de saída"
                          >
                            Tornar Padrão
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAddressModal({
                              isOpen: true,
                              addressId: addr.id,
                              label: addr.label,
                              contactName: addr.contactName || '',
                              postalCode: addr.postalCode,
                              street: addr.street,
                              number: addr.number,
                              complement: addr.complement || '',
                              neighborhood: addr.neighborhood,
                              city: addr.city,
                              state: addr.state,
                              phone: addr.phone || '',
                              isDefault: addr.isDefault,
                            });
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-secondary transition-colors"
                          title="Editar endereço"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja realmente remover o endereço de saída "${addr.label}"?`)) {
                              deleteAddressMutation.mutate(addr.id);
                            }
                          }}
                          disabled={deleteAddressMutation.isPending}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                          title="Excluir endereço"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="text-foreground font-medium">
                        {addr.street}, {addr.number} {addr.complement ? ` - ${addr.complement}` : ''}
                      </p>
                      <p>
                        {addr.neighborhood} • {addr.city} - {addr.state}
                      </p>
                      <p className="font-mono text-primary font-bold">CEP: {addr.postalCode}</p>
                      {(addr.contactName || addr.phone) && (
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                          Contato: {addr.contactName || 'Responsável'} {addr.phone ? `(${addr.phone})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Portais & Provedores de Frete Integrados (BYOK) */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-400" /> Portais & Provedores de Frete Integrados (BYOK)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Conecte suas contas no SuperFrete, Frete Rápido ou Melhor Envio para que seus clientes colecionadores aproveitem as suas tabelas de desconto exclusivas na hora de cotar o despacho da Garagem.
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Bring Your Own Key
                </span>
              </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Provider 1: SuperFrete */}
              {(() => {
                const integ = shippingIntegrations.find((i) => i.provider === 'SUPERFRETE');
                const isConnected = !!integ?.hasToken;

                return (
                  <div className="rounded-xl border border-border bg-secondary/10 p-4 flex flex-col justify-between space-y-3 relative hover:border-purple-500/40 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">SuperFrete</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                            Correios
                          </span>
                        </div>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="h-3 w-3" /> Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Não Configurado
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Emita SEDEX, PAC e Mini Envios com até 80% de desconto diretamente pela sua conta do aplicativo SuperFrete.
                      </p>

                      {isConnected && (
                        <div className="p-2 rounded bg-background/80 border border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                          <span>Token: {integ.maskedApiKey}</span>
                          <span className={integ.isActive ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                            {integ.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() =>
                          setIntegrationModal({
                            isOpen: true,
                            provider: 'SUPERFRETE',
                            apiKey: '',
                            extraConfig: {},
                            isActive: isConnected ? integ!.isActive : true,
                          })
                        }
                        className="flex-1 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all text-center"
                      >
                        {isConnected ? 'Editar Token' : 'Conectar SuperFrete'}
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => {
                            if (confirm('Deseja realmente desconectar a integração com o SuperFrete?')) {
                              deleteIntegrationMutation.mutate('SUPERFRETE');
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover integração"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Provider 2: Frete Rápido */}
              {(() => {
                const integ = shippingIntegrations.find((i) => i.provider === 'FRETE_RAPIDO');
                const isConnected = !!integ?.hasToken;

                return (
                  <div className="rounded-xl border border-border bg-secondary/10 p-4 flex flex-col justify-between space-y-3 relative hover:border-purple-500/40 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">Frete Rápido</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">
                            Multi-Carrier
                          </span>
                        </div>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="h-3 w-3" /> Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Não Configurado
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Cotação de fretes com Jadlog, Total Express, Braspress, Loggi e transportadoras fracionadas via API Frete Rápido.
                      </p>

                      {isConnected && (
                        <div className="p-2 rounded bg-background/80 border border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                          <span>Token: {integ.maskedApiKey}</span>
                          <span className={integ.isActive ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                            {integ.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() =>
                          setIntegrationModal({
                            isOpen: true,
                            provider: 'FRETE_RAPIDO',
                            apiKey: '',
                            extraConfig: integ?.extraConfig || { cnpj: '', platformCode: 'MINIHUBCAR' },
                            isActive: isConnected ? integ!.isActive : true,
                          })
                        }
                        className="flex-1 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all text-center"
                      >
                        {isConnected ? 'Editar Credenciais' : 'Conectar Frete Rápido'}
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => {
                            if (confirm('Deseja realmente desconectar a integração com o Frete Rápido?')) {
                              deleteIntegrationMutation.mutate('FRETE_RAPIDO');
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover integração"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Provider 3: Melhor Envio */}
              {(() => {
                const integ = shippingIntegrations.find((i) => i.provider === 'MELHOR_ENVIO');
                const isConnected = !!integ?.hasToken;

                return (
                  <div className="rounded-xl border border-border bg-secondary/10 p-4 flex flex-col justify-between space-y-3 relative hover:border-purple-500/40 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">Melhor Envio</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                            Conta Própria
                          </span>
                        </div>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="h-3 w-3" /> Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Não Configurado
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Use o seu próprio token de aplicação do Melhor Envio para gerar cotações e etiquetas na sua conta empresarial.
                      </p>

                      {isConnected && (
                        <div className="p-2 rounded bg-background/80 border border-border/60 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                          <span>Token: {integ.maskedApiKey}</span>
                          <span className={integ.isActive ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                            {integ.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() =>
                          setIntegrationModal({
                            isOpen: true,
                            provider: 'MELHOR_ENVIO',
                            apiKey: '',
                            extraConfig: {},
                            isActive: isConnected ? integ!.isActive : true,
                          })
                        }
                        className="flex-1 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all text-center"
                      >
                        {isConnected ? 'Editar Token' : 'Conectar Melhor Envio'}
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => {
                            if (confirm('Deseja realmente desconectar a integração com o Melhor Envio?')) {
                              deleteIntegrationMutation.mutate('MELHOR_ENVIO');
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover integração"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Section 3: Dados Cadastrais da Loja */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" /> Dados Cadastrais & Endereço Principal da Loja
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Atualize o perfil público da sua loja e o endereço fiscal/principal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Nome da Loja *</label>
                <input
                  type="text"
                  value={editProfileStoreName}
                  onChange={(e) => setEditProfileStoreName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={editProfilePhone}
                  onChange={(e) => setEditProfilePhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Endereço Principal Form */}
            <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Navigation className="h-4 w-4 text-primary" /> Endereço Principal
                </span>
                <span className="text-[10px] text-muted-foreground">Preenchimento automático via CEP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="00000-000"
                      value={editProfilePostalCode}
                      onChange={(e) => setEditProfilePostalCode(e.target.value)}
                      onBlur={handleProfileCepBlur}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                    {isSearchingProfileCep && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-3" />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">Logradouro / Rua</label>
                  <input
                    type="text"
                    value={editProfileStreet}
                    onChange={(e) => setEditProfileStreet(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Número</label>
                  <input
                    type="text"
                    value={editProfileNumber}
                    onChange={(e) => setEditProfileNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Complemento</label>
                  <input
                    type="text"
                    value={editProfileComplement}
                    onChange={(e) => setEditProfileComplement(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={editProfileNeighborhood}
                    onChange={(e) => setEditProfileNeighborhood(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={editProfileCity}
                    onChange={(e) => setEditProfileCity(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editProfileState}
                    onChange={(e) => setEditProfileState(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Biografia / Apresentação da Loja</label>
              <textarea
                rows={3}
                value={editProfileBio}
                onChange={(e) => setEditProfileBio(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={!editProfileStoreName || updateProfileMutation.isPending}
                onClick={() => updateProfileMutation.mutate()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all"
              >
                <Check className="h-4 w-4" />
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações Cadastrais'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE OFFER MODAL */}
      {showCreateOffer && (
        <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Anunciar Nova Miniatura no Marketplace
            </h3>
            <button
              onClick={() => {
                setShowCreateOffer(false);
                setSelectedVariation(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>

          {!selectedVariation ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Passo 1: Selecione a miniatura no catálogo para vincular sua oferta:
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickCreateModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Não achou? Cadastrar Nova Miniatura
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Digite o nome ou modelo da miniatura..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {catalogResults && catalogResults.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {catalogResults.map((v: any) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedVariation(v);
                          setOfferTitle(`${v.name} - ${isPreOrder ? 'Pré-Venda' : 'Pronta Entrega'}`);
                        }}
                        className="cursor-pointer p-3 rounded-lg border border-border bg-secondary/30 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3"
                      >
                        <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {v.photoUrl ? (
                            <img src={v.photoUrl} alt={v.name} className="h-full w-full object-cover" />
                          ) : (
                            <Layers className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{v.brandName}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border text-xs">
                    <span className="text-muted-foreground">Não encontrou a variação exata ou é um lançamento inédito?</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCreateModal(true)}
                      className="font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Cadastrar nova miniatura
                    </button>
                  </div>
                </div>
              )}

              {catalogSearch && (!catalogResults || catalogResults.length === 0) && (
                <div className="p-6 rounded-xl border border-dashed border-border bg-secondary/20 text-center space-y-2">
                  <Layers className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-foreground">
                    Nenhuma miniatura encontrada para &ldquo;{catalogSearch}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Precisa lançar uma pré-venda ou oferta de um modelo novo que ainda não está no catálogo? Cadastre agora mesmo sem burocracia.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQuickCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary-hover transition-all mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar &ldquo;{catalogSearch}&rdquo; no Catálogo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary">Miniatura Selecionada</span>
                  <p className="text-sm font-bold text-foreground">{selectedVariation.name}</p>
                </div>
                <button
                  onClick={() => setSelectedVariation(null)}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Trocar miniatura
                </button>
              </div>

              {/* Título & Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Título do Anúncio *</label>
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="149.90"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 font-bold"
                  />
                </div>
              </div>

              {/* Condição, Embalagem e Quantidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Condição do Item</label>
                  <select
                    value={offerCondition}
                    onChange={(e) => setOfferCondition(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground cursor-pointer"
                  >
                    <option value="LACRADO">Lacrado no Blister / Caixa</option>
                    <option value="NOVO">Novo / Aberto p/ Conferência</option>
                    <option value="USADO">Usado com Detalhes</option>
                    <option value="CUSTOM">Customizado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Estado da Embalagem</label>
                  <select
                    value={offerPackaging}
                    onChange={(e) => setOfferPackaging(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground cursor-pointer"
                  >
                    <option value="PERFEITO">Perfeito (Sem Vincos)</option>
                    <option value="LEVES_VINCOS">Leves vincos nos cantos</option>
                    <option value="DANIFICADO">Embalagem com amassados</option>
                    <option value="SEM_EMBALAGEM">Sem embalagem</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isPreOrder ? 'Cotas Disponíveis' : 'Estoque Inicial'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerStock}
                    onChange={(e) => setOfferStock(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground"
                  />
                </div>
              </div>

              {/* Peso e Endereço de Saída para Frete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl border border-border bg-secondary/15">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-primary" /> Peso Unitário (gramas)
                    </label>
                    <span className="text-[10px] text-muted-foreground font-medium">Média: ~150g</span>
                  </div>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    placeholder="150"
                    value={packageWeightGrams}
                    onChange={(e) => setPackageWeightGrams(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Calculado automaticamente como base (~150g blister 1:64). Altere livremente para miniaturas mais pesadas ou sets.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Ponto de Saída / Despacho
                  </label>
                  <select
                    value={shippingAddressId}
                    onChange={(e) => setShippingAddressId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="">
                      Origem Padrão ({profile.city ? `${profile.city} - ${profile.state}` : 'Loja Principal'})
                    </option>
                    {shippingAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} — {addr.city}/{addr.state} (CEP: {addr.postalCode}){addr.isDefault ? ' [Padrão]' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    O CEP deste ponto de saída será usado para cotação de PAC, SEDEX e Jadlog.
                  </p>
                </div>
              </div>

              {/* Pre-Order Toggle Card & Condições de Pagamento */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" /> Este anúncio é uma Pré-Venda?
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Ative se o produto estiver sob encomenda ou importação futura com opções de sinal e parcelamento.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPreOrder}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsPreOrder(checked);
                      setOfferTitle(`${selectedVariation.name} - ${checked ? 'Pré-Venda' : 'Pronta Entrega'}`);
                    }}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {isPreOrder && (
                  <div className="pt-3 border-t border-primary/20 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Previsão Estimada de Chegada na Loja
                      </label>
                      <input
                        type="date"
                        value={preOrderEstimatedArrival}
                        onChange={(e) => setPreOrderEstimatedArrival(e.target.value)}
                        className="h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground block">
                        Modalidades de Pagamento Aceitas:
                      </span>

                      {/* Plan 1: Deposit & Balance */}
                      <div className="p-3 rounded-lg bg-background/70 border border-border space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={allowDepositAndBalance}
                            onChange={(e) => setAllowDepositAndBalance(e.target.checked)}
                            className="h-4 w-4 rounded text-primary"
                          />
                          1. Sinal de entrada e pagamento da diferença na chegada
                        </label>
                        {allowDepositAndBalance && (
                          <div className="pl-6">
                            <label className="text-[11px] text-muted-foreground block mb-1">
                              Valor do Sinal de Entrada (R$):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 50.00 (ou deixe em branco para 30% padrão)"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              className="h-9 w-64 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
                            />
                          </div>
                        )}
                      </div>

                      {/* Plan 2: Full on arrival */}
                      <div className="p-3 rounded-lg bg-background/70 border border-border">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={allowFullOnArrival}
                            onChange={(e) => setAllowFullOnArrival(e.target.checked)}
                            className="h-4 w-4 rounded text-primary"
                          />
                          2. Pagamento integral na chegada da miniatura
                        </label>
                      </div>

                      {/* Plan 3: Installments */}
                      <div className="p-4 rounded-2xl bg-card border-2 border-primary/30 shadow-md space-y-3.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-foreground select-none">
                            <input
                              type="checkbox"
                              checked={allowInstallments}
                              onChange={(e) => setAllowInstallments(e.target.checked)}
                              className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                            />
                            <span>3. Parcelamento programado com controle de vencimentos</span>
                          </label>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            01x a 10x
                          </span>
                        </div>

                        {allowInstallments && (
                          <div className="space-y-3 pt-1">
                            {/* Card de Configuração de Parcelas: Número, Vencimento 1ª Parcela e Valor 1ª Parcela */}
                            <div className="rounded-xl p-3.5 bg-muted/60 dark:bg-slate-900/80 border border-border/80 shadow-inner space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* 1. Quantidade de Parcelas */}
                                <div>
                                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                    <Layers className="h-3.5 w-3.5 text-primary" />
                                    <span>Qtd. de Parcelas</span>
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={installmentsCount}
                                      onChange={(e) => setInstallmentsCount(e.target.value)}
                                      className="w-full h-10 px-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground shadow-sm cursor-pointer transition-colors"
                                    >
                                      <option value="1" className="bg-background text-foreground font-semibold">01x (Parcela única na reserva)</option>
                                      <option value="2" className="bg-background text-foreground font-semibold">02x</option>
                                      <option value="3" className="bg-background text-foreground font-semibold">03x</option>
                                      <option value="4" className="bg-background text-foreground font-semibold">04x</option>
                                      <option value="5" className="bg-background text-foreground font-semibold">05x</option>
                                      <option value="6" className="bg-background text-foreground font-semibold">06x</option>
                                      <option value="7" className="bg-background text-foreground font-semibold">07x</option>
                                      <option value="8" className="bg-background text-foreground font-semibold">08x</option>
                                      <option value="9" className="bg-background text-foreground font-semibold">09x</option>
                                      <option value="10" className="bg-background text-foreground font-semibold">10x</option>
                                    </select>
                                  </div>
                                </div>

                                {/* 2. Vencimento da 1ª Parcela */}
                                <div>
                                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span>Vencimento 1ª Parcela</span>
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="date"
                                      value={firstDueDate}
                                      onChange={(e) => setFirstDueDate(e.target.value)}
                                      className="w-full h-10 px-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground shadow-sm transition-colors cursor-pointer"
                                      style={{ colorScheme: 'dark light' }}
                                    />
                                  </div>
                                </div>

                                {/* 3. Valor da 1ª Parcela (Entrada) */}
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                      <span>Valor 1ª Parcela</span>
                                    </label>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded">Opcional</span>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder={
                                        parsedOfferPrice > 0
                                          ? (parsedOfferPrice / parsedInstallmentCount).toFixed(2)
                                          : 'Ex: 40.00'
                                      }
                                      value={customFirstInstallment}
                                      onChange={(e) => setCustomFirstInstallment(e.target.value)}
                                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground placeholder:text-muted-foreground/60 shadow-sm transition-colors"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/80 border border-border text-[11px] text-muted-foreground">
                                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                <p className="leading-snug">
                                  As parcelas seguintes vencerão automaticamente no <strong>mesmo dia ({firstDueDate ? firstDueDate.split('-')[2] : '10'}) dos meses subsequentes</strong>. O saldo restante após a 1ª parcela é rateado com precisão de centavos.
                                </p>
                              </div>
                            </div>

                            {/* Aviso de erro se o valor da 1ª parcela for inválido */}
                            {isCustomFirstInvalid && (
                              <div className="p-2.5 rounded-xl bg-destructive/10 border-2 border-destructive/30 text-destructive text-xs flex items-center gap-2 font-medium">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>O valor da 1ª parcela deve ser menor que o valor total (R$ {parsedOfferPrice.toFixed(2)}) para haver divisão nas parcelas seguintes.</span>
                              </div>
                            )}

                            {/* Tabela / Cronograma Visual das Parcelas */}
                            {parsedOfferPrice > 0 && installmentSchedule.length > 0 && (
                              <div className="rounded-xl border-2 border-primary/30 bg-card p-3.5 space-y-2.5 shadow-sm">
                                <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Cronograma Previsto de Vencimentos & Valores
                                  </span>
                                  <span className="text-[11px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                    Total: R$ {parsedOfferPrice.toFixed(2)}
                                  </span>
                                </div>

                                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                  {installmentSchedule.map((inst) => (
                                    <div
                                      key={inst.installmentNumber}
                                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                                        inst.isFirst && installmentSchedule.length > 1
                                          ? 'bg-primary/15 border-2 border-primary/40 font-semibold shadow-sm'
                                          : 'bg-muted/60 dark:bg-slate-900/60 border border-border/80'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black ${
                                          inst.isFirst && installmentSchedule.length > 1
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary text-foreground'
                                        }`}>
                                          {String(inst.installmentNumber).padStart(2, '0')}
                                        </span>
                                        <div>
                                          <span className="font-bold text-foreground block">
                                            {inst.description}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground block">
                                            Vencimento: <strong className="text-foreground font-semibold">{inst.dueDateFormatted}</strong>
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <span className="text-xs sm:text-sm font-extrabold text-foreground">
                                          R$ {inst.amount}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Observações / Descrição para o Comprador
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Lote importado com previsão para Novembro. Miniatura numerada na embalagem protetora."
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background border border-border text-sm text-foreground"
                />
              </div>

              {createOfferMutation.error && (
                <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{(createOfferMutation.error as any).message || 'Erro ao publicar anúncio'}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreateOffer(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  disabled={!offerPrice || createOfferMutation.isPending || (isPreOrder && allowInstallments && isCustomFirstInvalid)}
                  onClick={() => createOfferMutation.mutate()}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow disabled:opacity-50"
                >
                  {createOfferMutation.isPending ? 'Publicando...' : 'Publicar Anúncio no Marketplace'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Ajuste de Estoque Comercial</h3>
            <p className="text-xs text-muted-foreground">
              Item: <strong className="text-foreground">{adjustingOffer.title}</strong>
              <br />
              Estoque Físico Atual: {adjustingOffer.inventory?.onHand ?? 0} | Disponível:{' '}
              {adjustingOffer.inventory?.available ?? adjustingOffer.availableStock ?? 0}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Tipo de Movimento</label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
                >
                  <option value="STOCK_IN">Entrada (Adicionar unidades ao estoque)</option>
                  <option value="STOCK_OUT">Saída (Remover unidades por perda/dano)</option>
                  <option value="ADJUSTMENT">Inventário / Balanço Físico</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Motivo do Ajuste</label>
                <input
                  type="text"
                  placeholder="Ex: Aquisição de novo lote, conferência de gaveta"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAdjustingOffer(null)}
                  className="px-4 py-2 rounded-lg bg-secondary text-xs font-semibold text-foreground"
                >
                  Cancelar
                </button>
                <button
                  disabled={adjustStockMutation.isPending}
                  onClick={() => adjustStockMutation.mutate()}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-glow"
                >
                  {adjustStockMutation.isPending ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL SETTLEMENT (DAR BAIXA) MODAL */}
      {settleModal.isOpen && settleModal.installment && settleModal.preOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Dar Baixa Manual de Parcela
              </h3>
              <button
                onClick={() => setSettleModal({ isOpen: false, preOrder: null, installment: null })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1 text-xs">
              <p className="text-muted-foreground">
                Reserva: <strong className="text-foreground">{settleModal.preOrder.preOrderNumber}</strong>
              </p>
              <p className="text-muted-foreground">
                Item: <strong className="text-foreground">{settleModal.preOrder.variation.name}</strong>
              </p>
              <p className="text-muted-foreground">
                Cliente: <strong className="text-foreground">{settleModal.preOrder.buyer.name}</strong>
              </p>
              <p className="text-muted-foreground">
                Parcela: <strong className="text-primary">{settleModal.installment.description}</strong> (Valor nominal: R$ {parseFloat(settleModal.installment.amount).toFixed(2)})
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Valor Pago / Baixado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground font-bold focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Meio de Pagamento *
                </label>
                <select
                  value={settleMethod}
                  onChange={(e: any) => setSettleMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground font-semibold"
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro em Espécie</option>
                  <option value="TRANSFERENCIA">Transferência Bancária (TED/DOC)</option>
                  <option value="CARTAO">Cartão de Crédito / Débito</option>
                  <option value="OUTRO">Outro Meio</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Observações / Comprovante (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante confirmado no WhatsApp, transação E2E..."
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setSettleModal({ isOpen: false, preOrder: null, installment: null })}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground font-semibold"
                >
                  Cancelar
                </button>
                <button
                  disabled={!settleAmount || settleMutation.isPending}
                  onClick={() => settleMutation.mutate()}
                  className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-glow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {settleMutation.isPending ? 'Confirmando...' : 'Confirmar Baixa da Parcela'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INSTALLMENT (VENCIMENTO & VALOR) MODAL */}
      {editInstallmentModal.isOpen && editInstallmentModal.installment && editInstallmentModal.preOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Editar Parcela & Vencimento
              </h3>
              <button
                onClick={() => setEditInstallmentModal({ isOpen: false, preOrder: null, installment: null })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1 text-xs">
              <p className="text-muted-foreground">
                Reserva: <strong className="text-foreground">{editInstallmentModal.preOrder.preOrderNumber}</strong>
              </p>
              <p className="text-muted-foreground">
                Item: <strong className="text-foreground">{editInstallmentModal.preOrder.variation.name}</strong>
              </p>
              <p className="text-muted-foreground">
                Cliente: <strong className="text-foreground">{editInstallmentModal.preOrder.buyer.name}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Descrição da Parcela
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground font-bold"
                />
                <p className="text-[10px] text-muted-foreground pt-1">
                  Data limite combinada para o pagamento desta parcela.
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Valor da Parcela (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground font-bold"
                />
                <p className="text-[10px] text-muted-foreground pt-1">
                  Ao alterar o valor, o total e o saldo restante da pré-venda serão recalculados automaticamente.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setEditInstallmentModal({ isOpen: false, preOrder: null, installment: null })}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground font-semibold"
                >
                  Cancelar
                </button>
                <button
                  disabled={!editAmount || updateInstallmentMutation.isPending}
                  onClick={() => updateInstallmentMutation.mutate()}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-glow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {updateInstallmentMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARRIVAL MODAL (INFORMAR CHEGADA DA MINIATURA) */}
      {arrivalModal.isOpen && arrivalModal.campaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                Registrar Chegada da Miniatura
              </h3>
              <button
                onClick={() => setArrivalModal({ isOpen: false, campaign: null, arrivedAt: '' })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {arrivalModal.campaign.variation?.photoUrl ? (
                  <img
                    src={arrivalModal.campaign.variation.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Layers className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-foreground text-xs truncate">
                  {arrivalModal.campaign.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {arrivalModal.campaign.variation?.name}
                </p>
                <p className="text-[10px] font-bold text-primary">
                  {arrivalModal.campaign.reservations.length} colecionador(es) reservaram esta peça
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Data de Chegada na Loja *
                </label>
                <input
                  type="date"
                  value={arrivalModal.arrivedAt}
                  onChange={(e) =>
                    setArrivalModal((prev) => ({ ...prev, arrivedAt: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground font-bold focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground pt-1">
                  Informe a data exata em que o lote físico foi recebido do fornecedor.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ao registrar a chegada, o status da campanha será atualizado para <strong>Chegou na Loja</strong> e as reservas dos colecionadores estarão prontas para entrega direta ou armazenamento na garagem.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setArrivalModal({ isOpen: false, campaign: null, arrivedAt: '' })}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground font-semibold"
                >
                  Cancelar
                </button>
                <button
                  disabled={!arrivalModal.arrivedAt || markArrivalMutation.isPending}
                  onClick={() => markArrivalMutation.mutate()}
                  className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-glow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {markArrivalMutation.isPending ? 'Confirmando...' : 'Confirmar Chegada da Miniatura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLECTOR FINANCIAL SUMMARY (RAIO-X DO COLECIONADOR) MODAL */}
      {selectedCollectorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-card border border-border p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Raio-X Financeiro do Colecionador
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Histórico unificado de reservas e parcelas em toda a rede de pré-vendas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCollectorId(null)}
                className="text-xs text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            {isCollectorSummaryLoading ? (
              <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                <Clock className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p>Carregando histórico do colecionador...</p>
              </div>
            ) : !collectorSummaryData ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Não foi possível carregar as informações deste colecionador.
              </div>
            ) : (
              <div className="space-y-5 overflow-y-auto pr-1 flex-1">
                {/* Collector Profile Card & Health Badge */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center font-black text-sm text-foreground border border-border shrink-0 overflow-hidden">
                      {collectorSummaryData.collector.avatarUrl ? (
                        <img src={collectorSummaryData.collector.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        collectorSummaryData.collector.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground text-sm">{collectorSummaryData.collector.name}</p>
                      <p className="text-xs text-muted-foreground">{collectorSummaryData.collector.email}</p>
                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        {collectorSummaryData.collector.city && (
                          <span className="text-muted-foreground">
                            {collectorSummaryData.collector.city}{collectorSummaryData.collector.state ? `, ${collectorSummaryData.collector.state}` : ''}
                          </span>
                        )}
                        {collectorSummaryData.collector.whatsapp && (
                          <a
                            href={`https://wa.me/55${collectorSummaryData.collector.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-emerald-500 hover:underline"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Status de Pagamento
                    </span>
                    {collectorSummaryData.healthStatus === 'GREEN' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        🟢 Pagamento em Dia (0 atrasos)
                      </span>
                    )}
                    {collectorSummaryData.healthStatus === 'YELLOW' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        🟡 Alerta (Até 10d de atraso)
                      </span>
                    )}
                    {collectorSummaryData.healthStatus === 'RED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        🔴 Inadimplente ({collectorSummaryData.maxOverdueDays}d de atraso)
                      </span>
                    )}
                  </div>
                </div>

                {/* Platform Rule Explanation Box */}
                {collectorSummaryData.healthStatus === 'RED' ? (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-300">Regra de Segurança Ativada</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        Este colecionador possui parcela em aberto com <strong>mais de 10 dias de atraso</strong>. Por essa razão, qualquer nova reserva realizada por ele na sua loja ficará retida como <em>Aguardando Aprovação</em> até sua liberação manual.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-300">Colecionador Elegível para Aprovação Automática</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        Nenhuma parcela com atraso superior a 10 dias encontrada na rede. As reservas deste colecionador são confirmadas imediatamente sem necessidade de intervenção.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1: Pre-Orders List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-primary" />
                    Pré-Vendas Contratadas ({collectorSummaryData.preOrders.length})
                  </h4>

                  {collectorSummaryData.preOrders.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs bg-secondary/20 rounded-xl">
                      Nenhuma pré-venda registrada.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-secondary/40 text-[10px] text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Miniatura</th>
                            <th className="py-2.5 px-3">Vendedor</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                            <th className="py-2.5 px-3 text-right">Saldo Restante</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {collectorSummaryData.preOrders.map((po) => {
                            const isPendingAppr = po.status === 'PENDING_APPROVAL' || po.requiresApproval;
                            return (
                              <tr key={po.id} className="hover:bg-secondary/20">
                                <td className="py-2.5 px-3 font-mono font-bold text-primary">
                                  {po.preOrderNumber}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-foreground">
                                  {po.miniatureName}
                                </td>
                                <td className="py-2.5 px-3">
                                  {po.isCurrentSeller ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                      Sua Loja
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">
                                      {po.sellerStoreName}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                  R$ {parseFloat(po.totalAmount).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-amber-500">
                                  R$ {parseFloat(po.remainingAmount).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isPendingAppr ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black">
                                      Aguardando Aprovação
                                    </span>
                                  ) : po.status === 'RESERVED' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                      Confirmada
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">{po.status}</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {po.isCurrentSeller && isPendingAppr && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => {
                                          setApprovalActionModal({
                                            isOpen: true,
                                            preOrder: po,
                                            type: 'APPROVE',
                                            reasonOrNotes: '',
                                          });
                                        }}
                                        className="px-2 py-1 rounded bg-emerald-500 text-white font-bold text-[10px] hover:bg-emerald-600"
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        onClick={() => {
                                          setApprovalActionModal({
                                            isOpen: true,
                                            preOrder: po,
                                            type: 'REJECT',
                                            reasonOrNotes: '',
                                          });
                                        }}
                                        className="px-2 py-1 rounded bg-destructive/15 text-destructive font-bold text-[10px] hover:bg-destructive hover:text-white border border-destructive/20"
                                      >
                                        Recusar
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2: Installments Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Histórico de Parcelas na Rede ({collectorSummaryData.installments.length})
                  </h4>

                  {collectorSummaryData.installments.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs bg-secondary/20 rounded-xl">
                      Nenhuma parcela programada registrada.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-secondary/40 text-[10px] text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Parcela</th>
                            <th className="py-2.5 px-3">Descrição</th>
                            <th className="py-2.5 px-3">Origem</th>
                            <th className="py-2.5 px-3">Vencimento</th>
                            <th className="py-2.5 px-3 text-right">Valor</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Atraso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {collectorSummaryData.installments.map((inst) => {
                            const isPaid = inst.status === 'PAID';
                            const isOverdue = inst.isOverdue || inst.status === 'OVERDUE';

                            return (
                              <tr
                                key={inst.id}
                                className={`transition-colors ${
                                  isOverdue && inst.daysOverdue > 10
                                    ? 'bg-rose-500/10'
                                    : isOverdue
                                    ? 'bg-amber-500/5'
                                    : 'hover:bg-secondary/20'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono font-bold">
                                  {inst.installmentNumber}/{inst.totalInstallments}
                                </td>
                                <td className="py-2.5 px-3 text-foreground font-medium">
                                  {inst.description}
                                </td>
                                <td className="py-2.5 px-3">
                                  {inst.isCurrentSeller ? (
                                    <span className="text-primary font-bold text-[10px]">Sua Loja</span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">Outro Vendedor</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {inst.dueDate
                                    ? new Date(inst.dueDate).toLocaleDateString('pt-BR')
                                    : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-foreground">
                                  R$ {parseFloat(inst.amount).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isPaid ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                      Quitada
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                                      Vencida
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground">
                                      A Vencer
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold">
                                  {isPaid ? (
                                    <span className="text-emerald-500 text-[10px]">Em dia</span>
                                  ) : inst.daysOverdue > 10 ? (
                                    <span className="text-rose-500 text-xs font-black">
                                      {inst.daysOverdue} dias (&gt;10d)
                                    </span>
                                  ) : inst.daysOverdue > 0 ? (
                                    <span className="text-amber-500 text-xs font-bold">
                                      {inst.daysOverdue} dias
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">No prazo</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border shrink-0">
              <button
                onClick={() => setSelectedCollectorId(null)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 font-bold text-xs text-foreground transition-all"
              >
                Fechar Raio-X
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL / REJECTION CONFIRMATION MODAL */}
      {approvalActionModal.isOpen && approvalActionModal.preOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                {approvalActionModal.type === 'APPROVE' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Aprovar Reserva de Pré-Venda
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    Recusar Reserva de Pré-Venda
                  </>
                )}
              </h3>
              <button
                onClick={() =>
                  setApprovalActionModal({
                    isOpen: false,
                    preOrder: null,
                    type: 'APPROVE',
                    reasonOrNotes: '',
                  })
                }
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1.5 text-xs">
              <p className="text-muted-foreground">
                Código: <strong className="text-foreground">{approvalActionModal.preOrder.preOrderNumber}</strong>
              </p>
              <p className="text-muted-foreground">
                Item: <strong className="text-foreground">{approvalActionModal.preOrder.variation?.name || approvalActionModal.preOrder.miniatureName || 'Miniatura'}</strong>
              </p>
              <p className="text-muted-foreground">
                Colecionador: <strong className="text-foreground">{approvalActionModal.preOrder.buyer?.name || 'Cliente'}</strong>
              </p>
              {approvalActionModal.preOrder.approvalReason && (
                <p className="text-amber-500 text-[11px] pt-1">
                  Motivo da retenção: {approvalActionModal.preOrder.approvalReason}
                </p>
              )}
            </div>

            {approvalActionModal.type === 'APPROVE' ? (
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Ao aprovar, a reserva será confirmada para o colecionador e o cronograma de parcelas permanecerá ativo na sua loja.
                </p>
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Observações de Aprovação (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Combinado pagamento via PIX até sexta-feira."
                    value={approvalActionModal.reasonOrNotes}
                    onChange={(e) =>
                      setApprovalActionModal((prev) => ({
                        ...prev,
                        reasonOrNotes: e.target.value,
                      }))
                    }
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <p className="font-bold">Atenção ao Recusar:</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    A reserva será cancelada e a cota da miniatura será <strong>estornada de volta ao estoque disponível</strong> do anúncio.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Motivo da Recusa *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Inadimplência em parcelas anteriores superior a 10 dias. Favor regularizar antes de novas reservas."
                    value={approvalActionModal.reasonOrNotes}
                    onChange={(e) =>
                      setApprovalActionModal((prev) => ({
                        ...prev,
                        reasonOrNotes: e.target.value,
                      }))
                    }
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() =>
                  setApprovalActionModal({
                    isOpen: false,
                    preOrder: null,
                    type: 'APPROVE',
                    reasonOrNotes: '',
                  })
                }
                className="px-4 py-2 rounded-lg bg-secondary text-foreground font-semibold text-xs"
              >
                Cancelar
              </button>
              {approvalActionModal.type === 'APPROVE' ? (
                <button
                  disabled={approveReservationMutation.isPending}
                  onClick={() =>
                    approveReservationMutation.mutate({
                      preOrderId: approvalActionModal.preOrder.id,
                      notes: approvalActionModal.reasonOrNotes || undefined,
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {approveReservationMutation.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
                </button>
              ) : (
                <button
                  disabled={
                    !approvalActionModal.reasonOrNotes.trim() ||
                    rejectReservationMutation.isPending
                  }
                  onClick={() =>
                    rejectReservationMutation.mutate({
                      preOrderId: approvalActionModal.preOrder.id,
                      reason: approvalActionModal.reasonOrNotes,
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {rejectReservationMutation.isPending ? 'Recusando...' : 'Confirmar Recusa e Devolver Estoque'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR ENDEREÇO DE DESPACHO */}
      {addressModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {addressModal.addressId ? 'Editar Ponto de Saída' : 'Novo Ponto de Saída & Despacho'}
              </h3>
              <button
                onClick={() =>
                  setAddressModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Identificador do Ponto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Galpão Central, Loja Física, Depósito Zona Leste"
                  value={addressModal.label}
                  onChange={(e) =>
                    setAddressModal((prev) => ({ ...prev, label: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Nome do Responsável / Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos (opcional)"
                    value={addressModal.contactName}
                    onChange={(e) =>
                      setAddressModal((prev) => ({ ...prev, contactName: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={addressModal.phone}
                    onChange={(e) =>
                      setAddressModal((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Endereço Físico */}
              <div className="rounded-xl border border-border bg-secondary/15 p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">CEP *</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="00000-000"
                        value={addressModal.postalCode}
                        onChange={(e) =>
                          setAddressModal((prev) => ({ ...prev, postalCode: e.target.value }))
                        }
                        onBlur={handleAddressCepBlur}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                      />
                      {isSearchingAddressCep && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-3" />
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground block mb-1">Logradouro / Rua *</label>
                    <input
                      type="text"
                      placeholder="Rua ou Avenida..."
                      value={addressModal.street}
                      onChange={(e) =>
                        setAddressModal((prev) => ({ ...prev, street: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Número *</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={addressModal.number}
                      onChange={(e) =>
                        setAddressModal((prev) => ({ ...prev, number: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Galpão B"
                      value={addressModal.complement}
                      onChange={(e) =>
                        setAddressModal((prev) => ({ ...prev, complement: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Bairro *</label>
                    <input
                      type="text"
                      placeholder="Distrito Industrial"
                      value={addressModal.neighborhood}
                      onChange={(e) =>
                        setAddressModal((prev) => ({ ...prev, neighborhood: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Cidade *</label>
                    <input
                      type="text"
                      placeholder="São Paulo"
                      value={addressModal.city}
                      onChange={(e) =>
                        setAddressModal((prev) => ({ ...prev, city: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Estado (UF) *</label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      value={addressModal.state}
                      onChange={(e) =>
                        setAddressModal((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={addressModal.isDefault}
                  onChange={(e) =>
                    setAddressModal((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-primary"
                />
                Definir este local como ponto padrão de saída para novos anúncios
              </label>

              {saveAddressMutation.error && (
                <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                  {(saveAddressMutation.error as any).message || 'Erro ao salvar endereço.'}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() =>
                    setAddressModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground font-semibold text-xs hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  disabled={
                    !addressModal.label ||
                    !addressModal.postalCode ||
                    !addressModal.street ||
                    !addressModal.number ||
                    !addressModal.city ||
                    !addressModal.state ||
                    saveAddressMutation.isPending
                  }
                  onClick={() => saveAddressMutation.mutate()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {saveAddressMutation.isPending ? 'Salvando...' : 'Salvar Endereço'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR INTEGRAÇÃO LOGÍSTICA (BYOK) */}
      {integrationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-purple-400" />
                  {integrationModal.provider === 'SUPERFRETE'
                    ? 'Conectar SuperFrete'
                    : integrationModal.provider === 'FRETE_RAPIDO'
                    ? 'Conectar Frete Rápido'
                    : 'Conectar Melhor Envio'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Insira o token gerado na sua conta para habilitar cotações diretas.
                </p>
              </div>
              <button
                onClick={() =>
                  setIntegrationModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            {/* Platform Instructions Box */}
            <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs space-y-1.5">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Onde encontrar suas credenciais?
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {integrationModal.provider === 'SUPERFRETE' && (
                  <>Acesse o aplicativo ou painel web do <strong>SuperFrete</strong>, vá em <em>Configurações &gt; Integrações</em> e gere o seu Token de API.</>
                )}
                {integrationModal.provider === 'FRETE_RAPIDO' && (
                  <>Acesse o painel <strong>Frete Rápido</strong>, vá em <em>Configurações &gt; Integração / Expedição</em> e copie seu Token de Expedição e CNPJ.</>
                )}
                {integrationModal.provider === 'MELHOR_ENVIO' && (
                  <>Acesse o painel <strong>Melhor Envio</strong>, vá em <em>Gerenciar Chaves &gt; Tokens de Acesso</em> e gere um novo token de aplicação.</>
                )}
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Token / Chave de API *
                </label>
                <input
                  type="password"
                  placeholder={
                    integrationModal.provider === 'SUPERFRETE'
                      ? 'Ex: eyJhbGciOiJIUzI1Ni...'
                      : integrationModal.provider === 'FRETE_RAPIDO'
                      ? 'Ex: fr_token_expedicao_...'
                      : 'Ex: eyJ0eXAiOiJKV1Qi...'
                  }
                  value={integrationModal.apiKey}
                  onChange={(e) =>
                    setIntegrationModal((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {integrationModal.provider === 'FRETE_RAPIDO' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      CNPJ do Remetente (Cadastrado no Frete Rápido)
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={integrationModal.extraConfig?.cnpj || ''}
                      onChange={(e) =>
                        setIntegrationModal((prev) => ({
                          ...prev,
                          extraConfig: {
                            ...prev.extraConfig,
                            cnpj: e.target.value.replace(/\D/g, ''),
                          },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Código da Plataforma
                    </label>
                    <input
                      type="text"
                      placeholder="MINIHUBCAR"
                      value={integrationModal.extraConfig?.platformCode || 'MINIHUBCAR'}
                      onChange={(e) =>
                        setIntegrationModal((prev) => ({
                          ...prev,
                          extraConfig: {
                            ...prev.extraConfig,
                            platformCode: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={integrationModal.isActive}
                  onChange={(e) =>
                    setIntegrationModal((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs text-foreground font-medium">
                  Ativar esta integração para cotações em tempo real
                </span>
              </label>

              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40 text-[10px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Seu token é criptografado com segurança no servidor e nunca é exposto aos compradores.</span>
              </div>

              {saveIntegrationMutation.error && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {(saveIntegrationMutation.error as any).message || 'Erro ao salvar integração.'}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() =>
                    setIntegrationModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!integrationModal.apiKey.trim() || saveIntegrationMutation.isPending}
                  onClick={() =>
                    saveIntegrationMutation.mutate({
                      provider: integrationModal.provider,
                      input: {
                        apiKey: integrationModal.apiKey.trim(),
                        extraConfig: integrationModal.extraConfig,
                        isActive: integrationModal.isActive,
                      },
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {saveIntegrationMutation.isPending ? 'Salvando...' : 'Salvar Credenciais'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* QUICK CREATE MINIATURE MODAL */}
      <QuickCreateMiniatureModal
        isOpen={showQuickCreateModal}
        onClose={() => setShowQuickCreateModal(false)}
        initialName={catalogSearch}
        onCreated={(createdVariation) => {
          setSelectedVariation(createdVariation);
          setOfferTitle(`${createdVariation.name} - ${isPreOrder ? 'Pré-Venda' : 'Pronta Entrega'}`);
          setShowQuickCreateModal(false);
          setShowCreateOffer(true);
        }}
      />
    </div>
  );
}
