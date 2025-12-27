# NgxWebauthn

> ⚠️ **BETA SOFTWARE** ⚠️
>
> This library is currently in beta. The API surface is subject to change in future versions.
> Please use with caution in production environments and be prepared to update your code
> when new versions are released.

A powerful Angular library for WebAuthn (Web Authentication API) integration that provides a clean, type-safe abstraction over the native WebAuthn API. Features direct support for standard WebAuthn types with an optional preset system for common scenarios.

## Features

- 🔐 **Complete WebAuthn Support**: Full registration and authentication flows
- 🛡️ **Type Safety**: Direct support for native WebAuthn types with full TypeScript support
- 📱 **Cross-Platform**: Works with platform authenticators, security keys, and mobile devices
- 🔄 **RxJS Integration**: Observable-based API for reactive applications
- 🧩 **Flexible API**: Use native WebAuthn options directly or simplified presets
- ⚡ **Error Handling**: Structured error types with meaningful messages
- 🎯 **Preset System**: Optional pre-configured setups for common patterns (passkeys, 2FA, device-bound)
- 📖 **Transparent**: All preset configurations are exported as inspectable constants

## Demo Application

**🌟 [Try the live demo](https://jonnyheavey.github.io/ngx-webauthn/) 🌟**

You can try the interactive demo online at https://jonnyheavey.github.io/ngx-webauthn/ to see the library in action.

Alternatively, run the demo locally:

```bash
# Start the demo app
npx nx serve demo
```

The demo showcases:

- Browser support detection
- Native WebAuthn option usage
- Preset-based credential registration
- Authentication with different configurations
- Credential management interface
- Real-time feedback and error handling

Visit `http://localhost:4200` to explore the demo.

## Enhanced Demo with Backend Integration

The demo application now supports dual-mode operation:

### Mock Mode (Default)

- Uses client-side generated challenges
- No backend required
- Suitable for basic testing and demonstrations

### Remote Mode (Localhost Only)

- Uses server-generated cryptographically secure challenges
- Requires the WebAuthn backend service
- Provides realistic integration testing
- Demonstrates production-ready WebAuthn flow

### Quick Start

1. **Start the Backend Service:**

   ```bash
   npm run backend:start
   ```

   The backend will run on `http://localhost:3001`

2. **Start the Demo Application:**

   ```bash
   npx nx serve demo --port=4201
   ```

   The demo will run on `http://localhost:4201`

3. **Access the Demo:**
   - Open `http://localhost:4201` in your browser
   - Enable "Use Remote Backend" toggle (only visible on localhost)
   - The demo will now use server-generated challenges

### Backend Service

The backend service provides:

- Cryptographically secure challenge generation
- WebAuthn registration and authentication options
- Credential storage and verification
- Real-time health monitoring

For more details, see [`apps/webauthn-backend/README.md`](apps/webauthn-backend/README.md)

### Testing

For comprehensive testing instructions, see [`WEBAUTHN-INTEGRATION-TEST-REPORT.md`](WEBAUTHN-INTEGRATION-TEST-REPORT.md)

## Quick Start

### Installation

```bash
npm install ngx-webauthn
```

### Setup

Add the provider to your Angular application:

```typescript
// main.ts
import { provideWebAuthn } from 'ngx-webauthn';

bootstrapApplication(AppComponent, {
  providers: [
    provideWebAuthn({
      defaultTimeout: 60000, // Optional configuration
    }),
  ],
});
```

### Basic Usage with Native WebAuthn Types

The library provides direct support for standard WebAuthn types, giving you full control over the authentication process:

```typescript
import { Component, inject } from '@angular/core';
import { WebAuthnService } from 'ngx-webauthn';

@Component({...})
export class MyComponent {
  private webAuthn = inject(WebAuthnService);

  // Using native WebAuthn creation options
  registerWithNativeOptions() {
    const creationOptions: PublicKeyCredentialCreationOptions = {
      rp: {
        name: 'My App',
        id: 'myapp.com'
      },
      user: {
        id: new TextEncoder().encode('user123'),
        name: 'john.doe@example.com',
        displayName: 'John Doe',
      },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
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

    this.webAuthn.register(creationOptions).subscribe({
      next: (result) => console.log('Registration successful:', result),
      error: (error) => console.error('Registration failed:', error)
    });
  }

  // Using JSON WebAuthn options (base64url encoded)
  registerWithJsonOptions() {
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

    this.webAuthn.register(jsonOptions).subscribe({
      next: (result) => console.log('Registration successful:', result),
      error: (error) => console.error('Registration failed:', error)
    });
  }

  // Authentication with native options
  authenticateWithNativeOptions() {
    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          type: 'public-key',
          id: new TextEncoder().encode('credential-id'),
          transports: ['usb', 'nfc'],
        },
      ],
      userVerification: 'preferred',
      timeout: 60000,
    };

    this.webAuthn.authenticate(requestOptions).subscribe({
      next: (result) => console.log('Authentication successful:', result),
      error: (error) => console.error('Authentication failed:', error)
    });
  }
}
```

### Alternative: Simplified Preset System

For common scenarios, the library provides an optional preset system that handles the complexity for you:

```typescript
import { Component, inject } from '@angular/core';
import { WebAuthnService } from 'ngx-webauthn';

@Component({...})
export class MyComponent {
  private webAuthn = inject(WebAuthnService);

  // Simple passkey registration using presets
  registerPasskey() {
    this.webAuthn.register({
      username: 'john.doe@example.com',
      preset: 'passkey',
      rp: { name: 'My App' }
    }).subscribe({
      next: (result) => console.log('Registration successful:', result),
      error: (error) => console.error('Registration failed:', error)
    });
  }

  // Second factor registration using presets
  registerSecondFactor() {
    this.webAuthn.register({
      username: 'john.doe@example.com',
      preset: 'externalSecurityKey',
      rp: { name: 'My App' }
    }).subscribe({
      next: (result) => console.log('Second factor registered:', result),
      error: (error) => console.error('Registration failed:', error)
    });
  }

  // Simple authentication using presets
  authenticate() {
    this.webAuthn.authenticate({
      preset: 'passkey'
    }).subscribe({
      next: (result) => console.log('Authentication successful:', result),
      error: (error) => console.error('Authentication failed:', error)
    });
  }
}
```

## Native WebAuthn Options Support

The library provides full support for both native WebAuthn types and their JSON equivalents:

### Registration Options

```typescript
// Native ArrayBuffer-based options
const nativeOptions: PublicKeyCredentialCreationOptions = {
  rp: { name: 'My App', id: 'myapp.com' },
  user: {
    id: new TextEncoder().encode('user-id'),
    name: 'user@example.com',
    displayName: 'User Name',
  },
  challenge: crypto.getRandomValues(new Uint8Array(32)),
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
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

// JSON base64url-encoded options
const jsonOptions: PublicKeyCredentialCreationOptionsJSON = {
  rp: { name: 'My App', id: 'myapp.com' },
  user: {
    id: 'dXNlci1pZA', // base64url encoded 'user-id'
    name: 'user@example.com',
    displayName: 'User Name',
  },
  challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded challenge
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
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
```

### Authentication Options

```typescript
// Native ArrayBuffer-based options
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

// JSON base64url-encoded options
const jsonRequest: PublicKeyCredentialRequestOptionsJSON = {
  challenge: 'Y2hhbGxlbmdlLWRhdGE', // base64url encoded
  allowCredentials: [
    {
      type: 'public-key',
      id: 'Y3JlZGVudGlhbC1pZA', // base64url encoded
      transports: ['internal', 'usb'],
    },
  ],
  userVerification: 'preferred',
  timeout: 60000,
};
```

## Available Presets (Optional)

For convenience, the library includes presets for common WebAuthn scenarios:

### `passkey`

**Modern passwordless, cross-device credentials**

- Requires resident keys (discoverable credentials)
- Prefers user verification but doesn't require it
- Works with both platform and cross-platform authenticators
- Supports credential syncing across devices

### `externalSecurityKey`

**External security key as second factor after password**

- Discourages resident keys (server-side credential storage)
- Prefers user verification
- Favors cross-platform authenticators (USB/NFC security keys)
- Credentials typically not synced between devices

### `platformAuthenticator`

**High-security, platform authenticator credentials**

- Requires platform authenticators (built-in biometrics/PIN)
- Requires resident keys for discoverability
- Requires user verification (biometric/PIN)
- Credentials bound to specific device (no syncing)

### Preset with Overrides

```typescript
this.webAuthn
  .register({
    username: 'john.doe@example.com',
    preset: 'passkey',
    // Override preset defaults with native WebAuthn options
    authenticatorSelection: {
      userVerification: 'required',
    },
    timeout: 30000,
  })
  .subscribe((result) => {
    console.log('Custom passkey registered:', result);
  });
```

### Inspecting Presets

All presets are exported as constants for transparency:

```typescript
import { PASSKEY_PRESET, EXTERNAL_SECURITY_KEY_PRESET, PLATFORM_AUTHENTICATOR_PRESET } from 'ngx-webauthn';

console.log('Passkey configuration:', PASSKEY_PRESET);
// Output: { authenticatorSelection: { residentKey: 'required', ... }, ... }
```

## API Reference

### Service Methods

```typescript
class WebAuthnService {
  // Check if WebAuthn is supported
  isSupported(): boolean;

  // Get detailed support information
  getSupport(): Observable<WebAuthnSupport>;

  // Register with native options, JSON options, or preset config
  register(input: PublicKeyCredentialCreationOptions | PublicKeyCredentialCreationOptionsJSON | RegisterConfig): Observable<RegistrationResponse>;

  // Authenticate with native options, JSON options, or preset config
  authenticate(input: PublicKeyCredentialRequestOptions | PublicKeyCredentialRequestOptionsJSON | AuthenticateConfig): Observable<AuthenticationResponse>;
}
```

### RegisterConfig (Preset System)

```typescript
interface RegisterConfig {
  username: string; // Required: username for the credential
  preset?: 'passkey' | 'externalSecurityKey' | 'platformAuthenticator';
  displayName?: string; // Defaults to username
  rp?: { name: string; id?: string }; // Relying party info
  challenge?: string | Uint8Array; // Auto-generated if not provided
  timeout?: number; // Defaults to 60000ms
  // ... other WebAuthn options as overrides
}
```

### AuthenticateConfig (Preset System)

```typescript
interface AuthenticateConfig {
  username?: string; // Optional username hint
  preset?: 'passkey' | 'externalSecurityKey' | 'platformAuthenticator';
  challenge?: string | Uint8Array; // Auto-generated if not provided
  timeout?: number; // Defaults to 60000ms
  allowCredentials?: string[] | PublicKeyCredentialDescriptor[];
  // ... other WebAuthn options as overrides
}
```

## Error Handling

The library provides specific error types for better error handling:

```typescript
import { UserCancelledError, AuthenticatorError, UnsupportedOperationError, InvalidOptionsError, SecurityError, TimeoutError } from 'ngx-webauthn';

this.webAuthn.register(creationOptions).subscribe({
  next: (result) => {
    // Handle success
  },
  error: (error) => {
    if (error instanceof UserCancelledError) {
      console.log('User cancelled the operation');
    } else if (error instanceof AuthenticatorError) {
      console.log('Authenticator error:', error.message);
    } else if (error instanceof UnsupportedOperationError) {
      console.log('Operation not supported:', error.message);
    }
    // ... handle other error types
  },
});
```

## Library Development

### Build the Library

```bash
npx nx build ngx-webauthn
```

### Run Tests

```bash
npx nx test ngx-webauthn
```

### Lint

```bash
npx nx lint ngx-webauthn
```

## Project Structure

- `libs/ngx-webauthn/` - Main library source code
  - `src/lib/presets/` - Preset configurations
  - `src/lib/model/` - TypeScript interfaces
  - `src/lib/services/` - Core WebAuthn service
  - `src/lib/utils/` - Utility functions
  - `src/lib/errors/` - Error classes
- `apps/demo/` - Interactive demo application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Links

- [WebAuthn Specification](https://w3c.github.io/webauthn/)
- [MDN WebAuthn Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Passkey Guidelines](https://passkeys.dev/)
- [Angular Documentation](https://angular.io/)
- [Nx Documentation](https://nx.dev/)

## Demo Deployment

The demo application is automatically deployed to GitHub Pages on every push to the main branch.

**Live Demo:** [https://jonnyheavey.github.io/ngx-webauthn/](https://jonnyheavey.github.io/ngx-webauthn/)

### Deployment Workflow

- **Trigger:** Automatic on main branch pushes + manual dispatch
- **Build Process:** Library → Demo (with GitHub Pages base href)
- **Deployment:** GitHub Actions → GitHub Pages
- **URL:** `https://jonnyheavey.github.io/ngx-webauthn/`

### Development Notes

The demo uses WebAuthn which requires HTTPS. GitHub Pages provides this automatically, making it suitable for real WebAuthn testing. Note that credentials created on `localhost` during development won't work on the GitHub Pages domain due to WebAuthn's origin-based security model.
