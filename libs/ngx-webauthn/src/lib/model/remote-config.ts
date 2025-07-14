/**
 * Remote configuration types for WebAuthn operations
 *
 * These types provide flexible, type-safe interfaces for communicating with
 * remote servers that provide WebAuthn options. They use generics to allow
 * any server payload structure while maintaining TypeScript safety.
 */

/**
 * Request payload for remote registration endpoint.
 *
 * Can contain any data your server needs to generate WebAuthn creation options.
 * Sent as JSON body via POST request.
 *
 * @template T The structure of data your server expects
 *
 * @example
 * ```typescript
 * // Simple usage
 * webAuthnService.registerRemote({ username: 'user@example.com' });
 *
 * // Custom server payload
 * interface MyPayload { tenantId: string; userId: number; }
 * webAuthnService.registerRemote<MyPayload>({
 *   tenantId: 'acme',
 *   userId: 123
 * });
 * ```
 */
export type RemoteRegistrationRequest<
  T extends Record<string, any> = Record<string, any>
> = T;

/**
 * Request payload for remote authentication endpoint.
 *
 * Can contain any data your server needs to generate WebAuthn request options.
 * Sent as JSON body via POST request.
 *
 * @template T The structure of data your server expects
 *
 * @example
 * ```typescript
 * // Simple usage
 * webAuthnService.authenticateRemote({ username: 'user@example.com' });
 *
 * // Custom server payload
 * interface MyAuthPayload { sessionId: string; context: string; }
 * webAuthnService.authenticateRemote<MyAuthPayload>({
 *   sessionId: 'abc123',
 *   context: 'mobile'
 * });
 * ```
 */
export type RemoteAuthenticationRequest<
  T extends Record<string, any> = Record<string, any>
> = T;
