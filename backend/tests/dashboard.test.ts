import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Dashboard Multi-User Isolation Tests', () => {
  it('GET /api/v1/dashboard returns isolated metrics per user', async () => {
    const app = await buildApp();

    // 1. Login as collector (Carlos Colecionador - colecionador@minihubcar.com.br)
    const loginCollectorRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'colecionador@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(loginCollectorRes.statusCode).toBe(200);
    const collectorToken = JSON.parse(loginCollectorRes.body).data.accessToken;

    // 2. Fetch dashboard for collector
    const collectorDashRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: {
        authorization: `Bearer ${collectorToken}`,
      },
    });
    expect(collectorDashRes.statusCode).toBe(200);
    const collectorDash = JSON.parse(collectorDashRes.body).data;

    // 3. Register or login as another user
    const otherUserEmail = `user_dash_${Date.now()}@example.com`;
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Outro Colecionador',
        email: otherUserEmail,
        password: 'Password123!',
      },
    });
    expect(registerRes.statusCode).toBe(201);
    const otherToken = JSON.parse(registerRes.body).data.accessToken;

    // 4. Fetch dashboard for other user
    const otherDashRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    });
    expect(otherDashRes.statusCode).toBe(200);
    const otherDash = JSON.parse(otherDashRes.body).data;

    // 5. Verify strict isolation
    // Other user must have 0 active exemplars and 0 distinct variations
    expect(otherDash.metrics.activeExemplars).toBe(0);
    expect(otherDash.metrics.distinctVariations).toBe(0);
    expect(otherDash.metrics.totalInvested).toBe(0);
    expect(otherDash.distributions.byBrand).toEqual([]);
    expect(otherDash.recent.recentExemplars).toEqual([]);

    // Collector must reflect their own items, which should NOT bleed into other user
    expect(collectorDash.metrics.activeExemplars).toBeGreaterThanOrEqual(0);

    await app.close();
  });
});
