import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, SmtpSettings } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-smtp-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './smtp-settings-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class SmtpSettingsPanelComponent implements OnInit {
  private api = inject(SettingsHubService);

  isLoading = signal(true);
  isSaving = signal(false);
  isTesting = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showTestDialog = signal(false);

  enabled = true;
  host = '';
  port = 587;
  secure = false;
  username = '';
  password = '';
  fromName = '';
  fromEmail = '';
  testEmail = '';
  isPasswordSet = false;

  presets = [
    { key: 'gmail', label: 'Gmail', host: 'smtp.gmail.com' },
    { key: 'outlook', label: 'Outlook', host: 'smtp.office365.com' },
    { key: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net' },
    { key: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org' },
    { key: 'amazon_ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com' }
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.bannerError.set(null);
    this.api.getSmtp().subscribe({
      next: res => {
        const s = res.smtpSettings || {};
        this.enabled = s.enabled ?? false;
        this.host = s.host || '';
        this.port = Number(s.port) || 587;
        this.secure = s.secure ?? false;
        this.username = s.username || '';
        this.fromName = s.fromName || '';
        this.fromEmail = s.fromEmail || '';
        this.isPasswordSet = !!s.isPasswordSet;
        this.password = this.isPasswordSet ? '••••••••' : (s.password || '');
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.bannerError.set(err.error?.error || 'Failed to load SMTP settings.');
      }
    });
  }

  applyPreset(preset: { host: string }) {
    this.host = preset.host;
    this.port = 587;
    this.secure = false;
  }

  payload(): SmtpSettings {
    return {
      enabled: this.enabled,
      host: this.host.trim(),
      port: Number(this.port) || 587,
      secure: this.secure,
      username: this.username.trim(),
      password: this.password,
      fromName: this.fromName.trim(),
      fromEmail: this.fromEmail.trim()
    };
  }

  save() {
    this.isSaving.set(true);
    this.bannerError.set(null);
    this.bannerSuccess.set(null);
    this.api.saveSmtp(this.payload()).subscribe({
      next: res => {
        this.isSaving.set(false);
        this.bannerSuccess.set(res.message || 'SMTP settings saved successfully.');
      },
      error: err => {
        this.isSaving.set(false);
        this.bannerError.set(err.error?.error || 'Failed to save SMTP settings.');
      }
    });
  }

  openTestDialog() {
    this.testEmail = this.fromEmail || this.username;
    this.showTestDialog.set(true);
  }

  runTest() {
    const email = this.testEmail.trim();
    if (!email) {
      this.bannerError.set('Test recipient email is required.');
      return;
    }
    this.isTesting.set(true);
    this.api.testSmtp(email, this.payload()).subscribe({
      next: res => {
        this.isTesting.set(false);
        this.showTestDialog.set(false);
        this.bannerSuccess.set(res.message || `Test email sent to ${email}.`);
      },
      error: err => {
        this.isTesting.set(false);
        this.showTestDialog.set(false);
        this.bannerError.set(err.error?.error || 'SMTP test failed.');
      }
    });
  }
}
