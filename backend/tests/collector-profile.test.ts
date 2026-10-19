import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Public Collector Profile ("Instagram do Colecionador") Tests', () => {
  it('Allows setting username and bio, and serves public profile via /users/public/:identifier', async () => {
    const app = await buildApp();

    const timestamp = Date.now();
    const email = `collector_${timestamp}@example.com`;
    const username = `collector_${timestamp}`;

    // 1. Register collector
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Carlos Colecionador',
        email,
        password: 'Password123!',
      },
    });

    expect(regRes.statusCode).toBe(201);
    const regBody = JSON.parse(regRes.body);
    const token = regBody.data.accessToken;
    const userId = regBody.data.user.id;

    // 2. Update profile with username, bio and city
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        username,
        bio: 'Colecionador apaixonado por Hot Wheels Super Treasure Hunt e Mini GT.',
        city: 'São Paulo',
        state: 'SP',
        instagram: '@carlos_diecast',
      },
    });

    expect(patchRes.statusCode).toBe(200);
    const patchBody = JSON.parse(patchRes.body);
    expect(patchBody.data.username).toBe(username);
    expect(patchBody.data.bio).toContain('Super Treasure Hunt');

    // 3. Fetch public profile by username
    const pubRes = await app.inject({
      method: 'GET',
      url: `/api/v1/users/public/${username}`,
    });

    expect(pubRes.statusCode).toBe(200);
    const pubBody = JSON.parse(pubRes.body);
    expect(pubBody.data.name).toBe('Carlos Colecionador');
    expect(pubBody.data.username).toBe(username);
    expect(pubBody.data.bio).toContain('Super Treasure Hunt');
    expect(pubBody.data.stats).toBeDefined();
    expect(pubBody.data.stats).toHaveProperty('totalMiniatures');
    expect(pubBody.data.plan).toBeDefined();
    expect(Array.isArray(pubBody.data.collection)).toBe(true);

    // 4. Fetch public profile by user UUID also works
    const pubUuidRes = await app.inject({
      method: 'GET',
      url: `/api/v1/users/public/${userId}`,
    });
    expect(pubUuidRes.statusCode).toBe(200);

    await app.close();
  });
});
