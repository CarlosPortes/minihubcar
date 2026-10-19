import { createHash } from 'node:crypto';
import { AnalyticsRepository } from './analytics.repository';
import { RecordVisitInput, AdminAnalyticsStats } from './analytics.types';

export class AnalyticsService {
  constructor(private readonly repository = new AnalyticsRepository()) {}

  async recordVisit(
    input: RecordVisitInput,
    clientIp?: string,
    userAgent?: string,
    userId?: string
  ) {
    // Evitar registrar chamadas para assets estáticos, favicon ou APIs
    if (
      !input.path ||
      input.path.startsWith('/_next') ||
      input.path.startsWith('/api') ||
      input.path.startsWith('/catalog-media') ||
      input.path.startsWith('/uploads') ||
      input.path.includes('.')
    ) {
      return null;
    }

    // Hash anônimo de IP para proteger privacidade (LGPD)
    let ipHash: string | null = null;
    if (clientIp) {
      ipHash = createHash('sha256').update(clientIp + 'minihubcar-salt').digest('hex').substring(0, 32);
    }

    // Detecção básica de tipo de dispositivo
    let deviceType = input.deviceType;
    if (!deviceType && userAgent) {
      const ua = userAgent.toLowerCase();
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        deviceType = 'TABLET';
      } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
        deviceType = 'MOBILE';
      } else {
        deviceType = 'DESKTOP';
      }
    }

    return this.repository.recordVisit({
      path: input.path,
      visitorId: input.visitorId,
      userId: userId || null,
      ipHash,
      userAgent: userAgent ? userAgent.substring(0, 500) : null,
      referer: input.referer ? input.referer.substring(0, 500) : null,
      deviceType: deviceType || 'DESKTOP',
    });
  }

  async getAdminStats(): Promise<AdminAnalyticsStats> {
    return this.repository.getAdminStats();
  }
}
