import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const expectedRoles = route.data?.['roles'] as Role[] | undefined;
  if (expectedRoles && expectedRoles.length > 0) {
    if (!authService.hasRole(expectedRoles)) {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};
