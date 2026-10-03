'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/lib/api/users';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  User,
  Mail,
  Lock,
  Phone,
  Instagram,
  Globe,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Shield,
  Save,
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CollectionPhotosSection } from '@/features/profile/components/CollectionPhotosSection';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'security' | 'collectionPhotos'>('profile');

  // Form State: Profile & Contact
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [isCollectionPublic, setIsCollectionPublic] = useState(true);

  // Form State: Address
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Form State: Security (Email & Password)
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status banners
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null);
  const [addressErrorMsg, setAddressErrorMsg] = useState<string | null>(null);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(null);
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string | null>(null);

  // Avatar uploading
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Query Profile
  const { data: profileRes, isLoading, error } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user?.id,
  });

  const profile = profileRes?.data;

  // Initialize fields once profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAvatarUrl(profile.avatarUrl || '');
      setWhatsapp(profile.whatsapp || '');
      setInstagram(profile.instagram || '');
      setWebsite(profile.website || '');
      setPostalCode(profile.postalCode || '');
      setStreet(profile.street || '');
      setNumber(profile.number || '');
      setComplement(profile.complement || '');
      setNeighborhood(profile.neighborhood || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setNewEmail(profile.email || '');
      setIsCollectionPublic(profile.isCollectionPublic ?? true);
    }
  }, [profile]);

  // Cep lookup with ViaCEP
  const handleCepSearch = async (cepToSearch: string) => {
    const cleanCep = cepToSearch.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepError('Digite um CEP válido com 8 dígitos.');
      return;
    }

    setIsSearchingCep(true);
    setCepError(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError('CEP não encontrado na base dos Correios.');
      } else {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        setCepError(null);
      }
    } catch {
      setCepError('Não foi possível consultar o CEP no momento.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    setPostalCode(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      handleCepSearch(val);
    }
  };

  // Avatar File Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setProfileErrorMsg(null);

    try {
      const res = await usersApi.uploadAvatar(file);
      setAvatarUrl(res.url);
      setProfileSuccessMsg('Foto carregada com sucesso! Clique em "Salvar Alterações" para confirmar.');
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Erro ao enviar a imagem.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        name,
        avatarUrl: avatarUrl || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        website: website || null,
        isCollectionPublic,
      }),
    onSuccess: async () => {
      setProfileSuccessMsg('Dados cadastrais e de contato atualizados com sucesso!');
      setProfileErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await refreshUser();
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setProfileErrorMsg(err.message || 'Erro ao salvar alterações.');
      setProfileSuccessMsg(null);
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        postalCode: postalCode || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
      }),
    onSuccess: () => {
      setAddressSuccessMsg('Endereço completo salvo com sucesso!');
      setAddressErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setTimeout(() => setAddressSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setAddressErrorMsg(err.message || 'Erro ao salvar o endereço.');
      setAddressSuccessMsg(null);
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: () =>
      usersApi.updateEmail({
        newEmail,
        currentPassword: emailCurrentPassword,
      }),
    onSuccess: async () => {
      setSecuritySuccessMsg('E-mail atualizado com sucesso! Novos tokens de autenticação gerados.');
      setSecurityErrorMsg(null);
      setEmailCurrentPassword('');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await refreshUser();
      setTimeout(() => setSecuritySuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setSecurityErrorMsg(err.message || 'Erro ao alterar e-mail.');
      setSecuritySuccessMsg(null);
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) {
        throw new Error('A nova senha e a confirmação não coincidem.');
      }
      return usersApi.updatePassword({
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setSecuritySuccessMsg('Senha alterada com sucesso!');
      setSecurityErrorMsg(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSecuritySuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setSecurityErrorMsg(err.message || 'Erro ao alterar senha.');
      setSecuritySuccessMsg(null);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-card border border-border" />
        <div className="h-64 rounded-2xl bg-card border border-border" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center bg-card rounded-2xl border border-destructive/30 p-8 space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Não foi possível carregar o perfil</h2>
        <p className="text-sm text-muted-foreground">
          Por favor, verifique se está autenticado ou tente novamente mais tarde.
        </p>
      </div>
    );
  }

  // Format initials for avatar placeholder
  const initials = profile.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MC';

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profile Identity Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="h-24 w-24 rounded-full border-2 border-primary/40 bg-secondary flex items-center justify-center overflow-hidden shadow-glow">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-foreground tracking-wider">{initials}</span>
              )}
            </div>

            <label
              htmlFor="avatar-upload-input"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:bg-primary-hover transition-transform group-hover:scale-105"
              title="Trocar foto de perfil"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
                disabled={isUploadingAvatar}
              />
            </label>
          </div>

          {/* Profile Overview */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-foreground">{profile.name}</h1>
              {profile.roles?.includes('CATALOG_ADMIN') || profile.roles?.includes('SYSTEM_ADMIN') ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/30">
                  <Shield className="h-3 w-3" /> Administrador
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                  <Sparkles className="h-3 w-3 text-primary" /> Colecionador
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {profile.email}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-muted-foreground">
              {memberSince && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Membro desde {memberSince}
                </span>
              )}
              {profile.city && profile.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.city}, {profile.state}
                </span>
              )}
              {profile.whatsapp && (
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <Phone className="h-3.5 w-3.5" /> {profile.whatsapp}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" /> Dados Pessoais & Contatos
        </button>

        <button
          onClick={() => setActiveTab('address')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'address'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="h-4 w-4" /> Endereço Completo
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lock className="h-4 w-4" /> E-mail & Senha
        </button>

        <button
          onClick={() => setActiveTab('collectionPhotos')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'collectionPhotos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Camera className="h-4 w-4" /> Fotos da Minha Coleção
        </button>
      </div>

      {/* TAB 1: DADOS PESSOAIS & CONTATOS */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Informações de Cadastro & Redes Sociais</h2>
            <p className="text-xs text-muted-foreground">
              Atualize seus dados públicos e canais de contato com outros colecionadores.
            </p>
          </div>

          {profileSuccessMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nome de Exibição / Nome Completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* URL da Foto / Avatar */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Link da Foto de Perfil (Avatar URL)
              </label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://exemplo.com/minha-foto.jpg ou faça o upload clicando na câmera acima"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Você pode colar um link direto de imagem ou clicar no ícone de câmera na foto acima para enviar um arquivo do seu dispositivo.
              </p>
            </div>

            {/* Redes & Contato */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* WhatsApp */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  WhatsApp com DDD
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Instagram */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Perfil no Instagram
                </label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@seuperfil"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Website / Linktree / Loja
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://meusite.com.br"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Quick Link Previews */}
            {(whatsapp || instagram || website) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {whatsapp && (
                  <a
                    href={`https://wa.me/55${whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="h-3 w-3" /> Testar WhatsApp <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {instagram && (
                  <a
                    href={`https://instagram.com/${instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-500 text-xs font-semibold border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
                  >
                    <Instagram className="h-3 w-3" /> Ver Instagram <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {website && (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <Globe className="h-3 w-3" /> Acessar Website <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}

            {/* Privacidade da Coleção (Pública / Privada) */}
            <div className="rounded-xl border border-border bg-secondary/15 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Privacidade da Coleção</span>
                    {isCollectionPublic ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Pública
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Lock className="h-3 w-3" /> Privada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    {isCollectionPublic
                      ? 'Sua coleção está pública. Outros colecionadores da comunidade do MiniHub Car podem visualizar as miniaturas cadastradas na sua garagem e fotos reais.'
                      : 'Sua coleção está estritamente privada. Apenas você tem acesso visual e de gerenciamento aos seus exemplares.'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isCollectionPublic}
                    onChange={(e) => setIsCollectionPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              disabled={!name.trim() || updateProfileMutation.isPending}
              onClick={() => updateProfileMutation.mutate()}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ENDEREÇAMENTO COMPLETO */}
      {activeTab === 'address' && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Endereço Completo de Envio & Despacho</h2>
            <p className="text-xs text-muted-foreground">
              Utilizado para agilizar o cálculo de frete e preenchimento de pedidos no Marketplace.
            </p>
          </div>

          {addressSuccessMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{addressSuccessMsg}</span>
            </div>
          )}

          {addressErrorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{addressErrorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* CEP com Busca ViaCEP */}
            <div className="max-w-xs">
              <label className="text-xs font-semibold text-foreground block mb-1">
                CEP (Código Postal)
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={postalCode}
                    maxLength={9}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSearchingCep}
                  onClick={() => handleCepSearch(postalCode)}
                  className="px-3 rounded-lg bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-secondary/80 flex items-center gap-1.5"
                  title="Buscar endereço pelo CEP"
                >
                  {isSearchingCep ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Search className="h-3.5 w-3.5 text-primary" />
                  )}
                  Buscar
                </button>
              </div>
              {cepError && <p className="text-[11px] text-destructive mt-1">{cepError}</p>}
            </div>

            {/* Logradouro e Número */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Logradouro / Rua / Avenida
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex: Rua dos Colecionadores"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 123"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Complemento e Bairro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Complemento (Opcional)
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Ex: Apto 42, Bloco B"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  value={state}
                  maxLength={2}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground uppercase focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              disabled={updateAddressMutation.isPending}
              onClick={() => updateAddressMutation.mutate()}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all"
            >
              {updateAddressMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Endereço
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SEGURANÇA (EMAIL & SENHA) */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {securitySuccessMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{securitySuccessMsg}</span>
            </div>
          )}

          {securityErrorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{securityErrorMsg}</span>
            </div>
          )}

          {/* Form 1: Alterar E-mail */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Alterar Endereço de E-mail
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Por motivos de segurança, você precisará confirmar sua senha atual para alterar o e-mail de login.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Novo E-mail de Acesso *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novoemail@exemplo.com"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Senha Atual para Confirmação *
                </label>
                <input
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={
                  !newEmail.trim() ||
                  !emailCurrentPassword.trim() ||
                  newEmail.trim().toLowerCase() === profile.email.toLowerCase() ||
                  updateEmailMutation.isPending
                }
                onClick={() => updateEmailMutation.mutate()}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all"
              >
                {updateEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Atualizar E-mail
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form 2: Alterar Senha */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Alterar Senha de Acesso
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha uma nova senha forte com pelo menos 6 caracteres.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Senha Atual *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Nova Senha (mínimo 6 caracteres) *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Confirme a Nova Senha *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  As senhas digitadas não coincidem.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={
                  !currentPassword.trim() ||
                  !newPassword.trim() ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword ||
                  updatePasswordMutation.isPending
                }
                onClick={() => updatePasswordMutation.mutate()}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all"
              >
                {updatePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Atualizar Senha
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FOTOS DA MINHA COLEÇÃO */}
      {activeTab === 'collectionPhotos' && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
          <CollectionPhotosSection />
        </div>
      )}
    </div>
  );
}
