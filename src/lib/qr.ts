import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string, options?: { width?: number; margin?: number; color?: { dark?: string; light?: string } }): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#0f172a',
        light: options?.color?.light || '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}
