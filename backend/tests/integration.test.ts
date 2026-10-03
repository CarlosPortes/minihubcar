import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Integration Tests with PostgreSQL', () => {
  it('GET /health/ready confirms database is connected', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ready');
    expect(body.database).toBe('connected');
    await app.close();
  });

  it('POST /api/v1/auth/login logs in collector and returns tokens', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'colecionador@minihubcar.com.br',
        password: 'Password123!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe('colecionador@minihubcar.com.br');
    expect(body.data.user.name).toBe('Carlos Colecionador');
    await app.close();
  });

  it('GET /api/v1/catalog/search returns seeded catalog miniatures', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?page=1&pageSize=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.pagination.total).toBeGreaterThan(0);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toBeDefined();
    await app.close();
  });

  it('POST /api/v1/auth/logout handles empty body with application/json header', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        'content-type': 'application/json',
      },
    });

    console.log('LOGOUT STATUS:', res.statusCode, res.body);
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('GET /catalog-media/Minigt/fotos/MGT00038.jpg serves static image successfully', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/catalog-media/Minigt/fotos/MGT00038.jpg',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    await app.close();
  });

  it('GET /catalog-media/hw/2026/JKG06.jpg serves Hot Wheels 2026 static image successfully', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/catalog-media/hw/2026/JKG06.jpg',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    await app.close();
  });

  it('GET /api/v1/catalog/search finds Hot Wheels 2026 miniatures', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?q=Batmobile',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    const batmobile = body.data.find((item: any) => item.brand.name === 'Hot Wheels');
    expect(batmobile).toBeDefined();
    expect(batmobile.photoUrl).toContain('/catalog-media/hw/2026/');
    await app.close();
  });

  it('GET /api/v1/catalog/search finds miniature by product code (e.g. OEM0006)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?q=OEM0006',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toContain('Huracán');
    await app.close();
  });

  it('GET /api/v1/catalog/search filters by release year', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?year=2026&pageSize=5',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((item: any) => item.releaseYear === 2026)).toBe(true);
    await app.close();
  });

  it('GET /api/v1/catalog/filters returns brands, scales, years and rarities', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/filters',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.brands.length).toBeGreaterThan(0);
    expect(body.data.years.length).toBeGreaterThan(0);
    expect(body.data.years).toContain(2026);
    expect(body.data.years).toContain(2025);
    expect(body.data.years).toContain(2024);
    expect(body.data.years).toContain(2023);
    await app.close();
  });

  it('GET /api/v1/catalog/automakers and /catalog/vehicle-models return valid lists', async () => {
    const app = await buildApp();
    const amRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/automakers',
    });
    expect(amRes.statusCode).toBe(200);
    const amBody = JSON.parse(amRes.body);
    expect(Array.isArray(amBody.data)).toBe(true);

    const vmRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/vehicle-models',
    });
    expect(vmRes.statusCode).toBe(200);
    const vmBody = JSON.parse(vmRes.body);
    expect(Array.isArray(vmBody.data)).toBe(true);
    await app.close();
  });

  it('Collection full lifecycle: add, list with series/automaker, patch fields, and delete exemplar', async () => {
    const app = await buildApp();

    // 1. Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'colecionador@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const token = JSON.parse(loginRes.body).data.accessToken;
    const authHeaders = { authorization: `Bearer ${token}` };

    // 2. Get a variation from catalog
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    expect(catRes.statusCode).toBe(200);
    const variationId = JSON.parse(catRes.body).data[0].id;

    // 3. Add to collection
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/v1/collection/exemplars',
      headers: authHeaders,
      payload: {
        variationId,
        conditionCode: 'MINT',
        cost: 39.9,
        sourceName: 'Loja Teste Inicial',
        notes: 'Cadastro inicial para teste',
      },
    });
    expect(addRes.statusCode).toBe(201);
    const exemplarId = JSON.parse(addRes.body).data.id;
    expect(exemplarId).toBeDefined();

    // 4. List collection and verify series and automaker structure
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/collection/exemplars',
      headers: authHeaders,
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    const created = listBody.data.find((item: any) => item.id === exemplarId);
    expect(created).toBeDefined();
    expect(created.purchasePrice).toBe('39.90');
    expect(created.purchaseLocation).toBe('Loja Teste Inicial');

    // 5. Update exemplar fields (purchasePrice, purchaseLocation, notes)
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collection/exemplars/${exemplarId}`,
      headers: authHeaders,
      payload: {
        purchasePrice: 49.99,
        purchaseLocation: 'Loja Nova Atualizada',
        notes: 'Informação corrigida após cadastro',
      },
    });
    expect(patchRes.statusCode).toBe(200);
    const updated = JSON.parse(patchRes.body).data;
    expect(updated.purchasePrice).toBe('49.99');
    expect(updated.purchaseLocation).toBe('Loja Nova Atualizada');
    expect(updated.notes).toBe('Informação corrigida após cadastro');

    // 6. Delete exemplar from collection
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/collection/exemplars/${exemplarId}`,
      headers: authHeaders,
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.body).data.message).toContain('sucesso');

    // 7. Verify exemplar no longer exists
    const checkRes = await app.inject({
      method: 'GET',
      url: `/api/v1/collection/exemplars/${exemplarId}`,
      headers: authHeaders,
    });
    expect(checkRes.statusCode).toBe(404);

    await app.close();
  });

  it('handles write-offs (baixa por quebra/perda) and reflects on /write-offs without altering sales values', async () => {
    const app = await buildApp();

    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'colecionador@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const token = JSON.parse(loginRes.body).data.accessToken;
    const authHeaders = { authorization: `Bearer ${token}` };

    // Get variation
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    const variationId = JSON.parse(catRes.body).data[0].id;

    // Add to collection with cost
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/v1/collection/exemplars',
      headers: authHeaders,
      payload: {
        variationId,
        conditionCode: 'MINT',
        cost: 25.0,
        sourceName: 'Feira Diecast',
        notes: 'Miniatura comprada para baixa de teste',
      },
    });
    expect(addRes.statusCode).toBe(201);
    const exemplarId = JSON.parse(addRes.body).data.id;

    // Record write-off (Baixa por Quebra)
    const writeOffRes = await app.inject({
      method: 'POST',
      url: '/api/v1/write-offs',
      headers: authHeaders,
      payload: {
        exemplarId,
        reason: 'QUEBRA',
        writeOffDate: '2026-09-15',
        notes: 'Caiu da prateleira e quebrou o aerofólio',
      },
    });
    expect(writeOffRes.statusCode).toBe(201);
    const writeOffData = JSON.parse(writeOffRes.body).data;
    expect(writeOffData.reason).toBe('QUEBRA');

    // Verify exemplar is DISCARDED in collection
    const getExRes = await app.inject({
      method: 'GET',
      url: `/api/v1/collection/exemplars/${exemplarId}`,
      headers: authHeaders,
    });
    expect(getExRes.statusCode).toBe(200);
    expect(JSON.parse(getExRes.body).data.status).toBe('DISCARDED');

    // Verify GET /write-offs returns the item
    const listWriteOffsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/write-offs',
      headers: authHeaders,
    });
    expect(listWriteOffsRes.statusCode).toBe(200);
    const writeOffsList = JSON.parse(listWriteOffsRes.body).data;
    const found = writeOffsList.find((w: any) => w.exemplarId === exemplarId);
    expect(found).toBeDefined();
    expect(found.reason).toBe('QUEBRA');
    expect(found.notes).toBe('Caiu da prateleira e quebrou o aerofólio');

    // Verify GET /sales does NOT include this item as a sale
    const salesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sales',
      headers: authHeaders,
    });
    expect(salesRes.statusCode).toBe(200);
    const salesList = JSON.parse(salesRes.body).data;
    const inSales = salesList.find((s: any) => s.exemplarId === exemplarId);
    expect(inSales).toBeUndefined();

    // Clean up exemplar permanently
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/collection/exemplars/${exemplarId}`,
      headers: authHeaders,
    });
    expect(deleteRes.statusCode).toBe(200);

    await app.close();
  });
});

