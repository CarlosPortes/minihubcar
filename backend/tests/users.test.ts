import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Users & Profile Endpoints', () => {
  const testUserEmail = `test_profile_${Date.now()}@example.com`;
  const initialPassword = 'Password123!';
  let token = '';

  it('Registers a new user and gets their complete profile', async () => {
    const app = await buildApp();

    // Register
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Usuário de Teste Perfil',
        email: testUserEmail,
        password: initialPassword,
      },
    });

    expect(regRes.statusCode).toBe(201);
    const regBody = JSON.parse(regRes.body);
    token = regBody.data.accessToken;

    // Get Profile
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(profileRes.statusCode).toBe(200);
    const profileBody = JSON.parse(profileRes.body);
    expect(profileBody.data.name).toBe('Usuário de Teste Perfil');
    expect(profileBody.data.email).toBe(testUserEmail);
    expect(profileBody.data.roles).toContain('COLLECTOR');

    await app.close();
  });

  it('PATCH /api/v1/users/me updates personal info, social and complete address', async () => {
    const app = await buildApp();

    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Carlos Colecionador VIP',
        whatsapp: '(11) 98765-4321',
        instagram: '@diecast_carlos',
        website: 'https://carlosdiecast.com.br',
        avatarUrl: 'https://example.com/avatar.jpg',
        postalCode: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Apto 42B',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.body);
    expect(updateBody.data.name).toBe('Carlos Colecionador VIP');
    expect(updateBody.data.whatsapp).toBe('(11) 98765-4321');
    expect(updateBody.data.instagram).toBe('@diecast_carlos');
    expect(updateBody.data.website).toBe('https://carlosdiecast.com.br');
    expect(updateBody.data.postalCode).toBe('01310-100');
    expect(updateBody.data.street).toBe('Avenida Paulista');
    expect(updateBody.data.number).toBe('1000');
    expect(updateBody.data.complement).toBe('Apto 42B');
    expect(updateBody.data.neighborhood).toBe('Bela Vista');
    expect(updateBody.data.city).toBe('São Paulo');
    expect(updateBody.data.state).toBe('SP');

    await app.close();
  });

  it('PATCH /api/v1/users/me/password validates current password and updates hash', async () => {
    const app = await buildApp();

    // 1. Wrong current password should fail
    const failRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/password',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        currentPassword: 'WrongPassword!',
        newPassword: 'NewPassword123!',
      },
    });
    expect(failRes.statusCode).toBe(401);

    // 2. Correct password should succeed
    const okRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/password',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        currentPassword: initialPassword,
        newPassword: 'NewPassword123!',
      },
    });
    expect(okRes.statusCode).toBe(200);

    // 3. Login with new password should succeed
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUserEmail,
        password: 'NewPassword123!',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    token = JSON.parse(loginRes.body).data.accessToken;

    await app.close();
  });

  it('PATCH /api/v1/users/me/email updates email with security confirmation', async () => {
    const app = await buildApp();
    const updatedEmail = `new_${Date.now()}@example.com`;

    // 1. Wrong password should fail
    const wrongPassRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/email',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        newEmail: updatedEmail,
        currentPassword: 'WrongPassword!',
      },
    });
    expect(wrongPassRes.statusCode).toBe(401);

    // 2. Correct update
    const okRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/email',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        newEmail: updatedEmail,
        currentPassword: 'NewPassword123!',
      },
    });
    expect(okRes.statusCode).toBe(200);
    const body = JSON.parse(okRes.body);
    expect(body.data.user.email).toBe(updatedEmail);
    token = body.data.accessToken;

    // 3. Subsequent login with new email works
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: updatedEmail,
        password: 'NewPassword123!',
      },
    });
    expect(loginRes.statusCode).toBe(200);

    await app.close();
  });

  it('Admin endpoints: list users, update status, prevent self-inactivation, and reset password', async () => {
    const app = await buildApp();

    const normalUserEmail = `normal_${Date.now()}@example.com`;
    const adminUserEmail = `admin_${Date.now()}@example.com`;

    // 1. Create a normal user
    const regNormalRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Normal User',
        email: normalUserEmail,
        password: 'Password123!',
      },
    });
    expect(regNormalRes.statusCode).toBe(201);
    const normalToken = JSON.parse(regNormalRes.body).data.accessToken;
    const normalUserId = JSON.parse(regNormalRes.body).data.user.id;

    // Normal user cannot access /admin/users (403)
    const forbiddenRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${normalToken}` },
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // 2. Create an admin user
    const regAdminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Admin User Test',
        email: adminUserEmail,
        password: 'Password123!',
      },
    });
    expect(regAdminRes.statusCode).toBe(201);
    const tempAdminToken = JSON.parse(regAdminRes.body).data.accessToken;
    const adminUserId = JSON.parse(regAdminRes.body).data.user.id;

    // Claim admin role
    const claimRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/claim-admin',
      headers: { authorization: `Bearer ${tempAdminToken}` },
    });
    expect(claimRes.statusCode).toBe(200);

    // Re-login to get admin JWT with SYSTEM_ADMIN / CATALOG_ADMIN roles
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: adminUserEmail,
        password: 'Password123!',
      },
    });
    expect(adminLoginRes.statusCode).toBe(200);
    const adminToken = JSON.parse(adminLoginRes.body).data.accessToken;

    // 3. Admin gets stats
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users/stats',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(statsRes.statusCode).toBe(200);
    const stats = JSON.parse(statsRes.body).data;
    expect(stats.totalUsers).toBeGreaterThan(0);
    expect(stats.activeUsers).toBeGreaterThan(0);

    // 4. Admin lists users with search & filters
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/users?search=${encodeURIComponent(normalUserEmail)}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listData = JSON.parse(listRes.body).data;
    expect(listData.users.length).toBe(1);
    expect(listData.users[0].email).toBe(normalUserEmail);
    expect(listData.users[0].seller).toBeDefined();

    // 5. Admin deactivates normal user
    const deactivateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${normalUserId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'INACTIVE' },
    });
    expect(deactivateRes.statusCode).toBe(200);

    // Inactive user tries to login -> fails with 401
    const blockedLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: normalUserEmail,
        password: 'Password123!',
      },
    });
    expect(blockedLoginRes.statusCode).toBe(401);
    expect(JSON.parse(blockedLoginRes.body).error.message).toMatch(/inativa ou bloqueada/i);

    // 6. Admin reactivates normal user
    const reactivateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${normalUserId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'ACTIVE' },
    });
    expect(reactivateRes.statusCode).toBe(200);

    // 7. Admin resets password for normal user
    const newAdminPass = 'AdminNewSecret2026!';
    const resetRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${normalUserId}/reset-password`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { newPassword: newAdminPass },
    });
    expect(resetRes.statusCode).toBe(200);
    expect(JSON.parse(resetRes.body).data.temporaryPassword).toBe(newAdminPass);

    // Normal user logs in with new password -> success
    const newPassLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: normalUserEmail,
        password: newAdminPass,
      },
    });
    expect(newPassLogin.statusCode).toBe(200);

    // 8. Admin attempts self-inactivation -> blocked with 400
    const selfInactivateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${adminUserId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'INACTIVE' },
    });
    expect(selfInactivateRes.statusCode).toBe(400);

    await app.close();
  });
});

