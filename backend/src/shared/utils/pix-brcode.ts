/**
 * Gerador de Payload e QR Code PIX no padrão oficial BACEN / EMVCo BR Code
 */

interface PixBrCodeOptions {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid: string;
  description?: string;
}

function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

function sanitizeText(str: string, maxLength: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '') // somente alfanumérico e espaços
    .trim()
    .substring(0, maxLength);
}

export function computeCRC16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixCopiaECola(options: PixBrCodeOptions): string {
  const merchantName = sanitizeText(options.merchantName || 'MINIHUB CAR', 25) || 'MINIHUB CAR';
  const merchantCity = sanitizeText(options.merchantCity || 'SAO PAULO', 15) || 'SAO PAULO';
  const cleanTxid = options.txid ? options.txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) : '***';
  const formattedAmount = options.amount.toFixed(2);

  // Subtags do Merchant Account Information (Tag 26)
  const gui = formatTlv('00', 'br.gov.bcb.pix');
  const key = formatTlv('01', options.pixKey.trim());
  const desc = options.description ? formatTlv('02', sanitizeText(options.description, 40)) : '';
  const merchantAccountInfo = formatTlv('26', `${gui}${key}${desc}`);

  // Subtags do Additional Data Field (Tag 62)
  const referenceLabel = formatTlv('05', cleanTxid || '***');
  const additionalDataField = formatTlv('62', referenceLabel);

  // Montagem do payload sem CRC
  const payloadWithoutCrc = [
    formatTlv('00', '01'), // Payload Format Indicator
    merchantAccountInfo, // 26: Merchant Account Information
    formatTlv('52', '0000'), // 52: Merchant Category Code
    formatTlv('53', '986'), // 53: Transaction Currency (986 = BRL)
    formatTlv('54', formattedAmount), // 54: Transaction Amount
    formatTlv('58', 'BR'), // 58: Country Code
    formatTlv('59', merchantName), // 59: Merchant Name
    formatTlv('60', merchantCity), // 60: Merchant City
    additionalDataField, // 62: Additional Data Field (TxID)
    '6304', // 63: CRC16 Tag e Comprimento inicial
  ].join('');

  const crc = computeCRC16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

export function generatePixQrCodeUrl(pixCopiaECola: string, size = 300): string {
  // Retorna URL de renderização direta com codificação do payload
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
    pixCopiaECola
  )}`;
}
