import { Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import {
  AuthenticateConfig,
  AuthenticationResponse,
  AuthenticatorError,
  InvalidRemoteOptionsError,
  PresetName,
  RegisterConfig,
  RegistrationResponse,
  RemoteEndpointError,
  UnsupportedOperationError,
  UserCancelledError,
  WebAuthnError,
  WebAuthnService,
  WebAuthnSupport,
} from 'ngx-webauthn';
import { tap } from 'rxjs/operators';

interface StoredCredential {
  id: string;
  name: string;
  displayName: string;
  createdAt: Date;
  transports?: string[];
}

@Component({
  selector: 'app-webauthn-demo',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    MatSelectModule,
  ],
  template: `
    <div class="demo-container" [class.remote-mode-active]="useRemoteMode()">
      <!-- Prominent Mode Selection Header -->
      <mat-card class="mode-header-card">
        <mat-card-content>
          <div class="mode-header-content">
            <div class="mode-title-section">
              <h2 class="mode-title">
                <mat-icon>fingerprint</mat-icon>
                WebAuthn Demo
              </h2>
              @if (useRemoteMode()) {
              <div class="remote-badge">
                <mat-icon>cloud</mat-icon>
                Remote Mode Active
              </div>
              } @else {
              <div class="mock-badge">
                <mat-icon>offline_bolt</mat-icon>
                Mock Mode
              </div>
              }
            </div>

            @if (remoteModeAvailable()) {
            <div class="mode-toggle-section">
              <div class="mode-toggle-label">
                <strong>Select Operation Mode:</strong>
                <p class="mode-toggle-subtitle">
                  Choose how WebAuthn challenges are generated
                </p>
              </div>

              <div class="mode-toggle-buttons">
                <button
                  mat-stroked-button
                  [color]="!useRemoteMode() ? 'primary' : ''"
                  [class.active-mode]="!useRemoteMode()"
                  (click)="!useRemoteMode() && toggleMode()"
                  class="mode-button"
                >
                  <mat-icon>offline_bolt</mat-icon>
                  <div class="mode-button-content">
                    <strong>Mock Mode</strong>
                    <span class="mode-button-desc">
                      Challenges generated locally (for testing)
                    </span>
                  </div>
                </button>

                <button
                  mat-stroked-button
                  [color]="useRemoteMode() ? 'primary' : ''"
                  [class.active-mode]="useRemoteMode()"
                  (click)="useRemoteMode() && toggleMode()"
                  class="mode-button"
                >
                  <mat-icon>cloud</mat-icon>
                  <div class="mode-button-content">
                    <strong>Remote Mode</strong>
                    <span class="mode-button-desc">
                      Challenges from backend server (production)
                    </span>
                  </div>
                </button>
              </div>

              @if (useRemoteMode()) {
              <div class="backend-status-section">
                <div class="backend-status-header">
                  <strong>Backend Connection Status:</strong>
                  <button
                    mat-mini-fab
                    color="primary"
                    (click)="checkBackendConnection()"
                    matTooltip="Test connection to backend"
                    class="test-connection-btn"
                  >
                    <mat-icon>refresh</mat-icon>
                  </button>
                </div>

                <div
                  class="backend-status-indicator"
                  [class.connected]="backendConnected()"
                  [class.disconnected]="!backendConnected()"
                >
                  <div class="status-icon">
                    <mat-icon>
                      {{ backendConnected() ? 'check_circle' : 'error' }}
                    </mat-icon>
                  </div>
                  <div class="status-text">
                    <strong>
                      {{
                        backendConnected()
                          ? 'Backend Connected'
                          : 'Backend Disconnected'
                      }}
                    </strong>
                    <span class="status-detail">
                      @if (backendConnected()) { Server is running and
                      responding } @else { Cannot connect to backend server }
                    </span>
                  </div>
                </div>

                @if (backendConnectionError()) {
                <div class="backend-error-panel">
                  <mat-icon class="error-icon">warning</mat-icon>
                  <div class="error-content">
                    <strong>Connection Error</strong>
                    <p>{{ backendConnectionError() }}</p>
                    <div class="error-actions">
                      <strong>To fix this:</strong>
                      <ol>
                        <li>Start the backend server</li>
                        <li>
                          Run: <code>npm run backend:start</code> in terminal
                        </li>
                        <li>Wait for server to start</li>
                        <li>Click the refresh button to test connection</li>
                      </ol>
                    </div>
                  </div>
                </div>
                }
              </div>
              }
            </div>
            } @else {
            <div class="mode-unavailable">
              <mat-icon>info</mat-icon>
              <div>
                <strong>Remote Mode Unavailable</strong>
                <p>
                  Remote mode is only available when running on localhost for
                  security reasons.
                </p>
              </div>
            </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Mode Information Panel -->
      <mat-card class="mode-info-card">
        <mat-card-content>
          <mat-expansion-panel [expanded]="!useRemoteMode()">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>info</mat-icon>
                Understanding WebAuthn Modes
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="mode-info-content">
              <div class="mode-info-section">
                <h3>
                  <mat-icon>offline_bolt</mat-icon>
                  Mock Mode
                </h3>
                <p>
                  <strong>What it does:</strong> Generates WebAuthn challenges
                  locally in the browser using JavaScript.
                </p>
                <p>
                  <strong>When to use:</strong> Quick testing, development, or
                  when you don't have a backend server running.
                </p>
                <p>
                  <strong>Security Note:</strong> This is for demonstration
                  only. In production, challenges MUST be generated by your
                  backend server to prevent replay attacks.
                </p>
              </div>

              <mat-divider></mat-divider>

              <div class="mode-info-section">
                <h3>
                  <mat-icon>cloud</mat-icon>
                  Remote Mode
                </h3>
                <p>
                  <strong>What it does:</strong> Fetches WebAuthn challenges
                  from a backend server via HTTP API.
                </p>
                <p>
                  <strong>When to use:</strong> Production applications,
                  security testing, or when you need to verify credentials on
                  the server.
                </p>
                <p>
                  <strong>Why it's important:</strong> The backend server
                  generates cryptographically secure challenges and can verify
                  credential responses, providing complete end-to-end security.
                </p>
                <div class="remote-benefits">
                  <strong>Benefits:</strong>
                  <ul>
                    <li>✓ Secure challenge generation</li>
                    <li>✓ Server-side credential verification</li>
                    <li>✓ Prevents replay attacks</li>
                    <li>✓ Production-ready security</li>
                  </ul>
                </div>
              </div>

              @if (useRemoteMode()) {
              <div class="getting-started-panel">
                <h3>
                  <mat-icon>rocket_launch</mat-icon>
                  Getting Started with Remote Mode
                </h3>
                <ol class="getting-started-steps">
                  <li>
                    <strong>Ensure backend is running:</strong>
                    <code>npm run backend:start</code>
                  </li>
                  <li>
                    <strong>Check connection status:</strong> Look for the green
                    "Backend Connected" indicator above
                  </li>
                  <li>
                    <strong>Register a credential:</strong> Go to the "Preset
                    Registration" tab and fill in your details
                  </li>
                  <li>
                    <strong>Observe the challenge:</strong> Notice the
                    "Server-Generated Challenge" that appears below
                  </li>
                  <li>
                    <strong>Authenticate:</strong> Use the "Preset
                    Authentication" tab to test login
                  </li>
                </ol>
                <div class="expected-behavior">
                  <strong>Expected behavior:</strong>
                  <ul>
                    <li>
                      Registration and authentication will make HTTP requests to
                      the backend
                    </li>
                    <li>
                      You'll see server-generated challenges displayed in the UI
                    </li>
                    <li>
                      All operations are logged to the browser console for
                      debugging
                    </li>
                  </ul>
                </div>
              </div>
              }
            </div>
          </mat-expansion-panel>
        </mat-card-content>
      </mat-card>

      <!-- Server Challenge Display -->
      @if (useRemoteMode() && serverChallenge()) {
      <mat-card class="challenge-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>vpn_key</mat-icon>
            Server-Generated Challenge
          </mat-card-title>
          <mat-card-subtitle>
            This challenge was securely generated by the backend server
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="challenge-display">
            <div class="challenge-label">
              <strong>Challenge Value:</strong>
            </div>
            <div class="challenge-value">
              <code>{{ serverChallenge() }}</code>
            </div>
            <div class="challenge-explanation">
              <mat-icon>info</mat-icon>
              <p>
                This is a cryptographically secure random challenge generated by
                your backend server. It ensures that each WebAuthn operation is
                unique and prevents replay attacks.
              </p>
              <p class="challenge-note">
                <strong>Note:</strong> In production, the server would also
                verify the credential response to ensure authenticity.
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      }

      <!-- Browser Support Card -->
      <mat-card class="support-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>devices</mat-icon>
            Browser Support
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="support-info">
            <div class="support-chips">
              <mat-chip-set>
                <mat-chip [color]="support().isSupported ? 'primary' : 'warn'">
                  <mat-icon>{{
                    support().isSupported ? 'check_circle' : 'error'
                  }}</mat-icon>
                  WebAuthn
                  {{ support().isSupported ? 'Supported' : 'Not Supported' }}
                </mat-chip>
                <mat-chip
                  [color]="
                    support().isPlatformAuthenticatorAvailable
                      ? 'primary'
                      : 'warn'
                  "
                >
                  <mat-icon>{{
                    support().isPlatformAuthenticatorAvailable
                      ? 'check_circle'
                      : 'error'
                  }}</mat-icon>
                  Platform Authenticator
                  {{
                    support().isPlatformAuthenticatorAvailable
                      ? 'Available'
                      : 'Not Available'
                  }}
                </mat-chip>
              </mat-chip-set>
            </div>
            @if (support().supportedTransports.length > 0) {
            <div class="transports">
              <strong>Supported Transports:</strong>
              <mat-chip-set>
                @for (transport of support().supportedTransports; track
                transport) {
                <mat-chip>{{ transport }}</mat-chip>
                }
              </mat-chip-set>
            </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <mat-tab-group class="demo-tabs">
        <!-- Registration Tab -->
        <mat-tab label="Preset Registration">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title
                  >Register New Credential (Using Presets)</mat-card-title
                >
                <mat-card-subtitle
                  >Create a new WebAuthn credential using preset configurations
                  for common use cases</mat-card-subtitle
                >
              </mat-card-header>
              <mat-card-content>
                <form class="registration-form">
                  <mat-form-field appearance="outline">
                    <mat-label>Username</mat-label>
                    <input
                      matInput
                      [(ngModel)]="registrationForm.username"
                      name="username"
                      required
                    />
                    <mat-icon matSuffix>person</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Display Name</mat-label>
                    <input
                      matInput
                      [(ngModel)]="registrationForm.displayName"
                      name="displayName"
                      required
                    />
                    <mat-icon matSuffix>badge</mat-icon>
                  </mat-form-field>
                </form>

                <div class="actions">
                  <button
                    mat-raised-button
                    color="primary"
                    [disabled]="isRegistering() || !isRegistrationFormValid()"
                    (click)="register()"
                  >
                    @if (isRegistering()) {
                    <mat-spinner diameter="20"></mat-spinner>
                    Registering... } @else {
                    <ng-container>
                      <mat-icon>add</mat-icon>
                      Register Credential
                    </ng-container>
                    }
                  </button>
                </div>

                @if (lastRegistrationResult()) {
                <mat-expansion-panel class="result-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon color="primary">check_circle</mat-icon>
                      Registration Successful
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <div class="result-content">
                    <p>
                      <strong>Credential ID:</strong>
                      {{
                        lastRegistrationResult()!.credentialId.substring(0, 20)
                      }}...
                    </p>
                    <p>
                      <strong>Transports:</strong>
                      {{
                        lastRegistrationResult()!.transports?.join(', ') ||
                          'None'
                      }}
                    </p>
                    <p>
                      <strong>Created:</strong>
                      {{ getCurrentDateTime() }}
                    </p>
                  </div>
                </mat-expansion-panel>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Authentication Tab -->
        <mat-tab label="Preset Authentication">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title
                  >Authenticate with Credential (Using Presets)</mat-card-title
                >
                <mat-card-subtitle
                  >Use an existing WebAuthn credential to authenticate with
                  preset configurations</mat-card-subtitle
                >
              </mat-card-header>
              <mat-card-content>
                @if (storedCredentials().length === 0) {
                <div class="no-credentials">
                  <mat-icon>info</mat-icon>
                  <p>
                    No credentials available. Please register a credential
                    first.
                  </p>
                </div>
                } @else {
                <div class="credentials-list">
                  <h3>Available Credentials</h3>
                  @for (credential of storedCredentials(); track credential.id)
                  {
                  <mat-card class="credential-card">
                    <mat-card-content>
                      <div class="credential-info">
                        <div class="credential-details">
                          <strong>{{ credential.displayName }}</strong>
                          <span class="username">{{ credential.name }}</span>
                          <span class="created"
                            >Created:
                            {{ credential.createdAt.toLocaleString() }}</span
                          >
                          @if (credential.transports &&
                          credential.transports.length > 0) {
                          <div class="transports">
                            <mat-chip-set>
                              @for (transport of credential.transports; track
                              transport) {
                              <mat-chip>{{ transport }}</mat-chip>
                              }
                            </mat-chip-set>
                          </div>
                          }
                        </div>
                        <button
                          mat-raised-button
                          color="accent"
                          [disabled]="isAuthenticating()"
                          (click)="authenticate(credential.id)"
                        >
                          @if (isAuthenticating()) {
                          <mat-spinner diameter="20"></mat-spinner>
                          Authenticating... } @else {
                          <ng-container>
                            <mat-icon>login</mat-icon>
                            Authenticate
                          </ng-container>
                          }
                        </button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                  }
                </div>

                <mat-divider></mat-divider>

                <div class="auth-all">
                  <h3>Authenticate with Any Credential</h3>
                  <p>Let the authenticator choose which credential to use</p>
                  <button
                    mat-raised-button
                    color="primary"
                    [disabled]="isAuthenticating()"
                    (click)="authenticateAny()"
                  >
                    @if (isAuthenticating()) {
                    <mat-spinner diameter="20"></mat-spinner>
                    Authenticating... } @else {
                    <ng-container>
                      <mat-icon>login</mat-icon>
                      Authenticate with Any Credential
                    </ng-container>
                    }
                  </button>
                </div>
                } @if (lastAuthenticationResult()) {
                <mat-expansion-panel class="result-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon color="primary">check_circle</mat-icon>
                      Authentication Successful
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <div class="result-content">
                    <p>
                      <strong>Credential ID:</strong>
                      {{
                        lastAuthenticationResult()!.credentialId.substring(
                          0,
                          20
                        )
                      }}...
                    </p>
                    <p>
                      <strong>User Handle:</strong>
                      {{ lastAuthenticationResult()!.userHandle || 'None' }}
                    </p>
                    <p>
                      <strong>Authenticated:</strong>
                      {{ getCurrentDateTime() }}
                    </p>
                  </div>
                </mat-expansion-panel>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Stored Credentials Tab -->
        <mat-tab label="Manage Credentials">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Stored Credentials</mat-card-title>
                <mat-card-subtitle
                  >Manage your registered WebAuthn
                  credentials</mat-card-subtitle
                >
              </mat-card-header>
              <mat-card-content>
                @if (storedCredentials().length === 0) {
                <div class="no-credentials">
                  <mat-icon>info</mat-icon>
                  <p>
                    No credentials stored. Register a credential to get started.
                  </p>
                </div>
                } @else { @for (credential of storedCredentials(); track
                credential.id) {
                <mat-card class="credential-card">
                  <mat-card-content>
                    <div class="credential-info">
                      <div class="credential-details">
                        <strong>{{ credential.displayName }}</strong>
                        <span class="username">{{ credential.name }}</span>
                        <span class="credential-id"
                          >ID: {{ credential.id.substring(0, 20) }}...</span
                        >
                        <span class="created"
                          >Created:
                          {{ credential.createdAt.toLocaleString() }}</span
                        >
                      </div>
                      <button
                        mat-button
                        color="warn"
                        (click)="removeCredential(credential.id)"
                      >
                        <mat-icon>delete</mat-icon>
                        Remove
                      </button>
                    </div>
                  </mat-card-content>
                </mat-card>
                }

                <div class="actions">
                  <button
                    mat-button
                    color="warn"
                    (click)="clearAllCredentials()"
                  >
                    <mat-icon>clear_all</mat-icon>
                    Clear All Credentials
                  </button>
                </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Direct Options Tab -->
        <mat-tab label="Direct Options">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Direct WebAuthn Options</mat-card-title>
                <mat-card-subtitle>
                  Use raw WebAuthn options for maximum control
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="direct-options-info">
                  <p>
                    This section demonstrates how to use the library with direct
                    <code>PublicKeyCredentialCreationOptions</code> and
                    <code>PublicKeyCredentialRequestOptions</code> instead of
                    presets.
                  </p>
                </div>

                <form class="direct-options-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Username</mat-label>
                      <input
                        matInput
                        [(ngModel)]="directOptionsForm.username"
                        name="directUsername"
                        required
                      />
                      <mat-icon matSuffix>person</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Display Name</mat-label>
                      <input
                        matInput
                        [(ngModel)]="directOptionsForm.displayName"
                        name="directDisplayName"
                        required
                      />
                      <mat-icon matSuffix>badge</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Timeout (ms)</mat-label>
                      <input
                        matInput
                        type="number"
                        [(ngModel)]="directOptionsForm.timeout"
                        name="directTimeout"
                        min="10000"
                        max="300000"
                      />
                      <mat-icon matSuffix>timer</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>User Verification</mat-label>
                      <mat-select
                        [(ngModel)]="directOptionsForm.userVerification"
                        name="directUserVerification"
                      >
                        <mat-option value="required">Required</mat-option>
                        <mat-option value="preferred">Preferred</mat-option>
                        <mat-option value="discouraged">Discouraged</mat-option>
                      </mat-select>
                      <mat-icon matSuffix>verified_user</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Attestation</mat-label>
                      <mat-select
                        [(ngModel)]="directOptionsForm.attestation"
                        name="directAttestation"
                      >
                        <mat-option value="none">None</mat-option>
                        <mat-option value="indirect">Indirect</mat-option>
                        <mat-option value="direct">Direct</mat-option>
                        <mat-option value="enterprise">Enterprise</mat-option>
                      </mat-select>
                      <mat-icon matSuffix>security</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Resident Key</mat-label>
                      <mat-select
                        [(ngModel)]="directOptionsForm.residentKey"
                        name="directResidentKey"
                      >
                        <mat-option value="discouraged">Discouraged</mat-option>
                        <mat-option value="preferred">Preferred</mat-option>
                        <mat-option value="required">Required</mat-option>
                      </mat-select>
                      <mat-icon matSuffix>key</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button
                      mat-raised-button
                      color="primary"
                      [disabled]="
                        isDirectRegistering() || !isDirectOptionsFormValid()
                      "
                      (click)="registerWithDirectOptions()"
                    >
                      @if (isDirectRegistering()) {
                      <mat-spinner diameter="20"></mat-spinner>
                      Creating Credential... } @else {
                      <ng-container>
                        <mat-icon>add_circle</mat-icon>
                        Register with Direct Options
                      </ng-container>
                      }
                    </button>

                    @if (storedCredentials().length > 0) {
                    <button
                      mat-raised-button
                      color="accent"
                      [disabled]="isDirectAuthenticating()"
                      (click)="authenticateWithDirectOptions()"
                    >
                      @if (isDirectAuthenticating()) {
                      <mat-spinner diameter="20"></mat-spinner>
                      Authenticating... } @else {
                      <ng-container>
                        <mat-icon>login</mat-icon>
                        Authenticate with Direct Options
                      </ng-container>
                      }
                    </button>
                    }
                  </div>
                </form>

                <div class="direct-options-example">
                  <h4>Generated Options Preview:</h4>
                  <p>
                    This shows how your form inputs translate to WebAuthn
                    options:
                  </p>
                  <pre><code>{{ getDirectOptionsPreview() }}</code></pre>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .demo-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        transition: background-color 0.3s ease;
      }

      .demo-container.remote-mode-active {
        background-color: #e3f2fd;
      }

      /* Mode Header Card */
      .mode-header-card {
        margin-bottom: 20px;
        border: 3px solid transparent;
        transition: all 0.3s ease;
      }

      .demo-container.remote-mode-active .mode-header-card {
        border-color: #2196f3;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
      }

      .mode-header-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .mode-title-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }

      .mode-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 28px;
        color: #1976d2;
      }

      .mode-title mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      .remote-badge,
      .mock-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .remote-badge {
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: white;
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
      }

      .mock-badge {
        background: linear-gradient(135deg, #757575, #616161);
        color: white;
        box-shadow: 0 2px 8px rgba(117, 117, 117, 0.4);
      }

      .remote-badge mat-icon,
      .mock-badge mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* Mode Toggle Section */
      .mode-toggle-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .mode-toggle-label {
        text-align: center;
      }

      .mode-toggle-label strong {
        display: block;
        font-size: 20px;
        color: #333;
        margin-bottom: 8px;
      }

      .mode-toggle-subtitle {
        color: #666;
        margin: 0;
        font-size: 14px;
      }

      .mode-toggle-buttons {
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .mode-button {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 16px 24px !important;
        min-width: 280px;
        border-width: 2px !important;
        transition: all 0.3s ease;
      }

      .mode-button.active-mode {
        border-width: 3px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .mode-button mat-icon {
        font-size: 32px !important;
        width: 32px !important;
        height: 32px !important;
      }

      .mode-button-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        text-align: left;
      }

      .mode-button-content strong {
        font-size: 16px;
      }

      .mode-button-desc {
        font-size: 12px;
        color: #666;
        font-weight: normal;
      }

      /* Backend Status Section */
      .backend-status-section {
        margin-top: 16px;
        padding: 20px;
        background-color: #f5f5f5;
        border-radius: 8px;
        border: 2px solid #e0e0e0;
      }

      .backend-status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .backend-status-header strong {
        font-size: 16px;
        color: #333;
      }

      .test-connection-btn {
        width: 40px;
        height: 40px;
      }

      .backend-status-indicator {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
      }

      .backend-status-indicator.connected {
        background-color: #e8f5e9;
        border: 2px solid #4caf50;
      }

      .backend-status-indicator.disconnected {
        background-color: #ffebee;
        border: 2px solid #f44336;
      }

      .status-icon {
        font-size: 32px;
      }

      .status-icon.connected mat-icon {
        color: #4caf50;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .status-icon.disconnected mat-icon {
        color: #f44336;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .status-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .status-text strong {
        font-size: 18px;
      }

      .status-text.connected strong {
        color: #4caf50;
      }

      .status-text.disconnected strong {
        color: #f44336;
      }

      .status-detail {
        font-size: 14px;
        color: #666;
      }

      /* Backend Error Panel */
      .backend-error-panel {
        display: flex;
        gap: 16px;
        padding: 16px;
        background-color: #ffebee;
        border-left: 4px solid #f44336;
        border-radius: 4px;
        margin-top: 12px;
      }

      .error-icon {
        color: #f44336;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .error-content {
        flex: 1;
      }

      .error-content strong {
        display: block;
        color: #d32f2f;
        margin-bottom: 8px;
        font-size: 16px;
      }

      .error-content p {
        margin: 8px 0;
        color: #c62828;
      }

      .error-actions {
        margin-top: 12px;
        padding: 12px;
        background-color: white;
        border-radius: 4px;
      }

      .error-actions strong {
        color: #333;
        margin-bottom: 8px;
      }

      .error-actions ol {
        margin: 8px 0 0 20px;
        color: #555;
      }

      .error-actions li {
        margin: 8px 0;
      }

      .error-actions code {
        background-color: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        color: #d32f2f;
      }

      /* Mode Unavailable */
      .mode-unavailable {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background-color: #fff3e0;
        border: 2px solid #ff9800;
        border-radius: 8px;
      }

      .mode-unavailable mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #ff9800;
      }

      .mode-unavailable strong {
        display: block;
        color: #e65100;
        margin-bottom: 4px;
      }

      .mode-unavailable p {
        margin: 0;
        color: #666;
      }

      /* Mode Info Card */
      .mode-info-card {
        margin-bottom: 20px;
      }

      .mode-info-content {
        padding: 16px 0;
      }

      .mode-info-section {
        padding: 16px 0;
      }

      .mode-info-section h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px 0;
        color: #1976d2;
        font-size: 18px;
      }

      .mode-info-section h3 mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .mode-info-section p {
        margin: 8px 0;
        color: #555;
        line-height: 1.6;
      }

      .mode-info-section strong {
        color: #333;
      }

      .remote-benefits {
        margin-top: 12px;
        padding: 12px;
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
        border-radius: 4px;
      }

      .remote-benefits strong {
        display: block;
        color: #2e7d32;
        margin-bottom: 8px;
      }

      .remote-benefits ul {
        margin: 8px 0 0 20px;
        padding: 0;
      }

      .remote-benefits li {
        margin: 6px 0;
        color: #1b5e20;
      }

      /* Getting Started Panel */
      .getting-started-panel {
        margin-top: 20px;
        padding: 20px;
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border-radius: 8px;
        border: 2px solid #2196f3;
      }

      .getting-started-panel h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 16px 0;
        color: #1565c0;
        font-size: 18px;
      }

      .getting-started-panel h3 mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .getting-started-steps {
        margin: 16px 0;
        padding-left: 20px;
        color: #333;
      }

      .getting-started-steps li {
        margin: 12px 0;
        line-height: 1.6;
      }

      .getting-started-steps code {
        background-color: #1976d2;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
      }

      .expected-behavior {
        margin-top: 16px;
        padding: 12px;
        background-color: white;
        border-radius: 4px;
      }

      .expected-behavior strong {
        display: block;
        color: #1565c0;
        margin-bottom: 8px;
      }

      .expected-behavior ul {
        margin: 8px 0 0 20px;
        padding: 0;
      }

      .expected-behavior li {
        margin: 6px 0;
        color: #555;
      }

      /* Challenge Card */
      .challenge-card {
        margin-bottom: 20px;
        border: 3px solid #2196f3;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
      }

      .challenge-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #1976d2;
      }

      .challenge-card mat-card-title mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .challenge-display {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .challenge-label {
        font-size: 16px;
        color: #333;
      }

      .challenge-value {
        padding: 16px;
        background-color: #f5f5f5;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
      }

      .challenge-value code {
        display: block;
        word-break: break-all;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        color: #333;
        line-height: 1.6;
      }

      .challenge-explanation {
        display: flex;
        gap: 12px;
        padding: 16px;
        background-color: #e3f2fd;
        border-left: 4px solid #2196f3;
        border-radius: 4px;
      }

      .challenge-explanation mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #1976d2;
        flex-shrink: 0;
      }

      .challenge-explanation p {
        margin: 8px 0;
        color: #555;
        line-height: 1.6;
      }

      .challenge-note {
        margin-top: 8px;
        padding: 8px;
        background-color: #fff;
        border-radius: 4px;
        font-size: 13px;
        color: #666;
      }

      /* Support Card */
      .support-card {
        margin-bottom: 20px;
      }

      .support-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .support-card mat-card-title mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .support-info {
        padding: 8px 0;
      }

      .support-chips,
      .transports {
        margin: 12px 0;
      }

      .transports {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      /* Demo Tabs */
      .demo-tabs {
        margin-bottom: 20px;
      }

      .tab-content {
        padding: 20px 0;
      }

      /* Registration Form */
      .registration-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 20px;
      }

      .actions {
        display: flex;
        gap: 12px;
        margin: 20px 0;
      }

      .actions button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        line-height: normal !important;
      }

      .actions button .mat-icon {
        margin: 0 !important;
        vertical-align: middle !important;
      }

      /* Result Panel */
      .result-panel {
        margin-top: 20px;
      }

      .result-content {
        padding: 16px 0;
      }

      .result-content p {
        margin: 8px 0;
      }

      /* No Credentials */
      .no-credentials {
        text-align: center;
        padding: 40px;
        color: #666;
      }

      .no-credentials mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      /* Credentials List */
      .credentials-list {
        margin-bottom: 20px;
      }

      .credential-card {
        margin: 12px 0;
        background: #f5f5f5;
      }

      .credential-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .credential-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .credential-details .username {
        color: #666;
        font-size: 0.9em;
      }

      .credential-details .created,
      .credential-details .credential-id {
        color: #999;
        font-size: 0.8em;
      }

      .credential-details .transports {
        margin-top: 8px;
      }

      /* Auth All */
      .auth-all {
        margin-top: 20px;
        padding: 20px;
        background: #f9f9f9;
        border-radius: 8px;
      }

      .auth-all h3 {
        margin-top: 0;
      }

      /* Spinner */
      mat-spinner {
        margin-right: 8px !important;
        vertical-align: middle !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      /* Fix chip alignment */
      mat-chip {
        display: inline-flex !important;
        align-items: center !important;
      }

      mat-chip .mat-icon {
        margin: 0 4px 0 0 !important;
        vertical-align: middle !important;
      }

      /* Direct Options */
      .direct-options-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .direct-options-info {
        margin-bottom: 20px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .direct-options-info code {
        background-color: #e0e0e0;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Roboto Mono', monospace;
      }

      .direct-options-example {
        margin-top: 24px;
        padding: 16px;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #2196f3;
      }

      .direct-options-example h4 {
        margin-top: 0;
        color: #1976d2;
      }

      .direct-options-example pre {
        background-color: #fff;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
        line-height: 1.4;
      }

      .direct-options-example code {
        font-family: 'Roboto Mono', monospace;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .demo-container {
          padding: 10px;
        }

        .mode-title {
          font-size: 24px;
        }

        .mode-title mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        .mode-toggle-buttons {
          flex-direction: column;
        }

        .mode-button {
          min-width: 100%;
        }

        .credential-info {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .registration-form {
          gap: 12px;
        }

        .backend-status-indicator {
          flex-direction: column;
          text-align: center;
        }

        .backend-error-panel {
          flex-direction: column;
        }

        .mode-unavailable {
          flex-direction: column;
          text-align: center;
        }
      }
    `,
  ],
})
export class WebAuthnDemoComponent {
  private webAuthnService = inject(WebAuthnService);
  private snackBar = inject(MatSnackBar);

