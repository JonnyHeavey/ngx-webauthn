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
 * Type guard to check if input is a RegisterConfig
 */
export function isRegisterConfig(input: unknown): input is RegisterConfig {
  return typeof input === 'object' && input !== null && 'username' in input;
}

/**
 * Type guard to check if input is an AuthenticateConfig
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
 * Type guard to check if input is WebAuthn creation options
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
 * Type guard to check if input is WebAuthn request options
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
