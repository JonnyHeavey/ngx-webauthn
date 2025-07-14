/**
 * Utility functions for remote WebAuthn option validation
 *
 * These utilities provide comprehensive validation of server responses
 * to ensure they contain valid WebAuthn options before processing.
 * All validation is done without external dependencies for minimal
 * bundle size impact.
 */

import { InvalidRemoteOptionsError } from '../errors/webauthn.errors';

/**
 * Validates that server response contains valid WebAuthn creation options.
 * Performs essential validation without external dependencies.
 *
 * @param options Response from registration endpoint
 * @throws {InvalidRemoteOptionsError} When options are invalid or incomplete
 *
 * @example
 * ```typescript
 * try {
 *   validateRemoteCreationOptions(serverResponse);
 *   // Options are valid, proceed with registration
 * } catch (error) {
 *   console.error('Invalid server response:', error.message);
 * }
 * ```
 */
export function validateRemoteCreationOptions(
  options: unknown
): asserts options is PublicKeyCredentialCreationOptionsJSON {
  if (!options || typeof options !== 'object') {
    throw new InvalidRemoteOptionsError('Response must be an object');
  }

  const opts = options as any;

  // Validate relying party (required)
  if (!opts.rp || typeof opts.rp !== 'object') {
    throw new InvalidRemoteOptionsError(
      'Missing or invalid rp (relying party) field'
    );
  }

  if (typeof opts.rp.name !== 'string' || opts.rp.name.trim() === '') {
    throw new InvalidRemoteOptionsError('rp.name must be a non-empty string');
  }

  if (opts.rp.id !== undefined && typeof opts.rp.id !== 'string') {
    throw new InvalidRemoteOptionsError('rp.id must be a string when provided');
  }

  // Validate user (required)
  if (!opts.user || typeof opts.user !== 'object') {
    throw new InvalidRemoteOptionsError('Missing or invalid user field');
  }

  if (typeof opts.user.id !== 'string' || opts.user.id.trim() === '') {
    throw new InvalidRemoteOptionsError(
      'user.id must be a non-empty base64url string'
    );
  }

  if (typeof opts.user.name !== 'string' || opts.user.name.trim() === '') {
    throw new InvalidRemoteOptionsError('user.name must be a non-empty string');
  }

  if (
    typeof opts.user.displayName !== 'string' ||
    opts.user.displayName.trim() === ''
  ) {
    throw new InvalidRemoteOptionsError(
      'user.displayName must be a non-empty string'
    );
  }

  // Validate challenge (required)
  if (
    !opts.challenge ||
    typeof opts.challenge !== 'string' ||
    opts.challenge.trim() === ''
  ) {
    throw new InvalidRemoteOptionsError(
      'Missing or invalid challenge field - must be a non-empty base64url string'
    );
  }

  // Validate pubKeyCredParams (required)
  if (!Array.isArray(opts.pubKeyCredParams)) {
    throw new InvalidRemoteOptionsError('pubKeyCredParams must be an array');
  }

  if (opts.pubKeyCredParams.length === 0) {
    throw new InvalidRemoteOptionsError('pubKeyCredParams cannot be empty');
  }

  // Validate each pubKeyCredParams entry
  for (let i = 0; i < opts.pubKeyCredParams.length; i++) {
    const param = opts.pubKeyCredParams[i];
    if (!param || typeof param !== 'object') {
      throw new InvalidRemoteOptionsError(
        `pubKeyCredParams[${i}] must be an object`
      );
    }
    if (param.type !== 'public-key') {
      throw new InvalidRemoteOptionsError(
        `pubKeyCredParams[${i}].type must be "public-key"`
      );
    }
    if (typeof param.alg !== 'number') {
      throw new InvalidRemoteOptionsError(
        `pubKeyCredParams[${i}].alg must be a number`
      );
    }
  }

  // Validate optional fields if present
  if (
    opts.timeout !== undefined &&
    (typeof opts.timeout !== 'number' || opts.timeout <= 0)
  ) {
    throw new InvalidRemoteOptionsError(
      'timeout must be a positive number when provided'
    );
  }

  if (
    opts.attestation !== undefined &&
    !['none', 'indirect', 'direct', 'enterprise'].includes(opts.attestation)
  ) {
    throw new InvalidRemoteOptionsError(
      'attestation must be one of: none, indirect, direct, enterprise'
    );
  }

  // Validate authenticatorSelection if present
  if (opts.authenticatorSelection !== undefined) {
    if (typeof opts.authenticatorSelection !== 'object') {
      throw new InvalidRemoteOptionsError(
        'authenticatorSelection must be an object when provided'
      );
    }

    const authSel = opts.authenticatorSelection;

    if (
      authSel.authenticatorAttachment !== undefined &&
      !['platform', 'cross-platform'].includes(authSel.authenticatorAttachment)
    ) {
      throw new InvalidRemoteOptionsError(
        'authenticatorAttachment must be "platform" or "cross-platform"'
      );
    }

    if (
      authSel.userVerification !== undefined &&
      !['required', 'preferred', 'discouraged'].includes(
        authSel.userVerification
      )
    ) {
      throw new InvalidRemoteOptionsError(
        'userVerification must be "required", "preferred", or "discouraged"'
      );
    }

    if (
      authSel.residentKey !== undefined &&
      !['discouraged', 'preferred', 'required'].includes(authSel.residentKey)
    ) {
      throw new InvalidRemoteOptionsError(
        'residentKey must be "discouraged", "preferred", or "required"'
      );
    }
  }

  // Validate excludeCredentials if present
  if (opts.excludeCredentials !== undefined) {
    if (!Array.isArray(opts.excludeCredentials)) {
      throw new InvalidRemoteOptionsError(
        'excludeCredentials must be an array when provided'
      );
    }

    for (let i = 0; i < opts.excludeCredentials.length; i++) {
      const cred = opts.excludeCredentials[i];
      if (!cred || typeof cred !== 'object') {
        throw new InvalidRemoteOptionsError(
          `excludeCredentials[${i}] must be an object`
        );
      }
      if (cred.type !== 'public-key') {
        throw new InvalidRemoteOptionsError(
          `excludeCredentials[${i}].type must be "public-key"`
        );
      }
      if (typeof cred.id !== 'string' || cred.id.trim() === '') {
        throw new InvalidRemoteOptionsError(
          `excludeCredentials[${i}].id must be a non-empty base64url string`
        );
      }
    }
  }
}