  // Signals for reactive state
  support = signal<WebAuthnSupport>({
    isSupported: false,
    isPlatformAuthenticatorAvailable: false,
    supportedTransports: [],
  });

  isRegistering = signal(false);
  isAuthenticating = signal(false);
  lastRegistrationResult = signal<RegistrationResponse | null>(null);
  lastAuthenticationResult = signal<AuthenticationResponse | null>(null);
  storedCredentials = signal<StoredCredential[]>([]);

  // NEW: Mode management
  useRemoteMode = signal(false); // Default to mock mode
  remoteModeAvailable = computed(() => this.isLocalhost());

  // NEW: Backend connection status
  backendConnected = signal(false);
  backendConnectionError = signal<string | null>(null);

  // NEW: Server response tracking (for display)
  serverChallenge = signal<string | null>(null);
  serverResponse = signal<any>(null);

  // NEW: Network loading states
  isFetchingOptions = signal(false);

  // Form data
  registrationForm = {
    username: 'demo-user',
    displayName: 'Demo User',
    preset: 'passkey' as PresetName,
  };

  // Direct options form data
  directOptionsForm = {
    username: 'direct-user',
    displayName: 'Direct User',
    timeout: 60000,
    userVerification: 'preferred' as UserVerificationRequirement,
    attestation: 'none' as AttestationConveyancePreference,
    residentKey: 'preferred' as ResidentKeyRequirement,
    algorithms: [-7, -257] as number[], // ES256 and RS256
  };

