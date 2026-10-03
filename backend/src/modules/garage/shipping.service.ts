import { db } from '../../database/client';
import { sellerProfile, sellerShippingAddress, sellerShippingIntegration, offer } from '../../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../../shared/errors/api-error';

export interface PackagingDetails {
  miniaturesCount: number;
  weightGrams: number;
  weightKg: number;
  dimensions: {
    height: number;
    width: number;
    length: number;
  };
  declaredValue: number;
  isCustomWeight: boolean;
  includeInsurance: boolean;
  insuranceAmount: number;
}

export interface ShippingOption {
  id: string;
  carrier: string;
  serviceName: string;
  price: number;
  basePrice?: number;
  insuranceCost?: number;
  currency: string;
  deliveryDays: number;
  deliveryEstimate: string;
  badge?: string;
  companyLogo?: string;
}

export interface ShippingQuoteResult {
  originPostalCode: string;
  originCity: string;
  originState: string;
  originLabel: string;
  destinationPostalCode: string;
  package: PackagingDetails;
  declaredValue: number;
  includeInsurance: boolean;
  insuranceEstimate: number;
  options: ShippingOption[];
}

export class ShippingService {
  /**
   * Resolves the packaging weight and dimensions based on miniatures count and custom weights.
   */
  calculatePackaging(
    items: Array<{ quantity: number; unitPrice: number; packageWeightGrams?: number | null }>,
    customWeightGrams?: number | null,
    includeInsurance: boolean = true
  ): PackagingDetails {
    const totalCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
    const declaredValue = items.reduce((acc, it) => acc + (it.quantity || 1) * it.unitPrice, 0);

    // Sum individual weights or use standard 150g per miniature
    let calculatedWeight = 0;
    for (const it of items) {
      const unitWeight = it.packageWeightGrams && it.packageWeightGrams > 0 ? it.packageWeightGrams : 150;
      calculatedWeight += unitWeight * (it.quantity || 1);
    }

    // Add box packaging tare (80g for small, 150g for medium, 250g for large)
    const boxTare = totalCount <= 2 ? 80 : totalCount <= 6 ? 140 : 220;
    calculatedWeight += boxTare;

    const finalWeight = customWeightGrams && customWeightGrams > 0 ? customWeightGrams : calculatedWeight;

    // Dimensions in cm
    let height = 8;
    let width = 14;
    let length = 18;

    if (totalCount === 1) {
      height = 6;
      width = 12;
      length = 16;
    } else if (totalCount <= 4) {
      height = 10;
      width = 16;
      length = 20;
    } else if (totalCount <= 8) {
      height = 14;
      width = 18;
      length = 24;
    } else if (totalCount <= 16) {
      height = 18;
      width = 22;
      length = 30;
    } else {
      height = 22;
      width = 28;
      length = 36;
    }

    // Estimated standard insurance rate ~1.0%, min R$ 1.50 if declaredValue > 0
    const insuranceAmount = includeInsurance && declaredValue > 0
      ? Math.max(1.5, parseFloat((declaredValue * 0.01).toFixed(2)))
      : 0;

    return {
      miniaturesCount: totalCount,
      weightGrams: finalWeight,
      weightKg: parseFloat((finalWeight / 1000).toFixed(2)),
      dimensions: { height, width, length },
      declaredValue: parseFloat(declaredValue.toFixed(2)),
      isCustomWeight: !!(customWeightGrams && customWeightGrams > 0),
      includeInsurance,
      insuranceAmount,
    };
  }

