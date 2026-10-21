import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

export interface SidebarItem {
  label: string;
  labelAr: string;
  icon: string;
  route: string;
  badgeCount?: number;
}

export interface SidebarGroup {
  label: string;
  labelAr: string;
  icon: string;
  permissionKey: string;
  children: SidebarItem[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  isCollapsed = signal(false);
  isArabic = signal(false);
  searchQuery = signal('');
  isPosTerminal = signal(false);

  // Groups that are expanded (default: Main, Sales & POS)
  expandedGroups = signal<Set<string>>(new Set(['Main', 'Sales & POS', 'Human Resource (HRM)']));

  readonly menuGroups: SidebarGroup[] = [
    {
      label: 'Main',
      labelAr: 'الرئيسية',
      icon: 'pi pi-th-large',
      permissionKey: 'main',
      children: [
        { label: 'Executive Dashboard', labelAr: 'لوحة التحكم التنفيذية', icon: 'pi pi-th-large', route: '/dashboard' },
        { label: 'Analytics & Insights', labelAr: 'التحليلات والرؤى', icon: 'pi pi-chart-pie', route: '/analytics' },
        { label: 'AI Copilot Assistant', labelAr: 'المساعد الذكي (AI Copilot)', icon: 'pi pi-sparkles', route: '/copilot' }
      ]
    },
    {
      label: 'Sales & POS',
      labelAr: 'المبيعات ونقاط البيع',
      icon: 'pi pi-desktop',
      permissionKey: 'sales',
      children: [
        { label: 'POS Register Terminal', labelAr: 'شاشة نقطة البيع (POS)', icon: 'pi pi-desktop', route: '/pos/terminal' },
        { label: 'POS Analytics Dashboard', labelAr: 'تحليلات نقطة البيع', icon: 'pi pi-chart-bar', route: '/pos/dashboard' },
        { label: 'Kitchen & Delivery (KDS)', labelAr: 'المطبخ والتوصيل (KDS)', icon: 'pi pi-truck', route: '/orders/delivery' },
        { label: 'Sales Tax Invoices', labelAr: 'فواتير المبيعات الضريبية', icon: 'pi pi-receipt', route: '/invoices' },
        { label: 'Customer Directory', labelAr: 'دليل العملاء', icon: 'pi pi-users', route: '/clients' }
      ]
    },
    {
      label: 'Inventory & Stock',
      labelAr: 'المخزون والمنتجات',
      icon: 'pi pi-box',
      permissionKey: 'inventory',
      children: [
        { label: 'Products & Master Catalog', labelAr: 'المنتجات والكتالوج الرئيسي', icon: 'pi pi-box', route: '/inventory' },
        { label: 'Stock Management & Transfer', labelAr: 'إدارة المخزون والتحويلات', icon: 'pi pi-building', route: '/inventory/stock-management' },
        { label: 'Product Categories', labelAr: 'تصنيفات المنتجات', icon: 'pi pi-tags', route: '/inventory/categories' },
        { label: 'Sub Categories', labelAr: 'الفئات الفرعية', icon: 'pi pi-sitemap', route: '/inventory/sub-categories' },
        { label: 'Print Barcode Labels', labelAr: 'طباعة ملصقات البار كود', icon: 'pi pi-qrcode', route: '/inventory/print-labels' }
      ]
    },
    {
      label: 'Procurement & Purchases',
      labelAr: 'المشتريات والتوريد',
      icon: 'pi pi-shopping-cart',
      permissionKey: 'purchasing',
      children: [
        { label: 'Purchase Bills & Invoices', labelAr: 'فواتير المشتريات', icon: 'pi pi-shopping-cart', route: '/purchases' },
        { label: 'Supplier Directory', labelAr: 'دليل الموردين', icon: 'pi pi-truck', route: '/suppliers' }
      ]
    },
    {
      label: 'Accounts & Finance',
      labelAr: 'الحسابات والمالية',
      icon: 'pi pi-wallet',
      permissionKey: 'accounting',
      children: [
        { label: 'Accounts Overview', labelAr: 'نظرة عامة على الحسابات', icon: 'pi pi-chart-line', route: '/accounting/dashboard' },
        { label: 'Chart of Accounts (COA)', labelAr: 'شجرة الحسابات (COA)', icon: 'pi pi-sitemap', route: '/accounting/coa' },
        { label: 'Vouchers', labelAr: 'السندات المالية', icon: 'pi pi-ticket', route: '/accounting/vouchers' },
        { label: 'Voucher Approval Center', labelAr: 'اعتماد السندات المالية', icon: 'pi pi-check-square', route: '/accounting/voucher-approval' },
        { label: 'General Ledger Book', labelAr: 'دفتر الأستاذ العام', icon: 'pi pi-book', route: '/accounting/ledger' },
        { label: 'Cheque Book & Leaves', labelAr: 'دفتر وقوائم الشيكات', icon: 'pi pi-file', route: '/accounting/cheques' },
        { label: 'Financial Statements & Reports', labelAr: 'القوائم والتقارير المالية', icon: 'pi pi-file-excel', route: '/reports' },
        { label: 'Payment Gateways', labelAr: 'بوابات الدفع الإلكتروني', icon: 'pi pi-credit-card', route: '/payments' }
      ]
    },
    {
      label: 'Human Resource (HRM)',
      labelAr: 'الموارد البشرية (HRM)',
      icon: 'pi pi-id-card',
      permissionKey: 'hr',
      children: [
        { label: 'HR Overview Dashboard', labelAr: 'لوحة تحكم الموارد البشرية', icon: 'pi pi-briefcase', route: '/hr/dashboard' },
        { label: 'Employee Directory', labelAr: 'دليل الموظفين', icon: 'pi pi-id-card', route: '/hr/employees' },
        { label: 'Add Employee', labelAr: 'إضافة موظف', icon: 'pi pi-user-plus', route: '/hr/employees/new' },
        { label: 'Daily Attendance & Time logs', labelAr: 'سجل الحضور والانصراف', icon: 'pi pi-clock', route: '/hr/attendance' },
        { label: 'Leave Requests & Approvals', labelAr: 'طلبات الإجازات والموافقات', icon: 'pi pi-calendar-times', route: '/hr/leaves' },
        { label: 'Overtime Register', labelAr: 'سجل العمل الإضافي', icon: 'pi pi-stopwatch', route: '/hr/overtime' },
        { label: 'Payroll Engine & Slips', labelAr: 'مسير الرواتب والمسيرات', icon: 'pi pi-dollar', route: '/hr/payroll' },
        { label: 'Payroll Policy & Pay Scales', labelAr: 'سلم الرواتب والدرجات', icon: 'pi pi-chart-line', route: '/hr/payroll-policy' },
        { label: 'Loans & Salary Advances', labelAr: 'القروض والسلف المالية', icon: 'pi pi-money-bill', route: '/hr/loans' },
        { label: 'End of Service (EOSB)', labelAr: 'مكافأة نهاية الخدمة (EOSB)', icon: 'pi pi-calculator', route: '/hr/eosb' }
      ]
    },
    {
      label: 'Communication & Integrations',
      labelAr: 'التواصل والربط',
      icon: 'pi pi-comments',
      permissionKey: 'communication',
      children: [
        { label: 'WhatsApp Messaging', labelAr: 'رسائل الواتساب', icon: 'pi pi-whatsapp', route: '/whatsapp' }
      ]
    },
    {
      label: 'System Administration',
      labelAr: 'إدارة النظام والإعدادات',
      icon: 'pi pi-cog',
      permissionKey: 'settings',
      children: [
        { label: 'Tenant General Settings', labelAr: 'الإعدادات العامة للنظام', icon: 'pi pi-cog', route: '/settings' },
        { label: 'Accounting Settings', labelAr: 'إعدادات المحاسبة والترقيم', icon: 'pi pi-wrench', route: '/accounting/settings' },
        { label: 'Branch & Outlets Management', labelAr: 'إدارة الفروع والمنافذ', icon: 'pi pi-shop', route: '/settings/branches' },
        { label: 'Cost Centers & Department Rules', labelAr: 'مراكز التكلفة والأقسام', icon: 'pi pi-building-columns', route: '/settings/cost-centers' },
        { label: 'Product & Pricing Policy', labelAr: 'سياسات المنتجات والأسعار', icon: 'pi pi-shield', route: '/settings/product-policy' }
      ]
    }
  ];

  filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const isAr = this.isArabic();

    if (!q) {
      return this.menuGroups;
    }

    return this.menuGroups.map(group => {
      const groupMatches = (isAr ? group.labelAr : group.label).toLowerCase().includes(q) ||
                           group.label.toLowerCase().includes(q);

      const matchingChildren = group.children.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.labelAr.toLowerCase().includes(q)
      );

      if (groupMatches) {
        return group; // return whole group if title matched
      }

      return {
        ...group,
        children: matchingChildren
      };
    }).filter(group => group.children.length > 0);
  });

  ngOnInit() {
    this.syncPosMode(this.router.url);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.syncPosMode(event.urlAfterRedirects));
  }

  private syncPosMode(url: string): void {
    const onPos = url.includes('/pos/terminal');
    this.isPosTerminal.set(onPos);
    if (onPos) this.isCollapsed.set(true);
  }

  toggleGroup(label: string) {
    this.expandedGroups.update(set => {
      const next = new Set(set);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  isGroupExpanded(label: string): boolean {
    if (this.searchQuery().trim()) return true; // auto-expand on search
    return this.expandedGroups().has(label);
  }

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }

  toggleLanguage() {
    this.isArabic.update(v => !v);
  }

  logout() {
    this.authService.logout();
  }
}
