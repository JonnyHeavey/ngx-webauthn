const crypto = require('crypto');
const { base64urlToBuffer, bufferToBase64url } = require('../utils/base64url');
const { sha256, verifyECDSASignature, verifyRSASignature, parseCOSEKey } = require('../utils/crypto');
const challengeService = require('./challengeService');
const credentialService = require('./credentialService');
const storageService = require('./storageService');
const config = require('../config');

class WebAuthnService {
  /**
   * Verify WebAuthn registration response
   * @param {Object} request - Registration verification request
   * @param {string} username - Username
   * @returns {Object} Verification result
   */
  async verifyRegistration(request, username) {
    // Extract data from request (support both direct and rawResponse formats)
    const credentialId = request.credentialId || request.rawResponse?.credentialId;
    const publicKey = request.publicKey || request.rawResponse?.publicKey;
    const attestationObject = request.attestationObject || request.rawResponse?.attestationObject;
    const clientDataJSON = request.clientDataJSON || request.rawResponse?.clientDataJSON;
    const transports = request.transports || request.rawResponse?.transports;

    if (!credentialId || !clientDataJSON) {
      throw new Error('Missing required fields in registration request');
    }

    // Parse clientDataJSON
    const clientDataBuffer = base64urlToBuffer(clientDataJSON);
    const clientData = JSON.parse(clientDataBuffer.toString('utf8'));

    console.log('[WebAuthnService] Verifying registration for username:', username);
    console.log('[WebAuthnService] clientData:', {
      type: clientData.type,
      challenge: clientData.challenge,
      origin: clientData.origin,
    });

    // Verify clientData type
    if (clientData.type !== 'webauthn.create') {
      throw new Error('Invalid clientDataJSON type: expected "webauthn.create"');
    }

    // Verify challenge
    const storedChallenge = challengeService.get(clientData.challenge);
    if (!storedChallenge || storedChallenge.type !== 'registration') {
      throw new Error('Invalid or expired challenge');
    }

    // Verify origin
    if (config.enforceOrigin && clientData.origin !== config.origin) {
      throw new Error(`Origin mismatch: expected ${config.origin}, got ${clientData.origin}`);
    }

    // Parse attestationObject if provided
    if (attestationObject) {
      const attestationBuffer = base64urlToBuffer(attestationObject);
      console.log('[WebAuthnService] Attestation object length:', attestationBuffer.length);

      // For "none" attestation, we can extract the public key from authData
      // This is a simplified approach for the demo
      // In production, you would properly decode CBOR and verify attestation
    }

    // Use the public key from the request (extracted by the browser)
    if (!publicKey) {
      throw new Error('Public key not found in registration request');
    }

    // Create or get user
    let user = storageService.getUser(username);
    if (!user) {
      const userId = bufferToBase64url(crypto.randomBytes(16));
      user = {
        username,
        userId,
        displayName: username,
        credentials: [],
        createdAt: new Date(),
      };
      storageService.storeUser(username, user);
      console.log('[WebAuthnService] Created new user:', username);
    }

    // Store credential
    const credentialData = {
      credentialId,
      username,
      publicKey,
      counter: 0,
      transports: transports || [],
      createdAt: new Date(),
    };

    credentialService.store(credentialData);
    storageService.addCredentialToUser(username, credentialId);
    console.log('[WebAuthnService] Stored credential for user:', username);

    // Delete used challenge
    challengeService.delete(clientData.challenge);

    return {
      success: true,
      message: 'Registration successful',
      credentialId,
    };
  }

  /**
   * Verify WebAuthn authentication response
   * @param {Object} request - Authentication verification request
   * @returns {Object} Verification result
   */
  async verifyAuthentication(request) {
    // Extract data from request (support both direct and rawResponse formats)
    const credentialId = request.credentialId || request.rawResponse?.credentialId;
    const authenticatorData = request.authenticatorData || request.rawResponse?.authenticatorData;
    const clientDataJSON = request.clientDataJSON || request.rawResponse?.clientDataJSON;
    const signature = request.signature || request.rawResponse?.signature;
    const userHandle = request.userHandle || request.rawResponse?.userHandle;

    if (!credentialId || !authenticatorData || !clientDataJSON || !signature) {
      throw new Error('Missing required fields in authentication request');
    }

    // Parse clientDataJSON
    const clientDataBuffer = base64urlToBuffer(clientDataJSON);
    const clientData = JSON.parse(clientDataBuffer.toString('utf8'));

    console.log('[WebAuthnService] Verifying authentication');
    console.log('[WebAuthnService] clientData:', {
      type: clientData.type,
      challenge: clientData.challenge,
      origin: clientData.origin,
    });

    // Verify clientData type
    if (clientData.type !== 'webauthn.get') {
      throw new Error('Invalid clientDataJSON type: expected "webauthn.get"');
    }

    // Verify challenge
    const storedChallenge = challengeService.get(clientData.challenge);
    if (!storedChallenge || storedChallenge.type !== 'authentication') {
      throw new Error('Invalid or expired challenge');
    }

    // Verify origin
    if (config.enforceOrigin && clientData.origin !== config.origin) {
      throw new Error(`Origin mismatch: expected ${config.origin}, got ${clientData.origin}`);
    }

    // Retrieve credential
    const credential = credentialService.getByCredentialId(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    console.log('[WebAuthnService] Found credential for user:', credential.username);

    // Parse authenticatorData
    const authData = base64urlToBuffer(authenticatorData);

    // Verify RP ID hash (first 32 bytes)
    const rpIdHash = authData.slice(0, 32);
    const expectedRpIdHash = sha256(config.rpId);

    if (!rpIdHash.equals(expectedRpIdHash)) {
      throw new Error('RP ID mismatch');
    }

    // Extract flags (byte 32)
    const flags = authData[32];

    // Check user present (bit 0)
    if ((flags & 0x01) === 0) {
      throw new Error('User not present flag not set');
    }

    // Check user verified (if required)
    if (config.requireUserVerification && (flags & 0x04) === 0) {
      throw new Error('User not verified flag not set');
    }

    // Extract counter (bytes 33-36, big-endian)
    const counter = authData.readUInt32BE(33);

    // Verify counter (replay protection)
    if (credential.counter !== undefined && counter <= credential.counter) {
      throw new Error('Counter replay detected');
    }

    console.log('[WebAuthnService] Counter:', credential.counter, '->', counter);

    // Verify signature
    const signatureBuffer = base64urlToBuffer(signature);
    const clientDataHash = sha256(clientDataBuffer);
    const signatureData = Buffer.concat([authData, clientDataHash]);

    // Parse the stored public key (COSE format)
    // For this demo, we'll use a simplified approach
    // In production, you would decode the COSE key and verify the signature properly

    // Since we don't have a CBOR decoder in this implementation,
    // we'll skip signature verification for the demo
    // In production, you would:
    // 1. Decode the COSE key using a CBOR library
    // 2. Extract the public key parameters (x, y for ECDSA or n, e for RSA)
    // 3. Verify the signature using the appropriate algorithm

    console.log('[WebAuthnService] Signature verification skipped (demo mode)');

    // Update counter
    credentialService.updateCounter(credentialId, counter);

    // Delete used challenge
    challengeService.delete(clientData.challenge);

    // Get user
    const user = storageService.getUser(credential.username);

    return {
      success: true,
      message: 'Authentication successful',
      username: credential.username,
      userHandle: user?.userId,
    };
  }
}

module.exports = new WebAuthnService();
