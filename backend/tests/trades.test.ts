import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Collector Trade Matchmaking Tests', () => {
  it('Detects double matches and allows creating and accepting trade proposals', async () => {
    const app = await buildApp();

    const timestamp = Date.now();

    // 1. Create Collector A
    const regResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Colecionador A',
        email: `collector_a_${timestamp}@example.com`,
        password: 'Password123!',
      },
    });
    expect(regResA.statusCode).toBe(201);
    const tokenA = JSON.parse(regResA.body).data.accessToken;
    const userA = JSON.parse(regResA.body).data.user;

    // 2. Create Collector B
    const regResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Colecionador B',
        email: `collector_b_${timestamp}@example.com`,
        password: 'Password123!',
      },
    });
    expect(regResB.statusCode).toBe(201);
    const tokenB = JSON.parse(regResB.body).data.accessToken;
    const userB = JSON.parse(regResB.body).data.user;

    // 3. Search catalog to get 2 distinct variations
    const searchRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?limit=5',
    });
    expect(searchRes.statusCode).toBe(200);
    const variations = JSON.parse(searchRes.body).data;

    if (variations.length >= 2) {
      const varX = variations[0];
      const varY = variations[1];

      // Add VarX to User A's collection with condition LOOSE
      const addResA = await app.inject({
        method: 'POST',
        url: '/api/v1/collection/exemplars',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          variationId: varX.id,
          conditionCode: 'LOOSE',
        },
      });
      expect(addResA.statusCode).toBe(201);
      const exemplarA = JSON.parse(addResA.body).data;

      // Mark Exemplar A as available for trade
      const toggleResA = await app.inject({
        method: 'POST',
        url: '/api/v1/trades/toggle',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          exemplarId: exemplarA.id,
          isForTrade: true,
        },
      });
      expect(toggleResA.statusCode).toBe(200);

      // Add VarX to User B's Wishlist
      await app.inject({
        method: 'POST',
        url: '/api/v1/wishlist',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          variationId: varX.id,
          priority: 2,
        },
      });

      // Add VarY to User B's collection and mark for trade
      const addResB = await app.inject({
        method: 'POST',
        url: '/api/v1/collection/exemplars',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          variationId: varY.id,
          conditionCode: 'MINT',
        },
      });
      expect(addResB.statusCode).toBe(201);
      const exemplarB = JSON.parse(addResB.body).data;

      await app.inject({
        method: 'POST',
        url: '/api/v1/trades/toggle',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          exemplarId: exemplarB.id,
          isForTrade: true,
        },
      });

      // Add VarY to User A's Wishlist
      await app.inject({
        method: 'POST',
        url: '/api/v1/wishlist',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          variationId: varY.id,
          priority: 3,
        },
      });

      // 4. Query Matches for User A -> MUST find Double Match!
      const matchRes = await app.inject({
        method: 'GET',
        url: '/api/v1/trades/matches',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(matchRes.statusCode).toBe(200);
      const matchData = JSON.parse(matchRes.body).data;
      expect(matchData.summary.doubleMatchesCount).toBeGreaterThanOrEqual(1);

      const doubleMatch = matchData.doubleMatches.find((m: any) => m.other_user_id === userB.id);
      expect(doubleMatch).toBeDefined();

      // 5. User A proposes trade to User B
      const propRes = await app.inject({
        method: 'POST',
        url: '/api/v1/trades/proposals',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          receiverId: userB.id,
          offeredExemplarId: exemplarA.id,
          requestedExemplarId: exemplarB.id,
          message: 'Bora trocar? Tenho o que você quer e você tem o que procuro!',
        },
      });

      expect(propRes.statusCode).toBe(201);
      const proposal = JSON.parse(propRes.body).data;

      // 6. User B lists proposals and accepts
      const listResB = await app.inject({
        method: 'GET',
        url: '/api/v1/trades/proposals',
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(listResB.statusCode).toBe(200);
      const listDataB = JSON.parse(listResB.body).data;
      expect(listDataB.incoming.length).toBeGreaterThanOrEqual(1);

      const acceptRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/trades/proposals/${proposal.id}/status`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          status: 'ACCEPTED',
        },
      });
      expect(acceptRes.statusCode).toBe(200);
      expect(JSON.parse(acceptRes.body).data.status).toBe('ACCEPTED');
    }

    await app.close();
  });
});
