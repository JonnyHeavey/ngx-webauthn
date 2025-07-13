// Core service
export { WebAuthnService } from './lib/services/webauthn.service';

// Configuration system
export type {
  WebAuthnConfig,
  RelyingPartyConfig,
} from './lib/config/webauthn.config';
export {
  WEBAUTHN_CONFIG,
  createWebAuthnConfig,
  DEFAULT_WEBAUTHN_CONFIG,
} from './lib/config/webauthn.config';

// Providers
export {
  provideWebAuthn,
  provideWebAuthnLegacy,
} from './lib/providers/webauthn.providers';

// Core models and response types
export type {
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationResult,
  WebAuthnSupport,
  RegistrationResponse,
  AuthenticationResponse,
  // New configuration types
  RegisterConfig,
  AuthenticateConfig,
  RegisterInput,
  AuthenticateInput,
  PresetName,
} from './lib/models/webauthn.models';

// Additional configuration models
export type {
  RegisterConfig as RegisterConfigModel,
  AuthenticateConfig as AuthenticateConfigModel,
} from './lib/models/register-config.models';

// Error types for enhanced error handling
export {
  WebAuthnError,
  WebAuthnErrorType,
  UserCancelledError,
  AuthenticatorError,
  InvalidOptionsError,
  UnsupportedOperationError,
  SecurityError,
  TimeoutError,
  NetworkError,
} from './lib/errors/webauthn.errors';

// Utility functions
export {
  arrayBufferToBase64url,
  base64urlToArrayBuffer,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
  generateChallenge,
  generateUserId,
  credentialIdToArrayBuffer,
  arrayBufferToCredentialId,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  getSupportedTransports,
  validateRegistrationOptions,
  getDefaultPubKeyCredParams,
  isJSONOptions,
  isPublicKeyCredential,
} from './lib/utils/webauthn.utils';

// Preset configurations
export {
  PRESET_MAP,
  PASSKEY_PRESET,
  EXTERNAL_SECURITY_KEY_PRESET,
  PLATFORM_AUTHENTICATOR_PRESET,
} from './lib/presets/webauthn.presets';
