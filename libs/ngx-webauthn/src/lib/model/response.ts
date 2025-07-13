/**
 * Response interfaces for WebAuthn operations
 *
 * This file contains both raw WebAuthn results (converted to Base64URL strings)
 * and enhanced user-friendly response formats.
 */

/**
 * Raw result of WebAuthn registration
 * Simplified version with all ArrayBuffers converted to Base64URL strings for easier handling
 */
export interface WebAuthnRegistrationResult {
  credentialId: string; // Base64URL encoded
  publicKey: string; // Base64URL encoded
  attestationObject: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  transports?: AuthenticatorTransport[];
}

/**
 * Raw result of WebAuthn authentication
 * Simplified version with all ArrayBuffers converted to Base64URL strings for easier handling
 */
export interface WebAuthnAuthenticationResult {
  credentialId: string; // Base64URL encoded
  authenticatorData: string; // Base64URL encoded
  clientDataJSON: string; // Base64URL encoded
  signature: string; // Base64URL encoded
  userHandle?: string; // Base64URL encoded
}

/**
 * Enhanced registration response with clean, developer-friendly format
 * Used by the high-level register() method
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
 * Used by the high-level authenticate() method
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
 * Browser support information
 */
export interface WebAuthnSupport {
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  supportedTransports: AuthenticatorTransport[];
}
