/**
 * Utility functions for resolving and merging WebAuthn presets
 *
 * These utilities handle the logic of taking a RegisterConfig or AuthenticateConfig,
 * resolving any preset, and merging it with user overrides to produce final
 * WebAuthn options ready for the browser API.
 */

import { PRESET_MAP, type PresetName } from '../presets/webauthn.presets';
import type { RegisterConfig, AuthenticateConfig } from '../model';
import type { WebAuthnConfig } from '../model/service-config';

/**
 * Deep merge utility that properly handles nested objects
 * Later properties override earlier ones
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: any[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if a value is a plain object
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Generate a secure random challenge as Uint8Array
 */
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Generate a user ID from username
 * Uses TextEncoder to convert username to Uint8Array for consistency
 */
function generateUserId(username: string): Uint8Array {
  return new TextEncoder().encode(username);
}

/**
 * Convert challenge to appropriate format
 * Handles both string (base64url) and Uint8Array inputs
 */
function processChallenge(challenge?: string | Uint8Array): Uint8Array {
  if (!challenge) {
    return generateChallenge();
  }

  if (typeof challenge === 'string') {
    // Assume base64url string, convert to Uint8Array
    return Uint8Array.from(
      atob(challenge.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
  }

  return challenge;
}

/**
 * Convert user ID to appropriate format
 * Handles both string (base64url) and Uint8Array inputs
 */
function processUserId(
  userId?: string | Uint8Array,
  username?: string
): Uint8Array {
  if (userId) {
    if (typeof userId === 'string') {
      // Assume base64url string, convert to Uint8Array
      return Uint8Array.from(
        atob(userId.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );
    }
    return userId;
  }

  if (username) {
    return generateUserId(username);
  }

  // Fallback to random ID
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert string credential IDs to PublicKeyCredentialDescriptor format
 */
function processCredentialDescriptors(
  credentials?: PublicKeyCredentialDescriptor[] | string[]
): PublicKeyCredentialDescriptor[] | undefined {
  if (!credentials || credentials.length === 0) {
    return undefined;
  }

  // If already in descriptor format, return as-is
  if (typeof credentials[0] === 'object' && 'type' in credentials[0]) {
    return credentials as PublicKeyCredentialDescriptor[];
  }

  // Convert string IDs to descriptors
  return (credentials as string[]).map((id) => ({
    type: 'public-key' as const,
    id: Uint8Array.from(atob(id.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0)
    ),
  }));
}

/**
 * Resolve a preset configuration by name
 */
export function resolvePreset(presetName: PresetName) {
  const preset = PRESET_MAP[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }
  return preset;
}

/**
 * Creates base options from WebAuthn service configuration
 */
function createBaseCreationOptions(
  webAuthnConfig: WebAuthnConfig
): Partial<PublicKeyCredentialCreationOptions> {
  return {
    timeout: webAuthnConfig.defaultTimeout || 60000,
    attestation: webAuthnConfig.defaultAttestation || 'none',
  };
}

/**
 * Applies preset configuration to base options
 */
function applyPresetConfiguration(
  config: RegisterConfig,
  baseOptions: Partial<PublicKeyCredentialCreationOptions>,
  webAuthnConfig: WebAuthnConfig
): Partial<PublicKeyCredentialCreationOptions> {
  if (config.preset) {
    const preset = resolvePreset(config.preset);
    return deepMerge(baseOptions, {
      authenticatorSelection: preset.authenticatorSelection,
      pubKeyCredParams: [...preset.pubKeyCredParams], // Convert readonly to mutable
    });
  }

  // Apply default authenticator selection from config when no preset
  if (webAuthnConfig.defaultAuthenticatorSelection) {
    return {
      ...baseOptions,
      authenticatorSelection: webAuthnConfig.defaultAuthenticatorSelection,
    };
  }

  return baseOptions;
}

/**
 * Applies user-specified overrides to options
 */
function applyUserOverrides(
  config: RegisterConfig,
  options: Partial<PublicKeyCredentialCreationOptions>
): Partial<PublicKeyCredentialCreationOptions> {
  const result = { ...options };

  if (config.timeout !== undefined) {
    result.timeout = config.timeout;
  }

  if (config.attestation !== undefined) {
    result.attestation = config.attestation;
  }

  if (config.authenticatorSelection !== undefined) {
    result.authenticatorSelection = deepMerge(
      result.authenticatorSelection || {},
      config.authenticatorSelection
    );
  }

  if (config.pubKeyCredParams !== undefined) {
    result.pubKeyCredParams = config.pubKeyCredParams;
  }

  if (config.extensions !== undefined) {
    result.extensions = config.extensions;
  }

  return result;
}

/**
 * Builds the final PublicKeyCredentialCreationOptions with all required fields
 */
function assembleFinalCreationOptions(
  options: Partial<PublicKeyCredentialCreationOptions>,
  config: RegisterConfig,
  webAuthnConfig: WebAuthnConfig
): PublicKeyCredentialCreationOptions {
  const challenge = processChallenge(config.challenge);
  const userId = processUserId(config.userId, config.username);
  const relyingParty = config.rp || webAuthnConfig.relyingParty;

  return {
    ...options,
    rp: relyingParty,
    user: {
      id: userId,
      name: config.username,
      displayName: config.displayName || config.username,
    },
    challenge,
    pubKeyCredParams: options.pubKeyCredParams ||
      webAuthnConfig.defaultAlgorithms || [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
    excludeCredentials: processCredentialDescriptors(config.excludeCredentials),
  };
}

/**
 * Build complete PublicKeyCredentialCreationOptions from RegisterConfig
 * REFACTORED: Now composed of smaller, focused functions for better maintainability
 */
export function buildCreationOptionsFromConfig(
  config: RegisterConfig,
  webAuthnConfig: WebAuthnConfig
): PublicKeyCredentialCreationOptions {
  const baseOptions = createBaseCreationOptions(webAuthnConfig);
  const presetOptions = applyPresetConfiguration(
    config,
    baseOptions,
    webAuthnConfig
  );
  const finalOptions = applyUserOverrides(config, presetOptions);
  return assembleFinalCreationOptions(finalOptions, config, webAuthnConfig);
}

/**
 * Build complete PublicKeyCredentialRequestOptions from AuthenticateConfig
 * Now uses WebAuthnConfig for better defaults
 */
export function buildRequestOptionsFromConfig(
  config: AuthenticateConfig,
  webAuthnConfig: WebAuthnConfig
): PublicKeyCredentialRequestOptions {
  // Start with base configuration from WebAuthnConfig
  const options: Partial<PublicKeyCredentialRequestOptions> = {
    timeout: webAuthnConfig.defaultTimeout || 60000,
    userVerification: webAuthnConfig.enforceUserVerification
      ? 'required'
      : 'preferred',
  };

  // Apply preset if specified
  if (config.preset) {
    const preset = resolvePreset(config.preset);
    // Extract relevant parts for authentication (userVerification from authenticatorSelection)
    if (preset.authenticatorSelection?.userVerification) {
      options.userVerification = preset.authenticatorSelection.userVerification;
    }
  }

  // Apply user overrides
  if (config.timeout !== undefined) {
    options.timeout = config.timeout;
  }

  if (config.userVerification !== undefined) {
    options.userVerification = config.userVerification;
  }

  if (config.extensions !== undefined) {
    options.extensions = config.extensions;
  }

  // Handle required fields
  const challenge = processChallenge(config.challenge);

  // Build final options
  const finalOptions: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge,
    allowCredentials: processCredentialDescriptors(config.allowCredentials),
  };

  return finalOptions;
}

/**
 * Validate that a RegisterConfig has all required fields
 */
export function validateRegisterConfig(config: RegisterConfig): void {
  if (!config.username || typeof config.username !== 'string') {
    throw new Error('RegisterConfig must have a valid username');
  }

  if (config.preset && !PRESET_MAP[config.preset]) {
    throw new Error(
      `Invalid preset: ${config.preset}. Valid presets are: ${Object.keys(
        PRESET_MAP
      ).join(', ')}`
    );
  }
}

/**
 * Validate that an AuthenticateConfig has all required fields
 */
export function validateAuthenticateConfig(config: AuthenticateConfig): void {
  if (config.preset && !PRESET_MAP[config.preset]) {
    throw new Error(
      `Invalid preset: ${config.preset}. Valid presets are: ${Object.keys(
        PRESET_MAP
      ).join(', ')}`
    );
  }
}
