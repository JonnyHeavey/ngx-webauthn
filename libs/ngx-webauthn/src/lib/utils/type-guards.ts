/**
 * Type guard utilities for WebAuthn operations
 *
 * These functions help determine the type of input provided to WebAuthn operations,
 * enabling proper handling of different input formats (high-level configs vs native WebAuthn options).
 */

import type {
  RegisterConfig,
  AuthenticateConfig,
} from '../model/operation-config';

/**
 * Type guard to determine if input is a high-level RegisterConfig object.
 * Distinguishes between RegisterConfig and direct WebAuthn creation options.
 *
 * @param input The input to check
 * @returns True if the input is a RegisterConfig, false otherwise
 *
 * @example
 * ```typescript
 * if (isRegisterConfig(input)) {
 *   // Handle high-level config with preset support
 *   const options = buildCreationOptionsFromConfig(input, config);
 * } else {
 *   // Handle direct WebAuthn options
 *   const options = parseRegistrationOptions(input);
 * }
 * ```
 */
export function isRegisterConfig(input: unknown): input is RegisterConfig {
  return typeof input === 'object' && input !== null && 'username' in input;
}

/**
 * Type guard to determine if input is a high-level AuthenticateConfig object.
 * Distinguishes between AuthenticateConfig and direct WebAuthn request options.
 *
 * Uses the presence of 'username' or 'preset' fields and absence of WebAuthn-specific
 * fields ('rp', 'user') to identify AuthenticateConfig objects.
 *
 * @param input The input to check
 * @returns True if the input is an AuthenticateConfig, false otherwise
 *
 * @example
 * ```typescript
 * if (isAuthenticateConfig(input)) {
 *   // Handle high-level config with preset support
 *   const options = buildRequestOptionsFromConfig(input, config);
 * } else {
 *   // Handle direct WebAuthn options
 *   const options = parseAuthenticationOptions(input);
 * }
 * ```
 */
export function isAuthenticateConfig(
  input: unknown
): input is AuthenticateConfig {
  return (
    typeof input === 'object' &&
    input !== null &&
    ('username' in input || 'preset' in input) &&
    !('rp' in input) && // WebAuthn options have 'rp'
    !('user' in input)
  ); // WebAuthn options have 'user'
}

/**
 * Type guard to check if input contains WebAuthn creation options.
 * Identifies objects that have the structure of PublicKeyCredentialCreationOptions
 * by checking for required fields like 'rp' and 'user'.
 *
 * @param input The input to check
 * @returns True if the input has creation options structure, false otherwise
 *
 * @example
 * ```typescript
 * if (isCreationOptions(input)) {
 *   // Input is already in WebAuthn format
 *   return navigator.credentials.create({ publicKey: input });
 * }
 * ```
 */
export function isCreationOptions(
  input: unknown
): input is
  | PublicKeyCredentialCreationOptions
  | PublicKeyCredentialCreationOptionsJSON {
  return (
    typeof input === 'object' &&
    input !== null &&
    'rp' in input &&
    'user' in input
  );
}

/**
 * Type guard to check if input contains WebAuthn request options.
 * Identifies objects that have the structure of PublicKeyCredentialRequestOptions
 * by checking for the required 'challenge' field.
 *
 * @param input The input to check
 * @returns True if the input has request options structure, false otherwise
 *
 * @example
 * ```typescript
 * if (isRequestOptions(input)) {
 *   // Input is already in WebAuthn format
 *   return navigator.credentials.get({ publicKey: input });
 * }
 * ```
 */
export function isRequestOptions(
  input: unknown
): input is
  | PublicKeyCredentialRequestOptions
  | PublicKeyCredentialRequestOptionsJSON {
  return (
    typeof input === 'object' &&
    input !== null &&
    !('username' in input) &&
    !('rp' in input) &&
    !('user' in input)
  );
}
