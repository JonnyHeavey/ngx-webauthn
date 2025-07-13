/**
 * Operation-level configuration interfaces for WebAuthn operations
 *
 * These interfaces provide a convenient, preset-driven API while still allowing
 * full customization through override properties. They derive from standard WebAuthn
 * types where possible to reduce duplication and ensure compatibility.
 */

import type { PresetName } from '../presets/webauthn.presets';

// Re-export PresetName for convenience
export type { PresetName } from '../presets/webauthn.presets';

/**
 * Relying party configuration using standard WebAuthn type
 * No duplication needed - uses PublicKeyCredentialRpEntity directly
 */
export type EnhancedRelyingParty = PublicKeyCredentialRpEntity;

/**
 * Flexible user identifier that can be a string or Uint8Array
 * Provides better DX while maintaining compatibility with WebAuthn standards
 */
export type FlexibleUserId = string | Uint8Array;

/**
 * Flexible challenge that can be a string or Uint8Array
 * Provides better DX while maintaining compatibility with WebAuthn standards
 */
export type FlexibleChallenge = string | Uint8Array;

/**
 * Flexible credential descriptors that can be either full descriptors or just ID strings
 * Provides better DX for common use cases while maintaining full flexibility
 */
export type FlexibleCredentialDescriptors =
  | PublicKeyCredentialDescriptor[]
  | string[];

/**
 * Configuration for WebAuthn credential registration
 *
 * This interface extends standard WebAuthn types with preset support and enhanced UX.
 * It derives from PublicKeyCredentialCreationOptions where possible to avoid duplication.
 */
export interface RegisterConfig
  extends Partial<
    Pick<
      PublicKeyCredentialCreationOptions,
      | 'timeout'
      | 'attestation'
      | 'authenticatorSelection'
      | 'pubKeyCredParams'
      | 'extensions'
    >
  > {
  /**
   * Username for the credential
   * This is used to generate the user.name and user.id if not explicitly provided
   */
  username: string;

  /**
   * Optional preset to use as base configuration
   * - 'passkey': Modern passwordless, cross-device credentials
   * - 'externalSecurityKey': External security key as second factor after password
   * - 'platformAuthenticator': High-security, platform authenticator credentials
   */
  preset?: PresetName;

  /**
   * Display name for the user (optional override)
   * If not provided, defaults to the username
   */
  displayName?: string;

  /**
   * Relying Party configuration (optional override)
   * If not provided, will need to be set by the application or service
   * Uses standard PublicKeyCredentialRpEntity structure
   */
  rp?: EnhancedRelyingParty;

  /**
   * Challenge for the registration (optional override)
   * If not provided, a secure random challenge will be generated
   * Can be either base64url string or Uint8Array for better DX
   */
  challenge?: FlexibleChallenge;

  /**
   * Credentials to exclude from registration (optional override)
   * Can be an array of credential IDs (base64url strings) or full descriptors
   * Enhanced to accept simple string arrays for better DX
   */
  excludeCredentials?: FlexibleCredentialDescriptors;

  /**
   * User ID override (optional)
   * If not provided, a user ID will be generated from the username
   * Can be either base64url string or Uint8Array for better DX
   */
  userId?: FlexibleUserId;

  // All other properties (timeout, attestation, authenticatorSelection,
  // pubKeyCredParams, extensions) are inherited from the Partial<Pick<...>>
  // This eliminates duplication while maintaining full type safety
}

/**
 * Configuration for WebAuthn authentication
 *
 * This interface extends standard WebAuthn types with preset support and enhanced UX.
 * It derives from PublicKeyCredentialRequestOptions where possible to avoid duplication.
 */
export interface AuthenticateConfig
  extends Partial<
    Pick<
      PublicKeyCredentialRequestOptions,
      'timeout' | 'userVerification' | 'extensions'
    >
  > {
  /**
   * Optional username hint for discoverable credentials
   * Not required for authentication, but can be used for user experience
   */
  username?: string;

  /**
   * Optional preset to use as base configuration
   * Affects user verification and other authentication parameters
   */
  preset?: PresetName;

  /**
   * Challenge for the authentication (optional override)
   * If not provided, a secure random challenge will be generated
   * Can be either base64url string or Uint8Array for better DX
   */
  challenge?: FlexibleChallenge;

  /**
   * Specific credentials to allow for authentication (optional override)
   * Can be an array of credential IDs (base64url strings) or full descriptors
   * If not provided, allows any credential (discoverable credential flow)
   * Enhanced to accept simple string arrays for better DX
   */
  allowCredentials?: FlexibleCredentialDescriptors;

  // All other properties (timeout, userVerification, extensions) are inherited
  // from the Partial<Pick<...>> This eliminates duplication while maintaining
  // full type safety and compatibility with standard WebAuthn types
}

/**
 * Union type for all possible register inputs
 * Supports both high-level config and direct WebAuthn options
 */
export type RegisterInput =
  | RegisterConfig
  | PublicKeyCredentialCreationOptions
  | PublicKeyCredentialCreationOptionsJSON;

/**
 * Union type for all possible authenticate inputs
 * Supports both high-level config and direct WebAuthn options
 */
export type AuthenticateInput =
  | AuthenticateConfig
  | PublicKeyCredentialRequestOptions
  | PublicKeyCredentialRequestOptionsJSON;
