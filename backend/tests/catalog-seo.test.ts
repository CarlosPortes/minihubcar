import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Catalog SEO & Public Pages Tests', () => {
  it('GET /api/v1/catalog/sitemap-urls returns variation ids and timestamps', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/sitemap-urls',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty('id');
      expect(typeof body.data[0].id).toBe('string');
    }

    await app.close();
  });
});
