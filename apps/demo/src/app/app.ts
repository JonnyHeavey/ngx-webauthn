import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WebAuthnDemoComponent } from './webauthn-demo/webauthn-demo.component';

@Component({
  imports: [WebAuthnDemoComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'WebAuthn Demo';
}