  // State for direct options
  isDirectRegistering = signal(false);
  isDirectAuthenticating = signal(false);

  // Available presets for the UI
  presets: { value: PresetName; label: string; description: string }[] = [
    {
      value: 'passkey',
      label: 'Passkey',
      description: 'Modern passwordless, cross-device credentials',
    },
    {
      value: 'externalSecurityKey',
      label: 'External Security Key',
      description: 'External security key as second factor after password',
    },
    {
      value: 'platformAuthenticator',
      label: 'Platform Authenticator',
      description: 'High-security, platform authenticator credentials',
    },
  ];

  constructor() {
    this.loadSupport();
    this.loadStoredCredentials();
    this.checkBackendConnection();

    // Periodically check backend status
    setInterval(() => {
      this.checkBackendConnection();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if running on localhost
   */
  isLocalhost(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }

  /**
   * Check backend connection
   */
  checkBackendConnection(): void {
    fetch('http://localhost:3001/api/health')
      .then((res) => res.json())
      .then(() => {
        this.backendConnected.set(true);
        this.backendConnectionError.set(null);
      })
      .catch(() => {
        this.backendConnected.set(false);
        this.backendConnectionError.set(
          'Cannot connect to backend. Is the server running?'
        );
      });
  }

  /**
   * Toggle between mock and remote mode
   */
  toggleMode(): void {
    const newMode = !this.useRemoteMode();
    this.useRemoteMode.set(newMode);

    if (newMode) {
      this.checkBackendConnection();
    } else {
      this.serverChallenge.set(null);
      this.serverResponse.set(null);
    }
  }

  /**
   * Extract challenge from server response for display
   */
  extractChallenge(response: any): string {
    // Extract challenge from the response
    if (response && response.challenge) {
      return response.challenge;
    }
    return 'N/A';
  }

  /**
   * Enhanced error handling
   */
  handleError(message: string, error: any): void {
    console.error(message, error);

    let errorMessage = message;
    let duration = 5000;

    if (error instanceof RemoteEndpointError) {
      errorMessage = `Backend error: ${error.message}`;
      if (error.context.status) {
        errorMessage += ` (HTTP ${error.context.status})`;
      }
      duration = 7000;
    } else if (error instanceof InvalidRemoteOptionsError) {
      errorMessage = `Invalid server response: ${error.message}`;
      duration = 7000;
    } else if (error instanceof UserCancelledError) {
      errorMessage = 'Operation was cancelled by the user';
      duration = 3000;
    } else if (error instanceof AuthenticatorError) {
      errorMessage += `: ${error.message}`;
    } else if (error instanceof UnsupportedOperationError) {
      errorMessage += `: ${error.message}`;
    } else if (error instanceof WebAuthnError) {
      errorMessage += `: ${error.message}`;
    } else if (error?.message) {
      errorMessage += `: ${error.message}`;
    }

    this.snackBar.open(errorMessage, 'Close', {
      duration,
      panelClass: ['error-snackbar'],
    });
  }

  /**
   * Verify registration with backend
   */
  verifyRegistration(response: RegistrationResponse): void {
    fetch('http://localhost:3001/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          console.log('Registration verified by backend');
        } else {
          console.error('Registration verification failed:', result.message);
        }
      })
      .catch((error) => {
        console.error('Verification error:', error);
      });
  }

  /**
   * Verify authentication with backend
   */
  verifyAuthentication(response: AuthenticationResponse): void {
    fetch('http://localhost:3001/api/webauthn/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          console.log('Authentication verified by backend');
        } else {
          console.error('Authentication verification failed:', result.message);
        }
      })
      .catch((error) => {
        console.error('Verification error:', error);
      });
  }

  /**
   * Generates a mock base64url-encoded challenge for demo purposes.
   * SECURITY: In production, challenges MUST be generated by your server.
   */
  private generateMockChallenge(prefix = 'DEMO_CHALLENGE'): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const challengeText = `${prefix}_${timestamp}_${Array.from(
      randomBytes,
      (b) => b.toString(16).padStart(2, '0')
    ).join('')}`;

    // Convert to base64url format (WebAuthn spec requirement)
    const challengeBytes = new TextEncoder().encode(challengeText);
    return btoa(String.fromCharCode(...challengeBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private loadSupport(): void {
    this.webAuthnService.getSupport().subscribe({
      next: (support) => this.support.set(support),
      error: (error) =>
        this.handleError('Failed to check WebAuthn support', error),
    });
  }

  private loadStoredCredentials(): void {
    const stored = localStorage.getItem('webauthn-demo-credentials');
    if (stored) {
      try {
        const credentials = JSON.parse(stored).map((cred: any) => ({
          ...cred,
          createdAt: new Date(cred.createdAt),
        }));
        this.storedCredentials.set(credentials);
      } catch (error) {
        console.error('Failed to load stored credentials:', error);
      }
    }
  }

  private saveCredential(result: RegistrationResponse): void {
    const credential: StoredCredential = {
      id: result.credentialId,
      name: this.registrationForm.username,
      displayName: this.registrationForm.displayName,
      createdAt: new Date(),
      transports: result.transports?.map(String) || [],
    };

    const current = this.storedCredentials();
    const updated = [...current, credential];
    this.storedCredentials.set(updated);

    localStorage.setItem('webauthn-demo-credentials', JSON.stringify(updated));
  }

  isRegistrationFormValid(): boolean {
    return !!(
      this.registrationForm.username?.trim() &&
      this.registrationForm.displayName?.trim()
    );
  }

  register(): void {
    if (!this.isRegistrationFormValid()) {
      this.snackBar.open('Please fill in all required fields', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (this.useRemoteMode()) {
      this.registerRemote();
    } else {
      this.registerMock();
    }
  }

  private registerMock(): void {
    this.isRegistering.set(true);
    this.lastRegistrationResult.set(null);

    const config: RegisterConfig = {
      username: this.registrationForm.username,
      displayName: this.registrationForm.displayName,
      preset: this.registrationForm.preset,
      // SECURITY: In production, challenges MUST be generated by your server
      // This demo uses a mock challenge for demonstration purposes only
      challenge: this.generateMockChallenge('MOCK_SERVER_REGISTRATION'),
      // Note: relying party configuration is now handled at the application level
      // via provideWebAuthn() in app.config.ts for better security
    };

    this.webAuthnService.register(config).subscribe({
      next: (result) => {
        this.lastRegistrationResult.set(result);
        this.saveCredential(result);
        this.snackBar.open('Registration successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.isRegistering.set(false);
      },
      error: (error) => {
        this.handleError('Registration failed', error);
        this.isRegistering.set(false);
      },
    });
  }

  private registerRemote(): void {
    this.isFetchingOptions.set(true);
    this.lastRegistrationResult.set(null);

    this.webAuthnService
      .registerRemote({
        username: this.registrationForm.username,
        displayName: this.registrationForm.displayName,
        preset: this.registrationForm.preset,
      })
      .pipe(
        tap((response) => {
          this.serverChallenge.set(this.extractChallenge(response));
        })
      )
      .subscribe({
        next: (result) => {
          this.lastRegistrationResult.set(result);
          this.saveCredential(result);
          this.verifyRegistration(result);
          this.snackBar.open('Registration successful!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.isFetchingOptions.set(false);
          this.isRegistering.set(false);
        },
        error: (error) => {
          this.handleError('Registration failed', error);
          this.isFetchingOptions.set(false);
          this.isRegistering.set(false);
        },
      });
  }

  authenticate(credentialId?: string): void {
    if (this.useRemoteMode()) {
      this.authenticateRemote(credentialId);
    } else {
      this.authenticateMock(credentialId);
    }
  }

  private authenticateMock(credentialId?: string): void {
    this.isAuthenticating.set(true);
    this.lastAuthenticationResult.set(null);

    const config: AuthenticateConfig = {
      preset: this.registrationForm.preset, // Use same preset for consistency
      allowCredentials: credentialId ? [credentialId] : undefined,
      // SECURITY: In production, challenges MUST be generated by your server
      // This demo uses a mock challenge for demonstration purposes only
      challenge: this.generateMockChallenge('MOCK_SERVER_AUTHENTICATION'),
    };

    this.webAuthnService.authenticate(config).subscribe({
      next: (result) => {
        this.lastAuthenticationResult.set(result);
        this.snackBar.open('Authentication successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.isAuthenticating.set(false);
      },
      error: (error) => {
        this.handleError('Authentication failed', error);
        this.isAuthenticating.set(false);
      },
    });
  }

  private authenticateRemote(credentialId?: string): void {
    this.isFetchingOptions.set(true);
    this.lastAuthenticationResult.set(null);

    this.webAuthnService
      .authenticateRemote({
        username: this.registrationForm.username,
        credentialId,
        preset: this.registrationForm.preset,
      })
      .pipe(
        tap((response) => {
          this.serverChallenge.set(this.extractChallenge(response));
        })
      )
      .subscribe({
        next: (result) => {
          this.lastAuthenticationResult.set(result);
          this.verifyAuthentication(result);
          this.snackBar.open('Authentication successful!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.isFetchingOptions.set(false);
          this.isAuthenticating.set(false);
        },
        error: (error) => {
          this.handleError('Authentication failed', error);
          this.isFetchingOptions.set(false);
          this.isAuthenticating.set(false);
        },
      });
  }

  authenticateAny(): void {
    this.authenticate();
  }

  removeCredential(credentialId: string): void {
    const current = this.storedCredentials();
    const updated = current.filter((cred) => cred.id !== credentialId);
    this.storedCredentials.set(updated);
    localStorage.setItem('webauthn-demo-credentials', JSON.stringify(updated));
    this.snackBar.open('Credential removed', 'Close', { duration: 2000 });
  }

  clearAllCredentials(): void {
    this.storedCredentials.set([]);
    localStorage.removeItem('webauthn-demo-credentials');
    this.snackBar.open('All credentials cleared', 'Close', { duration: 2000 });
  }

  private generateUserId(): string {
    // Generate a random user ID for demo purposes
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  // Direct options methods
  registerWithDirectOptions(): void {
    if (!this.isDirectOptionsFormValid()) {
      return;
    }

    this.isDirectRegistering.set(true);

    // Create custom WebAuthn options
    // SECURITY: In production, the challenge MUST be generated by your server
    // This demo uses a mock challenge for demonstration purposes only
    const mockServerChallenge = new TextEncoder().encode(
      'MOCK_SERVER_CHALLENGE_' + Date.now()
    );

    const customOptions: PublicKeyCredentialCreationOptions = {
      challenge: mockServerChallenge,
      rp: {
        name: 'WebAuthn Demo (Direct)',
        id: 'localhost',
      },
      user: {
        id: new TextEncoder().encode(this.directOptionsForm.username),
        name: this.directOptionsForm.username,
        displayName: this.directOptionsForm.displayName,
      },
      pubKeyCredParams: this.directOptionsForm.algorithms.map((alg) => ({
        type: 'public-key',
        alg: alg,
      })),
      timeout: this.directOptionsForm.timeout,
      attestation: this.directOptionsForm.attestation,
      authenticatorSelection: {
        userVerification: this.directOptionsForm.userVerification,
        residentKey: this.directOptionsForm.residentKey,
      },
      excludeCredentials: this.storedCredentials().map((cred) => ({
        type: 'public-key',
        id: new TextEncoder().encode(cred.id),
      })),
    };

    this.webAuthnService.register(customOptions).subscribe({
      next: (result: RegistrationResponse) => {
        this.lastRegistrationResult.set(result);
        this.saveCredential(result);
        this.snackBar.open('Registration successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.isDirectRegistering.set(false);
      },
      error: (error) => {
        this.handleError('Registration failed', error);
        this.isDirectRegistering.set(false);
      },
    });
  }

  authenticateWithDirectOptions(): void {
    this.isDirectAuthenticating.set(true);

    // Create custom authentication options
    // SECURITY: In production, the challenge MUST be generated by your server
    // This demo uses a mock challenge for demonstration purposes only
    const mockServerAuthChallenge = new TextEncoder().encode(
      'MOCK_SERVER_AUTH_CHALLENGE_' + Date.now()
    );

    const customOptions: PublicKeyCredentialRequestOptions = {
      challenge: mockServerAuthChallenge,
      timeout: this.directOptionsForm.timeout,
      userVerification: this.directOptionsForm.userVerification,
      allowCredentials: this.storedCredentials().map((cred) => ({
        type: 'public-key',
        id: new TextEncoder().encode(cred.id),
        transports: cred.transports as AuthenticatorTransport[],
      })),
    };

    this.webAuthnService.authenticate(customOptions).subscribe({
      next: (result: AuthenticationResponse) => {
        this.lastAuthenticationResult.set(result);
        this.snackBar.open('Authentication successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.isDirectAuthenticating.set(false);
      },
      error: (error) => {
        this.handleError('Authentication failed', error);
        this.isDirectAuthenticating.set(false);
      },
    });
  }

  isDirectOptionsFormValid(): boolean {
    return (
      this.directOptionsForm.username.trim() !== '' &&
      this.directOptionsForm.displayName.trim() !== '' &&
      this.directOptionsForm.timeout > 0 &&
      this.directOptionsForm.algorithms.length > 0
    );
  }

  getDirectOptionsPreview(): string {
    const registrationOptions = {
      rp: {
        name: 'WebAuthn Demo (Direct)',
        id: 'localhost',
      },
      user: {
        name: this.directOptionsForm.username,
        displayName: this.directOptionsForm.displayName,
        id: '[generated-user-id]',
      },
      pubKeyCredParams: this.directOptionsForm.algorithms.map((alg) => ({
        type: 'public-key',
        alg: alg,
      })),
      timeout: this.directOptionsForm.timeout,
      attestation: this.directOptionsForm.attestation,
      authenticatorSelection: {
        userVerification: this.directOptionsForm.userVerification,
        residentKey: this.directOptionsForm.residentKey,
      },
      challenge: '[server-generated-challenge]',
      excludeCredentials: '[existing-credentials]',
    };

    return JSON.stringify(registrationOptions, null, 2);
  }
}
