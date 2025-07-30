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
 * Deep merge utility that properly handles nested objects.
 * Later properties override earlier ones, with recursive merging for nested objects.
 *
 * @param target The target object to merge into
 * @param sources Source objects to merge from (processed left to right)
 * @returns The merged target object
 * @example
 * ```typescript
 * const result = deepMerge(
 *   { a: 1, b: { x: 1 } },
 *   { b: { y: 2 } },
 *   { c: 3 }
 * );
 * // Result: { a: 1, b: { x: 1, y: 2 }, c: 3 }
 * ```
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
 * Type guard to check if a value is a plain object (not array, null, or primitive).
 *
 * @param item The value to check
 * @returns True if the item is a plain object, false otherwise
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Generates a unique user ID based on the username.
 * Creates a consistent, URL-safe identifier for the user.
 *
 * @param username The username to generate an ID from
 * @returns A Uint8Array containing the encoded user ID
 */
function generateUserId(username: string): Uint8Array {
  return new TextEncoder().encode(username);
}

/**
 * Processes and normalizes challenge values from various input formats.
 * Handles string (base64url) or Uint8Array. Challenges must be provided by the server.
 *
 * @param challenge Challenge as string or Uint8Array (required)
 * @returns Normalized Uint8Array challenge ready for WebAuthn API
 * @throws {Error} When no challenge is provided
 * @throws {Error} When provided string challenge is not valid base64url
 */
function processChallenge(challenge?: string | Uint8Array): Uint8Array {
  if (!challenge) {
    throw new Error(
      'Challenge is required and must be provided by the server. ' +
        'Use registerRemote() or authenticateRemote() methods for automatic server challenge generation, ' +
        'or provide a server-generated challenge directly in your configuration.'
    );
  }

  if (typeof challenge === 'string') {
    // Try to detect if string is base64url encoded or plain text
    // Base64url only contains A-Z, a-z, 0-9, -, _
    const base64urlPattern = /^[A-Za-z0-9_-]+$/;

    if (base64urlPattern.test(challenge) && challenge.length > 20) {
      try {
        // Likely base64url string, try to convert
        return Uint8Array.from(
          atob(challenge.replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0)
        );
      } catch (error) {
        // Fall back to UTF-8 encoding
        return new TextEncoder().encode(challenge);
      }
    } else {
      // Plain text string, encode as UTF-8
      return new TextEncoder().encode(challenge);
    }
  }

  return challenge;
}

/**
 * Processes and normalizes user ID values from various input formats.
 * Handles string (base64url), Uint8Array, or generates from username if none provided.
 *
 * @param userId Optional user ID as string or Uint8Array
 * @param username Username to generate ID from if userId not provided
 * @returns Normalized Uint8Array user ID ready for WebAuthn API
 * @throws {Error} When no userId provided and no username available for generation
 * @throws {Error} When provided string userId is not valid base64url
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
 * Processes and normalizes credential descriptors from various input formats.
 * Converts string credential IDs to proper PublicKeyCredentialDescriptor objects.
 *
 * @param credentials Optional array of credential IDs (strings) or full descriptors
 * @returns Array of normalized PublicKeyCredentialDescriptor objects, or undefined if none provided
 * @throws {Error} When a credential ID string is not valid base64url
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
 * Resolves a preset configuration by name.
 * Returns the complete preset configuration object for the specified preset.
 *
 * @param presetName The name of the preset to resolve
 * @returns The preset configuration object
 * @throws {Error} When the preset name is not found in PRESET_MAP
 *
 * @example
 * ```typescript
 * const preset = resolvePreset('passkey');
 * console.log(preset.authenticatorSelection.userVerification); // 'preferred'
 * ```
 */
export function resolvePreset(presetName: PresetName) {
  const preset = PRESET_MAP[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }
  return preset;
}

