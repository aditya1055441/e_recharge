import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = 'admin@example.local';
  password = 'ChangeMe123!';
  loading = signal(false);
  error = signal<string | null>(null);

  setCredentials(email: string) {
    this.email = email;
    this.password = 'ChangeMe123!';
    this.error.set(null);
  }

  onSubmit() {
    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Invalid credentials or server unavailable.');
      }
    });
  }

  async signInWithGoogle() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const userCredential = await this.firebaseService.signInWithGoogle();
      const idToken = await userCredential.user.getIdToken();

      this.authService.loginWithGoogle({
        idToken,
        email: userCredential.user.email || undefined,
        name: userCredential.user.displayName || undefined
      }).subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || err.error?.error || 'Failed to authenticate Google user with backend');
        }
      });
    } catch (err: any) {
      this.loading.set(false);
      if (err.code !== 'auth/popup-closed-by-user') {
        this.error.set(err.message || 'Google sign-in popup failed');
      }
    }
  }

  signInWithDemoGoogle() {
    this.loading.set(true);
    this.error.set(null);

    const mockIdToken = 'mock-google-token-' + Date.now();
    this.authService.loginWithGoogle({
      idToken: mockIdToken,
      email: 'google.retailer@example.local',
      name: 'Google Retailer'
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.error?.error || 'Google sign-in failed.');
      }
    });
  }
}
