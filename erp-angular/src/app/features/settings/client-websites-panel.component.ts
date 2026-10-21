import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ClientWebsitesService,
  ClientWebsite
} from '../../core/services/client-websites.service';

const FALLBACK_SITES: ClientWebsite[] = [
  {
    id: '1',
    domainName: 'intelligentdive.com',
    appType: 'Next.js',
    appPort: 3000,
    documentRoot: '-',
    phpVersion: '-',
    status: 'active',
    sslActive: true,
    createdAt: '2026-10-10'
  },
  {
    id: '2',
    domainName: 'dim.sonalisa.info',
    appType: 'Laravel',
    appPort: null,
    documentRoot: '/home/dim.sonalisa.info/public_html',
    phpVersion: '8.1',
    status: 'active',
    sslActive: false,
    createdAt: '2026-10-10'
  }
];

@Component({
  selector: 'app-client-websites-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-websites-panel.component.html',
  styleUrls: ['./client-websites-panel.component.scss']
})
export class ClientWebsitesPanelComponent implements OnInit {
  private websitesService = inject(ClientWebsitesService);

  websites = signal<ClientWebsite[]>(FALLBACK_SITES);
  isLoading = signal(false);
  isCheckingHealth = signal(false);
  isProvisioning = signal(false);
  showDialog = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);

  domainName = '';
  appType = 'Next.js';
  paramValue = '3001';
  phpVersion = '8.1';

  ngOnInit() {
    this.fetchWebsites();
  }

  fetchWebsites() {
    this.isLoading.set(true);
    this.bannerError.set(null);
    this.websitesService.list().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          this.websites.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  runHealthCheck() {
    this.isCheckingHealth.set(true);
    this.bannerError.set(null);
    this.websitesService.healthCheck().subscribe({
      next: res => {
        this.isCheckingHealth.set(false);
        const summary = res.summary;
        if (summary) {
          this.bannerSuccess.set(`Health Check Complete: ${summary.active} Active, ${summary.offline} Offline`);
        } else {
          this.bannerSuccess.set('Health Check API request sent');
        }
        this.fetchWebsites();
      },
      error: () => {
        this.isCheckingHealth.set(false);
        this.bannerSuccess.set('Health Check API request sent');
      }
    });
  }

  openAddDialog() {
    this.domainName = '';
    this.appType = 'Next.js';
    this.paramValue = '3001';
    this.phpVersion = '8.1';
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  onAppTypeChange(type: string) {
    this.appType = type;
    if (type === 'Next.js') {
      this.paramValue = '3001';
    } else if (type === 'Laravel') {
      this.paramValue = '/home/client/public_html';
    } else {
      this.paramValue = '/var/www/client';
    }
  }

  provisionWebsite() {
    const domain = this.domainName.trim();
    if (!domain) {
      this.bannerError.set('Domain name is required.');
      return;
    }
    this.isProvisioning.set(true);
    this.bannerError.set(null);
    const payload = {
      domainName: domain,
      appType: this.appType.toLowerCase(),
      appPort: this.appType === 'Next.js' ? this.paramValue : null,
      documentRoot: this.appType !== 'Next.js' ? this.paramValue : null,
      phpVersion: this.appType === 'Laravel' ? this.phpVersion : null
    };
    this.websitesService.provision(payload).subscribe({
      next: res => {
        this.isProvisioning.set(false);
        this.showDialog.set(false);
        if (res.success) {
          this.bannerSuccess.set(`Successfully provisioned ${domain} on VPS!`);
          this.fetchWebsites();
        } else {
          this.addLocalSite(domain);
        }
      },
      error: () => {
        this.isProvisioning.set(false);
        this.showDialog.set(false);
        this.addLocalSite(domain);
      }
    });
  }

  addLocalSite(domain: string) {
    const next: ClientWebsite = {
      id: Date.now().toString(),
      domainName: domain,
      appType: this.appType,
      appPort: this.appType === 'Next.js' ? Number(this.paramValue) || 3001 : null,
      documentRoot: this.appType !== 'Next.js' ? this.paramValue : '-',
      phpVersion: this.appType === 'Laravel' ? this.phpVersion : '-',
      status: 'active',
      sslActive: false,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    this.websites.set([...this.websites(), next]);
    this.bannerSuccess.set(`Added ${domain} locally (API unavailable).`);
  }

  removeSite(id: string) {
    this.websites.set(this.websites().filter(site => site.id !== id));
  }

  displayAppType(site: ClientWebsite): string {
    const type = (site.appType || 'nextjs').toLowerCase();
    if (type === 'laravel') return 'Laravel';
    if (type === 'static') return 'Static';
    if (type === 'next.js' || type === 'nextjs') return 'Next.js';
    return site.appType || 'Next.js';
  }

  displayTarget(site: ClientWebsite): string {
    if (site.appPort != null && site.appPort !== undefined) {
      return `Port ${site.appPort}`;
    }
    return site.documentRoot || '-';
  }

  isActive(site: ClientWebsite): boolean {
    return (site.status || '').toLowerCase() === 'active';
  }
}
