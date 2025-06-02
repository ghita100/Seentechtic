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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Adaugă aceste importuri


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ]
})
export class LoginComponent {
  loginForm: FormGroup;
  responseMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.responseMessage = '';
      this.isError = false;

      this.authService.login(this.loginForm.value).subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;

          if (response.success && response.token) {
            this.responseMessage = response.message || 'Autentificare reușită!';
            this.isError = false;

            localStorage.setItem('authToken', response.token);
            this.authService.updateUserIdFromToken();
            this.router.navigate(['/dashboard']);
          } else {
            this.responseMessage = response.message || 'Autentificare eșuată.';
            this.isError = true;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isError = true;

          let friendlyMessage = 'Autentificare eșuată. Verifică emailul și parola.';

          if (error.error) {
            if (typeof error.error === 'string') {
              friendlyMessage = error.error;
            } else if (error.error.message) {
              friendlyMessage = error.error.message;
            }
          }

          if (error.status === 0) {
            friendlyMessage = 'Nu s-a putut contacta serverul. Verifică conexiunea la internet.';
          }

          this.responseMessage = friendlyMessage;
        }
      });
    } else {
      // Optional: afișează un mesaj dacă formularul e invalid
      this.responseMessage = 'Te rugăm să completezi corect toate câmpurile.';
      this.isError = true;
    }
  }


  navigateToRegister() {
    this.router.navigate(['/register']);
  }

}
