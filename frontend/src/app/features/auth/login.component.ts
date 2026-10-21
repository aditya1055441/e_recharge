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

  // Authentication Mode: SIGNIN or SIGNUP
  authMode = signal<'SIGNIN' | 'SIGNUP'>('SIGNIN');

  // Sign In state
  email = 'admin@example.local';
  password = 'ChangeMe123!';

  // Sign Up state
  signupMethod = signal<'EMAIL' | 'MOBILE'>('EMAIL');
  signupStep = signal<1 | 2 | 3>(1);
  signupIdentifier = '';
  signupCode = '';
  signupName = '';
  signupPassword = '';

  loading = signal(false);
  error = signal<string | null>(null);
  statusMessage = signal<string | null>(null);

  setCredentials(email: string) {
    this.email = email;
    this.password = 'ChangeMe123!';
    this.error.set(null);
    this.statusMessage.set(null);
  }

  switchToSignUp() {
    this.authMode.set('SIGNUP');
    this.signupStep.set(1);
    this.error.set(null);
    this.statusMessage.set(null);
    this.signupIdentifier = '';
    this.signupCode = '';
  }

  switchToSignIn() {
    this.authMode.set('SIGNIN');
    this.error.set(null);
    this.statusMessage.set(null);
  }

  setSignupMethod(method: 'EMAIL' | 'MOBILE') {
    this.signupMethod.set(method);
    this.signupIdentifier = '';
    this.error.set(null);
    this.statusMessage.set(null);
  }

  // Handle standard password sign-in
  onSubmit() {
    this.loading.set(true);
    this.error.set(null);
    this.statusMessage.set(null);

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

  // Handle Step 1 of Sign Up: Send Code
  sendSignupVerificationCode() {
    if (!this.signupIdentifier || !this.signupIdentifier.trim()) {
      this.error.set(
        this.signupMethod() === 'EMAIL'
          ? 'Please enter your email address'
          : 'Please enter your 10-digit mobile number'
      );
      return;
    }

    if (this.signupMethod() === 'EMAIL' && !this.signupIdentifier.includes('@')) {
      this.error.set('Please enter a valid email address');
      return;
    }

    if (this.signupMethod() === 'MOBILE' && this.signupIdentifier.replace(/\D/g, '').length !== 10) {
      this.error.set('Please enter a valid 10-digit mobile phone number');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.statusMessage.set(null);

    this.authService.sendRegistrationCode(this.signupIdentifier.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.statusMessage.set(res.message);
        if (res.debugCode) {
          this.signupCode = res.debugCode;
        }
        this.signupStep.set(2);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to send verification code. Account may already exist.');
      }
    });
  }

  // Handle Step 2 of Sign Up: Verify Code
  verifySignupCode() {
    if (!this.signupCode || this.signupCode.trim().length !== 6) {
      this.error.set('Please enter the 6-digit verification code.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.statusMessage.set(null);

    this.authService.verifyRegistrationCode(this.signupIdentifier.trim(), this.signupCode.trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.statusMessage.set(res.message);
        this.signupStep.set(3);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Invalid or expired verification code.');
      }
    });
  }

  // Handle Step 3 of Sign Up: Complete Registration
  completeSignup() {
    if (!this.signupName || !this.signupName.trim()) {
      this.error.set('Please enter your full name.');
      return;
    }

    if (!this.signupPassword || this.signupPassword.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.statusMessage.set(null);

    this.authService.completeRegistration({
      identifier: this.signupIdentifier.trim(),
      code: this.signupCode.trim(),
      name: this.signupName.trim(),
      password: this.signupPassword
    }).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to complete registration.');
      }
    });
  }

  // Google sign in via Firebase
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
