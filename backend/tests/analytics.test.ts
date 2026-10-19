import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Analytics & Access Tracking Tests', () => {
  it('POST /api/v1/analytics/visit records anonymous visit successfully', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/visit',
      payload: {
        path: '/catalog',
        visitorId: 'test-visitor-123',
        referer: 'https://google.com',
        deviceType: 'DESKTOP',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    await app.close();
  });

  it('GET /api/v1/admin/analytics/stats enforces admin authentication', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics/stats',
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('GET /api/v1/admin/analytics/stats returns complete statistics for admin', async () => {
    const app = await buildApp();

    // Register admin user
    const adminEmail = `admin_analytics_${Date.now()}@example.com`;
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Admin Analytics Test',
        email: adminEmail,
        password: 'Password123!',
      },
    });

    expect(regRes.statusCode).toBe(201);
    const regBody = JSON.parse(regRes.body);
    const adminToken = regBody.data.accessToken;

    // Claim admin role
    const claimRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/claim-admin',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    // Re-login to get updated token with SYSTEM_ADMIN role
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: adminEmail,
        password: 'Password123!',
      },
    });
    const refreshedToken = JSON.parse(loginRes.body).data.accessToken;

    // Get analytics stats
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics/stats',
      headers: {
        authorization: `Bearer ${refreshedToken}`,
      },
    });

    expect(statsRes.statusCode).toBe(200);
    const statsBody = JSON.parse(statsRes.body);
    expect(statsBody.data).toBeDefined();
    expect(typeof statsBody.data.todayVisits).toBe('number');
    expect(typeof statsBody.data.uniqueVisitorsToday).toBe('number');
    expect(Array.isArray(statsBody.data.topPages)).toBe(true);
    expect(Array.isArray(statsBody.data.recentVisits)).toBe(true);
    expect(typeof statsBody.data.registeredActiveToday).toBe('number');

    // Also verify /admin/users/stats includes activeToday & activeThisWeek
    const userStatsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users/stats',
      headers: {
        authorization: `Bearer ${refreshedToken}`,
      },
    });
    expect(userStatsRes.statusCode).toBe(200);
    const userStatsBody = JSON.parse(userStatsRes.body);
    expect(typeof userStatsBody.data.activeToday).toBe('number');
    expect(typeof userStatsBody.data.activeThisWeek).toBe('number');

    await app.close();
  });
});
