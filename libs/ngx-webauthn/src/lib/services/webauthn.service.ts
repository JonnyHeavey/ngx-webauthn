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
} from '../model';

import { RegisterInput, AuthenticateInput } from '../model';

import { isRegisterConfig, isAuthenticateConfig } from '../utils/type-guards';

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

import { WEBAUTHN_CONFIG } from '../model/service-config';

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
   * Checks if WebAuthn is supported in the current browser environment.
   *
   * @returns True if WebAuthn is supported, false otherwise
   * @example
   * ```typescript
   * if (this.webAuthnService.isSupported()) {
   *   // Proceed with WebAuthn operations
   * } else {
   *   // Show fallback authentication method
   * }
   * ```
   */
  isSupported(): boolean {
    return isWebAuthnSupported();
  }

  /**
   * Gets detailed WebAuthn support information for the current browser.
   * Provides information about available authenticator types and capabilities.
   *
   * @returns Observable containing WebAuthn support details
   * @example
   * ```typescript
   * this.webAuthnService.getSupport().subscribe(support => {
   *   console.log('Platform authenticator:', support.platformAuthenticator);
   *   console.log('Cross-platform authenticator:', support.crossPlatformAuthenticator);
   * });
   * ```
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
   * Registers a new WebAuthn credential for a user.
   *
   * Supports two input formats:
   * 1. High-level RegisterConfig with preset support and automatic option building
   * 2. Direct PublicKeyCredentialCreationOptions for full control
   *
   * @param input Either a RegisterConfig object or raw WebAuthn creation options
   * @returns Observable containing the registration response with credential details
   *
   * @throws {UnsupportedOperationError} When WebAuthn is not supported
   * @throws {InvalidOptionsError} When provided options are invalid
   * @throws {UserCancelledError} When user cancels the registration
   * @throws {AuthenticatorError} When authenticator encounters an error
   * @throws {TimeoutError} When the operation times out
   * @throws {SecurityError} When a security violation occurs
   *
   * @example Using high-level config:
   * ```typescript
   * const config: RegisterConfig = {
   *   preset: 'passkey',
   *   user: {
   *     id: 'user123',
   *     name: 'user@example.com',
   *     displayName: 'John Doe'
   *   },
   *   challenge: 'random-challenge'
   * };
   *
   * this.webAuthnService.register(config).subscribe({
   *   next: (response) => {
   *     console.log('Registration successful:', response.credential.id);
   *   },
   *   error: (error) => {
   *     if (error instanceof UserCancelledError) {
   *       console.log('User cancelled registration');
   *     }
   *   }
   * });
   * ```
   *
   * @example Using direct options:
   * ```typescript
   * const options: PublicKeyCredentialCreationOptions = {
   *   rp: { name: "Example Corp" },
   *   user: { id: new Uint8Array([1,2,3]), name: "user@example.com", displayName: "User" },
   *   challenge: new Uint8Array([4,5,6]),
   *   pubKeyCredParams: [{ type: "public-key", alg: -7 }]
   * };
   * this.webAuthnService.register(options).subscribe(response => {
   *   // Handle response
   * });
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
   * Authenticates a user using an existing WebAuthn credential.
   *
   * Supports two input formats:
   * 1. High-level AuthenticateConfig with preset support and automatic option building
   * 2. Direct PublicKeyCredentialRequestOptions for full control
   *
   * @param input Either an AuthenticateConfig object or raw WebAuthn request options
   * @returns Observable containing the authentication response with assertion details
   *
   * @throws {UnsupportedOperationError} When WebAuthn is not supported
   * @throws {InvalidOptionsError} When provided options are invalid
   * @throws {UserCancelledError} When user cancels the authentication
   * @throws {AuthenticatorError} When authenticator encounters an error
   * @throws {TimeoutError} When the operation times out
   * @throws {SecurityError} When a security violation occurs
   *
   * @example Using high-level config:
   * ```typescript
   * const config: AuthenticateConfig = {
   *   preset: 'passkey',
   *   challenge: 'auth-challenge',
   *   allowCredentials: ['credential-id-1', 'credential-id-2']
   * };
   *
   * this.webAuthnService.authenticate(config).subscribe({
   *   next: (response) => {
   *     console.log('Authentication successful:', response.credential.id);
   *   },
   *   error: (error) => {
   *     if (error instanceof UserCancelledError) {
   *       console.log('User cancelled authentication');
   *     }
   *   }
   * });
   * ```
   *
   * @example Using direct options:
   * ```typescript
   * const options: PublicKeyCredentialRequestOptions = {
   *   challenge: new Uint8Array([1,2,3]),
   *   allowCredentials: [{ type: 'public-key', id: new Uint8Array([4,5,6]) }]
   * };
   * this.webAuthnService.authenticate(options).subscribe(response => {
   *   // Handle response
   * });
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
   * Parses and normalizes registration options from either native or JSON format.
   * Converts base64url-encoded strings to Uint8Array where necessary.
   *
   * @param options Registration options in either native or JSON format
   * @returns Normalized PublicKeyCredentialCreationOptions for browser API
   * @private
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
   * Parses and normalizes authentication options from either native or JSON format.
   * Converts base64url-encoded strings to Uint8Array where necessary.
   *
   * @param options Authentication options in either native or JSON format
   * @returns Normalized PublicKeyCredentialRequestOptions for browser API
   * @private
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
   * Validates that the credential is a valid PublicKeyCredential.
   *
   * @param credential Raw credential from navigator.credentials.create()
   * @returns Validated PublicKeyCredential
   * @throws {AuthenticatorError} When credential is invalid or null
   * @private
   */
  private validateRegistrationCredential(
    credential: Credential | null
  ): PublicKeyCredential {
    if (!isPublicKeyCredential(credential)) {
      throw new AuthenticatorError('No credential returned from authenticator');
    }
    return credential;
  }

  /**
   * Extracts basic credential information (ID and transports).
   *
   * @param credential Validated PublicKeyCredential
   * @returns Object containing credential ID and supported transports
   * @private
   */
  private extractCredentialInfo(credential: PublicKeyCredential): {
    credentialId: string;
    transports: AuthenticatorTransport[];
  } {
    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      credentialId: arrayBufferToBase64url(credential.rawId),
      transports: (response.getTransports?.() ||
        []) as AuthenticatorTransport[],
    };
  }

  /**
   * Safely extracts the public key with proper error handling.
   *
   * @param response AuthenticatorAttestationResponse
   * @returns Public key as base64url string, or undefined if extraction fails
   * @private
   */
  private extractPublicKey(
    response: AuthenticatorAttestationResponse
  ): string | undefined {
    try {
      const publicKeyBuffer = response.getPublicKey?.();
      if (publicKeyBuffer) {
        return arrayBufferToBase64url(publicKeyBuffer);
      }
    } catch {
      // Public key extraction failed - this is okay, not all algorithms are supported
      // Some authenticators or algorithms don't provide extractable public keys
    }

    return undefined;
  }

  /**
   * Creates the raw WebAuthn response for backward compatibility.
   * Handles the fallback logic for missing public key data.
   *
   * @param credential Validated PublicKeyCredential
   * @param credentialId Already extracted credential ID
   * @param publicKey Extracted public key (may be undefined)
   * @returns Complete WebAuthnRegistrationResult
   * @private
   */
  private createRawRegistrationResponse(
    credential: PublicKeyCredential,
    credentialId: string,
    publicKey: string | undefined
  ): WebAuthnRegistrationResult {
    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      credentialId,
      publicKey: publicKey || arrayBufferToBase64url(new ArrayBuffer(0)), // Clean fallback
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      transports: (response.getTransports?.() ||
        []) as AuthenticatorTransport[],
    };
  }

  /**
   * Assembles the final registration response.
   * Combines all extracted data into the final response format.
   *
   * @param credentialInfo Basic credential information
   * @param publicKey Extracted public key
   * @param rawResponse Raw WebAuthn response
   * @returns Complete RegistrationResponse
   * @private
   */
  private assembleRegistrationResponse(
    credentialInfo: {
      credentialId: string;
      transports: AuthenticatorTransport[];
    },
    publicKey: string | undefined,
    rawResponse: WebAuthnRegistrationResult
  ): RegistrationResponse {
    return {
      success: true,
      credentialId: credentialInfo.credentialId,
      publicKey,
      transports: credentialInfo.transports,
      rawResponse,
    };
  }

  /**
   * Processes the result of a WebAuthn registration operation.
   * Converts the browser credential response into a structured RegistrationResponse.
   *
   * @param credential The credential returned by navigator.credentials.create()
   * @returns Structured registration response with parsed credential data
   * @throws {AuthenticatorError} When credential creation fails or returns null
   * @private
   */
  private processRegistrationResult(
    credential: Credential | null
  ): RegistrationResponse {
    // 1. Validate input
    const validCredential = this.validateRegistrationCredential(credential);

    // 2. Extract basic information
    const credentialInfo = this.extractCredentialInfo(validCredential);

    // 3. Handle complex public key extraction
    const response =
      validCredential.response as AuthenticatorAttestationResponse;
    const publicKey = this.extractPublicKey(response);

    // 4. Create backward-compatible raw response
    const rawResponse = this.createRawRegistrationResponse(
      validCredential,
      credentialInfo.credentialId,
      publicKey
    );

    // 5. Assemble final response
    return this.assembleRegistrationResponse(
      credentialInfo,
      publicKey,
      rawResponse
    );
  }

  /**
   * Processes the result of a WebAuthn authentication operation.
   * Converts the browser credential response into a structured AuthenticationResponse.
   *
   * @param credential The credential returned by navigator.credentials.get()
   * @returns Structured authentication response with parsed assertion data
   * @throws {AuthenticatorError} When authentication fails or returns null
   * @private
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
   * Central error handling dispatcher for WebAuthn operations.
   * Routes different error types to specialized handlers for proper error classification.
   *
   * @param error The error to handle (can be DOMException, TypeError, or any other error)
   * @returns Observable that throws an appropriate WebAuthnError subclass
   * @private
   */
  private handleWebAuthnError(error: any): Observable<never> {
    if (error instanceof DOMException) {
      return this.handleDOMException(error);
    }

    if (this.isJSONParsingError(error)) {
      return this.handleJSONParsingError(error);
    }

    return this.handleUnknownError(error);
  }

  /**
   * Handles DOMExceptions from the WebAuthn API using a mapping approach.
   * Maps specific DOMException names to appropriate WebAuthnError subclasses.
   *
   * @param error The DOMException thrown by the WebAuthn API
   * @returns Observable that throws an appropriate WebAuthnError subclass
   * @private
   */
  private handleDOMException(error: DOMException): Observable<never> {
    const errorMap: Record<string, () => WebAuthnError> = {
      NotAllowedError: () => new UserCancelledError(error),
      InvalidStateError: () =>
        new AuthenticatorError('Invalid authenticator state', error),
      NotSupportedError: () =>
        new UnsupportedOperationError('Operation not supported', error),
      SecurityError: () => new SecurityError('Security error occurred', error),
      TimeoutError: () => new TimeoutError('Operation timed out', error),
      EncodingError: () =>
        new InvalidOptionsError('Encoding error in options', error),
    };

    const errorFactory = errorMap[error.name];
    const webAuthnError = errorFactory
      ? errorFactory()
      : new WebAuthnError(
          WebAuthnErrorType.UNKNOWN,
          `Unknown WebAuthn error: ${error.message}`,
          error
        );

    return throwError(() => webAuthnError);
  }

  /**
   * Determines if an error is related to JSON parsing issues.
   * Specifically checks for TypeError messages indicating JSON parsing failures.
   *
   * @param error The error to check
   * @returns True if the error is a JSON parsing error, false otherwise
   * @private
   */
  private isJSONParsingError(error: any): boolean {
    return (
      error instanceof TypeError &&
      (error.message.includes('parseCreationOptionsFromJSON') ||
        error.message.includes('parseRequestOptionsFromJSON'))
    );
  }

  /**
   * Handles JSON parsing errors specifically.
   * These errors occur when invalid JSON format options are provided.
   *
   * @param error The TypeError from JSON parsing
   * @returns Observable that throws an InvalidOptionsError
   * @private
   */
  private handleJSONParsingError(error: TypeError): Observable<never> {
    return throwError(
      () => new InvalidOptionsError('Invalid JSON options format', error)
    );
  }

  /**
   * Handles any unexpected errors that don't fall into other categories.
   * Provides a fallback for errors that aren't DOMExceptions or JSON parsing errors.
   *
   * @param error The unexpected error
   * @returns Observable that throws a generic WebAuthnError
   * @private
   */
  private handleUnknownError(error: any): Observable<never> {
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
