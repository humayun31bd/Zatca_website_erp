import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-zatca-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zatca-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class ZatcaPanelComponent {
  otp = '';
  isLoading = signal(false);
  hasCompliance = signal(false);
  hasProduction = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);

  generateCcsid() {
    if (!this.otp.trim()) {
      this.bannerError.set('Enter the 6-digit OTP generated from the ZATCA portal.');
      return;
    }
    this.isLoading.set(true);
    this.bannerError.set(null);
    setTimeout(() => {
      this.isLoading.set(false);
      this.hasCompliance.set(true);
      this.bannerSuccess.set('CCSID generated for local preview. Connect FATOORA credentials for production.');
    }, 400);
  }

  generatePcsid() {
    if (!this.hasCompliance()) return;
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
      this.hasProduction.set(true);
      this.bannerSuccess.set('PCSID generated for local preview.');
    }, 400);
  }
}
