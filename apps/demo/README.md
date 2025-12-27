# WebAuthn Demo App

This demo application showcases the `ngx-webauthn` library functionality with a comprehensive Angular Material interface.

## Features

- **Browser Support Detection**: Shows WebAuthn and platform authenticator availability
- **Registration**: Create new WebAuthn credentials with customizable options
- **Authentication**: Authenticate using existing credentials (specific or any available)
- **Credential Management**: View and manage stored credentials
- **Real-time Feedback**: Loading states, success/error messages, and detailed results

## How to Use

### 1. Check Browser Support

The app automatically detects and displays:

- WebAuthn API support
- Platform authenticator availability
- Supported transport methods

### 2. Register a Credential

1. Go to the "Registration" tab
2. Fill in the form (username and display name)
3. Click "Register Credential"
4. Follow your browser/device prompts to create the credential
5. View the registration result with credential details

**Note**: The relying party information is configured at the application level in `app.config.ts` for security reasons.

### 3. Authenticate

1. Go to the "Authentication" tab
2. Choose from available credentials or use "Authenticate with Any Credential"
3. Follow your browser/device prompts to authenticate
4. View the authentication result

### 4. Manage Credentials

1. Go to the "Manage Credentials" tab
2. View all stored credentials with details
3. Remove individual credentials or clear all

## Technical Details

- **Storage**: Credentials are stored in localStorage for demo purposes
- **Security**: Uses proper WebAuthn challenge generation and validation
- **Configuration**: Relying party information is configured at application level for security
- **Error Handling**: Comprehensive error messages for different failure scenarios
- **Responsive**: Works on desktop and mobile devices
- **Material Design**: Clean, modern UI using Angular Material

## Requirements

- Modern browser with WebAuthn support
- HTTPS (required for WebAuthn API)
- Authenticator device (built-in or external)

## Enhanced Features

### Dual-Mode Operation

The demo now supports two modes of operation:

#### Mock Mode

- Uses client-side generated challenges
- No backend service required
- Perfect for quick demonstrations

#### Remote Mode

- Uses server-generated challenges from the WebAuthn backend
- Requires backend service running on `http://localhost:3001`
- Provides realistic production-like experience
- Only available on localhost for security

### Backend Integration

When using remote mode, the demo integrates with a Node.js WebAuthn backend service that:

- Generates cryptographically secure 32-byte challenges
- Stores credentials in memory
- Verifies registration and authentication responses
- Provides real-time health monitoring

### UI Enhancements

- **Backend Connection Status**: Shows real-time connection to backend
- **Mode Toggle**: Switch between mock and remote modes
- **Server Challenge Display**: View server-generated challenges
- **Enhanced Error Handling**: Clear error messages for network issues

### Usage

1. Start the backend service:

   ```bash
   npm run backend:start
   ```

2. Start the demo:

   ```bash
   npx nx serve demo --port=4201
   ```

3. Open `http://localhost:4201` in your browser

4. Enable "Use Remote Backend" to use server-generated challenges

### Testing

See the comprehensive test report at [`../../WEBAUTHN-INTEGRATION-TEST-REPORT.md`](../../WEBAUTHN-INTEGRATION-TEST-REPORT.md)

## Development

```bash
# Start the demo app
npx nx serve demo

# Build the library
npx nx build ngx-webauthn

# Run tests
npx nx test ngx-webauthn
```
