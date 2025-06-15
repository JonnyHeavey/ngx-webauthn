import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-ngx-webauthn',
  imports: [CommonModule],
  templateUrl: './ngx-webauthn.html',
  styleUrl: './ngx-webauthn.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxWebauthn {}
