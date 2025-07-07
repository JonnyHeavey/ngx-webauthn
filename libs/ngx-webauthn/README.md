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
npm install ngx-webauthn
```

## Quick Start

### 1. Configure the Service

First, configure the WebAuthn service with your relying party information:

```typescript
// main.ts (standalone app)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideWebAuthn } from 'ngx-webauthn';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideWebAuthn(
      { name: 'My App', id: 'myapp.com' }, // Required relying party config
      { defaultTimeout: 30000 } // Optional overrides
    ),
    // ... other providers
  ],
});
```

```typescript
// app.module.ts (module-based app)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { WEBAUTHN_CONFIG, createWebAuthnConfig } from 'ngx-webauthn';

@NgModule({
  imports: [BrowserModule],
  providers: [
    {
      provide: WEBAUTHN_CONFIG,
      useValue: createWebAuthnConfig({ name: 'My App', id: 'myapp.com' }, { defaultTimeout: 30000 }),
    },
  ],
  // ...
})
export class AppModule {}
```

### 2. Use the Service with Presets

```typescript
import { Component, inject } from '@angular/core';
import { WebAuthnService, WebAuthnError, WebAuthnErrorType } from 'ngx-webauthn';

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
        username: 'john.doe@example.com',
        preset: 'passkey', // Easy preset configuration!
      })
      .subscribe({
        next: (result) => {
          console.log('Registration successful:', result);
          // Send result.credentialId, result.publicKey, etc. to your server
        },
        error: (error: WebAuthnError) => {
          console.error('Registration failed:', error.message);
          if (error.type === WebAuthnErrorType.USER_CANCELLED) {
            // User cancelled or denied permission
          }
        },
      });
  }

  authenticate() {
    this.webAuthnService
      .authenticate({
        preset: 'passkey', // Uses the same preset for consistency
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
import { WebAuthnService } from 'ngx-webauthn';

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

## Features Overview

### 🎯 **Preset System**

The library includes intelligent presets for common WebAuthn use cases:

- **`passkey`** - Modern passwordless authentication with credential syncing
- **`secondFactor`** - Traditional 2FA with hardware security keys
- **`deviceBound`** - High-security single-device authentication

```typescript
// Simple preset usage
this.webAuthnService.register({ username: 'user@example.com', preset: 'passkey' });

// Preset with custom overrides
this.webAuthnService.register({
  username: 'user@example.com',
  preset: 'passkey',
  authenticatorSelection: { userVerification: 'required' },
});
```

### 🔧 **Enhanced Configuration**

The new configuration system ensures proper security defaults:

```typescript
interface WebAuthnConfig {
  relyingParty: {
    name: string; // Required: Your app name
    id?: string; // Optional: Your domain
  };
  defaultTimeout?: number; // Default: 60000ms
  defaultAlgorithms?: PublicKeyCredentialParameters[];
  enforceUserVerification?: boolean; // Default: false
  defaultAttestation?: AttestationConveyancePreference;
  defaultAuthenticatorSelection?: AuthenticatorSelectionCriteria;
}
```

### 🔄 **Flexible Input Types**

Supports multiple input formats for maximum flexibility:

```typescript
// High-level config (recommended)
service.register({ username: 'user@example.com', preset: 'passkey' });

// Native WebAuthn options
service.register(nativeCreationOptions);

// JSON WebAuthn options (base64url strings)
service.register(jsonCreationOptions);
```

## API Reference

### WebAuthnService

#### Methods

##### `isSupported(): boolean`

Synchronously checks if WebAuthn is supported in the current browser.

##### `getSupport(): Observable<WebAuthnSupport>`

Returns detailed information about WebAuthn support including platform authenticator availability.

##### `register(input: RegisterInput): Observable<RegistrationResponse>`

Registers a new WebAuthn credential. Accepts either high-level config objects or direct WebAuthn options.

##### `authenticate(input: AuthenticateInput): Observable<AuthenticationResponse>`

Authenticates using an existing WebAuthn credential. Accepts either high-level config objects or direct WebAuthn options.

### Response Types

#### RegistrationResponse

```typescript
interface RegistrationResponse {
  success: boolean;
  credentialId: string; // Base64url encoded
  publicKey?: string; // Base64url encoded (if available)
  transports?: AuthenticatorTransport[];
  rawResponse?: WebAuthnRegistrationResult; // For advanced usage
}
```

#### AuthenticationResponse

```typescript
interface AuthenticationResponse {
  success: boolean;
  credentialId: string; // Base64url encoded
  userHandle?: string; // Base64url encoded
  rawResponse?: WebAuthnAuthenticationResult; // For advanced usage
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

### Using Direct WebAuthn Options

```typescript
// Native creation options
const creationOptions: PublicKeyCredentialCreationOptions = {
  rp: { name: 'My App' },
  user: {
    id: new Uint8Array([1, 2, 3, 4]),
    name: 'john.doe@example.com',
    displayName: 'John Doe',
  },
  challenge: new Uint8Array([5, 6, 7, 8]),
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
};

this.webAuthnService.register(creationOptions).subscribe((result) => {
  console.log('Registration complete:', result);
});
```

### JSON WebAuthn Options

```typescript
// JSON options also work (base64url strings instead of ArrayBuffers)
const jsonOptions: PublicKeyCredentialCreationOptionsJSON = {
  rp: { name: 'My App' },
  user: {
    id: 'dXNlcklk',
    name: 'john.doe@example.com',
    displayName: 'John Doe',
  },
  challenge: 'Y2hhbGxlbmdl',
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
};

this.webAuthnService.register(jsonOptions).subscribe((result) => {
  console.log('Registration complete:', result);
});
```

### Config with Custom Challenge

```typescript
// High-level config with custom challenge
this.webAuthnService
  .register({
    username: 'john.doe@example.com',
    preset: 'passkey',
    challenge: 'your-base64url-encoded-challenge',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
  })
  .subscribe((result) => {
    console.log('Passkey registered:', result);
  });
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