/**
 * Creates base creation options from WebAuthn service configuration.
 * Establishes default timeout and attestation settings that can be overridden later.
 *
 * @param webAuthnConfig The global WebAuthn service configuration
 * @returns Partial creation options with base settings applied
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
 * Applies preset configuration to base creation options.
 * Merges preset-specific authenticator selection and public key parameters into the options.
 *
 * @param config The register configuration containing preset information
 * @param baseOptions The base options to apply preset configuration to
 * @param webAuthnConfig The global WebAuthn service configuration
 * @returns Options with preset configuration applied
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
 * Applies user-specified overrides to creation options.
 * Allows users to override any preset or default settings with their own values.
 *
 * @param config The register configuration containing user overrides
 * @param options The options to apply user overrides to
 * @returns Options with user overrides applied
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
 * Assembles final creation options with all required WebAuthn fields.
 * Processes user information, challenge, and applies final service configuration.
 *
 * @param options The partially built options from previous steps
 * @param config The register configuration containing user and RP information
 * @param webAuthnConfig The global WebAuthn service configuration
 * @returns Complete PublicKeyCredentialCreationOptions ready for WebAuthn API
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
 * Builds complete WebAuthn creation options from a high-level register configuration.
 *
 * This function orchestrates the creation option building process by:
 * 1. Creating base options from service configuration
 * 2. Applying preset-specific settings if specified
 * 3. Applying user overrides for customization
 * 4. Assembling final options with all required fields
 *
 * @param config The high-level register configuration with preset support
 * @param webAuthnConfig The global WebAuthn service configuration
 * @returns Complete PublicKeyCredentialCreationOptions ready for navigator.credentials.create()
 *
 * @example
 * ```typescript
 * const config: RegisterConfig = {
 *   preset: 'passkey',
 *   user: {
 *     id: 'user123',
 *     name: 'user@example.com',
 *     displayName: 'John Doe'
 *   },
 *   challenge: 'custom-challenge'
 * };
 *
 * const options = buildCreationOptionsFromConfig(config, webAuthnConfig);
 * // Returns complete creation options ready for WebAuthn API
 * ```
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
 * Builds complete WebAuthn request options from a high-level authenticate configuration.
 *
 * Handles preset resolution, user overrides, and proper field processing to create
 * request options suitable for navigator.credentials.get().
 *
 * @param config The high-level authenticate configuration with preset support
 * @param webAuthnConfig The global WebAuthn service configuration
 * @returns Complete PublicKeyCredentialRequestOptions ready for navigator.credentials.get()
 *
 * @example
 * ```typescript
 * const config: AuthenticateConfig = {
 *   preset: 'passkey',
 *   challenge: 'auth-challenge',
 *   allowCredentials: ['cred-id-1', 'cred-id-2']
 * };
 *
 * const options = buildRequestOptionsFromConfig(config, webAuthnConfig);
 * // Returns complete request options ready for WebAuthn API
 * ```
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
 * Validates a register configuration for completeness and correctness.
 * Ensures all required fields are present and properly formatted.
 *
 * @param config The register configuration to validate
 * @throws {Error} When required fields are missing or invalid
 *
 * @example
 * ```typescript
 * try {
 *   validateRegisterConfig(config);
 *   // Config is valid, proceed with registration
 * } catch (error) {
 *   console.error('Invalid register config:', error.message);
 * }
 * ```
 */
export function validateRegisterConfig(config: RegisterConfig): void {
  if (!config.username || typeof config.username !== 'string') {
    throw new Error('RegisterConfig must have a valid username');
  }

  if (!config.challenge) {
    throw new Error(
      'RegisterConfig must have a valid challenge. ' +
        'Challenges must be generated by the server for security. ' +
        'Use registerRemote() for automatic server challenge generation, ' +
        'or provide a server-generated challenge directly.'
    );
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
 * Validates an authenticate configuration for completeness and correctness.
 * Ensures all required fields are present and properly formatted.
 *
 * @param config The authenticate configuration to validate
 * @throws {Error} When required fields are missing or invalid
 *
 * @example
 * ```typescript
 * try {
 *   validateAuthenticateConfig(config);
 *   // Config is valid, proceed with authentication
 * } catch (error) {
 *   console.error('Invalid authenticate config:', error.message);
 * }
 * ```
 */
export function validateAuthenticateConfig(config: AuthenticateConfig): void {
  if (!config.challenge) {
    throw new Error(
      'AuthenticateConfig must have a valid challenge. ' +
        'Challenges must be generated by the server for security. ' +
        'Use authenticateRemote() for automatic server challenge generation, ' +
        'or provide a server-generated challenge directly.'
    );
  }

  if (config.preset && !PRESET_MAP[config.preset]) {
    throw new Error(
      `Invalid preset: ${config.preset}. Valid presets are: ${Object.keys(
        PRESET_MAP
      ).join(', ')}`
    );
  }
}
