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
import {
  WebAuthnService,
  WebAuthnSupport,
  RegistrationResponse,
  AuthenticationResponse,
  WebAuthnCreationOptionsJSON,
  WebAuthnRequestOptionsJSON,
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
  ],
  template: `
    <div class="demo-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>fingerprint</mat-icon>
            WebAuthn Demo
          </mat-card-title>
          <mat-card-subtitle>
            Test WebAuthn registration and authentication
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
        <mat-tab label="Registration">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Register New Credential</mat-card-title>
                <mat-card-subtitle
                  >Create a new WebAuthn credential</mat-card-subtitle
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

                  <mat-form-field appearance="outline">
                    <mat-label>Relying Party Name</mat-label>
                    <input
                      matInput
                      [(ngModel)]="registrationForm.rpName"
                      name="rpName"
                      required
                    />
                    <mat-icon matSuffix>business</mat-icon>
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
                    <mat-icon>add</mat-icon>
                    Register Credential }
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
        <mat-tab label="Authentication">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Authenticate with Credential</mat-card-title>
                <mat-card-subtitle
                  >Use an existing WebAuthn credential to
                  authenticate</mat-card-subtitle
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
                          <mat-icon>login</mat-icon>
                          Authenticate }
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
                    <mat-icon>login</mat-icon>
                    Authenticate with Any Credential }
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
    rpName: 'WebAuthn Demo',
  };

  constructor() {
    this.loadSupport();
    this.loadStoredCredentials();
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
      this.registrationForm.displayName?.trim() &&
      this.registrationForm.rpName?.trim()
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

    const options: WebAuthnCreationOptionsJSON = {
      rp: {
        name: this.registrationForm.rpName,
      },
      user: {
        id: this.generateUserId(),
        name: this.registrationForm.username,
        displayName: this.registrationForm.displayName,
      },
      challenge: crypto
        .getRandomValues(new Uint8Array(32))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), ''),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
    };

    this.webAuthnService.register(options).subscribe({
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

    const options: WebAuthnRequestOptionsJSON = {
      challenge: crypto
        .getRandomValues(new Uint8Array(32))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), ''),
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: credentialId
        ? [
            {
              type: 'public-key',
              id: credentialId,
            },
          ]
        : undefined,
    };

    this.webAuthnService.authenticate(options).subscribe({
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
}
