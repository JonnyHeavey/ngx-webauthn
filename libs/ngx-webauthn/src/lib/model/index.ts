/**
 * Public API for model types
 *
 * This file re-exports all model types for easy consumption by the library users.
 */

// Service configuration
export type { RelyingPartyConfig, WebAuthnConfig } from './service-config';

export {
  DEFAULT_WEBAUTHN_CONFIG,
  WEBAUTHN_CONFIG,
  createWebAuthnConfig,
} from './service-config';

// Operation configuration
export type {
  RegisterConfig,
  AuthenticateConfig,
  PresetName,
  EnhancedRelyingParty,
  FlexibleUserId,
  FlexibleChallenge,
  FlexibleCredentialDescriptors,
  RegisterInput,
  AuthenticateInput,
} from './operation-config';

// Response interfaces (includes both raw and enhanced responses)
export type {
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationResult,
  RegistrationResponse,
  AuthenticationResponse,
  WebAuthnSupport,
} from './response';
