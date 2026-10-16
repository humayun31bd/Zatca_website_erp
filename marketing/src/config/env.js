/**
 * env.js
 * Environment helper for dynamic URL routing
 * Development: http://localhost:3000
 * Production:  https://erp.intelligentdive.com
 */

export function getErpUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined') {
    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local') ||
      window.location.port === '4321' ||
      window.location.port === '3000';

    if (isDev) {
      const devBase = import.meta.env.PUBLIC_DEV_ERP_URL || 'http://localhost:3000';
      return `${devBase}${cleanPath}`;
    }
  }

  const prodBase = import.meta.env.PUBLIC_ERP_URL || 'https://erp.intelligentdive.com';
  return `${prodBase}${cleanPath}`;
}
