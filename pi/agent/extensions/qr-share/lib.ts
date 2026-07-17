import QRCode from 'qrcode';

export const TOOL_NAME = 'show_qr';
export const STATE_TYPE = 'qr-share-mode';
export const MAX_QR_LENGTH = 1800;

export interface QrShareState {
  enabled: boolean;
}

export interface QrPayload {
  text: string;
  label?: string;
  ascii: string;
  charCount: number;
}

export interface QrToolDetails {
  cancelled?: boolean;
  label?: string;
  preview?: string;
  charCount?: number;
  ascii?: string;
}

export const AGENT_RESULT_TEXT = 'Succeeded.';
export const AGENT_CANCELLED_TEXT = 'Cancelled.';

export function previewText(text: string, max = 72): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

export function validateQrText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Text is required');
  }
  if (trimmed.length > MAX_QR_LENGTH) {
    throw new Error(
      `Text is too long for a QR code (${trimmed.length} chars, max ${MAX_QR_LENGTH}). ` +
        'Use a shorter URL or split the content.',
    );
  }
  return trimmed;
}

export async function generateQrPayload(
  text: string,
  label?: string,
): Promise<QrPayload> {
  const encoded = validateQrText(text);
  const ascii = await QRCode.toString(encoded, {
    type: 'terminal',
    errorCorrectionLevel: 'M',
  });

  return {
    text: encoded,
    label: label?.trim() || undefined,
    ascii,
    charCount: encoded.length,
  };
}
