# WebAuthn Backend Service

A Node.js/Express backend service for WebAuthn registration and authentication, designed to work seamlessly with the ngx-webauthn Angular library.

## Features

- **Challenge Generation**: Cryptographically secure random challenges for registration and authentication
- **Attestation Verification**: Verify WebAuthn registration responses and extract public keys
- **Assertion Verification**: Verify WebAuthn authentication responses against stored credentials
- **In-Memory Storage**: Simple data storage for demo purposes (challenges, credentials, users)
- **Preset Support**: Support for different authenticator presets (passkey, externalSecurityKey, platformAuthenticator)
- **CORS Configuration**: Pre-configured for localhost development
- **Challenge Expiration**: Automatic cleanup of expired challenges (10 minutes default)

## Technology Stack

- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js
- **Cryptography**: Native Node.js `crypto` module (no external WebAuthn libraries)
- **Encoding**: Base64url for all binary data
- **Storage**: In-memory (JavaScript objects/Maps)

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Setup

1. **Install dependencies**:

```bash
cd apps/webauthn-backend
npm install
```

2. **Configure environment variables** (optional):

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3001
HOST=localhost

# WebAuthn Configuration
RP_NAME=WebAuthn Demo
RP_ID=localhost
ORIGIN=http://localhost:4200

# Challenge Configuration
CHALLENGE_TIMEOUT=600000

# CORS Configuration
CORS_ORIGINS=http://localhost:4200,http://localhost:4201

# Security Configuration
REQUIRE_USER_VERIFICATION=false
ENFORCE_ORIGIN=true

# Logging
LOG_LEVEL=info
```

## Running the Server

### Development Mode

Run with auto-reload on file changes:

```bash
npm run dev
```

### Production Mode

Run without auto-reload:

```bash
npm start
```

### Verify Server is Running

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "config": {
    "rpName": "WebAuthn Demo",
    "rpId": "localhost",
    "origin": "http://localhost:4200",
    "challengeTimeout": 600000
  }
}
```

## API Endpoints

### 1. Health Check

**Endpoint**: `GET /api/health`

**Description**: Verify backend is running and return configuration

