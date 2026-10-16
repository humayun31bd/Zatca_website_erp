import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.warn(`[HTTP 401 Unauthorized] at ${req.url}`);
      } else if (error.status === 403) {
        console.error(`[HTTP 403 Forbidden] at ${req.url}`);
      } else if (error.status >= 500) {
        console.error(`[HTTP Server Error ${error.status}] at ${req.url}`, error.message);
      }
      return throwError(() => error);
    })
  );
};
