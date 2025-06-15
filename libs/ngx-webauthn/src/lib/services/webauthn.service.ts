import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import {
  WebAuthnRegistrationOptions,
  WebAuthnRegistrationResult,
  WebAuthnAuthenticationOptions,
  WebAuthnAuthenticationResult,
  WebAuthnSupport,
  WebAuthnError,
  WebAuthnErrorType,
} from '../models/webauthn.models';

import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  getSupportedTransports,
  generateChallenge,
  generateUserId,
  arrayBufferToBase64url,
  base64urlToArrayBuffer,
  arrayBufferToCredentialId,
  credentialIdToArrayBuffer,
  validateRegistrationOptions,
  getDefaultPubKeyCredParams,
} from '../utils/webauthn.utils';

/**
 * Angular service for WebAuthn operations
 * Provides a clean abstraction over the WebAuthn API with RxJS observables
 */
@Injectable({
  providedIn: 'root',
})
export class WebAuthnService {
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
          new WebAuthnError(
            WebAuthnErrorType.NOT_SUPPORTED,
            'WebAuthn is not supported in this browser'
          )
      );
    }

    return from(isPlatformAuthenticatorAvailable()).pipe(
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
   * Registers a new WebAuthn credential
   */
  register(
    options: WebAuthnRegistrationOptions
  ): Observable<WebAuthnRegistrationResult> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new WebAuthnError(
            WebAuthnErrorType.NOT_SUPPORTED,
            'WebAuthn is not supported in this browser'
          )
      );
    }

    try {
      const publicKeyOptions = this.buildRegistrationOptions(options);
      validateRegistrationOptions(publicKeyOptions);

      return from(
        navigator.credentials.create({ publicKey: publicKeyOptions })
      ).pipe(
        map((credential) => this.processRegistrationResult(credential)),
        catchError((error) => this.handleWebAuthnError(error))
      );
    } catch (error) {
      return throwError(
        () =>
          new WebAuthnError(
            WebAuthnErrorType.UNKNOWN,
            'Failed to prepare registration options',
            error as Error
          )
      );
    }
  }

  /**
   * Authenticates using an existing WebAuthn credential
   */
  authenticate(
    options: WebAuthnAuthenticationOptions
  ): Observable<WebAuthnAuthenticationResult> {
    if (!this.isSupported()) {
      return throwError(
        () =>
          new WebAuthnError(
            WebAuthnErrorType.NOT_SUPPORTED,
            'WebAuthn is not supported in this browser'
          )
      );
    }

    try {
      const publicKeyOptions = this.buildAuthenticationOptions(options);

      return from(
        navigator.credentials.get({ publicKey: publicKeyOptions })
      ).pipe(
        map((credential) => this.processAuthenticationResult(credential)),
        catchError((error) => this.handleWebAuthnError(error))
      );
    } catch (error) {
      return throwError(
        () =>
          new WebAuthnError(
            WebAuthnErrorType.UNKNOWN,
            'Failed to prepare authentication options',
            error as Error
          )
      );
    }
  }

  /**
   * Builds PublicKeyCredentialCreationOptions from our simplified options
   */
  private buildRegistrationOptions(
    options: WebAuthnRegistrationOptions
  ): PublicKeyCredentialCreationOptions {
    const challenge = options.challenge
      ? base64urlToArrayBuffer(options.challenge)
      : generateChallenge();

    const userId = base64urlToArrayBuffer(options.user.id) || generateUserId();

    const excludeCredentials: PublicKeyCredentialDescriptor[] =
      options.excludeCredentials?.map((credId) => ({
        type: 'public-key',
        id: credentialIdToArrayBuffer(credId),
        transports: getSupportedTransports(),
      })) || [];

    return {
      challenge,
      rp: {
        name: options.relyingParty.name,
        id: options.relyingParty.id,
      },
      user: {
        id: userId,
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams: getDefaultPubKeyCredParams(),
      timeout: options.timeout || 60000,
      attestation: options.attestation || 'none',
      authenticatorSelection: options.authenticatorSelection || {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      excludeCredentials,
    };
  }

  /**
   * Builds PublicKeyCredentialRequestOptions from our simplified options
   */
  private buildAuthenticationOptions(
    options: WebAuthnAuthenticationOptions
  ): PublicKeyCredentialRequestOptions {
    const challenge = options.challenge
      ? base64urlToArrayBuffer(options.challenge)
      : generateChallenge();

    const allowCredentials: PublicKeyCredentialDescriptor[] =
      options.allowCredentials?.map((credId) => ({
        type: 'public-key',
        id: credentialIdToArrayBuffer(credId),
        transports: getSupportedTransports(),
      })) || [];

    return {
      challenge,
      timeout: options.timeout || 60000,
      userVerification: options.userVerification || 'preferred',
      allowCredentials:
        allowCredentials.length > 0 ? allowCredentials : undefined,
    };
  }

  /**
   * Processes the registration result from the WebAuthn API
   */
  private processRegistrationResult(
    credential: Credential | null
  ): WebAuthnRegistrationResult {
    if (!credential || !this.isPublicKeyCredential(credential)) {
      throw new WebAuthnError(
        WebAuthnErrorType.INVALID_STATE,
        'Invalid credential received from registration'
      );
    }

    const response = (credential as PublicKeyCredential)
      .response as AuthenticatorAttestationResponse;

    if (!response.attestationObject || !response.clientDataJSON) {
      throw new WebAuthnError(
        WebAuthnErrorType.INVALID_STATE,
        'Missing required data in registration response'
      );
    }

    const transports =
      (response.getTransports?.() as AuthenticatorTransport[]) || [];

    return {
      credentialId: arrayBufferToCredentialId(
        (credential as PublicKeyCredential).rawId
      ),
      publicKey: arrayBufferToBase64url(
        response.getPublicKey() || new ArrayBuffer(0)
      ),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      transports,
    };
  }

  /**
   * Processes the authentication result from the WebAuthn API
   */
  private processAuthenticationResult(
    credential: Credential | null
  ): WebAuthnAuthenticationResult {
    if (!credential || !this.isPublicKeyCredential(credential)) {
      throw new WebAuthnError(
        WebAuthnErrorType.INVALID_STATE,
        'Invalid credential received from authentication'
      );
    }

    const response = (credential as PublicKeyCredential)
      .response as AuthenticatorAssertionResponse;

    if (
      !response.authenticatorData ||
      !response.clientDataJSON ||
      !response.signature
    ) {
      throw new WebAuthnError(
        WebAuthnErrorType.INVALID_STATE,
        'Missing required data in authentication response'
      );
    }

    return {
      credentialId: arrayBufferToCredentialId(
        (credential as PublicKeyCredential).rawId
      ),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle
        ? arrayBufferToBase64url(response.userHandle)
        : undefined,
    };
  }

  /**
   * Checks if a credential is a PublicKeyCredential (or mock equivalent)
   */
  private isPublicKeyCredential(
    credential: any
  ): credential is PublicKeyCredential {
    return (
      credential &&
      typeof credential.rawId !== 'undefined' &&
      typeof credential.response !== 'undefined'
    );
  }

  /**
   * Handles WebAuthn errors and converts them to our custom error types
   */
  private handleWebAuthnError(error: any): Observable<never> {
    if (error instanceof DOMException) {
      return throwError(() => WebAuthnError.fromDOMException(error));
    }

    if (error instanceof WebAuthnError) {
      return throwError(() => error);
    }

    return throwError(
      () =>
        new WebAuthnError(
          WebAuthnErrorType.UNKNOWN,
          error?.message || 'Unknown WebAuthn error occurred',
          error
        )
    );
  }
}
