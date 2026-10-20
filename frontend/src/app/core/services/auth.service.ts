import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, Role, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/v1';
  private tokenKey = 'rp_token';
  private userKey = 'rp_user';

  private tokenSignal = signal<string | null>(localStorage.getItem(this.tokenKey));
  private userSignal = signal<User | null>(this.getStoredUser());

  readonly token = computed(() => this.tokenSignal());
  readonly currentUser = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly userRole = computed(() => this.userSignal()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        this.tokenSignal.set(res.accessToken);
        this.userSignal.set(res.user);
        localStorage.setItem(this.tokenKey, res.accessToken);
        localStorage.setItem(this.userKey, JSON.stringify(res.user));
      })
    );
  }

  loginWithGoogle(data: { idToken?: string; tokenId?: string; email?: string; name?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, data).pipe(
      tap(res => {
        this.tokenSignal.set(res.accessToken);
        this.userSignal.set(res.user);
        localStorage.setItem(this.tokenKey, res.accessToken);
        localStorage.setItem(this.userKey, JSON.stringify(res.user));
      })
    );
  }

  logout() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  hasRole(roles: Role[]): boolean {
    const current = this.userRole();
    return !!current && roles.includes(current);
  }
}
