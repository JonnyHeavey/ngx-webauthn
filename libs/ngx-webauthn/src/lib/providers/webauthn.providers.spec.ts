/**
 * Tests for WebAuthn Providers
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
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

      const configOverrides = {
        defaultTimeout: 30000,
        defaultAlgorithms: [
          { alg: -7, type: 'public-key' as const },
          { alg: -8, type: 'public-key' as const },
        ],
      };

      const providers = provideWebAuthn(relyingParty, configOverrides);

      expect(providers).toHaveLength(2);
      expect(providers[0]).toHaveProperty('provide', WEBAUTHN_CONFIG);
      expect(providers[1]).toEqual(WebAuthnService);
    });

    it('should create correct configuration with minimal relying party', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
      };

      const providers = provideWebAuthn(relyingParty);
      const configProvider = providers[0] as {
        provide: any;
        useValue: WebAuthnConfig;
      };

      const config = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
      expect(config).toMatchObject(DEFAULT_WEBAUTHN_CONFIG);
    });

    it('should create correct configuration with relying party including id', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
        id: 'test.example.com',
      };

      const providers = provideWebAuthn(relyingParty);
      const configProvider = providers[0] as {
        provide: any;
        useValue: WebAuthnConfig;
      };

      const config = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
    });

    it('should merge configuration overrides correctly', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
      };

      const configOverrides = {
        defaultTimeout: 45000,
        enforceUserVerification: true,
      };

      const providers = provideWebAuthn(relyingParty, configOverrides);
      const configProvider = providers[0] as {
        provide: any;
        useValue: WebAuthnConfig;
      };

      const config = configProvider.useValue;

      expect(config.defaultTimeout).toBe(45000);
      expect(config.enforceUserVerification).toBe(true);
      expect(config.relyingParty).toEqual(relyingParty);
    });

    it('should work with empty config overrides', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
      };

      const providers = provideWebAuthn(relyingParty, {});
      const configProvider = providers[0] as {
        provide: any;
        useValue: WebAuthnConfig;
      };

      const config = configProvider.useValue;

      expect(config.relyingParty).toEqual(relyingParty);
      expect(config).toMatchObject(DEFAULT_WEBAUTHN_CONFIG);
    });

    it('should be usable with Angular TestBed', () => {
      const relyingParty: RelyingPartyConfig = {
        name: 'Test App',
        id: 'test.example.com',
      };

      TestBed.configureTestingModule({
        providers: [
          ...provideWebAuthn(relyingParty, { defaultTimeout: 45000 }),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
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
        providers: [
          ...provideWebAuthn(relyingParty),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });

      const service1 = TestBed.inject(WebAuthnService);

      // Reset and test again with different config
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ...provideWebAuthn(relyingParty, { defaultTimeout: 60000 }),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });

      const service2 = TestBed.inject(WebAuthnService);

      expect(service1).toBeInstanceOf(WebAuthnService);
      expect(service2).toBeInstanceOf(WebAuthnService);
      expect(service1).not.toBe(service2); // Different instances due to reset
    });
  });
});