  /**
   * Calculates shipping quotes from the seller's origin to buyer's destination.
   */
  async calculateQuote(params: {
    sellerId: string;
    items: Array<{ quantity: number; unitPrice: number; packageWeightGrams?: number | null }>;
    destinationZip: string;
    customWeightGrams?: number | null;
    includeInsurance?: boolean;
  }): Promise<ShippingQuoteResult> {
    const { sellerId, items, destinationZip, customWeightGrams, includeInsurance = true } = params;

    // 1. Resolve Seller Origin Address
    // First, check seller_shipping_address (where isDefault = true)
    const [defaultAddress] = await db
      .select()
      .from(sellerShippingAddress)
      .where(and(eq(sellerShippingAddress.sellerId, sellerId), eq(sellerShippingAddress.isDefault, true)))
      .limit(1);

    // Fallback to any address or seller_profile
    let originAddress = defaultAddress;
    if (!originAddress) {
      const [anyAddress] = await db
        .select()
        .from(sellerShippingAddress)
        .where(eq(sellerShippingAddress.sellerId, sellerId))
        .limit(1);
      originAddress = anyAddress;
    }

    const [seller] = await db
      .select()
      .from(sellerProfile)
      .where(eq(sellerProfile.id, sellerId))
      .limit(1);

    if (!seller) {
      throw new NotFoundError('Vendedor não encontrado');
    }

    const originZip = originAddress?.postalCode || seller.postalCode || '01001-000';
    const originCity = originAddress?.city || seller.city || 'São Paulo';
    const originState = originAddress?.state || seller.state || 'SP';
    const originLabel = originAddress?.label || 'Loja Principal';

    // 2. Package calculation
    const packaging = this.calculatePackaging(items, customWeightGrams, includeInsurance);

    // 3. Clean Zips
    const cleanOrigin = originZip.replace(/\D/g, '');
    const cleanDest = destinationZip.replace(/\D/g, '');

    if (cleanDest.length < 8) {
      throw new BadRequestError('CEP de destino inválido');
    }

    // 4. Check for Seller BYOK Integrations (SuperFrete, Frete Rápido, Melhor Envio)
    const activeIntegrations = await db
      .select()
      .from(sellerShippingIntegration)
      .where(
        and(
          eq(sellerShippingIntegration.sellerId, sellerId),
          eq(sellerShippingIntegration.isActive, true)
        )
      );

    const superfreteInteg = activeIntegrations.find((i) => i.provider === 'SUPERFRETE');
    const freteRapidoInteg = activeIntegrations.find((i) => i.provider === 'FRETE_RAPIDO');
    const melhorEnvioInteg = activeIntegrations.find((i) => i.provider === 'MELHOR_ENVIO');

    const liveOptions: ShippingOption[] = [];

    // 4.1 SuperFrete Live API
    if (superfreteInteg && superfreteInteg.apiKey) {
      try {
        const sfQuotes = await this.fetchSuperFreteQuotes({
          token: superfreteInteg.apiKey,
          fromCep: cleanOrigin,
          toCep: cleanDest,
          package: packaging,
        });
        if (sfQuotes && sfQuotes.length > 0) {
          liveOptions.push(...sfQuotes);
        }
      } catch (err) {
        console.warn('SuperFrete API calculation failed, falling back:', err);
      }
    }

    // 4.2 Frete Rápido Live API
    if (freteRapidoInteg && freteRapidoInteg.apiKey) {
      try {
        const frQuotes = await this.fetchFreteRapidoQuotes({
          token: freteRapidoInteg.apiKey,
          extraConfig: freteRapidoInteg.extraConfig || {},
          fromCep: cleanOrigin,
          toCep: cleanDest,
          package: packaging,
        });
        if (frQuotes && frQuotes.length > 0) {
          liveOptions.push(...frQuotes);
        }
      } catch (err) {
        console.warn('Frete Rápido API calculation failed, falling back:', err);
      }
    }

    // 4.3 Melhor Envio (Seller Token or Marketplace Token)
    const meToken = melhorEnvioInteg?.apiKey || process.env.MELHOR_ENVIO_TOKEN;
    if (meToken) {
      try {
        const meQuotes = await this.fetchMelhorEnvioQuotes({
          token: meToken,
          fromCep: cleanOrigin,
          toCep: cleanDest,
          package: packaging,
        });
        if (meQuotes && meQuotes.length > 0) {
          liveOptions.push(...meQuotes);
        }
      } catch (err) {
        console.warn('Melhor Envio API calculation failed, falling back:', err);
      }
    }

    // 5. Dynamic Engine (Accurate Brazilian Freight Rates)
    // If live options were returned, return them; otherwise, use the simulated engine
    const options = liveOptions.length > 0
      ? liveOptions.sort((a, b) => a.price - b.price)
      : this.simulateCarrierQuotes(cleanOrigin, cleanDest, packaging);

    return {
      originPostalCode: originZip,
      originCity,
      originState,
      originLabel,
      destinationPostalCode: destinationZip,
      package: packaging,
      declaredValue: packaging.declaredValue,
      includeInsurance: packaging.includeInsurance,
      insuranceEstimate: packaging.insuranceAmount,
      options,
    };
  }

