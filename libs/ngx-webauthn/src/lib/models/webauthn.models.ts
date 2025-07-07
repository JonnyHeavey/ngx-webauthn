/**
 * WebAuthn Models and Interfaces
 * Provides clean TypeScript interfaces that abstract away ArrayBuffer complexity
 * Uses native WebAuthn types where possible, with string-based abstractions for easier handling
 */

/**
 * User information for WebAuthn registration
 * Extends native PublicKeyCredentialUserEntity but uses string for id instead of BufferSource
 */
export interface WebAuthnUser {
  id: string; // Base64URL encoded - converted from/to BufferSource internally
  name: string;
  displayName: string;
}

/**
 * Relying Party information
 * Matches native PublicKeyCredentialRpEntity
 */
export interface WebAuthnRelyingParty {
  id?: string;
  name: string;
}

/**
 * Options for WebAuthn registration
 * Simplified version of PublicKeyCredentialCreationOptions with string-based abstractions
 */
export interface WebAuthnRegistrationOptions {
  user: WebAuthnUser;
  relyingParty: WebAuthnRelyingParty;
  challenge?: string; // Base64URL encoded - if not provided, will be generated
  timeout?: number; // Default: 60000ms
  attestation?: AttestationConveyancePreference; // Default: 'none'
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: string[]; // Array of Base64URL encoded credential IDs
}

/**
 * Result of WebAuthn registration
 * Simplified version with all ArrayBuffers converted to Base64URL strings
 */
export interface WebAuthnRegistrationResult {
  credentialId: string; // Base64URL encoded
  publicKey: string; // Base64URL encoded
  attestationObject: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  transports?: AuthenticatorTransport[];
}

/**
 * Options for WebAuthn authentication
 * Simplified version of PublicKeyCredentialRequestOptions with string-based abstractions
 */
export interface WebAuthnAuthenticationOptions {
  challenge?: string; // Base64URL encoded - if not provided, will be generated
  timeout?: number; // Default: 60000ms
  userVerification?: UserVerificationRequirement; // Default: 'preferred'
  allowCredentials?: string[]; // Array of Base64URL encoded credential IDs
}

/**
 * Result of WebAuthn authentication
 * Simplified version with all ArrayBuffers converted to Base64URL strings
 */
export interface WebAuthnAuthenticationResult {
  credentialId: string; // Base64URL encoded
  authenticatorData: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  signature: string; // Base64URL encoded
  userHandle?: string; // Base64URL encoded
}

/**
 * Browser support information
 */
export interface WebAuthnSupport {
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  supportedTransports: AuthenticatorTransport[];
}

/**
 * Custom WebAuthn error types
 * @deprecated Use the enhanced error types from webauthn.errors.ts
 */
export enum WebAuthnErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_ALLOWED = 'NOT_ALLOWED',
  INVALID_STATE = 'INVALID_STATE',
  CONSTRAINT = 'CONSTRAINT',
  SECURITY = 'SECURITY',
  NETWORK = 'NETWORK',
  ABORT = 'ABORT',
  TIMEOUT = 'TIMEOUT',
  ENCODING = 'ENCODING',
  UNKNOWN = 'UNKNOWN',
}

/**
 * WebAuthn error class with additional context
 * @deprecated Use the enhanced error classes from webauthn.errors.ts
 */
export class WebAuthnError extends Error {
  constructor(
    public readonly type: WebAuthnErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }

  static fromDOMException(error: DOMException): WebAuthnError {
    const type = WebAuthnError.mapDOMExceptionToType(error.name);
    return new WebAuthnError(type, error.message, error);
  }

