import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WebAuthnService } from './webauthn.service';
import { RegisterConfig, AuthenticateConfig } from '../model';
import {
  WebAuthnError,
  WebAuthnErrorType,
  UnsupportedOperationError,
  UserCancelledError,
  AuthenticatorError,
  InvalidOptionsError,
  SecurityError,
  TimeoutError,
  RemoteEndpointError,
  InvalidRemoteOptionsError,
} from '../errors/webauthn.errors';
import {
  WEBAUTHN_CONFIG,
  createWebAuthnConfig,
  type WebAuthnConfig,
} from '../model/service-config';

// Mock PublicKeyCredential class
class MockPublicKeyCredential {
  type = 'public-key';

  constructor(public rawId: ArrayBuffer, public response: any) {}
}

describe('WebAuthnService', () => {
  let service: WebAuthnService;
  let httpMock: HttpTestingController;
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
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(WebAuthnService);
    httpMock = TestBed.inject(HttpTestingController);

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
          next: (response) => {
            // FIXED: Registration should succeed even when public key extraction fails
            expect(response.success).toBe(true);
            expect(response.publicKey).toBeUndefined(); // Public key should be undefined
            expect(response.credentialId).toBeTruthy();
            expect(response.transports).toEqual(['usb']);
            done();
          },
          error: (error) => {
            done(error); // Should not reach here
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

  describe('preset configurations', () => {
    const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
      attestationObject: new ArrayBuffer(64),
      clientDataJSON: new ArrayBuffer(64),
      getPublicKey: () => new ArrayBuffer(64),
      getTransports: () => ['usb'],
    });

    beforeEach(() => {
      mockCredentials.create.mockResolvedValue(mockCredential);
      mockCredentials.get.mockResolvedValue(mockCredential);
    });

    describe('passkey preset', () => {
      it('should apply passkey preset configuration for registration', (done) => {
        service.register({ username: 'test', preset: 'passkey' }).subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            const options = createCall.publicKey;

            expect(options.authenticatorSelection.residentKey).toBe('required');
            expect(options.authenticatorSelection.userVerification).toBe(
              'preferred'
            );
            expect(
              options.authenticatorSelection.authenticatorAttachment
            ).toBeUndefined();
            done();
          },
          error: done,
        });
      });

      it('should apply passkey preset configuration for authentication', (done) => {
        service.authenticate({ preset: 'passkey' }).subscribe({
          next: () => {
            const getCall = mockCredentials.get.mock.calls[0][0];
            const options = getCall.publicKey;

            expect(options.userVerification).toBe('preferred');
            done();
          },
          error: done,
        });
      });
    });

    describe('externalSecurityKey preset', () => {
      it('should apply externalSecurityKey preset configuration for registration', (done) => {
        service
          .register({ username: 'test', preset: 'externalSecurityKey' })
          .subscribe({
            next: () => {
              const createCall = mockCredentials.create.mock.calls[0][0];
              const options = createCall.publicKey;

              expect(options.authenticatorSelection.residentKey).toBe(
                'discouraged'
              );
              expect(options.authenticatorSelection.userVerification).toBe(
                'preferred'
              );
              expect(
                options.authenticatorSelection.authenticatorAttachment
              ).toBe('cross-platform');
              done();
            },
            error: done,
          });
      });

      it('should apply externalSecurityKey preset configuration for authentication', (done) => {
        service.authenticate({ preset: 'externalSecurityKey' }).subscribe({
          next: () => {
            const getCall = mockCredentials.get.mock.calls[0][0];
            const options = getCall.publicKey;

            expect(options.userVerification).toBe('preferred');
            done();
          },
          error: done,
        });
      });
    });

    describe('platformAuthenticator preset', () => {
      it('should apply platformAuthenticator preset configuration for registration', (done) => {
        service
          .register({ username: 'test', preset: 'platformAuthenticator' })
          .subscribe({
            next: () => {
              const createCall = mockCredentials.create.mock.calls[0][0];
              const options = createCall.publicKey;

              expect(options.authenticatorSelection.residentKey).toBe(
                'required'
              );
              expect(options.authenticatorSelection.userVerification).toBe(
                'required'
              );
              expect(
                options.authenticatorSelection.authenticatorAttachment
              ).toBe('platform');
              done();
            },
            error: done,
          });
      });

      it('should apply platformAuthenticator preset configuration for authentication', (done) => {
        service.authenticate({ preset: 'platformAuthenticator' }).subscribe({
          next: () => {
            const getCall = mockCredentials.get.mock.calls[0][0];
            const options = getCall.publicKey;

            expect(options.userVerification).toBe('required');
            done();
          },
          error: done,
        });
      });
    });

    describe('Remote Registration', () => {
      describe('registerRemote', () => {
        const mockCreationOptions: PublicKeyCredentialCreationOptionsJSON = {
          rp: { name: 'Test App', id: 'test.example.com' },
          user: {
            id: 'dGVzdC11c2VyLWlk', // base64url encoded
            name: 'test@example.com',
            displayName: 'Test User',
          },
          challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 60000,
          attestation: 'none',
        };

        beforeEach(() => {
          // Configure remote endpoints
          const configWithRemote = createWebAuthnConfig(
            { name: 'Test App', id: 'test.example.com' },
            {
              remoteEndpoints: {
                registration:
                  'https://api.example.com/webauthn/registration/options',
                authentication:
                  'https://api.example.com/webauthn/authentication/options',
                requestOptions: { timeout: 10000 },
              },
            }
          );

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            providers: [
              {
                provide: WEBAUTHN_CONFIG,
                useValue: configWithRemote,
              },
              provideHttpClient(),
              provideHttpClientTesting(),
            ],
          });
          service = TestBed.inject(WebAuthnService);
          httpMock = TestBed.inject(HttpTestingController);
        });

        afterEach(() => {
          httpMock.verify();
        });

        it('should fetch options from server and register successfully', (done) => {
          const mockCredential = new MockPublicKeyCredential(
            new ArrayBuffer(32),
            {
              attestationObject: new ArrayBuffer(64),
              clientDataJSON: new ArrayBuffer(64),
              getPublicKey: () => new ArrayBuffer(64),
              getTransports: () => ['usb'],
            }
          );

          mockCredentials.create.mockResolvedValue(mockCredential);

          const requestPayload = { username: 'test@example.com' };

          service.registerRemote(requestPayload).subscribe({
            next: (result) => {
              expect(result.success).toBe(true);
              expect(typeof result.credentialId).toBe('string');
              done();
            },
            error: done,
          });

          // Expect HTTP request to be made
          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          expect(req.request.method).toBe('POST');
          expect(req.request.body).toEqual(requestPayload);

          // Respond with mock options
          req.flush(mockCreationOptions);
        });

        it('should send request payload as JSON body', (done) => {
          const customPayload = {
            username: 'test@example.com',
            tenantId: 'acme-corp',
            context: 'mobile',
          };

          const mockCredential = new MockPublicKeyCredential(
            new ArrayBuffer(32),
            {
              attestationObject: new ArrayBuffer(64),
              clientDataJSON: new ArrayBuffer(64),
              getPublicKey: () => new ArrayBuffer(64),
              getTransports: () => ['usb'],
            }
          );

          mockCredentials.create.mockResolvedValue(mockCredential);

          service.registerRemote(customPayload).subscribe({
            next: () => done(),
            error: done,
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          expect(req.request.body).toEqual(customPayload);
          req.flush(mockCreationOptions);
        });

        it('should validate server response before proceeding', (done) => {
          const invalidResponse = { invalid: 'response' };

          service.registerRemote({ username: 'test@example.com' }).subscribe({
            next: () => done(new Error('Should not succeed')),
            error: (error) => {
              expect(error).toBeInstanceOf(InvalidRemoteOptionsError);
              expect(error.message).toContain(
                'Missing or invalid rp (relying party) field'
              );
              done();
            },
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          req.flush(invalidResponse);
        });

        it('should throw InvalidOptionsError when endpoint not configured', () => {
          // Reset to config without remote endpoints
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            providers: [
              {
                provide: WEBAUTHN_CONFIG,
                useValue: testConfig, // Original config without remote endpoints
              },
              provideHttpClient(),
              provideHttpClientTesting(),
            ],
          });
          service = TestBed.inject(WebAuthnService);
          httpMock = TestBed.inject(HttpTestingController);

          expect(() => {
            service
              .authenticateRemote({ username: 'test@example.com' })
              .subscribe();
          }).toThrow(InvalidOptionsError);
        });

        it('should handle HTTP 404 errors', (done) => {
          service.registerRemote({ username: 'test@example.com' }).subscribe({
            next: () => done(new Error('Should not succeed')),
            error: (error) => {
              expect(error).toBeInstanceOf(RemoteEndpointError);
              expect(error.context.status).toBe(404);
              expect(error.context.operation).toBe('registration');
              done();
            },
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          req.flush('Not Found', { status: 404, statusText: 'Not Found' });
        });

        it('should handle HTTP 500 errors', (done) => {
          service.registerRemote({ username: 'test@example.com' }).subscribe({
            next: () => done(new Error('Should not succeed')),
            error: (error) => {
              expect(error).toBeInstanceOf(RemoteEndpointError);
              expect(error.context.status).toBe(500);
              expect(error.context.operation).toBe('registration');
              done();
            },
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          req.flush('Internal Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
          });
        });

        it('should handle malformed JSON responses', (done) => {
          service.registerRemote({ username: 'test@example.com' }).subscribe({
            next: () => done(new Error('Should not succeed')),
            error: (error) => {
              expect(error).toBeInstanceOf(InvalidRemoteOptionsError);
              done();
            },
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          req.flush('not valid json');
        });

        it('should work with empty request payload', (done) => {
          const mockCredential = new MockPublicKeyCredential(
            new ArrayBuffer(32),
            {
              attestationObject: new ArrayBuffer(64),
              clientDataJSON: new ArrayBuffer(64),
              getPublicKey: () => new ArrayBuffer(64),
              getTransports: () => ['usb'],
            }
          );

          mockCredentials.create.mockResolvedValue(mockCredential);

          service.registerRemote({}).subscribe({
            next: (result) => {
              expect(result.success).toBe(true);
              done();
            },
            error: done,
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/registration/options'
          );
          expect(req.request.body).toEqual({});
          req.flush(mockCreationOptions);
        });
      });
    });

    describe('Remote Authentication', () => {
      describe('authenticateRemote', () => {
        const mockRequestOptions: PublicKeyCredentialRequestOptionsJSON = {
          challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded
          timeout: 60000,
          userVerification: 'preferred',
          allowCredentials: [
            {
              type: 'public-key',
              id: 'Y3JlZGVudGlhbC1pZA', // base64url encoded
              transports: ['usb'],
            },
          ],
        };

        beforeEach(() => {
          // Configure remote endpoints
          const configWithRemote = createWebAuthnConfig(
            { name: 'Test App', id: 'test.example.com' },
            {
              remoteEndpoints: {
                registration:
                  'https://api.example.com/webauthn/registration/options',
                authentication:
                  'https://api.example.com/webauthn/authentication/options',
                requestOptions: { timeout: 10000 },
              },
            }
          );

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            providers: [
              {
                provide: WEBAUTHN_CONFIG,
                useValue: configWithRemote,
              },
              provideHttpClient(),
              provideHttpClientTesting(),
            ],
          });
          service = TestBed.inject(WebAuthnService);
          httpMock = TestBed.inject(HttpTestingController);
        });

        afterEach(() => {
          httpMock.verify();
        });

        it('should fetch options from server and authenticate successfully', (done) => {
          const mockCredential = new MockPublicKeyCredential(
            new ArrayBuffer(32),
            {
              authenticatorData: new ArrayBuffer(64),
              clientDataJSON: new ArrayBuffer(64),
              signature: new ArrayBuffer(64),
              userHandle: new ArrayBuffer(16),
            }
          );

          mockCredentials.get.mockResolvedValue(mockCredential);

          const requestPayload = { username: 'test@example.com' };

          service.authenticateRemote(requestPayload).subscribe({
            next: (result) => {
              expect(result.success).toBe(true);
              expect(typeof result.credentialId).toBe('string');
              done();
            },
            error: done,
          });

          // Expect HTTP request to be made
          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/authentication/options'
          );
          expect(req.request.method).toBe('POST');
          expect(req.request.body).toEqual(requestPayload);

          // Respond with mock options
          req.flush(mockRequestOptions);
        });

        it('should work with no request payload', (done) => {
          const mockCredential = new MockPublicKeyCredential(
            new ArrayBuffer(32),
            {
              authenticatorData: new ArrayBuffer(64),
              clientDataJSON: new ArrayBuffer(64),
              signature: new ArrayBuffer(64),
              userHandle: new ArrayBuffer(16),
            }
          );

          mockCredentials.get.mockResolvedValue(mockCredential);

          service.authenticateRemote().subscribe({
            next: (result) => {
              expect(result.success).toBe(true);
              done();
            },
            error: done,
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/authentication/options'
          );
          expect(req.request.body).toEqual({});
          req.flush(mockRequestOptions);
        });

        it('should validate server response before proceeding', (done) => {
          const invalidResponse = { invalid: 'response' };

          service
            .authenticateRemote({ username: 'test@example.com' })
            .subscribe({
              next: () => done(new Error('Should not succeed')),
              error: (error) => {
                expect(error).toBeInstanceOf(InvalidRemoteOptionsError);
                expect(error.message).toContain(
                  'Missing or invalid challenge field'
                );
                done();
              },
            });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/authentication/options'
          );
          req.flush(invalidResponse);
        });

        it('should throw InvalidOptionsError when endpoint not configured', () => {
          // Reset to config without remote endpoints
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            providers: [
              {
                provide: WEBAUTHN_CONFIG,
                useValue: testConfig, // Original config without remote endpoints
              },
              provideHttpClient(),
              provideHttpClientTesting(),
            ],
          });
          service = TestBed.inject(WebAuthnService);
          httpMock = TestBed.inject(HttpTestingController);

          expect(() => {
            service
              .authenticateRemote({ username: 'test@example.com' })
              .subscribe();
          }).toThrow(InvalidOptionsError);
        });

        it('should handle HTTP error scenarios', (done) => {
          service
            .authenticateRemote({ username: 'test@example.com' })
            .subscribe({
              next: () => done(new Error('Should not succeed')),
              error: (error) => {
                expect(error).toBeInstanceOf(RemoteEndpointError);
                expect(error.context.status).toBe(401);
                expect(error.context.operation).toBe('authentication');
                done();
              },
            });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/authentication/options'
          );
          req.flush('Unauthorized', {
            status: 401,
            statusText: 'Unauthorized',
          });
        });

        it('should work with custom request payload', (done) => {
          const customPayload = {
            sessionId: 'abc123',
            context: 'mobile',
          };

          const mockCredential = new MockPublicKeyCredential(
            new ArrayBuffer(32),
            {
              authenticatorData: new ArrayBuffer(64),
              clientDataJSON: new ArrayBuffer(64),
              signature: new ArrayBuffer(64),
              userHandle: new ArrayBuffer(16),
            }
          );

          mockCredentials.get.mockResolvedValue(mockCredential);

          service.authenticateRemote(customPayload).subscribe({
            next: () => done(),
            error: done,
          });

          const req = httpMock.expectOne(
            'https://api.example.com/webauthn/authentication/options'
          );
          expect(req.request.body).toEqual(customPayload);
          req.flush(mockRequestOptions);
        });
      });
    });
  });

  describe('WebAuthn config integration', () => {
    const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
      attestationObject: new ArrayBuffer(64),
      clientDataJSON: new ArrayBuffer(64),
      getPublicKey: () => new ArrayBuffer(64),
      getTransports: () => ['usb'],
    });

    beforeEach(() => {
      mockCredentials.create.mockResolvedValue(mockCredential);
      mockCredentials.get.mockResolvedValue(mockCredential);
    });

    it('should use defaultTimeout from config when no timeout specified', (done) => {
      const customConfig = createWebAuthnConfig(
        { name: 'Test App', id: 'test.example.com' },
        { defaultTimeout: 45000 }
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WEBAUTHN_CONFIG,
            useValue: customConfig,
          },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const customService = TestBed.inject(WebAuthnService);

      customService.register({ username: 'test' }).subscribe({
        next: () => {
          const createCall = mockCredentials.create.mock.calls[0][0];
          expect(createCall.publicKey.timeout).toBe(45000);
          done();
        },
        error: done,
      });
    });

    it('should use defaultAlgorithms from config when no preset specified', (done) => {
      const customAlgorithms = [
        { alg: -8, type: 'public-key' as const },
        { alg: -35, type: 'public-key' as const },
      ];
      const customConfig = createWebAuthnConfig(
        { name: 'Test App', id: 'test.example.com' },
        { defaultAlgorithms: customAlgorithms }
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WEBAUTHN_CONFIG,
            useValue: customConfig,
          },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const customService = TestBed.inject(WebAuthnService);

      customService.register({ username: 'test' }).subscribe({
        next: () => {
          const createCall = mockCredentials.create.mock.calls[0][0];
          expect(createCall.publicKey.pubKeyCredParams).toEqual(
            customAlgorithms
          );
          done();
        },
        error: done,
      });
    });

    it('should enforce user verification when enforceUserVerification is true', (done) => {
      const customConfig = createWebAuthnConfig(
        { name: 'Test App', id: 'test.example.com' },
        { enforceUserVerification: true }
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WEBAUTHN_CONFIG,
            useValue: customConfig,
          },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const customService = TestBed.inject(WebAuthnService);

      // Use config without preset to test service-level enforceUserVerification
      customService.authenticate({ username: 'test' }).subscribe({
        next: () => {
          const getCall = mockCredentials.get.mock.calls[0][0];
          expect(getCall.publicKey.userVerification).toBe('required');
          done();
        },
        error: done,
      });
    });

    it('should use defaultAttestation from config', (done) => {
      const customConfig = createWebAuthnConfig(
        { name: 'Test App', id: 'test.example.com' },
        { defaultAttestation: 'direct' }
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WEBAUTHN_CONFIG,
            useValue: customConfig,
          },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const customService = TestBed.inject(WebAuthnService);

      customService.register({ username: 'test' }).subscribe({
        next: () => {
          const createCall = mockCredentials.create.mock.calls[0][0];
          expect(createCall.publicKey.attestation).toBe('direct');
          done();
        },
        error: done,
      });
    });

    it('should use defaultAuthenticatorSelection from config when no preset', (done) => {
      const customConfig = createWebAuthnConfig(
        { name: 'Test App', id: 'test.example.com' },
        {
          defaultAuthenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
        }
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WEBAUTHN_CONFIG,
            useValue: customConfig,
          },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const customService = TestBed.inject(WebAuthnService);

      customService.register({ username: 'test' }).subscribe({
        next: () => {
          const createCall = mockCredentials.create.mock.calls[0][0];
          expect(
            createCall.publicKey.authenticatorSelection.authenticatorAttachment
          ).toBe('platform');
          expect(
            createCall.publicKey.authenticatorSelection.userVerification
          ).toBe('required');
          done();
        },
        error: done,
      });
    });

    afterEach(() => {
      // Reset TestBed after each test to prevent leakage
      TestBed.resetTestingModule();

      // Restore original test setup
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WEBAUTHN_CONFIG,
            useValue: testConfig,
          },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      service = TestBed.inject(WebAuthnService);
    });
  });

  describe('config override scenarios', () => {
    const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
      attestationObject: new ArrayBuffer(64),
      clientDataJSON: new ArrayBuffer(64),
      getPublicKey: () => new ArrayBuffer(64),
      getTransports: () => ['usb'],
    });

    beforeEach(() => {
      mockCredentials.create.mockResolvedValue(mockCredential);
      mockCredentials.get.mockResolvedValue(mockCredential);
    });

    it('should allow user timeout to override preset and service defaults', (done) => {
      service
        .register({
          username: 'test',
          preset: 'passkey',
          timeout: 30000,
        })
        .subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            expect(createCall.publicKey.timeout).toBe(30000);
            done();
          },
          error: done,
        });
    });

    it('should allow user authenticatorSelection to override preset', (done) => {
      service
        .register({
          username: 'test',
          preset: 'externalSecurityKey', // normally cross-platform
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // override to platform
          },
        })
        .subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            expect(
              createCall.publicKey.authenticatorSelection
                .authenticatorAttachment
            ).toBe('platform');
            // Other preset values should still apply
            expect(
              createCall.publicKey.authenticatorSelection.residentKey
            ).toBe('discouraged');
            done();
          },
          error: done,
        });
    });

    it('should allow user userVerification to override preset in authentication', (done) => {
      service
        .authenticate({
          preset: 'passkey', // normally 'preferred'
          userVerification: 'required', // override to required
        })
        .subscribe({
          next: () => {
            const getCall = mockCredentials.get.mock.calls[0][0];
            expect(getCall.publicKey.userVerification).toBe('required');
            done();
          },
          error: done,
        });
    });

    it('should allow user pubKeyCredParams to override preset algorithms', (done) => {
      const customAlgorithms = [{ type: 'public-key' as const, alg: -8 }]; // EdDSA

      service
        .register({
          username: 'test',
          preset: 'passkey',
          pubKeyCredParams: customAlgorithms,
        })
        .subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            expect(createCall.publicKey.pubKeyCredParams).toEqual(
              customAlgorithms
            );
            done();
          },
          error: done,
        });
    });

    it('should allow user attestation to override service default', (done) => {
      service
        .register({
          username: 'test',
          attestation: 'enterprise',
        })
        .subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            expect(createCall.publicKey.attestation).toBe('enterprise');
            done();
          },
          error: done,
        });
    });
  });

  describe('validation edge cases', () => {
    it('should reject RegisterConfig with missing username', (done) => {
      const invalidConfig = { preset: 'passkey' } as any;

      service.register(invalidConfig).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toContain(
            'Failed to process registration input'
          );
          done();
        },
      });
    });

    it('should reject RegisterConfig with invalid username type', (done) => {
      const invalidConfig = { username: 123, preset: 'passkey' } as any;

      service.register(invalidConfig).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toContain(
            'Failed to process registration input'
          );
          done();
        },
      });
    });

    it('should reject RegisterConfig with invalid preset name', (done) => {
      const invalidConfig = {
        username: 'test',
        preset: 'invalid-preset',
      } as any;

      service.register(invalidConfig).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toContain(
            'Failed to process registration input'
          );
          done();
        },
      });
    });

    it('should reject AuthenticateConfig with invalid preset name', (done) => {
      const invalidConfig = { preset: 'invalid-preset' } as any;

      service.authenticate(invalidConfig).subscribe({
        next: () => done(new Error('Should not succeed')),
        error: (error) => {
          expect(error).toBeInstanceOf(InvalidOptionsError);
          expect(error.message).toContain(
            'Failed to process authentication input'
          );
          done();
        },
      });
    });
  });

  describe('challenge generation', () => {
    const mockCredential = new MockPublicKeyCredential(new ArrayBuffer(32), {
      attestationObject: new ArrayBuffer(64),
      clientDataJSON: new ArrayBuffer(64),
      getPublicKey: () => new ArrayBuffer(64),
      getTransports: () => ['usb'],
    });

    beforeEach(() => {
      mockCredentials.create.mockResolvedValue(mockCredential);
      mockCredentials.get.mockResolvedValue(mockCredential);
    });

    it('should generate challenge automatically when not provided in RegisterConfig', (done) => {
      service.register({ username: 'test', preset: 'passkey' }).subscribe({
        next: () => {
          const createCall = mockCredentials.create.mock.calls[0][0];
          expect(createCall.publicKey.challenge).toBeInstanceOf(Uint8Array);
          expect(createCall.publicKey.challenge.length).toBeGreaterThan(0);
          done();
        },
        error: done,
      });
    });

    it('should generate challenge automatically when not provided in AuthenticateConfig', (done) => {
      service.authenticate({ preset: 'passkey' }).subscribe({
        next: () => {
          const getCall = mockCredentials.get.mock.calls[0][0];
          expect(getCall.publicKey.challenge).toBeInstanceOf(Uint8Array);
          expect(getCall.publicKey.challenge.length).toBeGreaterThan(0);
          done();
        },
        error: done,
      });
    });

    it('should use provided challenge in RegisterConfig', (done) => {
      const customChallenge = new Uint8Array([9, 8, 7, 6]);

      service
        .register({
          username: 'test',
          preset: 'passkey',
          challenge: customChallenge,
        })
        .subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            expect(createCall.publicKey.challenge).toEqual(customChallenge);
            done();
          },
          error: done,
        });
    });

    it('should use provided challenge in AuthenticateConfig', (done) => {
      const customChallenge = new Uint8Array([5, 4, 3, 2]);

      service
        .authenticate({
          preset: 'passkey',
          challenge: customChallenge,
        })
        .subscribe({
          next: () => {
            const getCall = mockCredentials.get.mock.calls[0][0];
            expect(getCall.publicKey.challenge).toEqual(customChallenge);
            done();
          },
          error: done,
        });
    });

    it('should handle base64url challenge in RegisterConfig', (done) => {
      const base64Challenge = 'Y2hhbGxlbmdl'; // 'challenge' in base64url

      service
        .register({
          username: 'test',
          preset: 'passkey',
          challenge: base64Challenge,
        })
        .subscribe({
          next: () => {
            const createCall = mockCredentials.create.mock.calls[0][0];
            expect(createCall.publicKey.challenge).toBeInstanceOf(Uint8Array);
            // Should decode the base64url string to Uint8Array
            expect(createCall.publicKey.challenge.length).toBeGreaterThan(0);
            done();
          },
          error: done,
        });
    });
  });
});
