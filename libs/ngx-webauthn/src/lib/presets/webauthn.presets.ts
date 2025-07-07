/**
 * WebAuthn Preset Configurations
 *
 * This file contains predefined configurations for common WebAuthn use cases.
 * These presets provide sensible defaults while remaining fully customizable.
 */

/**
 * A shared configuration for common, strong, and widely-supported
 * public key credential algorithms.
 */
export const COMMON_PUB_KEY_CRED_PARAMS = {
  pubKeyCredParams: [
    { type: 'public-key', alg: -7 }, // ES256 (ECDSA w/ SHA-256)
    { type: 'public-key', alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
  ],
} as const;

/**
 * Preset for modern, passwordless, cross-device credentials.
 *
 * Best for: Passkey-based authentication where users can sync credentials
 * across devices and use them for passwordless login.
 *
 * Features:
 * - Requires resident keys (discoverable credentials)
 * - Prefers user verification but doesn't require it
 * - Works with both platform and cross-platform authenticators
 * - Supports credential syncing across devices
 */
export const PASSKEY_PRESET = {
  ...COMMON_PUB_KEY_CRED_PARAMS,
  authenticatorSelection: {
    residentKey: 'required',
    userVerification: 'preferred',
  },
} as const;

/**
 * Preset for using a security key as a second factor after a password.
 *
 * Best for: Traditional 2FA scenarios where users already have a password
 * and want to add hardware security key as a second factor.
 *
 * Features:
 * - Discourages resident keys (server-side credential storage)
 * - Prefers user verification
 * - Favors cross-platform authenticators (USB/NFC security keys)
 * - Credentials typically not synced between devices
 */
export const SECOND_FACTOR_PRESET = {
  ...COMMON_PUB_KEY_CRED_PARAMS,
  authenticatorSelection: {
    residentKey: 'discouraged',
    userVerification: 'preferred',
    authenticatorAttachment: 'cross-platform',
  },
} as const;

/**
 * Preset for high-security, non-synced, single-device credentials.
 *
 * Best for: High-security scenarios where credentials must stay on a single
 * device and user verification is mandatory.
 *
 * Features:
 * - Requires platform authenticators (built-in biometrics/PIN)
 * - Requires resident keys for discoverability
 * - Requires user verification (biometric/PIN)
 * - Credentials bound to specific device (no syncing)
 */
export const DEVICE_BOUND_PRESET = {
  ...COMMON_PUB_KEY_CRED_PARAMS,
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    residentKey: 'required',
    userVerification: 'required',
  },
} as const;

/**
 * Map of preset names to their configurations
 * Used internally for preset resolution
 */
export const PRESET_MAP = {
  passkey: PASSKEY_PRESET,
  secondFactor: SECOND_FACTOR_PRESET,
  deviceBound: DEVICE_BOUND_PRESET,
} as const;

/**
 * Available preset names as a union type
 */
export type PresetName = keyof typeof PRESET_MAP;
