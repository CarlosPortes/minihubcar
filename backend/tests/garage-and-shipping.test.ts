import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';
import { db } from '../src/database/client';
import {
  appUser,
  sellerProfile,
  sellerAuthorization,
  sellerShippingAddress,
  offer,
  commercialProduct,
  commercialInventory,
  order,
  orderItem,
  variation,
  casting,
  miniatureBrand,
} from '../src/database/schema';
import { eq } from 'drizzle-orm';

describe('Garage & Logistics Shipping Tests', () => {
  let app: FastifyInstance;
  let sellerToken: string;
  let buyerToken: string;
  let sellerId: string;
  let sellerUserId: string;
  let buyerUserId: string;
  let variationId: string;
  let offerId: string;
  let createdOrderItemId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Register and setup Seller
    const sellerReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Vendedor Garagem Teste',
        email: `seller.garage.${Date.now()}@minihubcar.com`,
        password: 'Password123!',
      },
    });
    const sellerBody = JSON.parse(sellerReg.body);
    sellerToken = sellerBody.data.accessToken;
    sellerUserId = sellerBody.data.user.id;

    // Apply and approve seller
    const applyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/apply',
      headers: { Authorization: `Bearer ${sellerToken}` },
      payload: {
        storeName: 'Garagem Central Diecast',
        postalCode: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    });
    if (applyRes.statusCode !== 201) {
      console.error('APPLY ERROR:', applyRes.statusCode, applyRes.body);
    }
    expect(applyRes.statusCode).toBe(201);
    const applyBody = JSON.parse(applyRes.body);
    sellerId = applyBody.data.id;

    // Direct approve authorization
    await db
      .update(sellerAuthorization)
      .set({ status: 'APPROVED' })
      .where(eq(sellerAuthorization.sellerId, sellerId));

    // Register an extra dispatch origin address for the seller
    const addrRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/addresses',
      headers: { Authorization: `Bearer ${sellerToken}` },
      payload: {
        label: 'Galpão Interior SP',
        contactName: 'Expedição Galpão',
        postalCode: '13010-000',
        street: 'Rua Barão de Jaguara',
        number: '500',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        isDefault: false,
      },
    });
    expect(addrRes.statusCode).toBe(201);

    // 2. Register Buyer
    const buyerReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Colecionador Garagem Teste',
        email: `buyer.garage.${Date.now()}@minihubcar.com`,
        password: 'Password123!',
      },
    });
    const buyerBody = JSON.parse(buyerReg.body);
    buyerToken = buyerBody.data.accessToken;
    buyerUserId = buyerBody.data.user.id;

    // 3. Find or create a catalog variation
    const catalogRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    const catalogData = JSON.parse(catalogRes.body);
    const variationObj = Array.isArray(catalogData.data) ? catalogData.data[0] : catalogData.data.items[0];
    variationId = variationObj.id;

    // 4. Create an offer with 1 unit and packageWeightGrams = 180
    const offerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { Authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId,
        title: 'Nissan Skyline GT-R R34 Edição Especial Garagem',
        price: '149.90',
        condition: 'LACRADO',
        initialStock: 1,
        packageWeightGrams: 180,
      },
    });
    expect(offerRes.statusCode).toBe(201);
    const offerBody = JSON.parse(offerRes.body);
    offerId = offerBody.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Should buy the item with deliveryMode: GARAGE, and auto-set offer status to OUT_OF_STOCK', async () => {
    // Add to cart
    await app.inject({
      method: 'POST',
      url: '/api/v1/cart/items',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: { offerId, quantity: 1 },
    });

    // Checkout with GARAGE
    const checkoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: { deliveryMode: 'GARAGE' },
    });
    expect(checkoutRes.statusCode).toBe(201);
    const checkoutData = JSON.parse(checkoutRes.body).data;
    expect(checkoutData.deliveryMode).toBe('GARAGE');
    expect(checkoutData.fulfillmentStatus).toBe('NA_GARAGEM');
    expect(checkoutData.items.length).toBe(1);
    createdOrderItemId = checkoutData.items[0].id;

    // Verify offer is now OUT_OF_STOCK because stock reached 0
    const [updatedOffer] = await db
      .select({ id: offer.id, status: offer.status })
      .from(offer)
      .where(eq(offer.id, offerId));

    expect(updatedOffer.status).toBe('OUT_OF_STOCK');
  });

  it('2. Should list the purchased item in buyer garage grouped by seller with origin address and weight', async () => {
    const garageRes = await app.inject({
      method: 'GET',
      url: '/api/v1/garage/mine',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(garageRes.statusCode).toBe(200);
    const garageData = JSON.parse(garageRes.body).data;

    expect(garageData.summary.totalItems).toBe(1);
    expect(garageData.summary.totalSellers).toBe(1);
    expect(garageData.summary.readyForDispatchCount).toBe(1);
    expect(garageData.sellers.length).toBe(1);

    const sellerGroup = garageData.sellers[0];
    expect(sellerGroup.sellerId).toBe(sellerId);
    expect(sellerGroup.items.length).toBe(1);
    expect(sellerGroup.items[0].id).toBe(createdOrderItemId);
    expect(sellerGroup.items[0].fulfillmentStatus).toBe('NA_GARAGEM');
    expect(sellerGroup.items[0].canCancel).toBe(true);
    expect(sellerGroup.items[0].packageWeightGrams).toBe(180);
  });

  it('3. Should calculate realistic shipping quotes for the garage items with custom weight override support', async () => {
    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/garage/shipping/quote',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: {
        sellerId,
        itemIds: [createdOrderItemId],
        destinationZip: '80010-010', // Curitiba, PR
      },
    });
    expect(quoteRes.statusCode).toBe(200);
    const quoteData = JSON.parse(quoteRes.body).data;

    expect(quoteData.options.length).toBeGreaterThanOrEqual(3);
    const pac = quoteData.options.find((o: any) => o.id === 'correios_pac');
    const sedex = quoteData.options.find((o: any) => o.id === 'correios_sedex');
    const jadlog = quoteData.options.find((o: any) => o.id === 'jadlog_package');

    expect(pac).toBeDefined();
    expect(sedex).toBeDefined();
    expect(jadlog).toBeDefined();
    expect(sedex.price).toBeGreaterThan(pac.price);
    expect(quoteData.package.weightGrams).toBeGreaterThan(0);
    expect(quoteData.package.includeInsurance).toBe(true);
    expect(quoteData.package.declaredValue).toBe(149.9);
    expect(pac.insuranceCost).toBeGreaterThan(0);
    expect(pac.price).toBe(parseFloat((pac.basePrice + pac.insuranceCost).toFixed(2)));

    // Test with insurance disabled
    const noInsuranceRes = await app.inject({
      method: 'POST',
      url: '/api/v1/garage/shipping/quote',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: {
        sellerId,
        itemIds: [createdOrderItemId],
        destinationZip: '80010-010',
        includeInsurance: false,
      },
    });
    expect(noInsuranceRes.statusCode).toBe(200);
    const noInsuranceData = JSON.parse(noInsuranceRes.body).data;
    expect(noInsuranceData.package.includeInsurance).toBe(false);
    const noInsPac = noInsuranceData.options.find((o: any) => o.id === 'correios_pac');
    expect(noInsPac.price).toBe(noInsPac.basePrice);
    expect(noInsPac.price).toBeLessThan(pac.price);

    // Test with custom weight override
    const customQuoteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/garage/shipping/quote',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: {
        sellerId,
        itemIds: [createdOrderItemId],
        destinationZip: '80010-010',
        customWeightGrams: 850,
      },
    });
    expect(customQuoteRes.statusCode).toBe(200);
    const customQuoteData = JSON.parse(customQuoteRes.body).data;
    expect(customQuoteData.package.weightGrams).toBe(850);
    expect(customQuoteData.package.isCustomWeight).toBe(true);
  });

  it('4. Should cancel the garage item, restore inventory and reactivate the offer to ACTIVE', async () => {
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/garage/items/${createdOrderItemId}/cancel`,
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: { reason: 'Desisti da compra antes do despacho' },
    });
    expect(cancelRes.statusCode).toBe(200);
    const cancelData = JSON.parse(cancelRes.body).data;
    expect(cancelData.success).toBe(true);
    expect(cancelData.fulfillmentStatus).toBe('CANCELLED');

    // Verify inventory restored
    const [inv] = await db
      .select()
      .from(commercialInventory)
      .where(eq(commercialInventory.offerId, offerId));
    expect(inv.onHand).toBe(1);

    // Verify offer reactivated back to ACTIVE
    const [reactivatedOffer] = await db
      .select({ id: offer.id, status: offer.status })
      .from(offer)
      .where(eq(offer.id, offerId));
    expect(reactivatedOffer.status).toBe('ACTIVE');

    // Verify item is no longer in active garage
    const garageAfterCancel = await app.inject({
      method: 'GET',
      url: '/api/v1/garage/mine',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const garageData = JSON.parse(garageAfterCancel.body).data;
    expect(garageData.summary.totalItems).toBe(0);
  });

  it('5. Should test dispatch flow: buy again and dispatch garage items', async () => {
    // Buy again
    await app.inject({
      method: 'POST',
      url: '/api/v1/cart/items',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: { offerId, quantity: 1 },
    });
    const checkoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: { deliveryMode: 'GARAGE' },
    });
    const newOrderItemId = JSON.parse(checkoutRes.body).data.items[0].id;

    // Dispatch
    const dispatchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/garage/dispatch',
      headers: { Authorization: `Bearer ${buyerToken}` },
      payload: {
        sellerId,
        itemIds: [newOrderItemId],
        shippingMethod: {
          carrier: 'Jadlog',
          serviceName: '.Package Econômico',
          price: 21.5,
          deliveryDays: 4,
        },
        shippingAddress: {
          recipientName: 'Colecionador Garagem Teste',
          postalCode: '80010-010',
          street: 'Rua XV de Novembro',
          number: '120',
          neighborhood: 'Centro',
          city: 'Curitiba',
          state: 'PR',
        },
      },
    });
    expect(dispatchRes.statusCode).toBe(200);
    const dispatchData = JSON.parse(dispatchRes.body).data;
    expect(dispatchData.success).toBe(true);

    // Verify item status is now AGUARDANDO_ENVIO
    const [item] = await db
      .select({ fulfillmentStatus: orderItem.fulfillmentStatus })
      .from(orderItem)
      .where(eq(orderItem.id, newOrderItemId));
    expect(item.fulfillmentStatus).toBe('AGUARDANDO_ENVIO');
  });

  it('6. Should allow seller to configure BYOK shipping tokens (SuperFrete and Frete Rápido)', async () => {
    // 1. Save SuperFrete integration token
    const saveSfRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/sellers/me/shipping-integrations/SUPERFRETE',
      headers: { Authorization: `Bearer ${sellerToken}` },
      payload: {
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.superfrete.demo.token',
        isActive: true,
      },
    });
    expect(saveSfRes.statusCode).toBe(200);
    const saveSfData = JSON.parse(saveSfRes.body).data;
    expect(saveSfData.provider).toBe('SUPERFRETE');
    expect(saveSfData.hasToken).toBe(true);
    expect(saveSfData.maskedApiKey).toContain('...');

    // 2. Save Frete Rápido integration token with custom CNPJ & platform code
    const saveFrRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/sellers/me/shipping-integrations/FRETE_RAPIDO',
      headers: { Authorization: `Bearer ${sellerToken}` },
      payload: {
        apiKey: 'frete_rapido_token_xyz987654321',
        extraConfig: {
          cnpj: '12345678000199',
          platformCode: 'MINIHUBCAR',
        },
        isActive: true,
      },
    });
    expect(saveFrRes.statusCode).toBe(200);

    // 3. List seller integrations
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/shipping-integrations',
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listData = JSON.parse(listRes.body).data;
    expect(listData.length).toBe(2);
    expect(listData.map((it: any) => it.provider)).toContain('SUPERFRETE');
    expect(listData.map((it: any) => it.provider)).toContain('FRETE_RAPIDO');

    // 4. Delete an integration
    const delRes = await app.inject({
      method: 'DELETE',
      url: '/api/v1/sellers/me/shipping-integrations/SUPERFRETE',
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    expect(delRes.statusCode).toBe(200);

    const listAfterDel = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/shipping-integrations',
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const listAfterData = JSON.parse(listAfterDel.body).data;
    expect(listAfterData.length).toBe(1);
    expect(listAfterData[0].provider).toBe('FRETE_RAPIDO');
  });
});