**Response**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "config": {
    "rpName": "WebAuthn Demo",
    "rpId": "localhost",
    "origin": "http://localhost:4200",
    "challengeTimeout": 600000
  }
}
```

### 2. Registration Options

**Endpoint**: `POST /api/webauthn/register/options`

**Description**: Generate registration challenge and return PublicKeyCredentialCreationOptionsJSON

**Request**:

```json
{
  "username": "john.doe",
  "displayName": "John Doe",
  "preset": "passkey"
}
```

**Request Fields**:

- `username` (string, required): Username for the user
- `displayName` (string, optional): Display name (defaults to username)
- `preset` (string, optional): Authenticator preset (`passkey`, `externalSecurityKey`, `platformAuthenticator`)

**Response**:

```json
{
  "challenge": "base64url-encoded-challenge",
  "rp": {
    "name": "WebAuthn Demo",
    "id": "localhost"
  },
  "user": {
    "id": "base64url-encoded-user-id",
    "name": "john.doe",
    "displayName": "John Doe"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "attestation": "none",
  "authenticatorSelection": {
    "residentKey": "required",
    "userVerification": "preferred"
  },
  "excludeCredentials": []
}
```

**Preset Configurations**:

| Preset                  | Resident Key | User Verification | Authenticator Attachment |
| ----------------------- | ------------ | ----------------- | ------------------------ |
| `passkey`               | required     | preferred         | null (any)               |
| `externalSecurityKey`   | discouraged  | preferred         | cross-platform           |
| `platformAuthenticator` | required     | required          | platform                 |

### 3. Authentication Options

**Endpoint**: `POST /api/webauthn/authenticate/options`

**Description**: Generate authentication challenge and return PublicKeyCredentialRequestOptionsJSON

**Request**:

```json
{
  "username": "john.doe"
}
```

**Request Fields**:

- `username` (string, optional): Username hint (for discoverable credentials, can be omitted)

**Response**:

```json
{
  "challenge": "base64url-encoded-challenge",
  "timeout": 60000,
  "rpId": "localhost",
  "allowCredentials": [
    {
      "type": "public-key",
      "id": "base64url-encoded-credential-id",
      "transports": ["internal", "hybrid"]
    }
  ],
  "userVerification": "preferred"
}
```

**Behavior**:

- If `username` is provided: Returns `allowCredentials` with user's registered credentials
- If `username` is omitted: Returns empty `allowCredentials` for discoverable credential flow

### 4. Registration Verification

**Endpoint**: `POST /api/webauthn/register/verify`

**Description**: Verify registration response and store credential

**Request** (from ngx-webauthn `RegistrationResponse`):

```json
{
  "success": true,
  "credentialId": "base64url-encoded-credential-id",
  "publicKey": "base64url-encoded-public-key",
  "transports": ["internal"],
  "rawResponse": {
    "credentialId": "base64url-encoded-credential-id",
    "publicKey": "base64url-encoded-public-key",
    "attestationObject": "base64url-encoded-attestation-object",
    "clientDataJSON": "base64url-encoded-client-data-json",
    "transports": ["internal"]
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Registration successful",
  "credentialId": "base64url-encoded-credential-id"
}
```

**Verification Steps**:

1. Parse `clientDataJSON` from base64url
2. Verify `type` is "webauthn.create"
3. Verify `challenge` matches stored challenge
4. Verify `origin` matches expected origin
5. Parse `attestationObject` from base64url
6. Extract credential public key from attestation
7. Store user and credential in memory

### 5. Authentication Verification

**Endpoint**: `POST /api/webauthn/authenticate/verify`

**Description**: Verify authentication response

**Request** (from ngx-webauthn `AuthenticationResponse`):

```json
{
  "success": true,
  "credentialId": "base64url-encoded-credential-id",
  "userHandle": "base64url-encoded-user-id",
  "rawResponse": {
    "credentialId": "base64url-encoded-credential-id",
    "authenticatorData": "base64url-encoded-authenticator-data",
    "clientDataJSON": "base64url-encoded-client-data-json",
    "signature": "base64url-encoded-signature",
    "userHandle": "base64url-encoded-user-id"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Authentication successful",
  "username": "john.doe"
}
```

**Verification Steps**:

1. Parse `clientDataJSON` from base64url
2. Verify `type` is "webauthn.get"
3. Verify `challenge` matches stored challenge
4. Verify `origin` matches expected origin
5. Retrieve stored credential by `credentialId`
6. Parse `authenticatorData` and extract RP ID hash, flags, and counter
7. Verify signature using stored public key
8. Update credential counter
9. Return success with username

## Project Structure

```
apps/webauthn-backend/
├── package.json                 # Dependencies and scripts
├── server.js                    # Main entry point
├── README.md                    # This file
├── src/
│   ├── config/
│   │   └── index.js           # Configuration management
│   ├── middleware/
│   │   ├── cors.js            # CORS middleware
│   │   ├── errorHandler.js     # Global error handler
│   │   └── logger.js          # Request logging middleware
│   ├── routes/
│   │   ├── index.js           # Route aggregation
│   │   ├── health.js          # Health check endpoint
│   │   ├── register.js        # Registration endpoints
│   │   └── authenticate.js    # Authentication endpoints
│   ├── controllers/
│   │   ├── healthController.js      # Health check handler
│   │   ├── registerController.js   # Registration handlers
│   │   └── authenticateController.js # Authentication handlers
│   ├── services/
│   │   ├── challengeService.js   # Challenge generation and storage
│   │   ├── credentialService.js  # Credential storage and retrieval
│   │   ├── storageService.js    # In-memory storage implementation
│   │   └── webauthnService.js   # WebAuthn verification logic
│   └── utils/
│       ├── crypto.js          # Cryptographic utilities
│       └── base64url.js      # Base64url encoding/decoding
```

## Testing with curl

### Health Check

```bash
curl http://localhost:3001/api/health
```

### Get Registration Options

```bash
curl -X POST http://localhost:3001/api/webauthn/register/options \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "displayName": "Test User",
    "preset": "passkey"
  }'
```

### Get Authentication Options

```bash
curl -X POST http://localhost:3001/api/webauthn/authenticate/options \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'
```

## Integration with ngx-webauthn

### Configure Frontend

In your Angular application, configure the WebAuthn service:

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideWebAuthn, WebAuthnConfig } from '@ngx-webauthn/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideWebAuthn({
      relyingParty: {
        name: 'WebAuthn Demo',
        id: 'localhost',
      },
      remoteEndpoints: {
        registration: 'http://localhost:3001/api/webauthn/register/options',
        authentication: 'http://localhost:3001/api/webauthn/authenticate/options',
      },
    } as WebAuthnConfig),
  ],
};
```

### Test Registration Flow

1. Frontend calls `webauthnService.register()` with username
2. Backend generates challenge and returns options
3. Frontend creates credential using WebAuthn API
4. Frontend sends registration response to backend
5. Backend verifies and stores credential

### Test Authentication Flow

1. Frontend calls `webauthnService.authenticate()` with username
2. Backend generates challenge and returns options
3. Frontend gets assertion using WebAuthn API
4. Frontend sends authentication response to backend
5. Backend verifies and returns success

## Security Considerations

### Challenge Security

- Uses cryptographically secure random challenges (32 bytes)
- Stores challenges with expiration (10 minutes)
- Deletes challenges after use to prevent replay attacks

### Origin Validation

- Always validates the origin in clientDataJSON
- Use HTTPS in production
- Configure CORS properly

### Counter Replay Protection

- Implements signature counter verification
- Detects and prevents replay attacks
- Logs counter mismatches for security monitoring

### User Verification

- Supports different user verification levels (preferred, required)
- Handles authenticators without user verification gracefully

### Credential Storage

- Stores public keys securely
- Never stores private keys
- Consider encryption for production deployments

## Troubleshooting

### CORS Errors

**Symptom**: Browser shows CORS error when making requests

**Solution**:

- Verify `CORS_ORIGINS` environment variable includes your frontend URL
- Check that CORS middleware is configured correctly
- Ensure the origin in the request matches exactly (including protocol and port)

### Challenge Expired

**Symptom**: "Challenge expired" error during verification

**Solution**:

- Increase `CHALLENGE_TIMEOUT` environment variable (default: 10 minutes)
- Ensure frontend completes the WebAuthn flow within the timeout
- Check that system time is synchronized

### Origin Mismatch

**Symptom**: "Origin mismatch" error during verification

**Solution**:

- Verify `ORIGIN` environment variable matches your frontend URL exactly
- Check that `ENFORCE_ORIGIN` is set to `true` (default)
- Ensure the origin includes protocol, hostname, and port

### Credential Not Found

**Symptom**: "Credential not found" error during authentication

**Solution**:

- Verify registration completed successfully
- Check that credential ID is being sent correctly
- Ensure in-memory storage hasn't been cleared (server restart)

### Invalid Signature

**Symptom**: "Invalid signature" error during authentication

**Solution**:

- Verify public key was stored correctly during registration
- Check that signature verification is implemented correctly
- Ensure authenticatorData and clientDataJSON are parsed correctly

**Note**: For the demo implementation, signature verification is simplified. For production, implement full signature verification using the stored public key.

### Server Won't Start

**Symptom**: "EADDRINUSE" error when starting server

**Solution**:

- Check if another process is using the port
- Change the `PORT` environment variable
- Kill the process using the port

```bash
# Find process using port 3001
netstat -ano | findstr :3001  # Windows
lsof -i :3001  # macOS/Linux

# Kill the process
taskkill /PID <PID> /F  # Windows
kill -9 <PID>  # macOS/Linux
```

## Production Recommendations

### Database

Replace in-memory storage with a proper database:

- PostgreSQL, MySQL, or MongoDB for persistent storage
- Store credentials with encryption at rest
- Implement proper indexing for performance

### Session Management

- Implement proper session management
- Use secure, HTTP-only cookies
- Implement CSRF protection

### Rate Limiting

- Implement rate limiting on API endpoints
- Prevent brute force attacks
- Use libraries like `express-rate-limit`

### Monitoring

- Implement logging and monitoring
- Track authentication attempts
- Alert on suspicious activity

### Scalability

- Use a load balancer for high availability
- Implement horizontal scaling
- Consider using Redis for distributed challenge storage

## License

MIT

## Support

For issues or questions, please refer to the ngx-webauthn documentation or the WebAuthn specification: https://www.w3.org/TR/webauthn/
