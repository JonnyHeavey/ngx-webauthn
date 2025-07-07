export * from './lib/services/webauthn.service';
export type {
  WebAuthnUser,
  WebAuthnRelyingParty,
  WebAuthnRegistrationOptions,
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationOptions,
  WebAuthnAuthenticationResult,
  WebAuthnSupport,
  RegistrationResponse,
  AuthenticationResponse,
  WebAuthnCreationOptionsJSON,
  WebAuthnRequestOptionsJSON,
  FlexibleRegistrationOptions,
  FlexibleAuthenticationOptions,
} from './lib/models/webauthn.models';
export * from './lib/utils/webauthn.utils';

export * from './lib/errors/webauthn.errors';

export type { WebAuthnConfig } from './lib/config/webauthn.config';
export {
  WEBAUTHN_CONFIG,
  DEFAULT_WEBAUTHN_CONFIG,
} from './lib/config/webauthn.config';
export { provideWebAuthn } from './lib/providers/webauthn.providers';
