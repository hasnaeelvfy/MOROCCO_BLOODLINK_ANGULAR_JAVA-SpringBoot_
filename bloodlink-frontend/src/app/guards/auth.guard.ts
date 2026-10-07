import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { UserRole } from '../mock/models';
import { map } from 'rxjs';

function signInTree(router: Router, attempted: string) {
  if (attempted.startsWith('/hospital')) return router.createUrlTree(['/hospital/sign-in']);
  if (attempted.startsWith('/admin')) return router.createUrlTree(['/admin/sign-in']);
  return router.createUrlTree(['/donor/sign-in']);
}

export function roleGuard(roles: UserRole[]): CanActivateFn {
  return () => {
    const apiAuth = inject(AuthService);
    const router = inject(Router);

    if (roles.length === 1 && roles[0] === 'hospital') {
      if (apiAuth.isDonorAuthenticated() || apiAuth.isAdminAuthenticated()) {
        return router.createUrlTree(['/forbidden']);
      }
      return apiAuth.ensureHospitalSession().pipe(
        map((ok) => (ok ? true : signInTree(router, '/hospital')))
      );
    }

    if (roles.length === 1 && roles[0] === 'donor') {
      if (apiAuth.isHospitalAuthenticated() || apiAuth.isAdminAuthenticated()) {
        return router.createUrlTree(['/forbidden']);
      }
      return apiAuth.ensureDonorSession().pipe(
        map((ok) => (ok ? true : signInTree(router, '/donor')))
      );
    }

    if (roles.length === 1 && roles[0] === 'admin') {
      if (apiAuth.isHospitalAuthenticated() || apiAuth.isDonorAuthenticated()) {
        return router.createUrlTree(['/forbidden']);
      }
      return apiAuth.ensureAdminSession().pipe(
        map((ok) => (ok ? true : signInTree(router, '/admin')))
      );
    }

    if (apiAuth.isHospitalAuthenticated() || apiAuth.isDonorAuthenticated() || apiAuth.isAdminAuthenticated()) {
      return router.createUrlTree(['/forbidden']);
    }

    return signInTree(router, router.url);
  };
}

export const signedInGuard: CanActivateFn = () => {
  const apiAuth = inject(AuthService);
  const router = inject(Router);
  if (apiAuth.isHospitalAuthenticated() || apiAuth.isDonorAuthenticated() || apiAuth.isAdminAuthenticated()) {
    return true;
  }
  if (!apiAuth.token()) {
    return signInTree(router, router.url);
  }
  return apiAuth.restoreSession().pipe(
    map((ok) => (ok ? true : signInTree(router, router.url)))
  );
};

export const guestGuard: CanActivateFn = () => {
  const apiAuth = inject(AuthService);
  const router = inject(Router);
  if (apiAuth.isHospitalAuthenticated()) {
    return router.createUrlTree(['/hospital']);
  }
  if (apiAuth.isDonorAuthenticated()) {
    return router.createUrlTree(['/donor']);
  }
  if (apiAuth.isAdminAuthenticated()) {
    return router.createUrlTree(['/admin']);
  }
  return true;
};
