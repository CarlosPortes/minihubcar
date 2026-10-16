import { FastifyReply, FastifyRequest } from 'fastify';
import { WhatsAppService } from './whatsapp.service';

export class WhatsAppController {
  private service = new WhatsAppService();

  getStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const status = await this.service.getStatus();
    return reply.send({ success: true, data: status });
  };

  getQRCode = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const qrData = await this.service.getQRCode();
      return reply.send({ success: true, data: qrData });
    } catch (err: any) {
      return reply.status(502).send({
        success: false,
        message: err.message || 'Falha ao conectar com o serviço do WhatsApp',
      });
    }
  };

  disconnect = async (request: FastifyRequest, reply: FastifyReply) => {
    const ok = await this.service.disconnect();
    return reply.send({ success: ok, message: ok ? 'WhatsApp desconectado' : 'Falha ao desconectar' });
  };

  sendTestMessage = async (request: FastifyRequest, reply: FastifyReply) => {
    const adminPhone = await this.service.getAdminPhone();
    if (!adminPhone) {
      return reply.status(400).send({
        success: false,
        message: 'Nenhum WhatsApp de administrador configurado no perfil ou em ADMIN_WHATSAPP_PHONE.',
      });
    }

    const testText =
      `🧪 *Teste de Notificação MiniHub Car*\n\n` +
      `Olá! O seu WhatsApp está conectado com sucesso ao MiniHub Car. 🚗💨\n` +
      `Você receberá avisos automáticos aqui sempre que um novo colecionador se cadastrar!`;

    const ok = await this.service.sendTextMessage(adminPhone, testText);

    if (!ok) {
      return reply.status(502).send({
        success: false,
        message: 'Falha ao enviar mensagem de teste. Verifique se o WhatsApp está conectado e se o número é válido.',
      });
    }

    return reply.send({
      success: true,
      message: `Mensagem de teste enviada com sucesso para ${adminPhone}!`,
    });
  };
}
