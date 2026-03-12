/**
 * HyperClawKit — shared types and utilities for iOS/Android mobile clients.
 */

export const HYPERCLAWKIT_VERSION = '0.2.0';

export interface ConnectParams {
  gatewayUrl: string;
  deviceName?: string;
  platform: 'ios' | 'android';
}

export interface PairingPayload {
  code: string;
  url: string;
}

export interface NodeStatus {
  nodeId: string;
  platform: string;
  lastSeen: string;
  connected: boolean;
}

export interface ChatSession {
  sessionId: string;
  model?: string;
  agentName?: string;
}

export interface VoiceConfig {
  ttsEnabled: boolean;
  sttEnabled: boolean;
  language: string;
  silenceTimeoutMs?: number;
}
