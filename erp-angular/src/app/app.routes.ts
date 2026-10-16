import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./features/invoicing/invoices-list/invoices-list.component').then(
            m => m.InvoicesListComponent
          )
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./features/purchases/received-bills/received-bills.component').then(
            m => m.ReceivedBillsComponent
          )
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then(m => m.ClientsComponent)
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/products-list/products-list.component').then(
            m => m.ProductsListComponent
          )
      },
      {
        path: 'inventory/categories',
        loadComponent: () =>
          import('./features/inventory/categories/categories.component').then(
            m => m.CategoriesComponent
          )
      },
      {
        path: 'categories',
        redirectTo: 'inventory/categories',
        pathMatch: 'full'
      },
      {
        path: 'inventory/sub-categories',
        loadComponent: () =>
          import('./features/inventory/categories/categories.component').then(
            m => m.CategoriesComponent
          ),
        data: { activeTab: 'subcategories' }
      },
      {
        path: 'sub-categories',
        redirectTo: 'inventory/sub-categories',
        pathMatch: 'full'
      },
      {
        path: 'inventory/print-labels',
        loadComponent: () =>
          import('./features/inventory/print-labels/print-labels.component').then(
            m => m.PrintLabelsComponent
          )
      },
      {
        path: 'print-labels',
        redirectTo: 'inventory/print-labels',
        pathMatch: 'full'
      },
      {
        path: 'products',
        redirectTo: 'inventory',
        pathMatch: 'full'
      },
      {
        path: 'analytics',
        redirectTo: 'pos/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'pos',
        redirectTo: 'pos/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'pos/dashboard',
        loadComponent: () =>
          import('./features/pos/pos-dashboard/pos-dashboard.component').then(m => m.PosDashboardComponent)
      },
      {
        path: 'pos/terminal',
        loadComponent: () =>
          import('./features/pos/pos-terminal/pos-terminal.component').then(m => m.PosTerminalComponent)
      },
      {
        path: 'hr',
        redirectTo: 'hr/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'hr/dashboard',
        loadComponent: () =>
          import('./features/hr/hr-dashboard/hr-dashboard.component').then(m => m.HrDashboardComponent)
      },
      {
        path: 'hr/employees',
        loadComponent: () =>
          import('./features/hr/employees/employees-list.component').then(m => m.EmployeesListComponent)
      },
      {
        path: 'hr/attendance',
        loadComponent: () =>
          import('./features/hr/attendance/attendance.component').then(m => m.AttendanceComponent)
      },
      {
        path: 'hr/payroll',
        loadComponent: () =>
          import('./features/hr/payroll/payroll.component').then(m => m.PayrollComponent)
      },
      {
        path: 'hr/payroll-policy',
        redirectTo: 'hr/payroll',
        pathMatch: 'full'
      },
      {
        path: 'hr/leaves',
        redirectTo: 'hr/attendance',
        pathMatch: 'full'
      },
      {
        path: 'orders/delivery',
        loadComponent: () =>
          import('./features/kds/kds-board.component').then(m => m.KdsBoardComponent)
      },
      {
        path: 'kds',
        redirectTo: 'orders/delivery',
        pathMatch: 'full'
      },
      {
        path: 'customers',
        redirectTo: 'clients',
        pathMatch: 'full'
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
