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
  RegistrationResponse,
  AuthenticationResponse,
  RegisterConfig,
  AuthenticateConfig,
  PresetName,
  WebAuthnSupport,
} from './lib/model';

// Error types for enhanced error handling
export {
  WebAuthnError,
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

// Preset configurations
export {
  PASSKEY_PRESET,
  EXTERNAL_SECURITY_KEY_PRESET,
  PLATFORM_AUTHENTICATOR_PRESET,
} from './lib/presets/webauthn.presets';
