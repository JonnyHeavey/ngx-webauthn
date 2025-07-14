/**
 * Enhanced WebAuthn Error Classes
 * Provides specific, actionable error types for better developer experience
 */

/**
 * Enumeration of WebAuthn error types for categorizing different failure scenarios.
 * Provides semantic error classification for better error handling and user experience.
 */
export enum WebAuthnErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  USER_CANCELLED = 'USER_CANCELLED',
  AUTHENTICATOR_ERROR = 'AUTHENTICATOR_ERROR',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  REMOTE_ENDPOINT_ERROR = 'REMOTE_ENDPOINT_ERROR',
  INVALID_REMOTE_OPTIONS = 'INVALID_REMOTE_OPTIONS',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base WebAuthn error class that provides enhanced error information.
 * All WebAuthn-specific errors extend from this class for consistent error handling.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.register(config);
 * } catch (error) {
 *   if (error instanceof WebAuthnError) {
 *     console.log('Error type:', error.type);
 *     console.log('Original error:', error.originalError);
 *   }
 * }
 * ```
 */
export class WebAuthnError extends Error {
  /**
   * Creates a new WebAuthnError instance.
   *
   * @param type The semantic error type
   * @param message Human-readable error message
   * @param originalError The original error that caused this WebAuthn error (optional)
   */
  constructor(
    public readonly type: WebAuthnErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }

  /**
   * Factory method to create WebAuthnError from DOMException.
   * Maps browser DOMException types to semantic WebAuthn error types.
   *
   * @param error The DOMException thrown by WebAuthn API
   * @returns Appropriate WebAuthnError subclass based on the DOMException type
   */
  static fromDOMException(error: DOMException): WebAuthnError {
    const type = WebAuthnError.mapDOMExceptionToType(error.name);
    return new WebAuthnError(type, error.message, error);
  }

  /**
   * Maps DOMException names to WebAuthn error types.
   * Provides semantic classification of browser-level errors.
   *
   * @param name The DOMException name
   * @returns Corresponding WebAuthnErrorType
   * @private
   */
  private static mapDOMExceptionToType(name: string): WebAuthnErrorType {
    switch (name) {
      case 'NotSupportedError':
        return WebAuthnErrorType.NOT_SUPPORTED;
      case 'NotAllowedError':
        return WebAuthnErrorType.USER_CANCELLED;
      case 'InvalidStateError':
        return WebAuthnErrorType.AUTHENTICATOR_ERROR;
      case 'SecurityError':
        return WebAuthnErrorType.SECURITY_ERROR;
      case 'TimeoutError':
        return WebAuthnErrorType.TIMEOUT_ERROR;
      case 'NetworkError':
        return WebAuthnErrorType.NETWORK_ERROR;
      case 'EncodingError':
        return WebAuthnErrorType.INVALID_OPTIONS;
      default:
        return WebAuthnErrorType.UNKNOWN;
    }
  }
}

/**
 * Error thrown when the user cancels a WebAuthn operation.
 * This is the most common error and typically requires no action from the developer.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.register(config);
 * } catch (error) {
 *   if (error instanceof UserCancelledError) {
 *     // User chose not to proceed - this is normal behavior
 *     console.log('User cancelled the operation');
 *   }
 * }
 * ```
 */
export class UserCancelledError extends WebAuthnError {
  /**
   * Creates a new UserCancelledError.
   *
   * @param originalError The original DOMException that triggered this error (optional)
   */
  constructor(originalError?: Error) {
    super(
      WebAuthnErrorType.USER_CANCELLED,
      'User cancelled the WebAuthn operation',
      originalError
    );
    this.name = 'UserCancelledError';
  }
}

/**
 * Error thrown when there's an issue with the authenticator device.
 * This could indicate hardware problems, invalid state, or other device-specific issues.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.authenticate(config);
 * } catch (error) {
 *   if (error instanceof AuthenticatorError) {
 *     // Show user-friendly message about trying again or using different authenticator
 *     console.log('Authenticator issue:', error.message);
 *   }
 * }
 * ```
 */
