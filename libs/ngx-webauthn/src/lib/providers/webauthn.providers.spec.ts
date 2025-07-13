/**
 * Tests for WebAuthn Providers
 */

import { TestBed } from '@angular/core/testing';
import { provideWebAuthn } from './webauthn.providers';
import { WebAuthnService } from '../services/webauthn.service';
import {
  WEBAUTHN_CONFIG,
  WebAuthnConfig,
  RelyingPartyConfig,
  DEFAULT_WEBAUTHN_CONFIG,
} from '../model/service-config';

describe('WebAuthn Providers', () => {
  describe('provideWebAuthn', () => {
    it('should return array with config provider and service', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
        id: 'test.example.com',
      };

      const providers = provideWebAuthn(relyingParty);

      expect(providers).toHaveLength(2);
      expect(providers[0]).toEqual({
        provide: WEBAUTHN_CONFIG,
        useValue: expect.any(Object),
      });
      expect(providers[1]).toBe(WebAuthnService);
    });

    it('should create correct configuration with minimal relying party', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
      };

      const providers = provideWebAuthn(relyingParty);
      const configProvider = providers[0] as any;
      const config: WebAuthnConfig = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
      expect(config.defaultTimeout).toBe(
        DEFAULT_WEBAUTHN_CONFIG.defaultTimeout
      );
      expect(config.defaultAlgorithms).toEqual(
        DEFAULT_WEBAUTHN_CONFIG.defaultAlgorithms
      );
      expect(config.enforceUserVerification).toBe(
        DEFAULT_WEBAUTHN_CONFIG.enforceUserVerification
      );
      expect(config.defaultAttestation).toBe(
        DEFAULT_WEBAUTHN_CONFIG.defaultAttestation
      );
      expect(config.defaultAuthenticatorSelection).toEqual(
        DEFAULT_WEBAUTHN_CONFIG.defaultAuthenticatorSelection
      );
    });

    it('should create correct configuration with relying party including id', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
        id: 'test.example.com',
      };

      const providers = provideWebAuthn(relyingParty);
      const configProvider = providers[0] as any;
      const config: WebAuthnConfig = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
      expect(config.relyingParty.id).toBe('test.example.com');
    });

    it('should merge configuration overrides correctly', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
        id: 'test.example.com',
      };

      const overrides = {
        defaultTimeout: 30000,
        enforceUserVerification: true,
        defaultAttestation: 'direct' as const,
      };

      const providers = provideWebAuthn(relyingParty, overrides);
      const configProvider = providers[0] as any;
      const config: WebAuthnConfig = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
      expect(config.defaultTimeout).toBe(30000);
      expect(config.enforceUserVerification).toBe(true);
      expect(config.defaultAttestation).toBe('direct');
      // Should preserve defaults for non-overridden values
      expect(config.defaultAlgorithms).toEqual(
        DEFAULT_WEBAUTHN_CONFIG.defaultAlgorithms
      );
    });

    it('should work with empty config overrides', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
      };

      const providers = provideWebAuthn(relyingParty, {});
      const configProvider = providers[0] as any;
      const config: WebAuthnConfig = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
      expect(config.defaultTimeout).toBe(
        DEFAULT_WEBAUTHN_CONFIG.defaultTimeout
      );
    });

    it('should be usable with Angular TestBed', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
        id: 'test.example.com',
      };

      TestBed.configureTestingModule({
        providers: provideWebAuthn(relyingParty, { defaultTimeout: 45000 }),
      });

      const config = TestBed.inject(WEBAUTHN_CONFIG);
      const service = TestBed.inject(WebAuthnService);

      expect(config).toBeDefined();
      expect(config.relyingParty).toEqual(relyingParty);
      expect(config.defaultTimeout).toBe(45000);
      expect(service).toBeInstanceOf(WebAuthnService);
    });
  });

  describe('Provider Integration', () => {
    it('should provide WebAuthnService instance consistently', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
      };

      // Test with provideWebAuthn
      TestBed.configureTestingModule({
        providers: provideWebAuthn(relyingParty),
      });

      const service1 = TestBed.inject(WebAuthnService);

      // Reset and test again with different config
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: provideWebAuthn(relyingParty, { defaultTimeout: 60000 }),
      });

      const service2 = TestBed.inject(WebAuthnService);

      // Both should be WebAuthnService instances
      expect(service1).toBeInstanceOf(WebAuthnService);
      expect(service2).toBeInstanceOf(WebAuthnService);
    });
  });
});
