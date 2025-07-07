/**
 * WebAuthn Configuration
 * Provides configuration interfaces and injection token for WebAuthn service
 */

import { InjectionToken } from '@angular/core';

/**
 * Configuration interface for WebAuthn service
 * Currently minimal for local-only functionality, but extensible for future remote features
 */
export interface WebAuthnConfig {
  /**
   * Default timeout for WebAuthn operations in milliseconds
   * @default 60000
   */
  defaultTimeout?: number;

  /**
   * Whether to log debug information to console
   * @default false
   */
  debug?: boolean;
}

/**
 * Default configuration for WebAuthn service
 */
export const DEFAULT_WEBAUTHN_CONFIG: WebAuthnConfig = {
  defaultTimeout: 60000,
  debug: false,
};

/**
 * Injection token for WebAuthn configuration
 */
export const WEBAUTHN_CONFIG = new InjectionToken<WebAuthnConfig>(
  'WEBAUTHN_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_WEBAUTHN_CONFIG,
  }
);
