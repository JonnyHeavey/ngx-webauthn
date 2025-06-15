import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxWebauthn } from './ngx-webauthn';

describe('NgxWebauthn', () => {
  let component: NgxWebauthn;
  let fixture: ComponentFixture<NgxWebauthn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxWebauthn],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxWebauthn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
