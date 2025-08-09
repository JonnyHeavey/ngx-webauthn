A comprehensive Angular library that provides a clean, type-safe abstraction over the WebAuthn API. This library offers direct support for native WebAuthn types while providing an optional preset system for common scenarios.

## Features

- 🔐 **Complete WebAuthn Support** - Full registration and authentication flows
- 🛡️ **Native Type Safety** - Direct support for WebAuthn types with full TypeScript support
- 🎯 **Flexible API** - Use native WebAuthn options directly or simplified presets
- 📱 **Cross-Platform** - Works with platform authenticators (Face ID, Touch ID, Windows Hello)
- 🔑 **Security Keys** - Support for external authenticators (YubiKey, etc.)
- ⚡ **RxJS Integration** - Observable-based API that fits naturally into Angular
- 🧪 **Well Tested** - Comprehensive unit test coverage
- 📖 **Browser Support Detection** - Check WebAuthn and platform authenticator availability

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

### 2. Use Native WebAuthn Types

The library provides direct support for standard WebAuthn types, giving you full control:

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
    // Native WebAuthn creation options
    const creationOptions: PublicKeyCredentialCreationOptions = {
      rp: {
        name: 'My App',
        id: 'myapp.com',
      },
      user: {
        id: new TextEncoder().encode('user123'),
        name: 'john.doe@example.com',
        displayName: 'John Doe',
      },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      timeout: 60000,
      attestation: 'direct',
    };

    this.webAuthnService.register(creationOptions).subscribe({
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
    // Native WebAuthn request options
    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          type: 'public-key',
          id: new TextEncoder().encode('credential-id-from-registration'),
          transports: ['internal'],
        },
      ],
      userVerification: 'preferred',
      timeout: 60000,
    };

    this.webAuthnService.authenticate(requestOptions).subscribe({
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

### 3. Using JSON WebAuthn Options

The library also supports JSON-based WebAuthn options with base64url encoding:

```typescript
register() {
  // JSON WebAuthn creation options (base64url encoded)
  const jsonOptions: PublicKeyCredentialCreationOptionsJSON = {
    rp: {
      name: 'My App',
      id: 'myapp.com'
    },
    user: {
      id: 'dXNlcjEyMw', // base64url encoded 'user123'
      name: 'john.doe@example.com',
      displayName: 'John Doe',
    },
    challenge: 'Y2hhbGxlbmdlMTIzNDU2Nzg5MA', // base64url encoded challenge
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform',
      userVerification: 'preferred',
      residentKey: 'discouraged',
    },
    timeout: 60000,
    attestation: 'none',
  };

  this.webAuthnService.register(jsonOptions).subscribe({
    next: (result) => {
      console.log('Registration successful:', result);
    },
    error: (error: WebAuthnError) => {
      console.error('Registration failed:', error.message);
    },
  });
}
```

### 4. Alternative: Simplified Preset System

For convenience, the library includes an optional preset system for common scenarios:

```typescript
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
```

### 5. Check Browser Support

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

## Remote Server Integration

The library supports fetching WebAuthn options from remote endpoints, allowing your server to generate the options while the client handles the WebAuthn flow:

### Configuration

First, configure the remote endpoints in your WebAuthn setup:

```typescript
// main.ts (standalone app)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideWebAuthn } from 'ngx-webauthn';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(), // Required for remote functionality
    provideWebAuthn(
      { name: 'My App', id: 'myapp.com' },
      {
        remoteEndpoints: {
          registration: 'https://api.myapp.com/webauthn/registration/options',
          authentication: 'https://api.myapp.com/webauthn/authentication/options',
          requestOptions: {
            timeout: 10000, // Network timeout in milliseconds
          },
        },
      }
    ),
    // ... other providers
  ],
});
```

```typescript
// app.module.ts (module-based app)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { WEBAUTHN_CONFIG, createWebAuthnConfig } from 'ngx-webauthn';

@NgModule({
  imports: [BrowserModule, HttpClientModule],
  providers: [
    {
      provide: WEBAUTHN_CONFIG,
      useValue: createWebAuthnConfig(
        { name: 'My App', id: 'myapp.com' },
        {
          remoteEndpoints: {
            registration: 'https://api.myapp.com/webauthn/registration/options',
            authentication: 'https://api.myapp.com/webauthn/authentication/options',
            requestOptions: { timeout: 10000 },
          },
        }
      ),
    },
  ],
  // ...
})
export class AppModule {}
```

### Remote Registration

Use `registerRemote()` to fetch creation options from your server:

```typescript
import { Component, inject } from '@angular/core';
import { WebAuthnService } from 'ngx-webauthn';

@Component({
  selector: 'app-auth',
  template: ` <button (click)="registerWithServer()" [disabled]="!isSupported">Register with Server</button> `,
})
export class AuthComponent {
  private webAuthnService = inject(WebAuthnService);
  isSupported = this.webAuthnService.isSupported();

  registerWithServer() {
    // Simple registration request
    this.webAuthnService
      .registerRemote({
        username: 'john.doe@example.com',
        displayName: 'John Doe',
      })
      .subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          // Send response.rawResponse to your server for verification
        },
        error: (error) => {
          console.error('Registration failed:', error);
        },
      });
  }
}
```

### Remote Authentication

Use `authenticateRemote()` to fetch request options from your server:

```typescript
authenticateWithServer() {
  // Simple authentication request
  this.webAuthnService.authenticateRemote({
    username: 'john.doe@example.com'
  }).subscribe({
    next: (response) => {
      console.log('Authentication successful:', response);
      // Send response.rawResponse to your server for verification
    },
    error: (error) => {
      console.error('Authentication failed:', error);
    }
  });
}
```

### Custom Server Payloads

The library supports any payload structure your server requires:

```typescript
// Define your custom payload types
interface MyRegistrationPayload {
  tenantId: string;
  department: string;
  userId: string;
}

interface MyAuthenticationPayload {
  sessionId: string;
  context: 'web' | 'mobile';
}

// Use with type safety
this.webAuthnService
  .registerRemote<MyRegistrationPayload>({
    tenantId: 'acme-corp',
    department: 'engineering',
    userId: 'emp-12345',
  })
  .subscribe((response) => {
    console.log('Registration complete:', response);
  });

this.webAuthnService
  .authenticateRemote<MyAuthenticationPayload>({
    sessionId: 'session-abc123',
    context: 'web',
  })
  .subscribe((response) => {
    console.log('Authentication complete:', response);
  });
```

### Server Endpoint Requirements

Your server endpoints should implement the following contracts:

#### Registration Endpoint

**Request:** `POST /webauthn/registration/options`

- **Body:** Any JSON payload your application needs
- **Response:** `PublicKeyCredentialCreationOptionsJSON`

```javascript
// Example server response
{
  "rp": {
    "name": "My App",
    "id": "myapp.com"
  },
  "user": {
    "id": "dXNlci0xMjM0NQ", // base64url encoded user ID
    "name": "john.doe@example.com",
    "displayName": "John Doe"
  },
  "challenge": "Y2hhbGxlbmdlLWRhdGE", // base64url encoded challenge
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "attestation": "none",
  "authenticatorSelection": {
    "userVerification": "preferred",
    "residentKey": "preferred"
  },
  "excludeCredentials": [
    {
      "type": "public-key",
      "id": "Y3JlZGVudGlhbC0xMjM", // base64url encoded credential ID
      "transports": ["usb", "nfc"]
    }
  ]
}
```

#### Authentication Endpoint

**Request:** `POST /webauthn/authentication/options`

- **Body:** Any JSON payload your application needs (can be empty `{}`)
- **Response:** `PublicKeyCredentialRequestOptionsJSON`

```javascript
// Example server response
{
  "challenge": "YXV0aC1jaGFsbGVuZ2U", // base64url encoded challenge
  "timeout": 60000,
  "userVerification": "preferred",
  "allowCredentials": [
    {
      "type": "public-key",
      "id": "Y3JlZGVudGlhbC0xMjM", // base64url encoded credential ID
      "transports": ["usb", "nfc"]
    }
  ]
}
```

### Error Handling

Remote operations provide enhanced error context:

```typescript
import { RemoteEndpointError, InvalidRemoteOptionsError } from 'ngx-webauthn';

this.webAuthnService.registerRemote(payload).subscribe({
  error: (error) => {
    if (error instanceof RemoteEndpointError) {
      console.log('Server error:', error.context.status);
      console.log('Endpoint:', error.context.url);
      console.log('Operation:', error.context.operation);
    } else if (error instanceof InvalidRemoteOptionsError) {
      console.log('Server returned invalid options:', error.message);
    }
  },
});
```

### Authentication and Headers

Use Angular HTTP interceptors for authentication, CSRF tokens, and custom headers:

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Add authentication headers for WebAuthn endpoints
    if (req.url.includes('/webauthn/')) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${this.getAuthToken()}`,
          'X-CSRF-Token': this.getCsrfToken(),
        },
      });
      return next.handle(authReq);
    }
    return next.handle(req);
  }

  private getAuthToken(): string {
    // Your auth token logic
    return 'your-auth-token';
  }

  private getCsrfToken(): string {
    // Your CSRF token logic
    return 'your-csrf-token';
  }
}

// main.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // ... other providers
  ],
});
```

### Security Considerations

- **HTTPS Required:** All remote endpoints should use HTTPS in production
- **Authentication:** Protect your endpoints with proper authentication
- **Validation:** Always validate the server response structure
- **CSRF Protection:** Use CSRF tokens for state-changing operations
- **Rate Limiting:** Implement rate limiting on your WebAuthn endpoints

## Native WebAuthn Types Support

The library provides comprehensive support for standard WebAuthn types:

### Registration with Native Types

```typescript
// Native ArrayBuffer-based creation options
const nativeOptions: PublicKeyCredentialCreationOptions = {
  rp: { name: 'My App', id: 'myapp.com' },
  user: {
    id: new TextEncoder().encode('user-id'),
    name: 'user@example.com',
    displayName: 'User Name',
  },
  challenge: crypto.getRandomValues(new Uint8Array(32)),
  pubKeyCredParams: [
    { type: 'public-key', alg: -7 }, // ES256
    { type: 'public-key', alg: -257 }, // RS256
  ],
  excludeCredentials: [
    {
      type: 'public-key',
      id: new TextEncoder().encode('existing-credential-id'),
      transports: ['usb', 'nfc'],
    },
  ],
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    userVerification: 'required',
    residentKey: 'required',
  },
  timeout: 60000,
  attestation: 'direct',
};

this.webAuthnService.register(nativeOptions).subscribe((result) => {
  console.log('Registration complete:', result);
});
```

### Authentication with Native Types

```typescript
// Native ArrayBuffer-based request options
const nativeRequest: PublicKeyCredentialRequestOptions = {
  challenge: crypto.getRandomValues(new Uint8Array(32)),
  allowCredentials: [
    {
      type: 'public-key',
      id: new TextEncoder().encode('credential-id'),
      transports: ['internal', 'usb'],
    },
  ],
  userVerification: 'preferred',
  timeout: 60000,
};

this.webAuthnService.authenticate(nativeRequest).subscribe((result) => {
  console.log('Authentication complete:', result);
});
```

### JSON WebAuthn Options

```typescript
// JSON base64url-encoded creation options
const jsonOptions: PublicKeyCredentialCreationOptionsJSON = {
  rp: { name: 'My App', id: 'myapp.com' },
  user: {
    id: 'dXNlci1pZA', // base64url encoded 'user-id'
    name: 'user@example.com',
    displayName: 'User Name',
  },
  challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded challenge
  pubKeyCredParams: [
    { type: 'public-key', alg: -7 },
    { type: 'public-key', alg: -257 },
  ],
  excludeCredentials: [
    {
      type: 'public-key',
      id: 'ZXhpc3RpbmctY3JlZGVudGlhbC1pZA', // base64url encoded
      transports: ['usb', 'nfc'],
    },
  ],
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    userVerification: 'required',
    residentKey: 'required',
  },
  timeout: 60000,
  attestation: 'direct',
};

this.webAuthnService.register(jsonOptions).subscribe((result) => {
  console.log('Registration complete:', result);
});
```

## Features Overview

### 🎯 **Optional Preset System**

The library includes intelligent presets for common WebAuthn use cases:

- **`passkey`** - Modern passwordless authentication with credential syncing
- **`externalSecurityKey`** - Traditional 2FA with hardware security keys
- **`platformAuthenticator`** - High-security single-device authentication

```typescript
// Simple preset usage - challenge must be generated by your server
this.webAuthnService.register({
  username: 'user@example.com',
  preset: 'passkey',
  challenge: serverGeneratedChallenge,
});

// Preset with custom overrides (native WebAuthn options)
this.webAuthnService.register({
  username: 'user@example.com',
  preset: 'passkey',
  challenge: serverGeneratedChallenge,
  authenticatorSelection: { userVerification: 'required' },
  timeout: 30000,
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
// Native WebAuthn options (recommended for full control)
service.register(nativeCreationOptions);

// JSON WebAuthn options (base64url strings)
service.register(jsonCreationOptions);

// High-level preset config (convenience) - challenge must be from server
service.register({
  username: 'user@example.com',
  preset: 'passkey',
  challenge: serverGeneratedChallenge,
});
```

## API Reference

### WebAuthnService

#### Methods

##### `isSupported(): boolean`

Synchronously checks if WebAuthn is supported in the current browser.

##### `getSupport(): Observable<WebAuthnSupport>`

Returns detailed information about WebAuthn support including platform authenticator availability.

##### `register(input: RegisterInput): Observable<RegistrationResponse>`

Registers a new WebAuthn credential. Accepts native WebAuthn options, JSON options, or high-level config objects.

```typescript
type RegisterInput = PublicKeyCredentialCreationOptions | PublicKeyCredentialCreationOptionsJSON | RegisterConfig;
```

##### `authenticate(input: AuthenticateInput): Observable<AuthenticationResponse>`

Authenticates using an existing WebAuthn credential. Accepts native WebAuthn options, JSON options, or high-level config objects.

```typescript
type AuthenticateInput = PublicKeyCredentialRequestOptions | PublicKeyCredentialRequestOptionsJSON | AuthenticateConfig;
```

### Response Types

#### RegistrationResponse

```typescript
interface RegistrationResponse {
  success: boolean;
  credentialId: string; // Base64url encoded
  publicKey?: string; // Base64url encoded (if available)
  transports?: AuthenticatorTransport[];
  rawResponse?: WebAuthnRegistrationResult; // Complete WebAuthn data for advanced usage
}
```

#### AuthenticationResponse

```typescript
interface AuthenticationResponse {
  success: boolean;
  credentialId: string; // Base64url encoded
  userHandle?: string; // Base64url encoded
  rawResponse?: WebAuthnAuthenticationResult; // Complete WebAuthn data for advanced usage
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

### Preset System (Optional)

#### RegisterConfig

```typescript
interface RegisterConfig {
  username: string; // Required: username for the credential
  preset?: 'passkey' | 'externalSecurityKey' | 'platformAuthenticator';
  displayName?: string; // Defaults to username
  rp?: { name: string; id?: string }; // Relying party info
  challenge: string | Uint8Array; // Required: must be generated by your server
  timeout?: number; // Defaults to 60000ms
  // ... other native WebAuthn options as overrides
}
```

#### AuthenticateConfig

```typescript
interface AuthenticateConfig {
  username?: string; // Optional username hint
  preset?: 'passkey' | 'externalSecurityKey' | 'platformAuthenticator';
  challenge: string | Uint8Array; // Required: must be generated by your server
  timeout?: number; // Defaults to 60000ms
  allowCredentials?: string[] | PublicKeyCredentialDescriptor[];
  // ... other native WebAuthn options as overrides
}
```

## Server-Side Integration

This library handles the client-side WebAuthn flow. You'll need a server-side implementation to:

1. **Generate challenges** (required for security - challenges must never be generated client-side)
2. **Verify registration responses**
3. **Store public keys and credential metadata**
4. **Verify authentication responses**

Popular server-side libraries:

- **Node.js**: `@simplewebauthn/server`
- **.NET**: `Fido2NetLib`
- **Java**: `webauthn4j`
- **Python**: `py_webauthn`
- **Go**: `go-webauthn`

## Development

### Running unit tests

Run `nx test ngx-webauthn` to execute the unit tests.

### Building the library

Run `nx build ngx-webauthn` to build the library.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details.
