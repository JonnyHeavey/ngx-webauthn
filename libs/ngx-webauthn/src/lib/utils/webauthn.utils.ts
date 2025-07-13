/**
 * WebAuthn Utility Functions
 * Centralized utilities for ArrayBuffer conversions and WebAuthn-specific operations
 * This is the single source of truth for data transformation functions
 */

/**
 * Converts a string to ArrayBuffer
 */
export function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Converts ArrayBuffer to string
 */
export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Converts ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts base64url string to ArrayBuffer
 */
export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if necessary
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);
  return base64ToArrayBuffer(padded);
}

/**
 * Converts ArrayBuffer to base64url string
 * This is the canonical implementation used throughout the library
 */
export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const base64 = arrayBufferToBase64(buffer);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generates a random challenge as ArrayBuffer
 */
export function generateChallenge(length = 32): ArrayBuffer {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array.buffer;
}

/**
 * Generates a random user ID as ArrayBuffer
 */
export function generateUserId(length = 32): ArrayBuffer {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array.buffer;
}

/**
 * Converts credential ID string to ArrayBuffer for WebAuthn API
 */
export function credentialIdToArrayBuffer(credentialId: string): ArrayBuffer {
  return base64urlToArrayBuffer(credentialId);
}

/**
 * Converts ArrayBuffer credential ID to string
 */
export function arrayBufferToCredentialId(buffer: ArrayBuffer): string {
  return arrayBufferToBase64url(buffer);
}

/**
 * Checks if the current environment supports WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof navigator !== 'undefined' &&
    navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
}

/**
 * Checks if platform authenticator is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Gets supported authenticator transports for this platform
 * Enhanced detection with better browser compatibility
 */
export function getSupportedTransports(): AuthenticatorTransport[] {
  const transports: AuthenticatorTransport[] = ['usb', 'internal'];

  // Add NFC support for Android devices
  if (
    typeof navigator !== 'undefined' &&
    /Android/i.test(navigator.userAgent)
  ) {
    transports.push('nfc');
  }

  // Add BLE support for modern browsers with Web Bluetooth API
  if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
    transports.push('ble');
  }

  return transports;
}

/**
 * Validates that required WebAuthn options are present
 */
export function validateRegistrationOptions(options: any): void {
  if (!options.user) {
    throw new Error('User information is required for registration');
  }

  if (!options.user.id) {
    throw new Error('User ID is required for registration');
  }

  if (!options.user.name) {
    throw new Error('User name is required for registration');
  }

  if (!options.user.displayName) {
    throw new Error('User display name is required for registration');
  }

  if (!options.rp) {
    throw new Error('Relying party information is required for registration');
  }

  if (!options.rp.name) {
    throw new Error('Relying party name is required for registration');
  }
}

/**
 * Creates default public key credential parameters
 */
export function getDefaultPubKeyCredParams(): PublicKeyCredentialParameters[] {
  return [
    {
      type: 'public-key',
      alg: -7, // ES256
    },
    {
      type: 'public-key',
      alg: -257, // RS256
    },
  ];
}

/**
 * Enhanced type guard to detect JSON-formatted WebAuthn options
 * More robust than simple challenge type checking
 */
export function isJSONOptions(options: any): boolean {
  if (!options || typeof options !== 'object') {
    return false;
  }

  // Check multiple indicators that this is JSON format (base64url strings)
  return (
    typeof options.challenge === 'string' ||
    (options.user && typeof options.user.id === 'string') ||
    (options.allowCredentials?.length > 0 &&
      typeof options.allowCredentials[0]?.id === 'string') ||
    (options.excludeCredentials?.length > 0 &&
      typeof options.excludeCredentials[0]?.id === 'string')
  );
}

/**
 * Type guard to check if input is a PublicKeyCredential
 */
export function isPublicKeyCredential(
  credential: Credential | null
): credential is PublicKeyCredential {
  return credential !== null && credential.type === 'public-key';
}