export class AuthenticatorError extends WebAuthnError {
  /**
   * Creates a new AuthenticatorError.
   *
   * @param message Descriptive error message
   * @param originalError The original error that caused this authenticator error (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.AUTHENTICATOR_ERROR,
      `Authenticator error: ${message}`,
      originalError
    );
    this.name = 'AuthenticatorError';
  }
}

/**
 * Error thrown when the provided WebAuthn options are invalid or malformed.
 * This typically indicates a programming error in option construction.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.register(invalidConfig);
 * } catch (error) {
 *   if (error instanceof InvalidOptionsError) {
 *     // Check your configuration and options
 *     console.error('Invalid options provided:', error.message);
 *   }
 * }
 * ```
 */
export class InvalidOptionsError extends WebAuthnError {
  /**
   * Creates a new InvalidOptionsError.
   *
   * @param message Descriptive error message explaining what's invalid
   * @param originalError The original error that revealed the invalid options (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.INVALID_OPTIONS,
      `Invalid options: ${message}`,
      originalError
    );
    this.name = 'InvalidOptionsError';
  }
}

/**
 * Error thrown when a WebAuthn operation is not supported in the current environment.
 * This could be due to browser limitations or missing hardware capabilities.
 *
 * @example
 * ```typescript
 * if (!webAuthnService.isSupported()) {
 *   // Handle unsupported environment
 * }
 *
 * try {
 *   await webAuthnService.register(config);
 * } catch (error) {
 *   if (error instanceof UnsupportedOperationError) {
 *     // Show fallback authentication method
 *     console.log('WebAuthn not supported, using fallback');
 *   }
 * }
 * ```
 */
export class UnsupportedOperationError extends WebAuthnError {
  /**
   * Creates a new UnsupportedOperationError.
   *
   * @param message Descriptive error message explaining what's not supported
   * @param originalError The original error that indicated lack of support (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.UNSUPPORTED_OPERATION,
      `Unsupported operation: ${message}`,
      originalError
    );
    this.name = 'UnsupportedOperationError';
  }
}

/**
 * Error thrown when there's a network-related issue during WebAuthn operations.
 * This is rare but can occur in certain network conditions.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.authenticate(config);
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     // Suggest user check connection and retry
 *     console.log('Network issue during authentication:', error.message);
 *   }
 * }
 * ```
 */
export class NetworkError extends WebAuthnError {
  /**
   * Creates a new NetworkError.
   *
   * @param message Descriptive error message about the network issue
   * @param originalError The original network-related error (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.NETWORK_ERROR,
      `Network error: ${message}`,
      originalError
    );
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when a security violation occurs during WebAuthn operations.
 * This typically indicates issues with origin validation or other security checks.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.register(config);
 * } catch (error) {
 *   if (error instanceof SecurityError) {
 *     // Security issue - check origin, HTTPS, etc.
 *     console.error('Security violation:', error.message);
 *   }
 * }
 * ```
 */
export class SecurityError extends WebAuthnError {
  /**
   * Creates a new SecurityError.
   *
   * @param message Descriptive error message about the security issue
   * @param originalError The original security-related error (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.SECURITY_ERROR,
      `Security error: ${message}`,
      originalError
    );
    this.name = 'SecurityError';
  }
}

/**
 * Error thrown when a WebAuthn operation times out.
 * This can happen when the user takes too long to interact with their authenticator.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.register(config);
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     // Suggest user try again and respond more quickly
 *     console.log('Operation timed out - please try again');
 *   }
 * }
 * ```
 */
export class TimeoutError extends WebAuthnError {
  /**
   * Creates a new TimeoutError.
   *
   * @param message Descriptive error message about the timeout
   * @param originalError The original timeout-related error (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.TIMEOUT_ERROR,
      `Timeout error: ${message}`,
      originalError
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Context information for remote endpoint errors (security-conscious)
 */
export interface RemoteErrorContext {
  readonly url: string;
  readonly method: string;
  readonly operation: 'registration' | 'authentication';
  readonly status?: number;
  readonly statusText?: string;
  // Intentionally excludes request/response bodies for security
}

/**
 * Error thrown when remote endpoint request fails.
 * Includes network errors, HTTP errors, and timeout errors.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.registerRemote(request);
 * } catch (error) {
 *   if (error instanceof RemoteEndpointError) {
 *     console.log('Endpoint:', error.context.url);
 *     console.log('Status:', error.context.status);
 *   }
 * }
 * ```
 */
export class RemoteEndpointError extends WebAuthnError {
  /**
   * Creates a new RemoteEndpointError.
   *
   * @param message Descriptive error message about the remote endpoint failure
   * @param context Contextual information about the failed request
   * @param originalError The original error that caused this remote endpoint error (optional)
   */
  constructor(
    message: string,
    public readonly context: RemoteErrorContext,
    originalError?: Error
  ) {
    super(
      WebAuthnErrorType.REMOTE_ENDPOINT_ERROR,
      `Remote endpoint error: ${message}`,
      originalError
    );
    this.name = 'RemoteEndpointError';
  }
}

/**
 * Error thrown when remote server returns invalid WebAuthn options.
 * This indicates the server response doesn't match expected WebAuthn option format.
 *
 * @example
 * ```typescript
 * try {
 *   await webAuthnService.registerRemote(request);
 * } catch (error) {
 *   if (error instanceof InvalidRemoteOptionsError) {
 *     console.log('Invalid server response:', error.message);
 *   }
 * }
 * ```
 */
export class InvalidRemoteOptionsError extends WebAuthnError {
  /**
   * Creates a new InvalidRemoteOptionsError.
   *
   * @param message Descriptive error message about the invalid remote options
   * @param originalError The original error that revealed the invalid options (optional)
   */
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.INVALID_REMOTE_OPTIONS,
      `Invalid remote options: ${message}`,
      originalError
    );
    this.name = 'InvalidRemoteOptionsError';
  }
}
