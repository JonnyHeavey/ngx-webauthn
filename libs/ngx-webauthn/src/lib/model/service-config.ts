/**
 * Service-level configuration for WebAuthn operations
 *
 * These interfaces define the global configuration that affects the entire WebAuthn service,
 * including relying party information and default settings.
 */

import { InjectionToken } from '@angular/core';

/**
 * Required relying party configuration
 */
export interface RelyingPartyConfig {
  /**
   * Human-readable identifier for the Relying Party
   * @example "ACME Corporation"
   */
  name: string;

  /**
   * A valid domain string that identifies the Relying Party on whose behalf a given registration or authentication ceremony is being performed
   * @example "login.example.com" or "example.com"
   */
  id?: string;
}

/**
 * Configuration interface for WebAuthn service
 * Now includes required relying party information and advanced options
 */
export interface WebAuthnConfig {
  /**
   * Required relying party information for WebAuthn operations
   * This is critical for security - must be configured properly for production use
   */
  relyingParty: RelyingPartyConfig;

  /**
   * Default timeout for WebAuthn operations in milliseconds
   * @default 60000
   */
  defaultTimeout?: number;

  /**
   * Default public key credential algorithms in order of preference
   * @default [ES256, RS256]
   */
  defaultAlgorithms?: PublicKeyCredentialParameters[];

  /**
   * Whether to enforce user verification by default
   * @default false
   */
  enforceUserVerification?: boolean;

  /**
   * Default attestation conveyance preference
   * @default "none"
   */
  defaultAttestation?: AttestationConveyancePreference;

  /**
   * Default authenticator selection criteria
   */
  defaultAuthenticatorSelection?: AuthenticatorSelectionCriteria;

  /**
   * Optional remote endpoints for fetching WebAuthn options from server
   */
  remoteEndpoints?: {
    /**
     * Absolute URL for fetching PublicKeyCredentialCreationOptionsJSON
     * @example "https://api.example.com/webauthn/registration/options"
     */
    registration?: string;

    /**
     * Absolute URL for fetching PublicKeyCredentialRequestOptionsJSON
     * @example "https://api.example.com/webauthn/authentication/options"
     */
    authentication?: string;

    /** HTTP request configuration */
    requestOptions?: {
      /** Network timeout in milliseconds (separate from WebAuthn timeout) */
      timeout?: number;
    };
  };
}

/**
 * Default configuration for WebAuthn service
 * Note: relyingParty must be provided by the application
 */
export const DEFAULT_WEBAUTHN_CONFIG: Omit<WebAuthnConfig, 'relyingParty'> = {
  defaultTimeout: 60000,
  defaultAlgorithms: [
    { type: 'public-key', alg: -7 }, // ES256 (ECDSA w/ SHA-256)
    { type: 'public-key', alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
  ],
  enforceUserVerification: false,
  defaultAttestation: 'none',
  defaultAuthenticatorSelection: {
    userVerification: 'preferred',
  },
};

/**
 * Injection token for WebAuthn configuration
 */
export const WEBAUTHN_CONFIG = new InjectionToken<WebAuthnConfig>(
  'WEBAUTHN_CONFIG'
);

/**
 * Creates a complete WebAuthn configuration with required relying party information
 * @param relyingParty Required relying party configuration
 * @param overrides Optional configuration overrides
 */
export function createWebAuthnConfig(
  relyingParty: RelyingPartyConfig,
  overrides?: Partial<Omit<WebAuthnConfig, 'relyingParty'>>
): WebAuthnConfig {
  return {
    relyingParty,
    ...DEFAULT_WEBAUTHN_CONFIG,
    ...overrides,
  };
}
