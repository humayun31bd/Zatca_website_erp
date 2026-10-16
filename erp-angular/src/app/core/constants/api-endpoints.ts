export const API_ENDPOINTS = {
  baseUrl: 'http://localhost:3000/api/v1',
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    me: '/auth/me'
  },
  invoices: '/invoices',
  clients: '/clients',
  suppliers: '/suppliers',
  purchases: '/procurement/bills',
  grn: '/procurement/grn',
  inventory: '/inventory',
  accounting: '/accounting',
  hr: '/hr'
} as const;