  /**
   * Carrier quotes engine with realistic pricing, distance factors, and delivery deadlines.
   */
  private simulateCarrierQuotes(
    fromCep: string,
    toCep: string,
    pkg: PackagingDetails
  ): ShippingOption[] {
    const fromPrefix = parseInt(fromCep.slice(0, 2), 10) || 1;
    const toPrefix = parseInt(toCep.slice(0, 2), 10) || 1;

    // Region classification:
    // SP: 01-19, RJ: 20-28, MG: 30-39, ES: 29
    // PR: 80-87, SC: 88-89, RS: 90-99
    // Center-West: 70-79, Northeast: 40-65, North: 66-69
    const isLocal = fromPrefix === toPrefix;
    const isSameState = Math.abs(fromPrefix - toPrefix) <= 5;
    const isSoutheastSouth =
      ((fromPrefix >= 1 && fromPrefix <= 39) || (fromPrefix >= 80 && fromPrefix <= 99)) &&
      ((toPrefix >= 1 && toPrefix <= 39) || (toPrefix >= 80 && toPrefix <= 99));

    // Zone multiplier
    let zoneFactor = 1.0;
    let baseDaysPAC = 5;
    let baseDaysSedex = 1;
    let baseDaysJadlog = 4;

    if (isLocal) {
      zoneFactor = 0.85;
      baseDaysPAC = 3;
      baseDaysSedex = 1;
      baseDaysJadlog = 2;
    } else if (isSameState) {
      zoneFactor = 1.0;
      baseDaysPAC = 4;
      baseDaysSedex = 1;
      baseDaysJadlog = 3;
    } else if (isSoutheastSouth) {
      zoneFactor = 1.25;
      baseDaysPAC = 6;
      baseDaysSedex = 2;
      baseDaysJadlog = 5;
    } else {
      // Long distance (Northeast, North, etc.)
      zoneFactor = 1.75;
      baseDaysPAC = 9;
      baseDaysSedex = 3;
      baseDaysJadlog = 8;
    }

    // Weight factor: R$ 4.20 per kg above 0.5kg
    const extraWeightFactor = Math.max(0, pkg.weightKg - 0.5) * 4.2;

    // Base rates before insurance
    const baseJadlogPackage = parseFloat((17.5 * zoneFactor + extraWeightFactor).toFixed(2));
    const basePAC = parseFloat((21.8 * zoneFactor + extraWeightFactor).toFixed(2));
    const baseSedex = parseFloat((32.5 * zoneFactor + extraWeightFactor * 1.5).toFixed(2));
    const baseJadlogCom = parseFloat((28.9 * zoneFactor + extraWeightFactor * 1.3).toFixed(2));

    // Insurance costs:
    // Jadlog Ad Valorem: 0.8% of declared value, min R$ 1.50
    // Correios PAC: 1.5% of declared value, min R$ 2.00
    // Correios SEDEX: 1.8% of declared value, min R$ 2.50
    const jadlogInsurance = pkg.declaredValue > 0 ? Math.max(1.5, parseFloat((pkg.declaredValue * 0.008).toFixed(2))) : 0;
    const pacInsurance = pkg.declaredValue > 0 ? Math.max(2.0, parseFloat((pkg.declaredValue * 0.015).toFixed(2))) : 0;
    const sedexInsurance = pkg.declaredValue > 0 ? Math.max(2.5, parseFloat((pkg.declaredValue * 0.018).toFixed(2))) : 0;

    const includeInsurance = pkg.includeInsurance;

    const jadlogPackagePrice = parseFloat((baseJadlogPackage + (includeInsurance ? jadlogInsurance : 0)).toFixed(2));
    const pacPrice = parseFloat((basePAC + (includeInsurance ? pacInsurance : 0)).toFixed(2));
    const sedexPrice = parseFloat((baseSedex + (includeInsurance ? sedexInsurance : 0)).toFixed(2));
    const jadlogComPrice = parseFloat((baseJadlogCom + (includeInsurance ? jadlogInsurance : 0)).toFixed(2));

    return [
      {
        id: 'jadlog_package',
        carrier: 'Jadlog',
        serviceName: '.Package Econômico',
        price: jadlogPackagePrice,
        basePrice: baseJadlogPackage,
        insuranceCost: jadlogInsurance,
        currency: 'BRL',
        deliveryDays: baseDaysJadlog,
        deliveryEstimate: `${baseDaysJadlog - 1} a ${baseDaysJadlog + 1} dias úteis`,
        badge: 'Mais Econômico',
      },
      {
        id: 'correios_pac',
        carrier: 'Correios',
        serviceName: 'PAC',
        price: pacPrice,
        basePrice: basePAC,
        insuranceCost: pacInsurance,
        currency: 'BRL',
        deliveryDays: baseDaysPAC,
        deliveryEstimate: `${baseDaysPAC - 1} a ${baseDaysPAC + 2} dias úteis`,
        badge: 'Econômico',
      },
      {
        id: 'jadlog_com',
        carrier: 'Jadlog',
        serviceName: '.Com Expresso',
        price: jadlogComPrice,
        basePrice: baseJadlogCom,
        insuranceCost: jadlogInsurance,
        currency: 'BRL',
        deliveryDays: Math.max(1, baseDaysSedex + 1),
        deliveryEstimate: `${Math.max(1, baseDaysSedex)} a ${baseDaysSedex + 2} dias úteis`,
      },
      {
        id: 'correios_sedex',
        carrier: 'Correios',
        serviceName: 'SEDEX Expresso',
        price: sedexPrice,
        basePrice: baseSedex,
        insuranceCost: sedexInsurance,
        currency: 'BRL',
        deliveryDays: baseDaysSedex,
        deliveryEstimate: `${baseDaysSedex} a ${baseDaysSedex + 1} dia(s) útil(eis)`,
        badge: 'Mais Rápido',
      },
    ];
  }

