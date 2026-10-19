import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app/app';
import { FastifyInstance } from 'fastify';
import { db } from '../src/database/client';
import { appUser, miniatureBrand, casting, variation } from '../src/database/schema';
import { eq } from 'drizzle-orm';

describe('Prioridade 5: Identificação de Miniaturas por IA (ai-identifier)', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Criar usuário para autenticação
    const email = `ai-tester-${Date.now()}@minihubcar.test`;
    const [user] = await db
      .insert(appUser)
      .values({
        email,
        normalizedEmail: email.toLowerCase(),
        passwordHash: 'testhash',
        name: 'AI Tester Collector',
      })
      .returning();

    testUserId = user.id;
    authToken = app.jwt.sign({ sub: testUserId, email });

    // Garantir que haja pelo menos uma marca, casting e variação para o matcher encontrar
    const [brand] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Hot Wheels',
        normalizedName: `hot-wheels-${Date.now()}`,
      })
      .onConflictDoNothing()
      .returning();

    const brandId = brand ? brand.id : (await db.select().from(miniatureBrand).limit(1))[0]?.id;

    if (brandId) {
      const [testCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: brandId,
          name: '1971 Datsun 510 Wagon',
          normalizedName: `datsun-510-wagon-${Date.now()}`,
        })
        .returning();

      if (testCasting) {
        await db.insert(variation).values({
          castingId: testCasting.id,
          name: 'Datsun 510 Boulevard Blue',
          releaseYear: 2024,
          color: 'Azul',
          rarity: 'REGULAR',
        });
      }
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await db.delete(appUser).where(eq(appUser.id, testUserId));
    }
    await app.close();
  });

  it('GET /api/v1/ai/status deve retornar o status do motor de IA', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/status',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ONLINE');
    expect(body.data.provider).toBeDefined();
  });

  it('POST /api/v1/ai/identify-miniature deve exigir autenticação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify-miniature',
      payload: {
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/ai/identify-miniature deve analisar imagem e retornar matches do catálogo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify-miniature',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
        textHint: 'Datsun 510',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.analysis).toBeDefined();
    expect(body.data.analysis.manufacturer).toBeDefined();
    expect(body.data.analysis.modelName).toContain('Datsun 510');
    expect(body.data.matches).toBeInstanceOf(Array);
    expect(body.data.matches.length).toBeGreaterThan(0);

    const firstMatch = body.data.matches[0];
    expect(firstMatch.variationId).toBeDefined();
    expect(firstMatch.castingName).toBeDefined();
    expect(firstMatch.confidenceScore).toBeGreaterThanOrEqual(50);
    expect(firstMatch.matchedReasons.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/ai/identify-miniature deve validar se a imagem enviada é válida', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify-miniature',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        imageBase64: 'abc', // Muito curta
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
