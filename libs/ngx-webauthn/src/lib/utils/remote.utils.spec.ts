/**
 * Tests for remote WebAuthn validation utilities
 */

import {
  validateRemoteCreationOptions,
  validateRemoteRequestOptions,
} from './remote.utils';
import { InvalidRemoteOptionsError } from '../errors/webauthn.errors';

describe('Remote Utils', () => {
  describe('validateRemoteCreationOptions', () => {
    const validCreationOptions: PublicKeyCredentialCreationOptionsJSON = {
      rp: {
        name: 'Test App',
        id: 'test.example.com',
      },
      user: {
        id: 'dGVzdC11c2VyLWlk', // base64url encoded
        name: 'test@example.com',
        displayName: 'Test User',
      },
      challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      excludeCredentials: [
        {
          type: 'public-key',
          id: 'Y3JlZGVudGlhbC1pZA', // base64url encoded
          transports: ['usb', 'nfc'],
        },
      ],
    };

    it('should pass with valid creation options', () => {
      expect(() =>
        validateRemoteCreationOptions(validCreationOptions)
      ).not.toThrow();
    });

    it('should pass with minimal valid options', () => {
      const minimalOptions = {
        rp: { name: 'Test App' },
        user: {
          id: 'dGVzdA', // base64url
          name: 'test@example.com',
          displayName: 'Test User',
        },
        challenge: 'Y2hhbGxlbmdl', // base64url
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      };

      expect(() => validateRemoteCreationOptions(minimalOptions)).not.toThrow();
    });

    describe('input validation', () => {
      it('should reject null input', () => {
        expect(() => validateRemoteCreationOptions(null)).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });

      it('should reject undefined input', () => {
        expect(() => validateRemoteCreationOptions(undefined)).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });

      it('should reject non-object input', () => {
        expect(() => validateRemoteCreationOptions('string')).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });

      it('should reject array input', () => {
        expect(() => validateRemoteCreationOptions([])).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });
    });

    describe('rp field validation', () => {
      it('should reject missing rp field', () => {
        const options = { ...validCreationOptions };
        delete (options as any).rp;

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid rp (relying party) field'
          )
        );
      });

      it('should reject null rp field', () => {
        const options = { ...validCreationOptions, rp: null };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid rp (relying party) field'
          )
        );
      });

      it('should reject invalid rp.name', () => {
        const options = { ...validCreationOptions, rp: { name: '' } };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('rp.name must be a non-empty string')
        );
      });

      it('should reject non-string rp.name', () => {
        const options = { ...validCreationOptions, rp: { name: 123 } };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('rp.name must be a non-empty string')
        );
      });

      it('should reject non-string rp.id when provided', () => {
        const options = {
          ...validCreationOptions,
          rp: { name: 'Test', id: 123 },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('rp.id must be a string when provided')
        );
      });

      it('should allow undefined rp.id', () => {
        const options = { ...validCreationOptions, rp: { name: 'Test App' } };

        expect(() => validateRemoteCreationOptions(options)).not.toThrow();
      });
    });

    describe('user field validation', () => {
      it('should reject missing user field', () => {
        const options = { ...validCreationOptions };
        delete (options as any).user;

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('Missing or invalid user field')
        );
      });

      it('should reject null user field', () => {
        const options = { ...validCreationOptions, user: null };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('Missing or invalid user field')
        );
      });

      it('should reject empty user.id', () => {
        const options = {
          ...validCreationOptions,
          user: { ...validCreationOptions.user, id: '' },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'user.id must be a non-empty base64url string'
          )
        );
      });

      it('should reject non-string user.id', () => {
        const options = {
          ...validCreationOptions,
          user: { ...validCreationOptions.user, id: 123 },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'user.id must be a non-empty base64url string'
          )
        );
      });

      it('should reject empty user.name', () => {
        const options = {
          ...validCreationOptions,
          user: { ...validCreationOptions.user, name: '' },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('user.name must be a non-empty string')
        );
      });

      it('should reject non-string user.name', () => {
        const options = {
          ...validCreationOptions,
          user: { ...validCreationOptions.user, name: 123 },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('user.name must be a non-empty string')
        );
      });

      it('should reject empty user.displayName', () => {
        const options = {
          ...validCreationOptions,
          user: { ...validCreationOptions.user, displayName: '' },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'user.displayName must be a non-empty string'
          )
        );
      });

      it('should reject non-string user.displayName', () => {
        const options = {
          ...validCreationOptions,
          user: { ...validCreationOptions.user, displayName: 123 },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'user.displayName must be a non-empty string'
          )
        );
      });
    });

    describe('challenge field validation', () => {
      it('should reject missing challenge', () => {
        const options = { ...validCreationOptions };
        delete (options as any).challenge;

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid challenge field - must be a non-empty base64url string'
          )
        );
      });

      it('should reject empty challenge', () => {
        const options = { ...validCreationOptions, challenge: '' };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid challenge field - must be a non-empty base64url string'
          )
        );
      });

      it('should reject non-string challenge', () => {
        const options = { ...validCreationOptions, challenge: 123 };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid challenge field - must be a non-empty base64url string'
          )
        );
      });
    });

    describe('pubKeyCredParams validation', () => {
      it('should reject missing pubKeyCredParams', () => {
        const options = { ...validCreationOptions };
        delete (options as any).pubKeyCredParams;

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('pubKeyCredParams must be an array')
        );
      });

      it('should reject non-array pubKeyCredParams', () => {
        const options = {
          ...validCreationOptions,
          pubKeyCredParams: 'not-array',
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('pubKeyCredParams must be an array')
        );
      });

      it('should reject empty pubKeyCredParams array', () => {
        const options = { ...validCreationOptions, pubKeyCredParams: [] };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('pubKeyCredParams cannot be empty')
        );
      });

      it('should reject invalid pubKeyCredParams entry object', () => {
        const options = { ...validCreationOptions, pubKeyCredParams: [null] };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError('pubKeyCredParams[0] must be an object')
        );
      });

      it('should reject invalid pubKeyCredParams type', () => {
        const options = {
          ...validCreationOptions,
          pubKeyCredParams: [{ type: 'invalid', alg: -7 }],
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'pubKeyCredParams[0].type must be "public-key"'
          )
        );
      });

      it('should reject invalid pubKeyCredParams alg', () => {
        const options = {
          ...validCreationOptions,
          pubKeyCredParams: [{ type: 'public-key', alg: 'invalid' }],
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'pubKeyCredParams[0].alg must be a number'
          )
        );
      });
    });

    describe('optional fields validation', () => {
      it('should reject invalid timeout', () => {
        const options = { ...validCreationOptions, timeout: -1 };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'timeout must be a positive number when provided'
          )
        );
      });

      it('should reject non-number timeout', () => {
        const options = { ...validCreationOptions, timeout: 'invalid' };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'timeout must be a positive number when provided'
          )
        );
      });

      it('should reject invalid attestation', () => {
        const options = { ...validCreationOptions, attestation: 'invalid' };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'attestation must be one of: none, indirect, direct, enterprise'
          )
        );
      });

      it('should accept valid attestation values', () => {
        ['none', 'indirect', 'direct', 'enterprise'].forEach((attestation) => {
          const options = { ...validCreationOptions, attestation };
          expect(() => validateRemoteCreationOptions(options)).not.toThrow();
        });
      });
    });

    describe('authenticatorSelection validation', () => {
      it('should reject non-object authenticatorSelection', () => {
        const options = {
          ...validCreationOptions,
          authenticatorSelection: 'invalid',
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'authenticatorSelection must be an object when provided'
          )
        );
      });

      it('should reject invalid authenticatorAttachment', () => {
        const options = {
          ...validCreationOptions,
          authenticatorSelection: { authenticatorAttachment: 'invalid' },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'authenticatorAttachment must be "platform" or "cross-platform"'
          )
        );
      });

      it('should accept valid authenticatorAttachment values', () => {
        ['platform', 'cross-platform'].forEach((authenticatorAttachment) => {
          const options = {
            ...validCreationOptions,
            authenticatorSelection: { authenticatorAttachment },
          };
          expect(() => validateRemoteCreationOptions(options)).not.toThrow();
        });
      });

      it('should reject invalid userVerification', () => {
        const options = {
          ...validCreationOptions,
          authenticatorSelection: { userVerification: 'invalid' },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'userVerification must be "required", "preferred", or "discouraged"'
          )
        );
      });

      it('should accept valid userVerification values', () => {
        ['required', 'preferred', 'discouraged'].forEach((userVerification) => {
          const options = {
            ...validCreationOptions,
            authenticatorSelection: { userVerification },
          };
          expect(() => validateRemoteCreationOptions(options)).not.toThrow();
        });
      });

      it('should reject invalid residentKey', () => {
        const options = {
          ...validCreationOptions,
          authenticatorSelection: { residentKey: 'invalid' },
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'residentKey must be "discouraged", "preferred", or "required"'
          )
        );
      });

      it('should accept valid residentKey values', () => {
        ['discouraged', 'preferred', 'required'].forEach((residentKey) => {
          const options = {
            ...validCreationOptions,
            authenticatorSelection: { residentKey },
          };
          expect(() => validateRemoteCreationOptions(options)).not.toThrow();
        });
      });
    });

    describe('excludeCredentials validation', () => {
      it('should reject non-array excludeCredentials', () => {
        const options = {
          ...validCreationOptions,
          excludeCredentials: 'invalid',
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'excludeCredentials must be an array when provided'
          )
        );
      });

      it('should reject invalid excludeCredentials entry', () => {
        const options = { ...validCreationOptions, excludeCredentials: [null] };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'excludeCredentials[0] must be an object'
          )
        );
      });

      it('should reject invalid excludeCredentials type', () => {
        const options = {
          ...validCreationOptions,
          excludeCredentials: [{ type: 'invalid', id: 'test' }],
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'excludeCredentials[0].type must be "public-key"'
          )
        );
      });

      it('should reject invalid excludeCredentials id', () => {
        const options = {
          ...validCreationOptions,
          excludeCredentials: [{ type: 'public-key', id: '' }],
        };

        expect(() => validateRemoteCreationOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'excludeCredentials[0].id must be a non-empty base64url string'
          )
        );
      });

      it('should allow empty excludeCredentials array', () => {
        const options = { ...validCreationOptions, excludeCredentials: [] };

        expect(() => validateRemoteCreationOptions(options)).not.toThrow();
      });
    });
  });

  describe('validateRemoteRequestOptions', () => {
    const validRequestOptions: PublicKeyCredentialRequestOptionsJSON = {
      challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: [
        {
          type: 'public-key',
          id: 'Y3JlZGVudGlhbC1pZA', // base64url encoded
          transports: ['usb', 'nfc'],
        },
      ],
    };

    it('should pass with valid request options', () => {
      expect(() =>
        validateRemoteRequestOptions(validRequestOptions)
      ).not.toThrow();
    });

    it('should pass with minimal valid options', () => {
      const minimalOptions = {
        challenge: 'Y2hhbGxlbmdl', // base64url
      };

      expect(() => validateRemoteRequestOptions(minimalOptions)).not.toThrow();
    });

    describe('input validation', () => {
      it('should reject null input', () => {
        expect(() => validateRemoteRequestOptions(null)).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });

      it('should reject undefined input', () => {
        expect(() => validateRemoteRequestOptions(undefined)).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });

      it('should reject non-object input', () => {
        expect(() => validateRemoteRequestOptions('string')).toThrow(
          new InvalidRemoteOptionsError('Response must be an object')
        );
      });
    });

    describe('challenge field validation', () => {
      it('should reject missing challenge', () => {
        const options = { ...validRequestOptions };
        delete (options as any).challenge;

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid challenge field - must be a non-empty base64url string'
          )
        );
      });

      it('should reject empty challenge', () => {
        const options = { ...validRequestOptions, challenge: '' };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid challenge field - must be a non-empty base64url string'
          )
        );
      });

      it('should reject non-string challenge', () => {
        const options = { ...validRequestOptions, challenge: 123 };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'Missing or invalid challenge field - must be a non-empty base64url string'
          )
        );
      });
    });

    describe('optional fields validation', () => {
      it('should reject invalid timeout', () => {
        const options = { ...validRequestOptions, timeout: -1 };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'timeout must be a positive number when provided'
          )
        );
      });

      it('should reject invalid userVerification', () => {
        const options = { ...validRequestOptions, userVerification: 'invalid' };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'userVerification must be "required", "preferred", or "discouraged"'
          )
        );
      });

      it('should accept valid userVerification values', () => {
        ['required', 'preferred', 'discouraged'].forEach((userVerification) => {
          const options = { ...validRequestOptions, userVerification };
          expect(() => validateRemoteRequestOptions(options)).not.toThrow();
        });
      });

      it('should allow undefined optional fields', () => {
        const options = { challenge: 'Y2hhbGxlbmdl' };
        expect(() => validateRemoteRequestOptions(options)).not.toThrow();
      });
    });

    describe('allowCredentials validation', () => {
      it('should reject non-array allowCredentials', () => {
        const options = { ...validRequestOptions, allowCredentials: 'invalid' };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'allowCredentials must be an array when provided'
          )
        );
      });

      it('should reject invalid allowCredentials entry', () => {
        const options = { ...validRequestOptions, allowCredentials: [null] };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError('allowCredentials[0] must be an object')
        );
      });

      it('should reject invalid allowCredentials type', () => {
        const options = {
          ...validRequestOptions,
          allowCredentials: [{ type: 'invalid', id: 'test' }],
        };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'allowCredentials[0].type must be "public-key"'
          )
        );
      });

      it('should reject invalid allowCredentials id', () => {
        const options = {
          ...validRequestOptions,
          allowCredentials: [{ type: 'public-key', id: '' }],
        };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'allowCredentials[0].id must be a non-empty base64url string'
          )
        );
      });

      it('should reject invalid transports array', () => {
        const options = {
          ...validRequestOptions,
          allowCredentials: [
            { type: 'public-key', id: 'test', transports: 'invalid' },
          ],
        };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'allowCredentials[0].transports must be an array when provided'
          )
        );
      });

      it('should reject invalid transport values', () => {
        const options = {
          ...validRequestOptions,
          allowCredentials: [
            { type: 'public-key', id: 'test', transports: ['invalid'] },
          ],
        };

        expect(() => validateRemoteRequestOptions(options)).toThrow(
          new InvalidRemoteOptionsError(
            'allowCredentials[0].transports[0] must be one of: usb, nfc, ble, internal'
          )
        );
      });

      it('should accept valid transport values', () => {
        ['usb', 'nfc', 'ble', 'internal'].forEach((transport) => {
          const options = {
            ...validRequestOptions,
            allowCredentials: [
              { type: 'public-key', id: 'test', transports: [transport] },
            ],
          };
          expect(() => validateRemoteRequestOptions(options)).not.toThrow();
        });
      });

      it('should allow empty allowCredentials array', () => {
        const options = { ...validRequestOptions, allowCredentials: [] };

        expect(() => validateRemoteRequestOptions(options)).not.toThrow();
      });

      it('should allow undefined allowCredentials', () => {
        const options = { ...validRequestOptions };
        delete (options as any).allowCredentials;

        expect(() => validateRemoteRequestOptions(options)).not.toThrow();
      });
    });
  });
});
