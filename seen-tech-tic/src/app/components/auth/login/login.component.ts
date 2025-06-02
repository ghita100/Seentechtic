import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
      password: ['', [Validators.required, this.noTrailingOrMultipleSpacesValidator()]]
    });
  }

  noTrailingOrMultipleSpacesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const value = control.value as string;
      
      // Check for trailing spaces
      if (value.endsWith(' ')) {
        return { trailingSpaces: true };
      }
      
      // Check for multiple consecutive spaces
      if (value.includes('  ')) {
        return { multipleSpaces: true };
      }
      
      return null;
    };
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = ''; // Clear previous errors on new submission

      const { email, password } = this.loginForm.value;
      console.log('Login attempt with email:', email);

      this.authService.login({ email, password }).subscribe({
        next: (response) => {
          console.log('Login response:', response);
          this.isLoading = false;
          if (response.success) {
            this.router.navigate(['/']);
          } else {
            // Handle backend service-level errors (e.g., from AuthResponseDto if success is false but status is 200)
            this.errorMessage = response.message || 'Login failed. Please check your credentials.';
             console.log('Login failed with response message:', this.errorMessage);
          }
           this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Login error:', error);
           console.log('Login error status:', error.status);
           console.log('Login error response body:', error.error);

          this.isLoading = false;
          this.errorMessage = ''; // Clear previous general error message before setting a new one

          // Clear previous backend validation errors from all controls (useful for 400 errors from prior attempts)
          Object.keys(this.loginForm.controls).forEach(key => {
            const control = this.loginForm.get(key);
            if (control) { // Ensure control exists before accessing errors
              if (control.errors && control.errors['backend']) {
                const { backend, ...rest } = control.errors;
                 if (Object.keys(rest).length === 0) {
                   control.setErrors(null);
                 } else {
                   control.setErrors(rest);
                 }
              }
               // Also clear any frontend errors related to the specific backend validation
               if (control.hasError('trailingSpaces')) control.setErrors(null);
               if (control.hasError('multipleSpaces')) control.setErrors(null);
               // Mark as touched and dirty to ensure error is displayed on subsequent backend errors
               control.markAsTouched();
               control.markAsDirty();
            }
          });

          // --- Refactored Error Handling Logic ---

          if (error.status === 401) {
            // Handle 401 Unauthorized specifically - Invalid Credentials
            // Access message directly from error.error as backend sends AuthResponseDto
            this.errorMessage = error.error?.message || 'Invalid email or password';
            console.log('Set error message for 401', this.errorMessage);

          } else if (error.status === 400 && error.error && typeof error.error === 'object') {
             // Handle 400 Bad Request with potential ModelState errors or a general message
             if (error.error.errors) {
                const modelStateErrors = error.error.errors;
                console.log('Parsing ModelState errors and setting on form controls:', modelStateErrors);
                let generalErrors: string[] = []; // Collect non-field specific errors from 400 response

                for (const key in modelStateErrors) {
                  if (modelStateErrors.hasOwnProperty(key)) {
                    const formControl = this.loginForm.get(key.toLowerCase());
                    if (formControl) {
                      const currentErrors = formControl.errors || {};
                      formControl.setErrors({...currentErrors, backend: modelStateErrors[key].join(' ') });
                      console.log(`Set backend error on ${key.toLowerCase()}:`, formControl.errors);
                       formControl.markAsTouched();
                       formControl.markAsDirty();
                    } else {
                       console.warn(`Backend error for unknown control: ${key}`, modelStateErrors[key]);
                       if (Array.isArray(modelStateErrors[key])) {
                          generalErrors = generalErrors.concat(modelStateErrors[key]);
                        } else if (typeof modelStateErrors[key] === 'string') {
                          generalErrors.push(modelStateErrors[key]);
                        }
                    }
                  }
                }
                 // If there are any non-field specific errors from 400, display them as a general message
                 if (generalErrors.length > 0) {
                     this.errorMessage = generalErrors.join('\n');
                 }
             } else if (error.error.message) {
                // Fallback for 400 with a top-level 'message' property
                 this.errorMessage = error.error.message;
             }
          } else { // Handle other HTTP error statuses (e.g., 500 Internal Server Error)
             this.errorMessage = error.message || 'An unexpected error occurred during login. Please try again.';
          }

          // --- End of Refactored Error Handling Logic ---

          console.log('Final errorMessage value:', this.errorMessage);
           this.cdr.detectChanges(); // Manually trigger change detection to update the view
        }
      });
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid email address (e.g., user@domain.com)';
    }
    if (control?.hasError('trailingSpaces')) {
      return 'Password cannot end with spaces';
    }
    if (control?.hasError('multipleSpaces')) {
      return 'Password cannot contain multiple consecutive spaces';
    }
    // Check for backend validation error set on the form control
    if (control?.errors && typeof control.errors === 'object') {
      const backendError = control.errors['backend'];
      if (backendError) {
        return backendError;
      }
    }
    return '';
  }
} 