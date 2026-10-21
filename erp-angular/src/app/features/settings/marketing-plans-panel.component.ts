import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Plan {
  name: string;
  branches: number;
  counters: number;
  invoices: number;
  users: number;
}

@Component({
  selector: 'app-marketing-plans-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marketing-plans-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class MarketingPlansPanelComponent {
  plans = signal<Plan[]>([
    { name: 'Starter', branches: 1, counters: 1, invoices: 500, users: 1 },
    { name: 'Standard', branches: 1, counters: 3, invoices: 2000, users: 3 },
    { name: 'Pro', branches: -1, counters: -1, invoices: -1, users: -1 }
  ]);
  showDialog = signal(false);
  editing: Plan | null = null;
  formBranches = 1;
  formCounters = 1;
  formInvoices = 500;

  unlimited(n: number) {
    return n < 0 ? 'Unlimited' : String(n);
  }

  openEdit(plan: Plan) {
    this.editing = plan;
    this.formBranches = plan.branches;
    this.formCounters = plan.counters;
    this.formInvoices = plan.invoices;
    this.showDialog.set(true);
  }

  save() {
    if (!this.editing) return;
    this.plans.set(this.plans().map(p => p.name === this.editing!.name
      ? { ...p, branches: Number(this.formBranches), counters: Number(this.formCounters), invoices: Number(this.formInvoices) }
      : p));
    this.showDialog.set(false);
  }
}