/**
 * Validates that server response contains valid WebAuthn request options.
 * Performs essential validation without external dependencies.
 *
 * @param options Response from authentication endpoint
 * @throws {InvalidRemoteOptionsError} When options are invalid or incomplete
 *
 * @example
 * ```typescript
 * try {
 *   validateRemoteRequestOptions(serverResponse);
 *   // Options are valid, proceed with authentication
 * } catch (error) {
 *   console.error('Invalid server response:', error.message);
 * }
 * ```
 */
export function validateRemoteRequestOptions(
  options: unknown
): asserts options is PublicKeyCredentialRequestOptionsJSON {
  if (!options || typeof options !== 'object') {
    throw new InvalidRemoteOptionsError('Response must be an object');
  }

  const opts = options as any;

  // Validate challenge (required)
  if (
    !opts.challenge ||
    typeof opts.challenge !== 'string' ||
    opts.challenge.trim() === ''
  ) {
    throw new InvalidRemoteOptionsError(
      'Missing or invalid challenge field - must be a non-empty base64url string'
    );
  }

  // Validate optional fields if present
  if (
    opts.timeout !== undefined &&
    (typeof opts.timeout !== 'number' || opts.timeout <= 0)
  ) {
    throw new InvalidRemoteOptionsError(
      'timeout must be a positive number when provided'
    );
  }

  if (
    opts.userVerification !== undefined &&
    !['required', 'preferred', 'discouraged'].includes(opts.userVerification)
  ) {
    throw new InvalidRemoteOptionsError(
      'userVerification must be "required", "preferred", or "discouraged"'
    );
  }

  // Validate allowCredentials if present
  if (opts.allowCredentials !== undefined) {
    if (!Array.isArray(opts.allowCredentials)) {
      throw new InvalidRemoteOptionsError(
        'allowCredentials must be an array when provided'
      );
    }

    for (let i = 0; i < opts.allowCredentials.length; i++) {
      const cred = opts.allowCredentials[i];
      if (!cred || typeof cred !== 'object') {
        throw new InvalidRemoteOptionsError(
          `allowCredentials[${i}] must be an object`
        );
      }
      if (cred.type !== 'public-key') {
        throw new InvalidRemoteOptionsError(
          `allowCredentials[${i}].type must be "public-key"`
        );
      }
      if (typeof cred.id !== 'string' || cred.id.trim() === '') {
        throw new InvalidRemoteOptionsError(
          `allowCredentials[${i}].id must be a non-empty base64url string`
        );
      }

      // Validate transports if present
      if (cred.transports !== undefined) {
        if (!Array.isArray(cred.transports)) {
          throw new InvalidRemoteOptionsError(
            `allowCredentials[${i}].transports must be an array when provided`
          );
        }

        const validTransports = ['usb', 'nfc', 'ble', 'internal'];
        for (let j = 0; j < cred.transports.length; j++) {
          if (!validTransports.includes(cred.transports[j])) {
            throw new InvalidRemoteOptionsError(
              `allowCredentials[${i}].transports[${j}] must be one of: ${validTransports.join(
                ', '
              )}`
            );
          }
        }
      }
    }
  }
}
