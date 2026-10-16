import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const tenantId = authService.tenantId();

  let url = req.url;
  // Prepend baseUrl if path is relative
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    url = `${API_ENDPOINTS.baseUrl}${cleanPath}`;
  }

  // Clone headers with Bearer token & x-tenant-id
  let headers = req.headers;
  if (token && !headers.has('Authorization')) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  if (tenantId && !headers.has('x-tenant-id')) {
    headers = headers.set('x-tenant-id', tenantId);
  }

  const clonedReq = req.clone({
    url,
    headers
  });

  return next(clonedReq);
};