  private static mapDOMExceptionToType(name: string): WebAuthnErrorType {
    switch (name) {
      case 'NotSupportedError':
        return WebAuthnErrorType.NOT_SUPPORTED;
      case 'NotAllowedError':
        return WebAuthnErrorType.NOT_ALLOWED;
      case 'InvalidStateError':
        return WebAuthnErrorType.INVALID_STATE;
      case 'ConstraintError':
        return WebAuthnErrorType.CONSTRAINT;
      case 'SecurityError':
        return WebAuthnErrorType.SECURITY;
      case 'NetworkError':
        return WebAuthnErrorType.NETWORK;
      case 'AbortError':
        return WebAuthnErrorType.ABORT;
      case 'TimeoutError':
        return WebAuthnErrorType.TIMEOUT;
      case 'EncodingError':
        return WebAuthnErrorType.ENCODING;
      default:
        return WebAuthnErrorType.UNKNOWN;
    }
  }
}

// =============================================================================
// Enhanced Response Types for New High-Level API
// =============================================================================

/**
 * Enhanced registration response with clean, developer-friendly format
 * Used by the new high-level register() method
 */
export interface RegistrationResponse {
  /**
   * Whether the registration was successful
   */
  success: boolean;

  /**
   * The credential ID as a base64url string
   */
  credentialId: string;

  /**
   * The public key as a base64url string (if available)
   * May be undefined if the algorithm is not supported by the user agent
   */
  publicKey?: string;

  /**
   * Available transport methods for this credential
   */
  transports?: AuthenticatorTransport[];

  /**
   * Raw WebAuthn response for advanced users who need access to all data
   * This preserves backward compatibility and provides access to attestation objects, etc.
   */
  rawResponse?: WebAuthnRegistrationResult;
}

/**
 * Enhanced authentication response with clean, developer-friendly format
 * Used by the new high-level authenticate() method
 */
export interface AuthenticationResponse {
  /**
   * Whether the authentication was successful
   */
  success: boolean;

  /**
   * The credential ID that was used for authentication
   */
  credentialId: string;

  /**
   * The user handle associated with this credential (if available)
   * This is useful for identifying the user in discoverable credential scenarios
   */
  userHandle?: string;

  /**
   * Raw WebAuthn response for advanced users who need access to all data
   * This preserves backward compatibility and provides access to signatures, etc.
   */
  rawResponse?: WebAuthnAuthenticationResult;
}

/**
 * Type alias for JSON-serializable creation options
 * These are the types that accept base64url strings instead of ArrayBuffers
 */
export type WebAuthnCreationOptionsJSON =
  PublicKeyCredentialCreationOptionsJSON;

/**
 * Type alias for JSON-serializable request options
 * These are the types that accept base64url strings instead of ArrayBuffers
 */
export type WebAuthnRequestOptionsJSON = PublicKeyCredentialRequestOptionsJSON;

/**
 * Union type for flexible registration options
 * Allows developers to use either JSON (base64url strings) or native (ArrayBuffers) formats
 */
export type FlexibleRegistrationOptions =
  | WebAuthnCreationOptionsJSON
  | PublicKeyCredentialCreationOptions;

/**
 * Union type for flexible authentication options
 * Allows developers to use either JSON (base64url strings) or native (ArrayBuffers) formats
 */
export type FlexibleAuthenticationOptions =
  | WebAuthnRequestOptionsJSON
  | PublicKeyCredentialRequestOptions;

/**
 * Note: Native WebAuthn types are available globally via DOM types:
 * - PublicKeyCredentialUserEntity
 * - PublicKeyCredentialRpEntity
 * - PublicKeyCredentialCreationOptions
 * - PublicKeyCredentialRequestOptions
 * - PublicKeyCredentialCreationOptionsJSON
 * - PublicKeyCredentialRequestOptionsJSON
 * - AuthenticatorSelectionCriteria
 * - AttestationConveyancePreference
 * - UserVerificationRequirement
 * - AuthenticatorAttachment
 * - ResidentKeyRequirement
 * - AuthenticatorTransport
 * - PublicKeyCredentialType
 * - COSEAlgorithmIdentifier
 * - PublicKeyCredentialDescriptor
 * - AuthenticationExtensionsClientInputs
 * - AuthenticationExtensionsClientOutputs
 *
 * Our interfaces above provide string-based abstractions for easier handling.
 */
