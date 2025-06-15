# ngx-webauthn

A comprehensive Angular library that provides a clean, type-safe abstraction over the WebAuthn API. This library simplifies the implementation of passwordless authentication using passkeys, security keys, and biometric authentication.

## Features

- 🔐 **Complete WebAuthn Support** - Registration and authentication flows
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive interfaces
- 🎯 **Clean API** - Simplified abstraction over complex WebAuthn APIs
- 📱 **Cross-Platform** - Works with platform authenticators (Face ID, Touch ID, Windows Hello)
- 🔑 **Security Keys** - Support for external authenticators (YubiKey, etc.)
- ⚡ **RxJS Integration** - Observable-based API that fits naturally into Angular
- 🧪 **Well Tested** - Comprehensive unit test coverage
- 📖 **Browser Support** - Works in all modern browsers with WebAuthn support

## Installation

```bash
npm install @ngx-webauthn/core
```

## Quick Start

### 1. Import the Service

```typescript
import { Component, inject } from '@angular/core';
import { WebAuthnService, WebAuthnError, WebAuthnErrorType } from '@ngx-webauthn/core';

@Component({
  selector: 'app-auth',
  template: `
    <div>
      <button (click)="register()" [disabled]="!isSupported">Register</button>
      <button (click)="authenticate()" [disabled]="!isSupported">Authenticate</button>
      <p *ngIf="!isSupported">WebAuthn is not supported in this browser</p>
    </div>
  `,
})
export class AuthComponent {
  private webAuthnService = inject(WebAuthnService);

  isSupported = this.webAuthnService.isSupported();

  register() {
    this.webAuthnService
      .register({
        user: {
          id: 'user-123',
          name: 'john.doe@example.com',
          displayName: 'John Doe',
        },
        relyingParty: {
          name: 'My App',
          id: 'example.com',
        },
      })
      .subscribe({
        next: (result) => {
          console.log('Registration successful:', result);
          // Send result.credentialId, result.publicKey, etc. to your server
        },
        error: (error: WebAuthnError) => {
          console.error('Registration failed:', error.message);
          if (error.type === WebAuthnErrorType.NOT_ALLOWED) {
            // User cancelled or denied permission
          }
        },
      });
  }

  authenticate() {
    this.webAuthnService
      .authenticate({
        // Optional: specify allowed credentials
        allowCredentials: ['credential-id-from-registration'],
      })
      .subscribe({
        next: (result) => {
          console.log('Authentication successful:', result);
          // Send result to your server for verification
        },
        error: (error: WebAuthnError) => {
          console.error('Authentication failed:', error.message);
        },
      });
  }
}
```

### 2. Check Browser Support

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { WebAuthnService } from '@ngx-webauthn/core';

@Component({
  selector: 'app-support-check',
  template: `
    <div *ngIf="support">
      <p>WebAuthn Support: {{ support.isSupported ? 'Yes' : 'No' }}</p>
      <p>Platform Authenticator: {{ support.isPlatformAuthenticatorAvailable ? 'Available' : 'Not Available' }}</p>
      <p>Supported Transports: {{ support.supportedTransports.join(', ') }}</p>
    </div>
  `,
})
export class SupportCheckComponent implements OnInit {
  private webAuthnService = inject(WebAuthnService);
  support: any;

