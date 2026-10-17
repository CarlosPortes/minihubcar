import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../database/client.js';
import { appUser, role, userRole } from '../../database/schema/index.js';

export interface WhatsAppStatus {
  connected: boolean;
  state: string; // 'open' | 'close' | 'connecting' | 'not_created'
  instanceName: string;
  adminPhone: string | null;
}

export class WhatsAppService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor() {
    this.baseUrl = env.EVOLUTION_API_URL.replace(/\/$/, '');
    this.apiKey = env.EVOLUTION_API_KEY;
    this.instanceName = env.EVOLUTION_INSTANCE_NAME;
  }

  /**
   * Obtém o número de WhatsApp cadastrado no perfil do Administrador (ou .env)
   */
  async getAdminPhone(): Promise<string | null> {
    if (env.ADMIN_WHATSAPP_PHONE && env.ADMIN_WHATSAPP_PHONE.trim().length > 0) {
      return this.formatPhoneNumber(env.ADMIN_WHATSAPP_PHONE);
    }

    try {
      // Busca usuário com role SYSTEM_ADMIN que tenha WhatsApp cadastrado
      const admins = await db
        .select({
          id: appUser.id,
          name: appUser.name,
          whatsapp: appUser.whatsapp,
        })
        .from(appUser)
        .innerJoin(userRole, eq(userRole.userId, appUser.id))
        .innerJoin(role, eq(role.id, userRole.roleId))
        .where(eq(role.code, 'SYSTEM_ADMIN'))
        .limit(5);

      const adminWithPhone = admins.find((a) => a.whatsapp && a.whatsapp.trim().length > 0);
      if (adminWithPhone && adminWithPhone.whatsapp) {
        return this.formatPhoneNumber(adminWithPhone.whatsapp);
      }
    } catch (err) {
      console.warn('[WhatsAppService] Erro ao consultar WhatsApp do administrador no banco:', err);
    }

    return null;
  }

  /**
   * Normaliza número para formato internacional (ex: 5511999999999)
   */
  formatPhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      return `55${clean}`;
    }
    return clean;
  }

  /**
   * Consulta o estado atual da conexão da instância no WhatsApp
   */
  async getStatus(): Promise<WhatsAppStatus> {
    const adminPhone = await this.getAdminPhone();

    try {
      const response = await fetch(`${this.baseUrl}/instance/connectionState/${this.instanceName}`, {
        headers: {
          apikey: this.apiKey,
        },
      });

      if (response.status === 404) {
        return {
          connected: false,
          state: 'not_created',
          instanceName: this.instanceName,
          adminPhone,
        };
      }

      if (!response.ok) {
        return {
          connected: false,
          state: 'error',
          instanceName: this.instanceName,
          adminPhone,
        };
      }

      const data = (await response.json()) as any;
      const state = data?.instance?.state || data?.state || 'close';

      return {
        connected: state === 'open',
        state,
        instanceName: this.instanceName,
        adminPhone,
      };
    } catch (err: any) {
      return {
        connected: false,
        state: 'unreachable',
        instanceName: this.instanceName,
        adminPhone,
      };
    }
  }

  /**
   * Garante a criação da instância e retorna o QR Code em base64
   */
  async getQRCode(): Promise<{ qrcode: string | null; base64: string | null; state: string; count?: number }> {
    try {
      // 1. Tenta obter o QR code da instância existente
      let connectRes = await fetch(`${this.baseUrl}/instance/connect/${this.instanceName}`, {
        headers: { apikey: this.apiKey },
      });

      // Se a instância não existe, cria ela primeiro
      if (connectRes.status === 404) {
        const createRes = await fetch(`${this.baseUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({
            instanceName: this.instanceName,
            token: this.apiKey,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        if (!createRes.ok) {
          const errData = await createRes.text();
          throw new Error(`Falha ao criar instância: ${createRes.status} - ${errData}`);
        }

        // Tenta conectar novamente após criar
        connectRes = await fetch(`${this.baseUrl}/instance/connect/${this.instanceName}`, {
          headers: { apikey: this.apiKey },
        });
      }

      if (!connectRes.ok) {
        const errText = await connectRes.text();
        throw new Error(`Erro ao gerar QR Code: ${connectRes.status} - ${errText}`);
      }

      const data = (await connectRes.json()) as any;
      let base64 = data?.base64 || data?.qrcode?.base64 || null;
      let qrcode = data?.code || data?.qrcode?.code || null;

      // Se a instância estiver travada (count: 0 e sem QR code), recria ela do zero
      if (!base64 && (data?.count === 0 || !qrcode)) {
        console.log(`[WhatsAppService] Instância ${this.instanceName} travada com count 0. Recriando...`);
        try {
          await fetch(`${this.baseUrl}/instance/delete/${this.instanceName}`, {
            method: 'DELETE',
            headers: { apikey: this.apiKey },
          });
        } catch {
          // ignore
        }

        const recreateRes = await fetch(`${this.baseUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({
            instanceName: this.instanceName,
            token: this.apiKey,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        if (recreateRes.ok) {
          const recData = (await recreateRes.json()) as any;
          base64 = recData?.qrcode?.base64 || recData?.base64 || null;
          qrcode = recData?.qrcode?.code || recData?.code || null;
        }

        // Se ainda não veio no create, tenta connect novamente
        if (!base64) {
          const retryConnect = await fetch(`${this.baseUrl}/instance/connect/${this.instanceName}`, {
            headers: { apikey: this.apiKey },
          });
          if (retryConnect.ok) {
            const retryData = (await retryConnect.json()) as any;
            base64 = retryData?.base64 || retryData?.qrcode?.base64 || null;
            qrcode = retryData?.code || retryData?.qrcode?.code || null;
          }
        }
      }

      return {
        qrcode,
        base64,
        state: data?.state || 'connecting',
        count: data?.count || 1,
      };
    } catch (err: any) {
      console.error('[WhatsAppService] Erro ao obter QR Code da Evolution API:', err.message);
      throw err;
    }
  }

  /**
   * Desconecta / Realiza Logout da sessão do WhatsApp
   */
  async disconnect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/instance/logout/${this.instanceName}`, {
        method: 'DELETE',
        headers: { apikey: this.apiKey },
      });
      return res.ok;
    } catch (err) {
      console.warn('[WhatsAppService] Erro ao desconectar instância:', err);
      return false;
    }
  }

  /**
   * Envia uma mensagem de texto simples
   */
  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const formattedNumber = this.formatPhoneNumber(to);
    if (!formattedNumber) {
      console.warn('[WhatsAppService] Número de telefone inválido para envio:', to);
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/message/sendText/${this.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: formattedNumber,
          textMessage: {
            text,
          },
          text,
        }),
      });

      if (!response.ok) {
        const errData = await response.text();
        console.warn(`[WhatsAppService] Falha ao enviar mensagem (${response.status}):`, errData);
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn('[WhatsAppService] Erro de comunicação com Evolution API:', err.message);
      return false;
    }
  }

  /**
   * Notifica o administrador sobre o cadastro de um novo colecionador
   */
  async notifyAdminNewCollector(user: { name: string; email: string; whatsapp?: string | null }): Promise<void> {
    const adminPhone = await this.getAdminPhone();
    if (!adminPhone) {
      console.log('[WhatsAppService] Notificação de novo cadastro ignorada: Administrador sem WhatsApp configurado.');
      return;
    }

    const nowFormatted = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const userWhatsappLine = user.whatsapp ? `📱 *WhatsApp do Colecionador:* ${user.whatsapp}\n` : '';

    const message =
      `🚗💨 *Novo Colecionador Cadastrado no MiniHub Car!*\n\n` +
      `👤 *Nome:* ${user.name}\n` +
      `📧 *E-mail:* ${user.email}\n` +
      userWhatsappLine +
      `📅 *Data do Cadastro:* ${nowFormatted}\n\n` +
      `👉 *Acesse o painel para gerenciar:* https://minihubcar.com.br/admin/users`;

    const success = await this.sendTextMessage(adminPhone, message);
    if (success) {
      console.log(`[WhatsAppService] Notificação enviada com sucesso para o admin (${adminPhone})!`);
    }
  }
}
