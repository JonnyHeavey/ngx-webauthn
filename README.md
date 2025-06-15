# NgxWebauthn

A comprehensive Angular library for WebAuthn (Web Authentication API) integration, providing a clean abstraction over the complex WebAuthn API with RxJS observables and TypeScript interfaces.

## Features

- 🔐 **Complete WebAuthn Support**: Registration and authentication flows
- 🎯 **Clean API**: String-based abstractions over ArrayBuffer complexity
- 📱 **Cross-Platform**: Works with platform authenticators, security keys, and mobile devices
- 🔄 **RxJS Integration**: Observable-based API for reactive applications
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive interfaces
- ⚡ **Error Handling**: Structured error types with meaningful messages
- 🧪 **Well Tested**: Comprehensive unit test coverage
- 📖 **Documentation**: Complete API documentation and examples

## Demo Application

Try the interactive demo to see the library in action:

```bash
# Start the demo app
npx nx serve demo
```

The demo showcases:

- Browser support detection
- Credential registration with customizable options
- Authentication with existing credentials
- Credential management interface
- Real-time feedback and error handling

Visit `http://localhost:4200` to explore the demo.

## Quick Start

### Installation

```bash
npm install @ngx-webauthn/core
```

### Basic Usage

```typescript
import { WebAuthnService } from '@ngx-webauthn/core';

@Component({...})
export class MyComponent {
  constructor(private webAuthn: WebAuthnService) {}

  async register() {
    const options = {
      user: {
        id: 'user-123',
        name: 'john.doe@example.com',
        displayName: 'John Doe'
      },
      relyingParty: {
        name: 'My App'
      }
    };

    this.webAuthn.register(options).subscribe({
      next: (result) => console.log('Registration successful:', result),
      error: (error) => console.error('Registration failed:', error)
    });
  }

  async authenticate() {
    this.webAuthn.authenticate().subscribe({
      next: (result) => console.log('Authentication successful:', result),
      error: (error) => console.error('Authentication failed:', error)
    });
  }
}
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
- `apps/demo/` - Interactive demo application
- `docs/` - Additional documentation

## Browser Support

WebAuthn is supported in all modern browsers:

- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 79+

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
- [Angular Documentation](https://angular.io/)
- [Nx Documentation](https://nx.dev/)
