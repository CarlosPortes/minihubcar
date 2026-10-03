import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Phase 2A Commercial & Marketplace Tests', () => {
  it('Complete Phase 2A flow: Seller application, approval, offer creation, marketplace, cart, checkout and orders', async () => {
    const app = await buildApp();

    // 1. Login as collector
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'colecionador@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const collectorToken = JSON.parse(loginRes.body).data.accessToken;

    // 2. Login as admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(adminLoginRes.statusCode).toBe(200);
    const adminToken = JSON.parse(adminLoginRes.body).data.accessToken;

    // 3. User applies to become a seller (or check existing)
    let mySellerRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me',
      headers: { authorization: `Bearer ${collectorToken}` },
    });

    let seller = JSON.parse(mySellerRes.body).data;
    if (!seller) {
      const applyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sellers/apply',
        headers: { authorization: `Bearer ${collectorToken}` },
        payload: {
          storeName: 'Garagem do Colecionador',
          bio: 'Especialista em miniaturas JDM e RLC 1:64',
          city: 'São Paulo',
          state: 'SP',
        },
      });
      if (applyRes.statusCode !== 201) {
        console.error('APPLY ERROR:', applyRes.body);
      }
      expect(applyRes.statusCode).toBe(201);
      seller = JSON.parse(applyRes.body).data;
    }

    expect(seller).toBeDefined();

    // 4. Admin approves seller
    const reviewRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/sellers/${seller.id}/review`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        status: 'APPROVED',
        notes: 'Vendedor auditado e aprovado com sucesso',
      },
    });
    expect(reviewRes.statusCode).toBe(200);

    // 5. Get a catalog variation to sell
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    expect(catRes.statusCode).toBe(200);
    const catalogItem = JSON.parse(catRes.body).data[0];
    expect(catalogItem).toBeDefined();
    const variationId = catalogItem.id;

    // 6. Approved seller creates offer for variation
    const createOfferRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${collectorToken}` },
      payload: {
        variationId,
        title: `${catalogItem.name} - Pronta Entrega`,
        price: '149.90',
        condition: 'LACRADO',
        packagingState: 'PERFEITO',
        description: 'Miniatura nova no blister impecável com protetor',
        initialStock: 5,
      },
    });
    expect(createOfferRes.statusCode).toBe(201);
    const offerData = JSON.parse(createOfferRes.body).data;
    expect(offerData.id).toBeDefined();
    expect(offerData.inventory.available).toBe(5);

    // 7. Adjust stock (add 3 more units)
    const adjustRes = await app.inject({
      method: 'POST',
      url: `/api/v1/sellers/me/offers/${offerData.id}/inventory/adjust`,
      headers: { authorization: `Bearer ${collectorToken}` },
      payload: {
        type: 'STOCK_IN',
        quantity: 3,
        reason: 'Chegada de novo lote',
      },
    });
    expect(adjustRes.statusCode).toBe(200);
    const updatedInventory = JSON.parse(adjustRes.body).data;
    expect(updatedInventory.onHand).toBe(8);
    expect(updatedInventory.available).toBe(8);

    // 8. Public Marketplace Search finds this variation
    const mktSearchRes = await app.inject({
      method: 'GET',
      url: '/api/v1/marketplace/search',
    });
    expect(mktSearchRes.statusCode).toBe(200);
    const mktData = JSON.parse(mktSearchRes.body);
    expect(mktData.items.length).toBeGreaterThan(0);
    const foundMktItem = mktData.items.find((it: any) => it.variationId === variationId);
    expect(foundMktItem).toBeDefined();
    expect(foundMktItem.offersCount).toBeGreaterThan(0);

    // 9. Public Marketplace Variation Offers
    const varOffersRes = await app.inject({
      method: 'GET',
      url: `/api/v1/marketplace/variations/${variationId}/offers`,
    });
    expect(varOffersRes.statusCode).toBe(200);
    const varOffersData = JSON.parse(varOffersRes.body).data;
    expect(varOffersData.variation.id).toBe(variationId);
    expect(varOffersData.offers.length).toBeGreaterThan(0);
    const myOffer = varOffersData.offers.find((o: any) => o.id === offerData.id);
    expect(myOffer).toBeDefined();
    expect(myOffer.price).toBe('149.90');

    // 10. Buyer adds offer to cart
    const addCartRes = await app.inject({
      method: 'POST',
      url: '/api/v1/cart/items',
      headers: { authorization: `Bearer ${adminToken}` }, // Admin acts as buyer here
      payload: {
        offerId: offerData.id,
        quantity: 2,
      },
    });
    expect(addCartRes.statusCode).toBe(201);

    // 11. Buyer views cart
    const viewCartRes = await app.inject({
      method: 'GET',
      url: '/api/v1/cart',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(viewCartRes.statusCode).toBe(200);
    const cartData = JSON.parse(viewCartRes.body).data;
    expect(cartData.items.length).toBeGreaterThan(0);
    expect(cartData.totalItems).toBe(2);
    expect(parseFloat(cartData.subtotal)).toBeCloseTo(299.80, 2);

    // 12. Buyer checkouts to generate Order
    const checkoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        shippingAddress: {
          recipientName: 'Carlos Admin',
          street: 'Av. Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
      },
    });
    expect(checkoutRes.statusCode).toBe(201);
    const orderData = JSON.parse(checkoutRes.body).data;
    expect(orderData.orderNumber).toMatch(/^ORD-/);
    expect(orderData.totalItems).toBe(2);
    expect(orderData.items.length).toBe(1);
    expect(orderData.items[0].variationSnapshot.name).toBe(catalogItem.name);
    expect(orderData.items[0].sellerSnapshot.storeName).toBe('Garagem do Colecionador');

    // 13. Cart is now empty
    const emptyCartRes = await app.inject({
      method: 'GET',
      url: '/api/v1/cart',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const emptyCartData = JSON.parse(emptyCartRes.body).data;
    expect(emptyCartData.items.length).toBe(0);

    // 14. Stock was decremented by 2
    const checkStockOfferRes = await app.inject({
      method: 'GET',
      url: `/api/v1/offers/${offerData.id}`,
    });
    const offerAfterOrder = JSON.parse(checkStockOfferRes.body).data;
    expect(offerAfterOrder.inventory.onHand).toBe(6); // 8 - 2 = 6

    // 15. Buyer views own orders
    const myOrdersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/mine',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(myOrdersRes.statusCode).toBe(200);
    const myOrders = JSON.parse(myOrdersRes.body).data;
    expect(myOrders.length).toBeGreaterThan(0);
    expect(myOrders[0].id).toBe(orderData.id);

    // 16. Seller views own sales
    const sellerSalesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/sales',
      headers: { authorization: `Bearer ${collectorToken}` },
    });
    expect(sellerSalesRes.statusCode).toBe(200);
    const sellerSales = JSON.parse(sellerSalesRes.body).data;
    expect(sellerSales.length).toBeGreaterThan(0);
    expect(sellerSales[0].order.orderNumber).toBe(orderData.orderNumber);

    // 17. Test Checkout with "Deixar na Garagem do Colecionador" (deliveryMode: 'GARAGE')
    await app.inject({
      method: 'POST',
      url: '/api/v1/cart/items',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { offerId: offerData.id, quantity: 1 },
    });
    const garageCheckoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { deliveryMode: 'GARAGE' },
    });
    expect(garageCheckoutRes.statusCode).toBe(201);
    const garageOrder = JSON.parse(garageCheckoutRes.body).data;
    expect(garageOrder.deliveryMode).toBe('GARAGE');
    expect(garageOrder.fulfillmentStatus).toBe('NA_GARAGEM');
    expect(garageOrder.items[0].fulfillmentStatus).toBe('NA_GARAGEM');

    // 18. Seller updates sale item fulfillment from "NA_GARAGEM" to "ENTREGUE"
    const updateFulfillRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/sellers/me/sales/${garageOrder.items[0].id}/fulfillment`,
      headers: { authorization: `Bearer ${collectorToken}` },
      payload: { fulfillmentStatus: 'ENTREGUE' },
    });
    expect(updateFulfillRes.statusCode).toBe(200);
    const updatedSaleItem = JSON.parse(updateFulfillRes.body).data;
    expect(updatedSaleItem.fulfillmentStatus).toBe('ENTREGUE');

    await app.close();
  });
});

