import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, UserItem } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-users-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class UsersPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  items = signal<UserItem[]>([]);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  editingId: string | null = null;
  searchQuery = '';
  roleFilter = 'All';
  formEmail = '';
  formPassword = '';
  formRole = 'TENANT_USER';
  roles = ['SUPERADMIN', 'TENANT_ADMIN', 'TENANT_USER'];

  ngOnInit() { this.load(); }

  filtered() {
    const q = this.searchQuery.toLowerCase();
    return this.items().filter(u => {
      const match = !q || u.email.toLowerCase().includes(q);
      const roleOk = this.roleFilter === 'All' || u.role === this.roleFilter;
      return match && roleOk;
    });
  }

  displayRole(role?: string) {
    return role === 'TENANT_ADMIN' ? 'ADMIN' : (role || 'TENANT_USER');
  }

  load() {
    this.isLoading.set(true);
    this.api.getUsers().subscribe({
      next: res => { this.items.set(res.users || []); this.isLoading.set(false); },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.message || 'Failed to load users.'); }
    });
  }

  openAdd(user?: UserItem) {
    this.editingId = user?.id || null;
    this.formEmail = user?.email || '';
    this.formPassword = '';
    this.formRole = user?.role || 'TENANT_USER';
    this.showDialog.set(true);
  }

  save() {
    if (!this.formEmail.trim() || (!this.editingId && !this.formPassword)) {
      this.bannerError.set('Email and password are required for new users.');
      return;
    }
    const payload: { email: string; role: string; password?: string } = {
      email: this.formEmail.trim(),
      role: this.formRole
    };
    if (this.formPassword) payload.password = this.formPassword;
    const req = this.editingId
      ? this.api.updateUser(this.editingId, payload)
      : this.api.createUser({ email: payload.email, password: this.formPassword, role: payload.role });
    req.subscribe({
      next: () => { this.showDialog.set(false); this.bannerSuccess.set('User saved.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.message || 'Failed to save user.'); }
    });
  }

  remove(user: UserItem) {
    if (!confirm(`Delete ${user.email}?`)) return;
    this.api.deleteUser(user.id).subscribe({
      next: () => { this.bannerSuccess.set('Deleted user.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.message || 'Cannot delete this user.'); }
    });
  }
}