  /**
   * Live integration with Melhor Envio API v2 when MELHOR_ENVIO_TOKEN is present.
   */
  private async fetchMelhorEnvioQuotes(args: {
    token: string;
    fromCep: string;
    toCep: string;
    package: PackagingDetails;
  }): Promise<ShippingOption[]> {
    const url = process.env.MELHOR_ENVIO_SANDBOX === 'true'
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'
      : 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

    const payload = {
      from: { postal_code: args.fromCep },
      to: { postal_code: args.toCep },
      package: {
        height: args.package.dimensions.height,
        width: args.package.dimensions.width,
        length: args.package.dimensions.length,
        weight: args.package.weightKg,
      },
      options: {
        receipt: false,
        own_hand: false,
        insurance_value: args.package.includeInsurance ? args.package.declaredValue : 0,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${args.token}`,
        'User-Agent': 'MiniHubCar-Logistics (contato@minihubcar.com.br)',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Melhor Envio HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    const options: ShippingOption[] = [];
    for (const quote of data) {
      if (quote.error) continue;
      const price = parseFloat(quote.custom_price || quote.price || '0');
      if (price <= 0) continue;

      options.push({
        id: `me_${quote.id}`,
        carrier: quote.company?.name || 'Transportadora',
        serviceName: quote.name,
        price,
        currency: 'BRL',
        deliveryDays: parseInt(quote.delivery_time || '5', 10),
        deliveryEstimate: `${quote.delivery_time} dias úteis`,
        companyLogo: quote.company?.picture,
      });
    }

    return options.sort((a, b) => a.price - b.price);
  }

  /**
   * SuperFrete live calculation using seller's token.
   */
  private async fetchSuperFreteQuotes(args: {
    token: string;
    fromCep: string;
    toCep: string;
    package: PackagingDetails;
  }): Promise<ShippingOption[]> {
    const url = 'https://api.superfrete.com/api/v0/calculator';
    const payload = {
      from: { postal_code: args.fromCep },
      to: { postal_code: args.toCep },
      services: '1,2,17', // 1: SEDEX, 2: PAC, 17: Mini Envios
      options: {
        own_hand: false,
        receipt: false,
        insurance_value: args.package.includeInsurance ? args.package.declaredValue : 0,
        use_insurance_value: args.package.includeInsurance && args.package.declaredValue > 0,
      },
      package: {
        height: args.package.dimensions.height,
        width: args.package.dimensions.width,
        length: args.package.dimensions.length,
        weight: Math.max(0.1, args.package.weightKg),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${args.token}`,
        'User-Agent': 'MiniHubCar-Platform (contato@minihubcar.com)',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`SuperFrete HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    const options: ShippingOption[] = [];
    for (const item of data) {
      if (item.has_error || item.error) continue;
      const price = parseFloat(item.price || item.discount || '0');
      if (price <= 0) continue;

      const basePrice = item.discount ? parseFloat(item.price) : price;
      const insuranceCost = args.package.includeInsurance ? args.package.insuranceAmount : 0;

      options.push({
        id: `sf_${item.id}`,
        carrier: 'Correios',
        serviceName: `${item.name || 'Envio'} (SuperFrete)`,
        price,
        basePrice: parseFloat(basePrice.toFixed(2)),
        insuranceCost: parseFloat(insuranceCost.toFixed(2)),
        currency: 'BRL',
        deliveryDays: item.delivery_time || 3,
        deliveryEstimate: `${item.delivery_time || 3} dias úteis`,
        badge: 'SuperFrete',
      });
    }

    return options;
  }

  /**
   * Frete Rápido live calculation using seller's token.
   */
  private async fetchFreteRapidoQuotes(args: {
    token: string;
    extraConfig?: Record<string, any>;
    fromCep: string;
    toCep: string;
    package: PackagingDetails;
  }): Promise<ShippingOption[]> {
    const url = 'https://freterapido.com/api/external/v3/quote/simulate';
    const payload = {
      remetente: {
        cnpj: args.extraConfig?.cnpj || '00000000000100',
      },
      destinatario: {
        tipo_pessoa: 1,
        cep: args.toCep,
      },
      expedicao: {
        token: args.token,
        codigo_plataforma: args.extraConfig?.platformCode || 'MINIHUBCAR',
        retorno: 1,
      },
      volumes: [
        {
          tipo: 7, // Caixa / Pacote
          quantidade: 1,
          peso: args.package.weightKg,
          altura: parseFloat((args.package.dimensions.height / 100).toFixed(2)),
          largura: parseFloat((args.package.dimensions.width / 100).toFixed(2)),
          comprimento: parseFloat((args.package.dimensions.length / 100).toFixed(2)),
          valor: args.package.includeInsurance ? args.package.declaredValue : 0,
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Frete Rápido HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const transportadoras = data.transportadoras || [];
    if (!Array.isArray(transportadoras)) {
      return [];
    }

    const options: ShippingOption[] = [];
    for (const item of transportadoras) {
      const price = parseFloat(item.preco_frete || item.custo_frete || '0');
      if (price <= 0) continue;

      options.push({
        id: `fr_${item.oferta || item.nome}`,
        carrier: item.nome || 'Transportadora',
        serviceName: `${item.servico || 'Padrão'} (Frete Rápido)`,
        price,
        basePrice: price,
        insuranceCost: args.package.includeInsurance ? args.package.insuranceAmount : 0,
        currency: 'BRL',
        deliveryDays: item.prazo_entrega || 5,
        deliveryEstimate: `${item.prazo_entrega || 5} dias úteis`,
        badge: 'Frete Rápido',
      });
    }

    return options;
  }
}
