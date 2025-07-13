# NgxWebauthn

A powerful Angular library for WebAuthn (Web Authentication API) integration that makes implementing passwordless authentication simple and flexible. Features a preset system for common scenarios while retaining full control for advanced use cases.

## Features

- 🎯 **Preset System**: Pre-configured setups for common patterns (passkeys, 2FA, device-bound)
- 🔐 **Complete WebAuthn Support**: Registration and authentication flows
- 📱 **Cross-Platform**: Works with platform authenticators, security keys, and mobile devices
- 🔄 **RxJS Integration**: Observable-based API for reactive applications
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive interfaces
- ⚡ **Error Handling**: Structured error types with meaningful messages
- 🧩 **Flexible API**: Use presets for simplicity or direct WebAuthn options for full control
- 📖 **Transparent**: All preset configurations are exported as inspectable constants

## Demo Application

Try the interactive demo to see the library in action:

```bash
# Start the demo app
npx nx serve demo
```

The demo showcases:

- Browser support detection
- Preset-based credential registration
- Authentication with different configurations
- Credential management interface
- Real-time feedback and error handling

Visit `http://localhost:4200` to explore the demo.

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

### Basic Usage with Presets

```typescript
import { Component, inject } from '@angular/core';
import { WebAuthnService } from 'ngx-webauthn';

@Component({...})
export class MyComponent {
  private webAuthn = inject(WebAuthnService);

  // Simple passkey registration
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

  // Second factor registration
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

  // Simple authentication
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

## Available Presets

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

## Advanced Usage

### Preset with Overrides

```typescript
this.webAuthn
  .register({
    username: 'john.doe@example.com',
    preset: 'passkey',
    // Override preset defaults
    authenticatorSelection: {
      userVerification: 'required',
    },
    timeout: 30000,
  })
  .subscribe((result) => {
    console.log('Custom passkey registered:', result);
  });
```

### Direct WebAuthn Options

For full control, you can still pass native WebAuthn options:

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

this.webAuthn.register(creationOptions).subscribe((result) => {
  console.log('Registration complete:', result);
});

// JSON options also work
const jsonOptions: PublicKeyCredentialCreationOptionsJSON = {
  rp: { name: 'My App' },
  user: { id: 'dXNlcklk', name: 'john.doe@example.com', displayName: 'John Doe' },
  challenge: 'Y2hhbGxlbmdl',
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
};

this.webAuthn.register(jsonOptions).subscribe((result) => {
  console.log('Registration complete:', result);
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

### RegisterConfig

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

### AuthenticateConfig

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

### Service Methods

```typescript
class WebAuthnService {
  // Check if WebAuthn is supported
  isSupported(): boolean;

  // Get detailed support information
  getSupport(): Observable<WebAuthnSupport>;

  // Register with preset config or direct options
  register(input: RegisterConfig | PublicKeyCredentialCreationOptions | PublicKeyCredentialCreationOptionsJSON): Observable<RegistrationResponse>;

  // Authenticate with preset config or direct options
  authenticate(input: AuthenticateConfig | PublicKeyCredentialRequestOptions | PublicKeyCredentialRequestOptionsJSON): Observable<AuthenticationResponse>;
}
```

## Error Handling

The library provides specific error types for better error handling:

```typescript
import { UserCancelledError, AuthenticatorError, UnsupportedOperationError, InvalidOptionsError, SecurityError, TimeoutError } from 'ngx-webauthn';

this.webAuthn.register(config).subscribe({
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
  - `src/lib/models/` - TypeScript interfaces
  - `src/lib/services/` - Core WebAuthn service
  - `src/lib/utils/` - Utility functions
  - `src/lib/errors/` - Error classes
- `apps/demo/` - Interactive demo application

## Browser Support

WebAuthn is supported in all modern browsers:

- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 79+

Mobile support:

- iOS Safari 14+
- Android Chrome 70+

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