  ngOnInit() {
    this.webAuthnService.getSupport().subscribe({
      next: (support) => {
        this.support = support;
      },
      error: (error) => {
        console.error('Failed to check WebAuthn support:', error);
      },
    });
  }
}
```

## API Reference

### WebAuthnService

#### Methods

##### `isSupported(): boolean`

Synchronously checks if WebAuthn is supported in the current browser.

##### `getSupport(): Observable<WebAuthnSupport>`

Returns detailed information about WebAuthn support including platform authenticator availability.

##### `register(options: WebAuthnRegistrationOptions): Observable<WebAuthnRegistrationResult>`

Registers a new WebAuthn credential.

##### `authenticate(options: WebAuthnAuthenticationOptions): Observable<WebAuthnAuthenticationResult>`

Authenticates using an existing WebAuthn credential.

### Interfaces

#### WebAuthnRegistrationOptions

```typescript
interface WebAuthnRegistrationOptions {
  user: WebAuthnUser;
  relyingParty: WebAuthnRelyingParty;
  challenge?: string; // Auto-generated if not provided
  timeout?: number; // Default: 60000ms
  attestation?: AttestationConveyancePreference; // Default: 'none'
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    userVerification?: UserVerificationRequirement;
    requireResidentKey?: boolean;
    residentKey?: ResidentKeyRequirement;
  };
  excludeCredentials?: string[]; // Credential IDs to exclude
}
```

#### WebAuthnRegistrationResult

```typescript
interface WebAuthnRegistrationResult {
  credentialId: string; // Base64url encoded
  publicKey: string; // Base64url encoded
  attestationObject: string; // Base64url encoded
  clientDataJSON: string; // Base64url encoded
  transports?: AuthenticatorTransport[];
}
```

#### WebAuthnAuthenticationOptions

```typescript
interface WebAuthnAuthenticationOptions {
  challenge?: string; // Auto-generated if not provided
  timeout?: number; // Default: 60000ms
  userVerification?: UserVerificationRequirement; // Default: 'preferred'
  allowCredentials?: string[]; // Credential IDs to allow
}
```

#### WebAuthnAuthenticationResult

```typescript
interface WebAuthnAuthenticationResult {
  credentialId: string; // Base64url encoded
  authenticatorData: string; // Base64url encoded
  clientDataJSON: string; // Base64url encoded
  signature: string; // Base64url encoded
  userHandle?: string; // Base64url encoded
}
```

### Error Handling

The library provides structured error handling through the `WebAuthnError` class:

```typescript
enum WebAuthnErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_ALLOWED = 'NOT_ALLOWED',
  INVALID_STATE = 'INVALID_STATE',
  CONSTRAINT = 'CONSTRAINT',
  SECURITY = 'SECURITY',
  NETWORK = 'NETWORK',
  ABORT = 'ABORT',
  TIMEOUT = 'TIMEOUT',
  ENCODING = 'ENCODING',
  UNKNOWN = 'UNKNOWN',
}

class WebAuthnError extends Error {
  constructor(public readonly type: WebAuthnErrorType, message: string, public readonly originalError?: Error);
}
```

## Advanced Usage

### Custom Challenge Generation

```typescript
// Generate your own challenge (must be base64url encoded)
const customChallenge = 'your-base64url-encoded-challenge';

this.webAuthnService
  .register({
    user: {
      /* ... */
    },
    relyingParty: {
      /* ... */
    },
    challenge: customChallenge,
  })
  .subscribe(/* ... */);
```

### Authenticator Selection

```typescript
// Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
this.webAuthnService
  .register({
    user: {
      /* ... */
    },
    relyingParty: {
      /* ... */
    },
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
  })
  .subscribe(/* ... */);
```

### Excluding Existing Credentials

```typescript
// Prevent re-registration of existing credentials
this.webAuthnService
  .register({
    user: {
      /* ... */
    },
    relyingParty: {
      /* ... */
    },
    excludeCredentials: ['existing-credential-id-1', 'existing-credential-id-2'],
  })
  .subscribe(/* ... */);
```

## Server-Side Integration

This library handles the client-side WebAuthn flow. You'll need a server-side implementation to:

1. **Generate challenges** (optional - library can generate them)
2. **Verify registration responses**
3. **Store public keys and credential metadata**
4. **Verify authentication responses**

Popular server-side libraries:

- **Node.js**: `@simplewebauthn/server`
- **.NET**: `Fido2NetLib`
- **Java**: `webauthn4j`
- **Python**: `py_webauthn`
- **Go**: `go-webauthn`

## Browser Support

WebAuthn is supported in all modern browsers:

- Chrome 67+
- Firefox 60+
- Safari 14+
- Edge 18+

Check current support at [caniuse.com/webauthn](https://caniuse.com/webauthn).

## Development

### Running unit tests

Run `nx test ngx-webauthn` to execute the unit tests.

### Building the library

Run `nx build ngx-webauthn` to build the library.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details.
