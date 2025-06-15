import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { WebAuthnService } from './webauthn.service';
import {
  WebAuthnError,
  WebAuthnErrorType,
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
} from '../models/webauthn.models';

// Mock WebAuthn utilities
jest.mock('../utils/webauthn.utils', () => ({
  isWebAuthnSupported: jest.fn(),
  isPlatformAuthenticatorAvailable: jest.fn(),
  getSupportedTransports: jest.fn(),
  generateChallenge: jest.fn(),
  generateUserId: jest.fn(),
  arrayBufferToBase64url: jest.fn(),
  base64urlToArrayBuffer: jest.fn(),
  arrayBufferToCredentialId: jest.fn(),
  credentialIdToArrayBuffer: jest.fn(),
  validateRegistrationOptions: jest.fn(),
  getDefaultPubKeyCredParams: jest.fn(),
}));

import * as utils from '../utils/webauthn.utils';

// Mock PublicKeyCredential class
class MockPublicKeyCredential {
  constructor(public rawId: ArrayBuffer, public response: any) {}
}

describe('WebAuthnService', () => {
  let service: WebAuthnService;
  let mockNavigator: any;
  let mockCredentials: any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebAuthnService);

    // Mock navigator.credentials
    mockCredentials = {
      create: jest.fn(),
      get: jest.fn(),
    };

    mockNavigator = {
      credentials: mockCredentials,
    };

    // Replace global navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
    });

    // Mock PublicKeyCredential
    global.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when WebAuthn is supported', () => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);

      expect(service.isSupported()).toBe(true);
      expect(utils.isWebAuthnSupported).toHaveBeenCalled();
    });

    it('should return false when WebAuthn is not supported', () => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(false);

      expect(service.isSupported()).toBe(false);
      expect(utils.isWebAuthnSupported).toHaveBeenCalled();
    });
  });

  describe('getSupport', () => {
    it('should return support information when WebAuthn is supported', (done) => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
      (utils.isPlatformAuthenticatorAvailable as jest.Mock).mockResolvedValue(
        true
      );
      (utils.getSupportedTransports as jest.Mock).mockReturnValue([
        'usb',
        'internal',
      ]);

      service.getSupport().subscribe({
        next: (support) => {
          expect(support).toEqual({
            isSupported: true,
            isPlatformAuthenticatorAvailable: true,
            supportedTransports: ['usb', 'internal'],
          });
          done();
        },
        error: done,
      });
    });

    it('should throw error when WebAuthn is not supported', (done) => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(false);

      service.getSupport().subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.NOT_SUPPORTED);
          expect(error.message).toBe(
            'WebAuthn is not supported in this browser'
          );
          done();
        },
      });
    });

    it('should handle platform authenticator check failure', (done) => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
      (utils.isPlatformAuthenticatorAvailable as jest.Mock).mockRejectedValue(
        new Error('Platform check failed')
      );

      service.getSupport().subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.UNKNOWN);
          expect(error.message).toBe('Failed to check WebAuthn support');
          done();
        },
      });
    });
  });

  describe('register', () => {
    const mockRegistrationOptions: WebAuthnRegistrationOptions = {
      user: {
        id: 'user123',
        name: 'testuser',
        displayName: 'Test User',
      },
      relyingParty: {
        name: 'Test App',
        id: 'example.com',
      },
    };

    beforeEach(() => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
      (utils.base64urlToArrayBuffer as jest.Mock).mockImplementation(
        (str) => new TextEncoder().encode(str).buffer
      );
      (utils.generateChallenge as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );
      (utils.generateUserId as jest.Mock).mockReturnValue(new ArrayBuffer(32));
      (utils.getSupportedTransports as jest.Mock).mockReturnValue([
        'usb',
        'internal',
      ]);
      (utils.getDefaultPubKeyCredParams as jest.Mock).mockReturnValue([
        { type: 'public-key', alg: -7 },
      ]);
      (utils.validateRegistrationOptions as jest.Mock).mockImplementation(
        () => {
          // No-op validation for tests
        }
      );
      (utils.arrayBufferToCredentialId as jest.Mock).mockReturnValue(
        'credential123'
      );
      (utils.arrayBufferToBase64url as jest.Mock).mockReturnValue('base64data');
    });

    it('should successfully register a credential', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockRegistrationOptions).subscribe({
        next: (result) => {
          expect(result).toEqual({
            credentialId: 'credential123',
            publicKey: 'base64data',
            attestationObject: 'base64data',
            clientDataJSON: 'base64data',
            transports: ['usb'],
          });
          expect(mockCredentials.create).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should throw error when WebAuthn is not supported', (done) => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(false);

      service.register(mockRegistrationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.NOT_SUPPORTED);
          done();
        },
      });
    });

    it('should handle validation errors', (done) => {
      (utils.validateRegistrationOptions as jest.Mock).mockImplementation(
        () => {
          throw new Error('Validation failed');
        }
      );

      service.register(mockRegistrationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.UNKNOWN);
          expect(error.message).toBe('Failed to prepare registration options');
          done();
        },
      });
    });

    it('should handle credential creation failure', (done) => {
      const domException = new DOMException(
        'User cancelled',
        'NotAllowedError'
      );
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegistrationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.NOT_ALLOWED);
          expect(error.message).toBe('User cancelled');
          done();
        },
      });
    });

    it('should handle invalid credential response', (done) => {
      mockCredentials.create.mockResolvedValue(null);

      service.register(mockRegistrationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.INVALID_STATE);
          expect(error.message).toBe(
            'Invalid credential received from registration'
          );
          done();
        },
      });
    });

    it('should handle missing response data', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        // Missing attestationObject and clientDataJSON
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockRegistrationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.INVALID_STATE);
          expect(error.message).toBe(
            'Missing required data in registration response'
          );
          done();
        },
      });
    });

    it('should handle registration with exclude credentials', (done) => {
      const optionsWithExclude = {
        ...mockRegistrationOptions,
        excludeCredentials: ['existing-cred-1', 'existing-cred-2'],
      };

      (utils.credentialIdToArrayBuffer as jest.Mock).mockImplementation(
        (id) => new TextEncoder().encode(id).buffer
      );

      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(optionsWithExclude).subscribe({
        next: (result) => {
          expect(result.credentialId).toBe('credential123');
          expect(utils.credentialIdToArrayBuffer).toHaveBeenCalledWith(
            'existing-cred-1'
          );
          expect(utils.credentialIdToArrayBuffer).toHaveBeenCalledWith(
            'existing-cred-2'
          );
          done();
        },
        error: done,
      });
    });
  });

  describe('authenticate', () => {
    const mockAuthenticationOptions: WebAuthnAuthenticationOptions = {
      allowCredentials: ['credential123'],
    };

    beforeEach(() => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
      (utils.base64urlToArrayBuffer as jest.Mock).mockImplementation(
        (str) => new TextEncoder().encode(str).buffer
      );
      (utils.generateChallenge as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );
      (utils.getSupportedTransports as jest.Mock).mockReturnValue([
        'usb',
        'internal',
      ]);
      (utils.credentialIdToArrayBuffer as jest.Mock).mockImplementation(
        (id) => new TextEncoder().encode(id).buffer
      );
      (utils.arrayBufferToCredentialId as jest.Mock).mockReturnValue(
        'credential123'
      );
      (utils.arrayBufferToBase64url as jest.Mock).mockReturnValue('base64data');
    });

    it('should successfully authenticate with a credential', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        signature: new ArrayBuffer(64),
        userHandle: new ArrayBuffer(16),
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(mockAuthenticationOptions).subscribe({
        next: (result) => {
          expect(result).toEqual({
            credentialId: 'credential123',
            authenticatorData: 'base64data',
            clientDataJSON: 'base64data',
            signature: 'base64data',
            userHandle: 'base64data',
          });
          expect(mockCredentials.get).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should throw error when WebAuthn is not supported', (done) => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(false);

      service.authenticate(mockAuthenticationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.NOT_SUPPORTED);
          done();
        },
      });
    });

    it('should handle authentication failure', (done) => {
      const domException = new DOMException('Timeout', 'TimeoutError');
      mockCredentials.get.mockRejectedValue(domException);

      service.authenticate(mockAuthenticationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.TIMEOUT);
          expect(error.message).toBe('Timeout');
          done();
        },
      });
    });

    it('should handle invalid credential response', (done) => {
      mockCredentials.get.mockResolvedValue(null);

      service.authenticate(mockAuthenticationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.INVALID_STATE);
          expect(error.message).toBe(
            'Invalid credential received from authentication'
          );
          done();
        },
      });
    });

    it('should handle missing response data', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        // Missing required fields
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(mockAuthenticationOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.INVALID_STATE);
          expect(error.message).toBe(
            'Missing required data in authentication response'
          );
          done();
        },
      });
    });

    it('should handle authentication without userHandle', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        signature: new ArrayBuffer(64),
        userHandle: null,
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(mockAuthenticationOptions).subscribe({
        next: (result) => {
          expect(result.userHandle).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should handle authentication without allowCredentials', (done) => {
      const optionsWithoutCredentials: WebAuthnAuthenticationOptions = {};

      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        signature: new ArrayBuffer(64),
        userHandle: null,
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(optionsWithoutCredentials).subscribe({
        next: (result) => {
          expect(result.credentialId).toBe('credential123');
          done();
        },
        error: done,
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
    });

    it('should handle unknown errors', (done) => {
      const unknownError = new Error('Unknown error');
      mockCredentials.create.mockRejectedValue(unknownError);

      const mockOptions: WebAuthnRegistrationOptions = {
        user: { id: 'user123', name: 'test', displayName: 'Test' },
        relyingParty: { name: 'Test App' },
      };

      service.register(mockOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.UNKNOWN);
          expect(error.originalError).toBe(unknownError);
          done();
        },
      });
    });

    it('should pass through WebAuthnError instances', (done) => {
      const webauthnError = new WebAuthnError(
        WebAuthnErrorType.SECURITY,
        'Security error'
      );
      mockCredentials.create.mockRejectedValue(webauthnError);

      const mockOptions: WebAuthnRegistrationOptions = {
        user: { id: 'user123', name: 'test', displayName: 'Test' },
        relyingParty: { name: 'Test App' },
      };

      service.register(mockOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBe(webauthnError);
          done();
        },
      });
    });

    it('should handle errors without message', (done) => {
      const errorWithoutMessage = {};
      mockCredentials.create.mockRejectedValue(errorWithoutMessage);

      const mockOptions: WebAuthnRegistrationOptions = {
        user: { id: 'user123', name: 'test', displayName: 'Test' },
        relyingParty: { name: 'Test App' },
      };

      service.register(mockOptions).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.message).toBe('Unknown WebAuthn error occurred');
          done();
        },
      });
    });
  });

  describe('buildRegistrationOptions', () => {
    it('should use provided challenge', () => {
      const options: WebAuthnRegistrationOptions = {
        user: { id: 'user123', name: 'test', displayName: 'Test' },
        relyingParty: { name: 'Test App' },
        challenge: 'custom-challenge',
      };

      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
      (utils.base64urlToArrayBuffer as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );
      (utils.getDefaultPubKeyCredParams as jest.Mock).mockReturnValue([]);
      (utils.getSupportedTransports as jest.Mock).mockReturnValue([]);

      // Access private method for testing
      const publicKeyOptions = (service as any).buildRegistrationOptions(
        options
      );

      expect(utils.base64urlToArrayBuffer).toHaveBeenCalledWith(
        'custom-challenge'
      );
    });

    it('should generate challenge when not provided', () => {
      const options: WebAuthnRegistrationOptions = {
        user: { id: 'user123', name: 'test', displayName: 'Test' },
        relyingParty: { name: 'Test App' },
      };

      (utils.isWebAuthnSupported as jest.Mock).mockReturnValue(true);
      (utils.base64urlToArrayBuffer as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );
      (utils.generateChallenge as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );
      (utils.getDefaultPubKeyCredParams as jest.Mock).mockReturnValue([]);
      (utils.getSupportedTransports as jest.Mock).mockReturnValue([]);

      // Access private method for testing
      const publicKeyOptions = (service as any).buildRegistrationOptions(
        options
      );

      expect(utils.generateChallenge).toHaveBeenCalled();
    });
  });

  describe('buildAuthenticationOptions', () => {
    it('should use provided challenge', () => {
      const options: WebAuthnAuthenticationOptions = {
        challenge: 'custom-challenge',
      };

      (utils.base64urlToArrayBuffer as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );

      // Access private method for testing
      const publicKeyOptions = (service as any).buildAuthenticationOptions(
        options
      );

      expect(utils.base64urlToArrayBuffer).toHaveBeenCalledWith(
        'custom-challenge'
      );
    });

    it('should generate challenge when not provided', () => {
      const options: WebAuthnAuthenticationOptions = {};

      (utils.generateChallenge as jest.Mock).mockReturnValue(
        new ArrayBuffer(32)
      );

      // Access private method for testing
      const publicKeyOptions = (service as any).buildAuthenticationOptions(
        options
      );

      expect(utils.generateChallenge).toHaveBeenCalled();
    });
  });
});
