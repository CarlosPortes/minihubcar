import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Health Checks', () => {
  it('GET /health returns 200 ok', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('minihub-car-api');
    await app.close();
  });
});
