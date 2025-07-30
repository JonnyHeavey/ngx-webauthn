// Core service
export { WebAuthnService } from './lib/services/webauthn.service';

// Configuration system
export type {
  WebAuthnConfig,
  RelyingPartyConfig,
} from './lib/model/service-config';
export {
  WEBAUTHN_CONFIG,
  createWebAuthnConfig,
  DEFAULT_WEBAUTHN_CONFIG,
} from './lib/model/service-config';

// Providers
export { provideWebAuthn } from './lib/providers/webauthn.providers';

// Core models and response types
export type {
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationResult,
  WebAuthnSupport,
  RegistrationResponse,
  AuthenticationResponse,
  RegisterConfig,
  AuthenticateConfig,
  RegisterInput,
  AuthenticateInput,
  PresetName,
  EnhancedRelyingParty,
  FlexibleUserId,
  FlexibleChallenge,
  FlexibleCredentialDescriptors,
  RemoteRegistrationRequest,
  RemoteAuthenticationRequest,
} from './lib/model';

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
  RemoteEndpointError,
  InvalidRemoteOptionsError,
} from './lib/errors/webauthn.errors';

// Remote error context type
export type { RemoteErrorContext } from './lib/errors/webauthn.errors';

// Utility functions
export {
  arrayBufferToBase64url,
  base64urlToArrayBuffer,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
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

// Remote validation utilities
export {
  validateRemoteCreationOptions,
  validateRemoteRequestOptions,
} from './lib/utils/remote.utils';

// Type guards
export {
  isRegisterConfig,
  isAuthenticateConfig,
  isCreationOptions,
  isRequestOptions,
} from './lib/utils/type-guards';

// Preset configurations
export {
  PRESET_MAP,
  PASSKEY_PRESET,
  EXTERNAL_SECURITY_KEY_PRESET,
  PLATFORM_AUTHENTICATOR_PRESET,
} from './lib/presets/webauthn.presets';
