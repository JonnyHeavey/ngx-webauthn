/**
 * Enhanced WebAuthn Service
 *
 * Provides a clean, high-level API for WebAuthn operations with:
 * - Modern inject() pattern instead of constructor DI
 * - Flexible options (JSON base64url strings OR native ArrayBuffers)
 * - Enhanced error handling with specific error types
 * - Native browser parsing functions for optimal performance
 * - Clean, developer-friendly response objects
 */

import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  WebAuthnSupport,
  RegistrationResponse,
  AuthenticationResponse,
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationResult,
} from '../models/webauthn.models';

import {
  RegisterInput,
  AuthenticateInput,
  isRegisterConfig,
  isAuthenticateConfig,
} from '../models/register-config.models';

import {
  buildCreationOptionsFromConfig,
  buildRequestOptionsFromConfig,
  validateRegisterConfig,
  validateAuthenticateConfig,
} from '../utils/preset.utils';

import {
  WebAuthnError,
  WebAuthnErrorType,
  UserCancelledError,
  AuthenticatorError,
  InvalidOptionsError,
  UnsupportedOperationError,
  SecurityError,
  TimeoutError,
} from '../errors/webauthn.errors';

import { WEBAUTHN_CONFIG } from '../config/webauthn.config';

// Import consolidated utility functions
import {
  arrayBufferToBase64url,
  getSupportedTransports,
  isJSONOptions,
  isPublicKeyCredential,
  isWebAuthnSupported,
} from '../utils/webauthn.utils';

/**
 * Enhanced Angular service for WebAuthn operations
 * Provides a clean abstraction over the WebAuthn API with RxJS observables
 * and enhanced error handling
 */
@Injectable({
  providedIn: 'root',
})
export class WebAuthnService {
  private readonly config = inject(WEBAUTHN_CONFIG);

  /**
   * Checks if WebAuthn is supported in the current browser
   */
  isSupported(): boolean {
    return isWebAuthnSupported();
  }

