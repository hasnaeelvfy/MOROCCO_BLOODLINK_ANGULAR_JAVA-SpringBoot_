import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register/hospital',
  '/api/v1/auth/register/donor',
  '/api/v1/health',
  '/api/v1/public/'
];

function isPublicAuthRequest(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPublicAuthRequest(req.url)) {
    return next(req);
  }

  const token = inject(AuthService).token();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  );
};
