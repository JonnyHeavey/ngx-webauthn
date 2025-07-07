/**
 * Enhanced WebAuthn Error Classes
 * Provides specific, actionable error types for better developer experience
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
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base WebAuthn error class with additional context
 */
export class WebAuthnError extends Error {
  constructor(
    public readonly type: WebAuthnErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }

  static fromDOMException(error: DOMException): WebAuthnError {
    const type = WebAuthnError.mapDOMExceptionToType(error.name);
    return new WebAuthnError(type, error.message, error);
  }

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
 * Error thrown when user cancels the WebAuthn operation
 */
export class UserCancelledError extends WebAuthnError {
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
 * Error thrown when there's an issue with the authenticator
 */
export class AuthenticatorError extends WebAuthnError {
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
 * Error thrown when the provided options are invalid
 */
export class InvalidOptionsError extends WebAuthnError {
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
 * Error thrown when the requested operation is not supported
 */
export class UnsupportedOperationError extends WebAuthnError {
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
 * Error thrown when there's a network-related issue
 */
export class NetworkError extends WebAuthnError {
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
 * Error thrown when there's a security-related issue
 */
export class SecurityError extends WebAuthnError {
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
 * Error thrown when the operation times out
 */
export class TimeoutError extends WebAuthnError {
  constructor(message: string, originalError?: Error) {
    super(
      WebAuthnErrorType.TIMEOUT_ERROR,
      `Timeout error: ${message}`,
      originalError
    );
    this.name = 'TimeoutError';
  }
}
