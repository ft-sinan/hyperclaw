/**
 * @hyperclaw/device-pair
 * Device pairing extension — QR flow, multi-device management.
 * Extends core hyperclaw devices list/pair/approve with richer flows.
 */

export const DEVICE_PAIR_VERSION = '0.1.0';

export interface PairRequest {
  deviceName?: string;
  platform?: 'ios' | 'android' | 'macos' | 'headless';
}

export interface PairResult {
  requestId: string;
  setupCode: string;
  qrPayload?: string;
  expiresAt: string;
}

/** Generate QR payload for pairing (for mobile app scan) */
export function getQRPayload(setupCode: string, gatewayUrl: string): string {
  return JSON.stringify({ code: setupCode, url: gatewayUrl });
}
