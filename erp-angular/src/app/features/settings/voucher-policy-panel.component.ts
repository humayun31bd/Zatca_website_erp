import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-voucher-policy-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voucher-policy-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class VoucherPolicyPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  isLoading = signal(true);
  isSaving = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  requireCashierApproval = true;
  posVoucherControl = 'ACCOUNTANT_APPROVAL';
  directPostSystemVouchers = true;
  numberingFormula = '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}';
  resetPeriod = 'YEARLY';
  pvCode = 'PV';
  rvCode = 'RV';
  cvCode = 'CV';
  jvCode = 'JV';
  seqPadding = 6;

  ngOnInit() {
    this.api.getVoucherPolicy().subscribe({
      next: res => {
        const p = res.policy || {};
        this.requireCashierApproval = p.requireCashierApproval ?? true;
        this.posVoucherControl = p.posVoucherControl || 'ACCOUNTANT_APPROVAL';
        this.directPostSystemVouchers = p.directPostSystemVouchers ?? true;
        this.numberingFormula = p.numberingFormula || this.numberingFormula;
        this.resetPeriod = p.resetPeriod || 'YEARLY';
        this.pvCode = p.pvCode || 'PV';
        this.rvCode = p.rvCode || 'RV';
        this.cvCode = p.cvCode || 'CV';
        this.jvCode = p.jvCode || 'JV';
        this.seqPadding = p.seqPadding || 6;
        this.isLoading.set(false);
      },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load voucher policy.'); }
    });
  }

  preview() {
    const pad = String(1).padStart(this.seqPadding || 6, '0');
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return this.numberingFormula
      .replace('{TYPE}', this.pvCode || 'PV')
      .replace('{YYYY}', yyyy)
      .replace('{MM}', mm)
      .replace('{DD}', dd)
      .replace('{SEQ}', pad);
  }

  save() {
    this.isSaving.set(true);
    this.api.saveVoucherPolicy({
      requireCashierApproval: this.requireCashierApproval,
      posVoucherControl: this.posVoucherControl,
      directPostSystemVouchers: this.directPostSystemVouchers,
      numberingFormula: this.numberingFormula,
      resetPeriod: this.resetPeriod,
      pvCode: this.pvCode,
      rvCode: this.rvCode,
      cvCode: this.cvCode,
      jvCode: this.jvCode,
      seqPadding: Number(this.seqPadding) || 6
    }).subscribe({
      next: () => { this.isSaving.set(false); this.bannerSuccess.set('Voucher entry policy saved.'); },
      error: err => { this.isSaving.set(false); this.bannerError.set(err.error?.error || 'Failed to save policy.'); }
    });
  }
}
