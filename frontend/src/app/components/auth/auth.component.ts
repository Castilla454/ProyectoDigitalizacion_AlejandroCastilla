import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.css']
})
export class AuthComponent {
    isLoginMode = true;
    isLoading = false;
    error: string | null = null;
    success: string | null = null;

    // Login
    loginEmail = '';
    loginPassword = '';

    // Register
    regUsername = '';
    regEmail = '';
    regPassword = '';
    regConfirmPassword = '';
    regDisplayName = '';

    constructor(private authService: AuthService, private router: Router) {
        if (this.authService.isLoggedIn) {
            this.router.navigate(['/']);
        }
    }

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        this.error = null;
        this.success = null;
    }

    onLogin() {
        if (!this.loginEmail || !this.loginPassword) {
            this.error = 'Por favor rellena todos los campos';
            return;
        }

        this.isLoading = true;
        this.error = null;

        this.authService.login(this.loginEmail, this.loginPassword).subscribe({
            next: () => {
                this.isLoading = false;
                this.router.navigate(['/']);
            },
            error: (err: any) => {
                this.isLoading = false;
                this.error = err.error?.error || 'Error al iniciar sesión';
            }
        });
    }

    onRegister() {
        if (!this.regUsername || !this.regEmail || !this.regPassword) {
            this.error = 'Por favor rellena todos los campos obligatorios';
            return;
        }

        if (this.regPassword !== this.regConfirmPassword) {
            this.error = 'Las contraseñas no coinciden';
            return;
        }

        if (this.regPassword.length < 6) {
            this.error = 'La contraseña debe tener al menos 6 caracteres';
            return;
        }

        this.isLoading = true;
        this.error = null;

        this.authService.register(
            this.regUsername,
            this.regEmail,
            this.regPassword,
            this.regDisplayName || this.regUsername
        ).subscribe({
            next: () => {
                this.isLoading = false;
                this.router.navigate(['/']);
            },
            error: (err: any) => {
                this.isLoading = false;
                console.error('Registration error:', err);
                if (err.error && typeof err.error === 'object' && err.error.error) {
                    this.error = err.error.error;
                } else if (err.error && typeof err.error === 'string') {
                    this.error = err.error;
                } else if (err.status === 409) {
                    this.error = 'El usuario o email ya existe';
                } else {
                    this.error = err.message || 'Error al registrarse';
                }
            }
        });
    }
}
