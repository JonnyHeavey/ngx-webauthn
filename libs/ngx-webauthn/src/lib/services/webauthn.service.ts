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
  FlexibleRegistrationOptions,
  FlexibleAuthenticationOptions,
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationResult,
} from '../models/webauthn.models';

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
    return !!(
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof navigator !== 'undefined' &&
      navigator.credentials &&
      typeof navigator.credentials.create === 'function' &&
      typeof navigator.credentials.get === 'function'
    );
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
        supportedTransports: this.getSupportedTransports(),
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
   * Registers a new WebAuthn credential with flexible options support
   *
   * @param options Either JSON-serializable options (with base64url strings) or native options (with ArrayBuffers)
   * @returns Observable of RegistrationResponse with clean, developer-friendly format
   *
   * @example
   * ```typescript
   * // JSON options (easy for developers)
   * const jsonOptions = {
   *   challenge: "Y2hhbGxlbmdl", // base64url string
   *   rp: { name: "My App" },
   *   user: { id: "dXNlcklk", name: "user@example.com", displayName: "User" },
   *   pubKeyCredParams: [{ type: "public-key", alg: -7 }]
   * };
   *
   * // Native options (for advanced users)
   * const nativeOptions = {
   *   challenge: new Uint8Array([...]),
   *   rp: { name: "My App" },
   *   user: { id: new Uint8Array([...]), name: "user@example.com", displayName: "User" },
   *   pubKeyCredParams: [{ type: "public-key", alg: -7 }]
   * };
   *
   * this.webAuthnService.register(jsonOptions).subscribe({
   *   next: (response) => console.log('Success!', response),
   *   error: (error) => console.error('Error:', error)
   * });
   * ```
   */
  register(
    options: FlexibleRegistrationOptions
  ): Observable<RegistrationResponse> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new UnsupportedOperationError(
            'WebAuthn is not supported in this browser'
          )
      );
    }

    try {
      const parsedOptions = this.parseRegistrationOptions(options);
      this.logDebug('Parsed registration options:', parsedOptions);

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
            'Failed to parse registration options',
            error as Error
          )
      );
    }
  }

  /**
   * Authenticates using an existing WebAuthn credential with flexible options support
   *
   * @param options Either JSON-serializable options (with base64url strings) or native options (with ArrayBuffers)
   * @returns Observable of AuthenticationResponse with clean, developer-friendly format
   *
   * @example
   * ```typescript
   * // JSON options (easy for developers)
   * const jsonOptions = {
   *   challenge: "Y2hhbGxlbmdl", // base64url string
   *   allowCredentials: [{
   *     type: "public-key",
   *     id: "Y3JlZElk" // base64url string
   *   }]
   * };
   *
   * this.webAuthnService.authenticate(jsonOptions).subscribe({
   *   next: (response) => console.log('Authenticated!', response),
   *   error: (error) => console.error('Error:', error)
   * });
   * ```
   */
  authenticate(
    options: FlexibleAuthenticationOptions
  ): Observable<AuthenticationResponse> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new UnsupportedOperationError(
            'WebAuthn is not supported in this browser'
          )
      );
    }

    try {
      const parsedOptions = this.parseAuthenticationOptions(options);
      this.logDebug('Parsed authentication options:', parsedOptions);

      return from(navigator.credentials.get({ publicKey: parsedOptions })).pipe(
        map((credential) => this.processAuthenticationResult(credential)),
        catchError((error) => this.handleWebAuthnError(error))
      );
    } catch (error) {
      return throwError(
        () =>
          new InvalidOptionsError(
            'Failed to parse authentication options',
            error as Error
          )
      );
    }
  }

  /**
   * Parses registration options, handling both JSON and native formats
   */
  private parseRegistrationOptions(
    options: FlexibleRegistrationOptions
  ): PublicKeyCredentialCreationOptions {
    if (this.isJSONOptions(options)) {
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
    options: FlexibleAuthenticationOptions
  ): PublicKeyCredentialRequestOptions {
    if (this.isJSONOptions(options)) {
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
   * Detects if options are JSON-like (base64url strings) or native (ArrayBuffers)
   */
  private isJSONOptions(options: any): boolean {
    // Simple heuristic: JSON options have string challenges, native options have ArrayBuffer challenges
    return typeof options.challenge === 'string';
  }

  /**
   * Processes the raw credential result into a clean RegistrationResponse
   */
  private processRegistrationResult(
    credential: Credential | null
  ): RegistrationResponse {
    if (!credential || !this.isPublicKeyCredential(credential)) {
      throw new AuthenticatorError('No credential returned from authenticator');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    // Extract data using the response methods
    const credentialId = this.arrayBufferToBase64url(credential.rawId);
    const transports = (response.getTransports?.() ||
      []) as AuthenticatorTransport[];

    let publicKey: string | undefined;
    try {
      const publicKeyBuffer = response.getPublicKey?.();
      if (publicKeyBuffer) {
        publicKey = this.arrayBufferToBase64url(publicKeyBuffer);
      }
    } catch {
      // Public key extraction failed - this is okay, not all algorithms are supported
      this.logDebug(
        'Public key extraction failed - algorithm may not be supported by user agent'
      );
    }

    // Create the raw response for backward compatibility
    const rawResponse: WebAuthnRegistrationResult = {
      credentialId,
      publicKey:
        publicKey ||
        this.arrayBufferToBase64url(
          response.getPublicKey?.() || new ArrayBuffer(0)
        ),
      attestationObject: this.arrayBufferToBase64url(
        response.attestationObject
      ),
      clientDataJSON: this.arrayBufferToBase64url(response.clientDataJSON),
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
    if (!credential || !this.isPublicKeyCredential(credential)) {
      throw new AuthenticatorError('No credential returned from authenticator');
    }

    const response = credential.response as AuthenticatorAssertionResponse;
    const credentialId = this.arrayBufferToBase64url(credential.rawId);

    let userHandle: string | undefined;
    if (response.userHandle) {
      userHandle = this.arrayBufferToBase64url(response.userHandle);
    }

    // Create the raw response for backward compatibility
    const rawResponse: WebAuthnAuthenticationResult = {
      credentialId,
      authenticatorData: this.arrayBufferToBase64url(
        response.authenticatorData
      ),
      clientDataJSON: this.arrayBufferToBase64url(response.clientDataJSON),
      signature: this.arrayBufferToBase64url(response.signature),
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
   * Type guard to check if credential is a PublicKeyCredential
   */
  private isPublicKeyCredential(
    credential: Credential
  ): credential is PublicKeyCredential {
    return credential.type === 'public-key';
  }

  /**
   * Enhanced error handling that maps DOMExceptions to specific error types
   */
  private handleWebAuthnError(error: any): Observable<never> {
    this.logDebug('WebAuthn error occurred:', error);

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

  /**
   * Gets supported authenticator transports for this platform
   */
  private getSupportedTransports(): AuthenticatorTransport[] {
    const transports: AuthenticatorTransport[] = ['usb', 'internal'];

    // Add NFC support for Android devices
    if (
      typeof navigator !== 'undefined' &&
      /Android/i.test(navigator.userAgent)
    ) {
      transports.push('nfc');
    }

    // Add BLE support for modern browsers with Web Bluetooth API
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      transports.push('ble');
    }

    return transports;
  }

  /**
   * Converts ArrayBuffer to base64url string
   */
  private arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Logs debug information if debug mode is enabled
   */
  private logDebug(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[WebAuthnService] ${message}`, data);
    }
  }
}
