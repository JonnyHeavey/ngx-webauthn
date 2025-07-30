import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import {
  WebAuthnService,
  WebAuthnSupport,
  RegistrationResponse,
  AuthenticationResponse,
  RegisterConfig,
  AuthenticateConfig,
  PresetName,
  PASSKEY_PRESET,
  EXTERNAL_SECURITY_KEY_PRESET,
  PLATFORM_AUTHENTICATOR_PRESET,
  WebAuthnError,
  UserCancelledError,
  AuthenticatorError,
  UnsupportedOperationError,
} from 'ngx-webauthn';

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
    CommonModule,
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
    <div class="demo-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>fingerprint</mat-icon>
            WebAuthn Demo
            <a
              href="https://github.com/JonnyHeavey/ngx-webauthn"
              target="_blank"
              class="github-link"
            >
              <mat-icon>open_in_new</mat-icon>
              View on GitHub
            </a>
          </mat-card-title>
          <mat-card-subtitle>
            Test WebAuthn registration and authentication with ngx-webauthn
            library
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="support-info">
            <h3>Browser Support</h3>
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
      }

      .header-card {
        margin-bottom: 20px;
      }

      .header-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: space-between;
      }

      .github-link {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #666;
        text-decoration: none;
        font-size: 14px;
        font-weight: normal;
        transition: color 0.2s ease;
      }

      .github-link:hover {
        color: #1976d2;
        text-decoration: underline;
      }

      .github-link mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .support-info {
        margin-top: 16px;
      }

      .support-chips,
      .transports {
        margin: 8px 0;
      }

      .transports {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .demo-tabs {
        margin-bottom: 20px;
      }

      .tab-content {
        padding: 20px 0;
      }

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

      .result-panel {
        margin-top: 20px;
      }

      .result-content {
        padding: 16px 0;
      }

      .result-content p {
        margin: 8px 0;
      }

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

      .auth-all {
        margin-top: 20px;
        padding: 20px;
        background: #f9f9f9;
        border-radius: 8px;
      }

      .auth-all h3 {
        margin-top: 0;
      }

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

      @media (max-width: 768px) {
        .demo-container {
          padding: 10px;
        }

        .credential-info {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .registration-form {
          gap: 12px;
        }
      }

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

  authenticate(credentialId?: string): void {
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

  private handleError(message: string, error: any): void {
    console.error(message, error);

    let errorMessage = message;
    let duration = 5000;

    if (error instanceof UserCancelledError) {
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
