import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { inArray } from 'drizzle-orm';
import { AdminCatalogController } from './admin-catalog.controller';
import { authenticate } from '../auth/auth.middleware';
import { ForbiddenError } from '../../shared/errors/api-error';
import { db } from '../../database/client';
import { role, userRole } from '../../database/schema';

export async function adminCatalogRoutes(app: FastifyInstance) {
  const controller = new AdminCatalogController();

  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply);
    const roles = req.user?.roles || [];
    if (!roles.includes('CATALOG_ADMIN') && !roles.includes('SYSTEM_ADMIN')) {
      throw new ForbiddenError('Acesso restrito a administradores do catálogo');
    }
  };

  // Canonical Variation creation & update
  app.post('/admin/catalog/variations', { preHandler: [requireAdmin] }, controller.createVariation);
  app.put('/admin/catalog/variations/:id', { preHandler: [requireAdmin] }, controller.updateVariation);

  // Automakers
  app.get('/admin/catalog/automakers', { preHandler: [requireAdmin] }, controller.listAutomakers);
  app.post('/admin/catalog/automakers', { preHandler: [requireAdmin] }, controller.createAutomaker);
  app.put('/admin/catalog/automakers/:id', { preHandler: [requireAdmin] }, controller.updateAutomaker);

  // Vehicle Models
  app.get('/admin/catalog/vehicle-models', { preHandler: [requireAdmin] }, controller.listVehicleModels);
  app.post('/admin/catalog/vehicle-models', { preHandler: [requireAdmin] }, controller.createVehicleModel);
  app.put('/admin/catalog/vehicle-models/:id', { preHandler: [requireAdmin] }, controller.updateVehicleModel);

  // Brands
  app.get('/admin/catalog/brands', { preHandler: [requireAdmin] }, controller.listBrands);
  app.post('/admin/catalog/brands', { preHandler: [requireAdmin] }, controller.createBrand);
  app.put('/admin/catalog/brands/:id', { preHandler: [requireAdmin] }, controller.updateBrand);

  // Series
  app.get('/admin/catalog/series', { preHandler: [requireAdmin] }, controller.listSeries);
  app.post('/admin/catalog/series', { preHandler: [requireAdmin] }, controller.createSeries);
  app.put('/admin/catalog/series/:id', { preHandler: [requireAdmin] }, controller.updateSeries);

  // Scales
  app.get('/admin/catalog/scales', { preHandler: [requireAdmin] }, controller.listScales);
  app.post('/admin/catalog/scales', { preHandler: [requireAdmin] }, controller.createScale);
  app.put('/admin/catalog/scales/:id', { preHandler: [requireAdmin] }, controller.updateScale);

  // Promote authenticated user to Admin (convenience for testing & development)
  app.post('/admin/claim-admin', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user.sub;
    const adminRoles = await db
      .select()
      .from(role)
      .where(inArray(role.code, ['CATALOG_ADMIN', 'SYSTEM_ADMIN']));

    for (const r of adminRoles) {
      await db
        .insert(userRole)
        .values({ userId, roleId: r.id })
        .onConflictDoNothing();
    }
    return reply.status(200).send({ data: { message: 'Permissões de Administrador ativadas com sucesso!' } });
  });
}