  /**
   * Gets comprehensive WebAuthn support information
   */
  getSupport(): Observable<WebAuthnSupport> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new UnsupportedOperationError(
            'WebAuthn is not supported in this browser'
          )
      );
    }

    return from(
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    ).pipe(
      map((isPlatformAvailable) => ({
        isSupported: true,
        isPlatformAuthenticatorAvailable: isPlatformAvailable,
        supportedTransports: getSupportedTransports(),
      })),
      catchError((error) =>
        throwError(
          () =>
            new WebAuthnError(
              WebAuthnErrorType.UNKNOWN,
              'Failed to check WebAuthn support',
              error
            )
        )
      )
    );
  }

  /**
   * Registers a new WebAuthn credential with flexible configuration support
   *
   * @param input Either a high-level RegisterConfig with presets, or direct WebAuthn creation options
   * @returns Observable of RegistrationResponse with clean, developer-friendly format
   *
   * @example
   * ```typescript
   * // Simple preset usage
   * this.webAuthnService.register({ username: 'john.doe', preset: 'passkey' });
   *
   * // Preset with overrides
   * this.webAuthnService.register({
   *   username: 'john.doe',
   *   preset: 'passkey',
   *   authenticatorSelection: { userVerification: 'required' }
   * });
   *
   * // Direct WebAuthn options (native)
   * const nativeOptions: PublicKeyCredentialCreationOptions = {
   *   challenge: new Uint8Array([...]),
   *   rp: { name: "My App" },
   *   user: { id: new Uint8Array([...]), name: "user@example.com", displayName: "User" },
   *   pubKeyCredParams: [{ type: "public-key", alg: -7 }]
   * };
   * this.webAuthnService.register(nativeOptions);
   *
   * // Direct WebAuthn options (JSON)
   * const jsonOptions: PublicKeyCredentialCreationOptionsJSON = {
   *   challenge: "Y2hhbGxlbmdl",
   *   rp: { name: "My App" },
   *   user: { id: "dXNlcklk", name: "user@example.com", displayName: "User" },
   *   pubKeyCredParams: [{ type: "public-key", alg: -7 }]
   * };
   * this.webAuthnService.register(jsonOptions);
   * ```
   */
  register(input: RegisterInput): Observable<RegistrationResponse> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new UnsupportedOperationError(
            'WebAuthn is not supported in this browser'
          )
      );
    }

    try {
      let creationOptions:
        | PublicKeyCredentialCreationOptions
        | PublicKeyCredentialCreationOptionsJSON;

      if (isRegisterConfig(input)) {
        // High-level config path: validate, resolve preset, build options
        validateRegisterConfig(input);
        creationOptions = buildCreationOptionsFromConfig(input, this.config);
      } else {
        // Direct options path: use provided options
        creationOptions = input;
      }

      const parsedOptions = this.parseRegistrationOptions(creationOptions);

      return from(
        navigator.credentials.create({ publicKey: parsedOptions })
      ).pipe(
        map((credential) => this.processRegistrationResult(credential)),
        catchError((error) => this.handleWebAuthnError(error))
      );
    } catch (error) {
      return throwError(
        () =>
          new InvalidOptionsError(
            'Failed to process registration input',
            error as Error
          )
      );
    }
  }

  /**
   * Authenticates using an existing WebAuthn credential with flexible configuration support
   *
   * @param input Either a high-level AuthenticateConfig with presets, or direct WebAuthn request options
   * @returns Observable of AuthenticationResponse with clean, developer-friendly format
   *
   * @example
   * ```typescript
   * // Simple preset usage
   * this.webAuthnService.authenticate({ preset: 'passkey' });
   *
   * // Config with credential filtering
   * this.webAuthnService.authenticate({
   *   username: 'john.doe',
   *   preset: 'secondFactor',
   *   allowCredentials: ['credential-id-1', 'credential-id-2']
   * });
   *
   * // Direct WebAuthn options (JSON)
   * const jsonOptions: PublicKeyCredentialRequestOptionsJSON = {
   *   challenge: "Y2hhbGxlbmdl",
   *   allowCredentials: [{
   *     type: "public-key",
   *     id: "Y3JlZElk"
   *   }]
   * };
   * this.webAuthnService.authenticate(jsonOptions);
   *
   * // Direct WebAuthn options (native)
   * const nativeOptions: PublicKeyCredentialRequestOptions = {
   *   challenge: new Uint8Array([...]),
   *   allowCredentials: [{
   *     type: "public-key",
   *     id: new Uint8Array([...])
   *   }]
   * };
   * this.webAuthnService.authenticate(nativeOptions);
   * ```
   */
  authenticate(input: AuthenticateInput): Observable<AuthenticationResponse> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new UnsupportedOperationError(
            'WebAuthn is not supported in this browser'
          )
      );
    }

    try {
      let requestOptions:
        | PublicKeyCredentialRequestOptions
        | PublicKeyCredentialRequestOptionsJSON;

      if (isAuthenticateConfig(input)) {
        // High-level config path: validate, resolve preset, build options
        validateAuthenticateConfig(input);
        requestOptions = buildRequestOptionsFromConfig(input, this.config);
      } else {
        // Direct options path: use provided options
        requestOptions = input;
      }

      const parsedOptions = this.parseAuthenticationOptions(requestOptions);

      return from(navigator.credentials.get({ publicKey: parsedOptions })).pipe(
        map((credential) => this.processAuthenticationResult(credential)),
        catchError((error) => this.handleWebAuthnError(error))
      );
    } catch (error) {
      return throwError(
        () =>
          new InvalidOptionsError(
            'Failed to process authentication input',
            error as Error
          )
      );
    }
  }

  /**
   * Parses registration options, handling both JSON and native formats
   */
  private parseRegistrationOptions(
    options:
      | PublicKeyCredentialCreationOptions
      | PublicKeyCredentialCreationOptionsJSON
  ): PublicKeyCredentialCreationOptions {
    if (isJSONOptions(options)) {
      // Use native browser function for JSON options
      return PublicKeyCredential.parseCreationOptionsFromJSON(
        options as PublicKeyCredentialCreationOptionsJSON
      );
    } else {
      // Options are already in native format
      return options as PublicKeyCredentialCreationOptions;
    }
  }

  /**
   * Parses authentication options, handling both JSON and native formats
   */
  private parseAuthenticationOptions(
    options:
      | PublicKeyCredentialRequestOptions
      | PublicKeyCredentialRequestOptionsJSON
  ): PublicKeyCredentialRequestOptions {
    if (isJSONOptions(options)) {
      // Use native browser function for JSON options
      return PublicKeyCredential.parseRequestOptionsFromJSON(
        options as PublicKeyCredentialRequestOptionsJSON
      );
    } else {
      // Options are already in native format
      return options as PublicKeyCredentialRequestOptions;
    }
  }

  /**
   * Processes the raw credential result into a clean RegistrationResponse
   */
  private processRegistrationResult(
    credential: Credential | null
  ): RegistrationResponse {
    if (!isPublicKeyCredential(credential)) {
      throw new AuthenticatorError('No credential returned from authenticator');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    // Extract data using the response methods
    const credentialId = arrayBufferToBase64url(credential.rawId);
    const transports = (response.getTransports?.() ||
      []) as AuthenticatorTransport[];

    let publicKey: string | undefined;
    try {
      const publicKeyBuffer = response.getPublicKey?.();
      if (publicKeyBuffer) {
        publicKey = arrayBufferToBase64url(publicKeyBuffer);
      }
    } catch {
      // Public key extraction failed - this is okay, not all algorithms are supported
    }

    // Create the raw response for backward compatibility
    const rawResponse: WebAuthnRegistrationResult = {
      credentialId,
      publicKey:
        publicKey ||
        arrayBufferToBase64url(response.getPublicKey?.() || new ArrayBuffer(0)),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      transports: transports,
    };

    return {
      success: true,
      credentialId,
      publicKey,
      transports,
      rawResponse,
    };
  }

  /**
   * Processes the raw credential result into a clean AuthenticationResponse
   */
  private processAuthenticationResult(
    credential: Credential | null
  ): AuthenticationResponse {
    if (!isPublicKeyCredential(credential)) {
      throw new AuthenticatorError('No credential returned from authenticator');
    }

    const response = credential.response as AuthenticatorAssertionResponse;
    const credentialId = arrayBufferToBase64url(credential.rawId);

    let userHandle: string | undefined;
    if (response.userHandle) {
      userHandle = arrayBufferToBase64url(response.userHandle);
    }

    // Create the raw response for backward compatibility
    const rawResponse: WebAuthnAuthenticationResult = {
      credentialId,
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      signature: arrayBufferToBase64url(response.signature),
      userHandle,
    };

    return {
      success: true,
      credentialId,
      userHandle,
      rawResponse,
    };
  }

  /**
   * Enhanced error handling that maps DOMExceptions to specific error types
   */
  private handleWebAuthnError(error: any): Observable<never> {
    // Handle DOMExceptions from WebAuthn API
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return throwError(() => new UserCancelledError(error));
        case 'InvalidStateError':
          return throwError(
            () => new AuthenticatorError('Invalid authenticator state', error)
          );
        case 'NotSupportedError':
          return throwError(
            () =>
              new UnsupportedOperationError('Operation not supported', error)
          );
        case 'SecurityError':
          return throwError(
            () => new SecurityError('Security error occurred', error)
          );
        case 'TimeoutError':
          return throwError(
            () => new TimeoutError('Operation timed out', error)
          );
        case 'EncodingError':
          return throwError(
            () => new InvalidOptionsError('Encoding error in options', error)
          );
        default:
          return throwError(
            () =>
              new WebAuthnError(
                WebAuthnErrorType.UNKNOWN,
                `Unknown WebAuthn error: ${error.message}`,
                error
              )
          );
      }
    }

    // Handle JSON parsing errors
    if (
      error instanceof TypeError &&
      (error.message.includes('parseCreationOptionsFromJSON') ||
        error.message.includes('parseRequestOptionsFromJSON'))
    ) {
      return throwError(
        () => new InvalidOptionsError('Invalid JSON options format', error)
      );
    }

    // Handle other errors
    return throwError(
      () =>
        new WebAuthnError(
          WebAuthnErrorType.UNKNOWN,
          `Unexpected error: ${error.message}`,
          error
        )
    );
  }
}
