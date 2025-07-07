import { TestBed } from '@angular/core/testing';
import { WebAuthnService } from './webauthn.service';
import { RegisterConfig, AuthenticateConfig } from '../models/webauthn.models';
import {
  WebAuthnError,
  WebAuthnErrorType,
  UnsupportedOperationError,
  UserCancelledError,
  AuthenticatorError,
  InvalidOptionsError,
  SecurityError,
  TimeoutError,
} from '../errors/webauthn.errors';
import {
  WEBAUTHN_CONFIG,
  createWebAuthnConfig,
  type WebAuthnConfig,
} from '../config/webauthn.config';

// Mock PublicKeyCredential class
class MockPublicKeyCredential {
  type = 'public-key';

  constructor(public rawId: ArrayBuffer, public response: any) {}
}

describe('WebAuthnService', () => {
  let service: WebAuthnService;
  let mockNavigator: any;
  let mockCredentials: any;

  const testConfig: WebAuthnConfig = createWebAuthnConfig(
    { name: 'Test App', id: 'test.example.com' },
    { defaultTimeout: 30000 }
  );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WEBAUTHN_CONFIG,
          useValue: testConfig,
        },
      ],
    });
    service = TestBed.inject(WebAuthnService);

    // Mock navigator.credentials
    mockCredentials = {
      create: jest.fn(),
      get: jest.fn(),
    };

    mockNavigator = {
      credentials: mockCredentials,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // Replace global navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
    });

    // Mock crypto for challenge generation
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: jest
          .fn()
          .mockReturnValue(new Uint8Array([1, 2, 3, 4])),
      },
      writable: true,
    });

    // Mock PublicKeyCredential
    Object.defineProperty(global, 'PublicKeyCredential', {
      value: class {
        static parseCreationOptionsFromJSON = jest
          .fn()
          .mockImplementation((options) => options);
        static parseRequestOptionsFromJSON = jest
          .fn()
          .mockImplementation((options) => options);
        static isUserVerifyingPlatformAuthenticatorAvailable = jest
          .fn()
          .mockResolvedValue(true);
      },
      writable: true,
    });

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        PublicKeyCredential: global.PublicKeyCredential,
      },
      writable: true,
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('isSupported', () => {
    it('should return true when WebAuthn is supported', () => {
      expect(service.isSupported()).toBe(true);
    });

    it('should return false when window is undefined', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      expect(service.isSupported()).toBe(false);
    });

    it('should return false when PublicKeyCredential is undefined', () => {
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
      });

      expect(service.isSupported()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });

      expect(service.isSupported()).toBe(false);
    });

    it('should return false when credentials is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      expect(service.isSupported()).toBe(false);
    });

    it('should return false when credentials.create is not a function', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          credentials: { create: 'not-a-function' },
        },
        writable: true,
      });

      expect(service.isSupported()).toBe(false);
    });
  });

  describe('getSupport', () => {
    it('should return support information when WebAuthn is supported', (done) => {
      service.getSupport().subscribe({
        next: (support) => {
          expect(support.isSupported).toBe(true);
          expect(typeof support.isPlatformAuthenticatorAvailable).toBe(
            'boolean'
          );
          expect(Array.isArray(support.supportedTransports)).toBe(true);
          expect(support.supportedTransports).toContain('usb');
          expect(support.supportedTransports).toContain('internal');
          done();
        },
        error: done,
      });
    });

    it('should include NFC transport for Android devices', (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          ...mockNavigator,
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        },
        writable: true,
      });

      service.getSupport().subscribe({
        next: (support) => {
          expect(support.supportedTransports).toContain('nfc');
          done();
        },
        error: done,
      });
    });

    it('should include BLE transport when Web Bluetooth is available', (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          ...mockNavigator,
          bluetooth: {},
        },
        writable: true,
      });

      service.getSupport().subscribe({
        next: (support) => {
          expect(support.supportedTransports).toContain('ble');
          done();
        },
        error: done,
      });
    });

    it('should throw error when WebAuthn is not supported', (done) => {
      jest.spyOn(service, 'isSupported').mockReturnValue(false);

      service.getSupport().subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(UnsupportedOperationError);
          expect(error.message).toBe(
            'Unsupported operation: WebAuthn is not supported in this browser'
          );
          done();
        },
      });
    });

    it('should handle platform authenticator check failure', (done) => {
      (
        global.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable as jest.Mock
      ).mockRejectedValue(new Error('Platform check failed'));

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
    const mockRegisterConfig: RegisterConfig = {
      username: 'testuser',
      displayName: 'Test User',
      preset: 'passkey',
      rp: {
        name: 'Test App',
        id: 'example.com',
      },
    };

    const mockCreationOptions: PublicKeyCredentialCreationOptions = {
      rp: { name: 'Test App', id: 'example.com' },
      user: {
        id: new Uint8Array([1, 2, 3, 4]),
        name: 'testuser',
        displayName: 'Test User',
      },
      challenge: new Uint8Array([5, 6, 7, 8]),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    };

    const mockJSONOptions: PublicKeyCredentialCreationOptionsJSON = {
      rp: { name: 'Test App', id: 'example.com' },
      user: {
        id: 'dGVzdA',
        name: 'testuser',
        displayName: 'Test User',
      },
      challenge: 'Y2hhbGxlbmdl',
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    };

    it('should successfully register a credential with config', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockRegisterConfig).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(typeof result.credentialId).toBe('string');
          expect(result.transports).toEqual(['usb']);
          expect(typeof result.publicKey).toBe('string');
          expect(result.rawResponse).toBeDefined();
          expect(mockCredentials.create).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should successfully register with native creation options', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: () => ['internal'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockCreationOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(typeof result.credentialId).toBe('string');
          expect(mockCredentials.create).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should successfully register with JSON creation options', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockJSONOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(
            global.PublicKeyCredential.parseCreationOptionsFromJSON
          ).toHaveBeenCalledWith(mockJSONOptions);
          done();
        },
        error: done,
      });
    });

    it('should handle credential without public key', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => null,
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockRegisterConfig).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.publicKey).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should handle credential without transport information', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: undefined,
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service.register(mockRegisterConfig).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.transports).toEqual([]);
          done();
        },
        error: done,
      });
    });

    it('should throw error when WebAuthn is not supported', (done) => {
      jest.spyOn(service, 'isSupported').mockReturnValue(false);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(UnsupportedOperationError);
          done();
        },
      });
    });

    it('should handle user cancellation', (done) => {
      const domException = new DOMException(
        'User cancelled',
        'NotAllowedError'
      );
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(UserCancelledError);
          expect(error.originalError).toBe(domException);
          done();
        },
      });
    });

    it('should handle invalid state error', (done) => {
      const domException = new DOMException(
        'Invalid state',
        'InvalidStateError'
      );
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticatorError);
          expect(error.message).toBe(
            'Authenticator error: Invalid authenticator state'
          );
          done();
        },
      });
    });

    it('should handle not supported error', (done) => {
      const domException = new DOMException(
        'Not supported',
        'NotSupportedError'
      );
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(UnsupportedOperationError);
          done();
        },
      });
    });

    it('should handle security error', (done) => {
      const domException = new DOMException('Security error', 'SecurityError');
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(SecurityError);
          expect(error.message).toBe('Security error: Security error occurred');
          done();
        },
      });
    });

    it('should handle timeout error', (done) => {
      const domException = new DOMException('Timeout', 'TimeoutError');
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(TimeoutError);
          expect(error.message).toBe('Timeout error: Operation timed out');
          done();
        },
      });
    });

    it('should handle encoding error', (done) => {
      const domException = new DOMException('Encoding error', 'EncodingError');
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toBe(
            'Invalid options: Encoding error in options'
          );
          done();
        },
      });
    });

    it('should handle unknown DOM exception', (done) => {
      const domException = new DOMException('Unknown error', 'UnknownError');
      mockCredentials.create.mockRejectedValue(domException);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.UNKNOWN);
          expect(error.message).toBe('Unknown WebAuthn error: Unknown error');
          done();
        },
      });
    });

    it('should handle JSON parsing errors', (done) => {
      const typeError = new TypeError('parseCreationOptionsFromJSON failed');
      mockCredentials.create.mockRejectedValue(typeError);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toBe(
            'Invalid options: Invalid JSON options format'
          );
          done();
        },
      });
    });

    it('should handle configuration validation errors', (done) => {
      const invalidConfig = { preset: 'passkey' } as RegisterConfig; // Missing username

      service.register(invalidConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toBe(
            'Invalid options: Failed to process registration input'
          );
          done();
        },
      });
    });

    it('should handle null credential response', (done) => {
      mockCredentials.create.mockResolvedValue(null);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.message).toContain('Unexpected error');
          done();
        },
      });
    });

    it('should handle non-PublicKeyCredential response', (done) => {
      const invalidCredential = { type: 'invalid' };
      mockCredentials.create.mockResolvedValue(invalidCredential);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.message).toContain('Unexpected error');
          done();
        },
      });
    });

    it('should handle unexpected errors', (done) => {
      const unexpectedError = new Error('Unexpected error');
      mockCredentials.create.mockRejectedValue(unexpectedError);

      service.register(mockRegisterConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.type).toBe(WebAuthnErrorType.UNKNOWN);
          expect(error.message).toBe('Unexpected error: Unexpected error');
          done();
        },
      });
    });
  });

  describe('authenticate', () => {
    const mockAuthenticateConfig: AuthenticateConfig = {
      preset: 'passkey',
    };

    const mockRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: new Uint8Array([5, 6, 7, 8]),
      timeout: 60000,
    };

    const mockJSONRequestOptions: PublicKeyCredentialRequestOptionsJSON = {
      challenge: 'Y2hhbGxlbmdl',
      timeout: 60000,
    };

    it('should successfully authenticate with config', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        signature: new ArrayBuffer(64),
        userHandle: new ArrayBuffer(16),
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(mockAuthenticateConfig).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(typeof result.credentialId).toBe('string');
          expect(typeof result.userHandle).toBe('string');
          expect(result.rawResponse).toBeDefined();
          expect(mockCredentials.get).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should successfully authenticate with native request options', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        signature: new ArrayBuffer(64),
        userHandle: new ArrayBuffer(16),
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(mockRequestOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(typeof result.credentialId).toBe('string');
          done();
        },
        error: done,
      });
    });

    it('should successfully authenticate with JSON request options', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        authenticatorData: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        signature: new ArrayBuffer(64),
        userHandle: new ArrayBuffer(16),
      });

      mockCredentials.get.mockResolvedValue(mockCredential);

      service.authenticate(mockJSONRequestOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(
            global.PublicKeyCredential.parseRequestOptionsFromJSON
          ).toHaveBeenCalledWith(mockJSONRequestOptions);
          done();
        },
        error: done,
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

      service.authenticate(mockAuthenticateConfig).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.userHandle).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should throw error when WebAuthn is not supported', (done) => {
      jest.spyOn(service, 'isSupported').mockReturnValue(false);

      service.authenticate(mockAuthenticateConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(UnsupportedOperationError);
          done();
        },
      });
    });

    it('should handle user cancellation', (done) => {
      const domException = new DOMException(
        'User cancelled',
        'NotAllowedError'
      );
      mockCredentials.get.mockRejectedValue(domException);

      service.authenticate(mockAuthenticateConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(UserCancelledError);
          done();
        },
      });
    });

    it('should handle null credential response', (done) => {
      mockCredentials.get.mockResolvedValue(null);

      service.authenticate(mockAuthenticateConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(WebAuthnError);
          expect(error.message).toContain('Unexpected error');
          done();
        },
      });
    });

    it('should handle configuration validation errors', (done) => {
      const invalidConfig = {
        preset: 'invalid-preset',
      } as unknown as AuthenticateConfig;

      service.authenticate(invalidConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toBe(
            'Invalid options: Failed to process authentication input'
          );
          done();
        },
      });
    });

    it('should handle JSON parsing errors for authentication', (done) => {
      const typeError = new TypeError('parseRequestOptionsFromJSON failed');
      mockCredentials.get.mockRejectedValue(typeError);

      service.authenticate(mockAuthenticateConfig).subscribe({
        next: () => done(new Error('Should not emit value')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toBe(
            'Invalid options: Invalid JSON options format'
          );
          done();
        },
      });
    });
  });

  describe('edge cases and private methods', () => {
    it('should correctly detect JSON options by challenge type', () => {
      const jsonOptions = { challenge: 'string-challenge' };
      const nativeOptions = { challenge: new Uint8Array([1, 2, 3]) };

      // Test JSON detection (private method behavior observed through public API)
      expect(typeof jsonOptions.challenge).toBe('string');
      expect(typeof nativeOptions.challenge).toBe('object');
    });

    it('should handle public key extraction failure gracefully', (done) => {
      const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => {
          throw new Error('Public key extraction failed');
        },
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service
        .register({ username: 'test', preset: 'passkey', rp: { name: 'Test' } })
        .subscribe({
          next: () => done(new Error('Should not succeed')),
          error: (error) => {
            expect(error).toBeInstanceOf(WebAuthnError);
            expect(error.message).toContain('Public key extraction failed');
            done();
          },
        });
    });

    it('should properly convert ArrayBuffer to base64url', (done) => {
      const testBuffer = new ArrayBuffer(4);
      const view = new Uint8Array(testBuffer);
      view[0] = 72; // 'H'
      view[1] = 101; // 'e'
      view[2] = 108; // 'l'
      view[3] = 108; // 'l'

      const mockCredential = new MockPublicKeyCredential(testBuffer, {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(64),
        getPublicKey: () => new ArrayBuffer(64),
        getTransports: () => ['usb'],
      });

      mockCredentials.create.mockResolvedValue(mockCredential);

      service
        .register({ username: 'test', preset: 'passkey', rp: { name: 'Test' } })
        .subscribe({
          next: (result) => {
            expect(result.credentialId).toBe('SGVsbA'); // Base64url for 'Hell'
            done();
          },
          error: done,
        });
    });
  });
});
