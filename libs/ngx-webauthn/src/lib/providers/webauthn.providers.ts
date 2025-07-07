/**
 * WebAuthn Providers
 * Modern Angular standalone provider function for WebAuthn service
 */

import { Provider } from '@angular/core';
import { WebAuthnService } from '../services/webauthn.service';
import {
  WebAuthnConfig,
  WEBAUTHN_CONFIG,
  DEFAULT_WEBAUTHN_CONFIG,
} from '../config/webauthn.config';

/**
 * Provides WebAuthn service with optional configuration
 *
 * @param config Optional configuration to override defaults
 * @returns Array of providers for WebAuthn functionality
 *
 * @example
 * ```typescript
 * // main.ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWebAuthn({
 *       defaultTimeout: 30000,
 *       debug: true
 *     })
 *   ]
 * });
 * ```
 */
export function provideWebAuthn(
  config: Partial<WebAuthnConfig> = {}
): Provider[] {
  return [
    {
      provide: WEBAUTHN_CONFIG,
      useValue: { ...DEFAULT_WEBAUTHN_CONFIG, ...config },
    },
    WebAuthnService,
  ];
}
