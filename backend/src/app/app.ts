import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { env } from '../config/env';
import { logger } from '../infrastructure/logging/logger';
import { errorHandler } from '../shared/errors/error-handler';
import { healthRoutes } from './routes';

// Domain Routes
import { catalogRoutes } from '../modules/catalog/catalog.routes';
import { adminCatalogRoutes } from '../modules/catalog/admin-catalog.routes';
import { authRoutes } from '../modules/auth/auth.routes';
import { locationsRoutes } from '../modules/locations/locations.routes';
import { collectionRoutes } from '../modules/collection/collection.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { wishlistRoutes } from '../modules/wishlist/wishlist.routes';
import { acquisitionsSalesRoutes } from '../modules/acquisitions-sales/acquisitions-sales.routes';
import { catalogRequestsRoutes } from '../modules/catalog-requests/catalog-requests.routes';
import { listsRoutes } from '../modules/lists/lists.routes';
import { mediaRoutes } from '../modules/media/media.routes';
import { sellersRoutes } from '../modules/sellers/sellers.routes';
import { offersRoutes } from '../modules/offers/offers.routes';
import { marketplaceRoutes } from '../modules/marketplace/marketplace.routes';
import { cartRoutes } from '../modules/cart/cart.routes';
import { ordersRoutes } from '../modules/orders/orders.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { preOrdersRoutes } from '../modules/pre-orders/pre-orders.routes';
import { garageRoutes } from '../modules/garage/garage.routes';
import { statsRoutes } from '../modules/stats/stats.routes';
import { donationsRoutes } from '../modules/donations/donations.routes';
import { communityRoutes } from '../modules/community/community.routes';
import { importExportRoutes } from '../modules/import-export/import-export.routes';
import { collectiblesRoutes } from '../modules/collectibles/collectibles.routes';
import { subscriptionsRoutes } from '../modules/subscriptions/subscriptions.routes';
import { feedbackRoutes } from '../modules/feedback/feedback.routes';

export async function buildApp() {
  const app = fastify({
    loggerInstance: logger,
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  });

  // Security & Utility Plugins
  await app.register(cors, {
    origin: [env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
  });

  await app.register(cookie);

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per photo
    },
  });

  // Gracefully handle empty bodies with Content-Type: application/json
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body: string, done) => {
    if (!body || body.trim() === '') {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Robust paths resolution whether process.cwd() is backend/ or workspace root
  const possibleUploads = [
    path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH),
    path.resolve(process.cwd(), 'backend', env.STORAGE_LOCAL_PATH),
    path.resolve(__dirname, '../../uploads'),
  ];
  const uploadsDir = possibleUploads.find((dir) => fs.existsSync(dir)) || path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Helper to build case-insensitive file mapping for static folders (critical on Linux ext4)
  const buildCaseMap = (baseDir: string, urlPrefix: string) => {
    const map = new Map<string, string>();
    const walk = (currentDir: string, currentPrefix: string) => {
      if (!fs.existsSync(currentDir)) return;
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            walk(path.join(currentDir, entry.name), `${currentPrefix}${entry.name}/`);
          } else if (entry.isFile()) {
            const relPath = `${currentPrefix}${entry.name}`;
            map.set(relPath.toLowerCase(), relPath);
          }
        }
      } catch {
        // ignore unreadable dirs
      }
    };
    walk(baseDir, urlPrefix);
    return map;
  };

  // Serve catalog photos if catalogos folder exists
  const possibleCatalogDirs = [
    process.env.CATALOG_MEDIA_PATH,
    '/app/catalogos',
    path.resolve(process.cwd(), 'catalogos'),
    path.resolve(process.cwd(), '../catalogos'),
    path.resolve(__dirname, '../../../../catalogos'),
    path.resolve(__dirname, '../../../catalogos'),
    '/var/www/minihubcar/catalogos',
  ].filter(Boolean) as string[];

  const catalogPhotosDir = possibleCatalogDirs.find((dir) => fs.existsSync(dir));

  // Build case-insensitive lookup table for static files
  const staticCaseMap = new Map<string, string>();
  const refreshStaticCaseMap = () => {
    staticCaseMap.clear();
    const uploadsMap = buildCaseMap(uploadsDir, '/uploads/');
    for (const [k, v] of uploadsMap) staticCaseMap.set(k, v);
    if (catalogPhotosDir) {
      const catMap = buildCaseMap(catalogPhotosDir, '/catalog-media/');
      for (const [k, v] of catMap) staticCaseMap.set(k, v);
    }
  };
  refreshStaticCaseMap();

  // Case-insensitive normalization hook: transforms /catalog-media/HW/jhw68.jpg -> /catalog-media/HW/JHW68.jpg
  app.addHook('onRequest', async (req) => {
    const rawUrl = req.raw.url;
    if (!rawUrl) return;
    if (rawUrl.startsWith('/catalog-media/') || rawUrl.startsWith('/uploads/')) {
      const [pathname, query] = rawUrl.split('?');
      if (pathname) {
        const exactPath = staticCaseMap.get(pathname.toLowerCase());
        if (exactPath) {
          req.raw.url = exactPath + (query ? `?${query}` : '');
        }
      }
    }
  });

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  if (catalogPhotosDir) {
    await app.register(fastifyStatic, {
      root: catalogPhotosDir,
      prefix: '/catalog-media/',
      decorateReply: false,
    });
    app.log.info(`📸 Static catalog media mounted from: ${catalogPhotosDir} (${staticCaseMap.size} static files indexed)`);
  } else {
    app.log.warn('⚠️ Diretório de fotos do catálogo (catalogos) não encontrado nas rotas esperadas.');
  }

  // Hook to set X-Request-Id header in responses
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
  });

  // Error Handler
  app.setErrorHandler(errorHandler);

  // Health and Readiness probes (root /health)
  await app.register(healthRoutes);

  // Register All Domain Routes under /api/v1
  await app.register(
    async (v1) => {
      await v1.register(catalogRoutes);
      await v1.register(adminCatalogRoutes);
      await v1.register(authRoutes);
      await v1.register(locationsRoutes);
      await v1.register(collectionRoutes);
      await v1.register(dashboardRoutes);
      await v1.register(wishlistRoutes);
      await v1.register(acquisitionsSalesRoutes);
      await v1.register(catalogRequestsRoutes);
      await v1.register(listsRoutes);
      await v1.register(mediaRoutes);
      await v1.register(sellersRoutes);
      await v1.register(offersRoutes);
      await v1.register(marketplaceRoutes);
      await v1.register(cartRoutes);
      await v1.register(ordersRoutes);
      await v1.register(usersRoutes);
      await v1.register(preOrdersRoutes);
      await v1.register(garageRoutes);
      await v1.register(statsRoutes);
      await v1.register(donationsRoutes);
      await v1.register(communityRoutes);
      await v1.register(importExportRoutes);
      await v1.register(collectiblesRoutes);
      await v1.register(subscriptionsRoutes);
      await v1.register(feedbackRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
