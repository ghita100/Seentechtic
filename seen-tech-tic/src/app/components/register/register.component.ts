import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, AuthResponse } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ]
})
export class RegisterComponent {
  registerForm: FormGroup;
  responseMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.responseMessage = '';
      this.isError = false;

      const { username, email, password, confirmPassword } = this.registerForm.value;

      this.authService.register({ username, email, password, confirmPassword }).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.router.navigate(['/login']);
          } else {
            this.isError = true;
            this.responseMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isError = true;
          
          if (error.error && error.error.message) {
            // Handle specific backend error messages
            if (error.error.message.includes('Username already exists')) {
              this.registerForm.get('username')?.setErrors({ backend: 'Acest nume de utilizator este deja folosit.' });
            } else if (error.error.message.includes('Email already exists')) {
              this.registerForm.get('email')?.setErrors({ backend: 'Acest email este deja folosit.' });
            } else {
              this.responseMessage = error.error.message;
            }
          } else {
            this.responseMessage = 'A apărut o eroare la înregistrare. Vă rugăm să încercați din nou.';
          }
        }
      });
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return 'Acest câmp este obligatoriu.';
    }
    if (control.hasError('minlength')) {
      return `Trebuie să aibă cel puțin ${control.errors?.['minlength']?.requiredLength} caractere.`;
    }
    if (controlName === 'email' && control.hasError('pattern')) {
      return 'Vă rugăm să introduceți o adresă de email validă.';
    }
    if (control.hasError('passwordMismatch')) {
      return 'Parolele nu se potrivesc.';
    }
    if (control.hasError('backend')) {
      return control.errors?.['backend'];
    }
    return '';
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
