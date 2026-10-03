import { buildApp } from './app/app.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 MiniHub Car API running at: ${address}`);
    app.log.info(`🩺 Health check at: ${address}/health`);
    app.log.info(`🩺 Readiness check at: ${address}/health/ready`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
