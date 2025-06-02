import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
      password: ['', [Validators.required, Validators.minLength(6), this.noTrailingOrMultipleSpacesValidator()]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { username, email, password, confirmPassword } = this.registerForm.value;
      console.log('Registration attempt with:', { username, email, password, confirmPassword });

      this.authService.register({ username, email, password, confirmPassword }).subscribe({
        next: (response) => {
          console.log('Registration response:', response);
          this.isLoading = false;
          if (response.success) {
            this.router.navigate(['/login']);
          } else {
            // Handle backend service-level errors (AuthResponseDto structure, e.g., email/username already exists)
            this.errorMessage = response.message || 'Registration failed.';
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Registration error:', error);
          console.log('Full error object:', error); // Log the full error object

          this.isLoading = false;

          // Clear previous backend errors from all controls
          Object.keys(this.registerForm.controls).forEach(key => {
            const control = this.registerForm.get(key);
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
            }
          });

          let generalErrors: string[] = [];

          if (error.status === 400 && error.error && typeof error.error === 'object') {
             if (error.error.errors) {
                const modelStateErrors = error.error.errors;
                console.log('Parsing ModelState errors and setting on form controls:', modelStateErrors);

                for (const key in modelStateErrors) {
                  if (modelStateErrors.hasOwnProperty(key)) {
                    // Normalize key to lowercase for matching form control names
                    const formControl = this.registerForm.get(key.toLowerCase());
                    if (formControl) {
                      const currentErrors = formControl.errors || {};
                      // Set backend error and preserve other existing errors
                      formControl.setErrors({...currentErrors, backend: modelStateErrors[key].join(' ') });
                      console.log(`Set backend error on ${key.toLowerCase()}:`, formControl.errors);

                       // Mark as touched and dirty to ensure error is displayed
                      formControl.markAsTouched();
                      formControl.markAsDirty();
                    } else {
                       console.warn(`Backend error for unknown control: ${key}`, modelStateErrors[key]);
                       // If the error is not for a known form control, add it to the general error message list
                       if (Array.isArray(modelStateErrors[key])) {
                          generalErrors = generalErrors.concat(modelStateErrors[key]);
                        } else if (typeof modelStateErrors[key] === 'string') {
                          generalErrors.push(modelStateErrors[key]);
                        }
                    }
                  }
                }
             } else if (error.error.message) {
                // Fallback to a top-level 'message' property in the 400 response body
                generalErrors.push(error.error.message);
             }
          } else if (error.message) { // Handle other HTTP errors
            generalErrors.push(error.message);
          }

          // Set general error message if any
          if (generalErrors.length > 0) {
            this.errorMessage = generalErrors.join('\n');
          } else { // Fallback for unexpected errors if no specific or general errors were set
             this.errorMessage = 'An unexpected error occurred. Please try again.';
          }

          console.log('Final error message to display:', this.errorMessage);
        }
      });
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('minlength')) {
      return `Must be at least ${control.errors?.['minlength']?.requiredLength} characters`;
    }
    if (control?.hasError('maxlength')) {
      return `Cannot be more than ${control.errors?.['maxlength']?.requiredLength} characters`;
    }
    if (control?.hasError('pattern')) {
      if (controlName === 'email') {
        return 'Please enter a valid email address (e.g., user@domain.com)';
      }
      return 'Invalid format';
    }
    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
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

  passwordMatchValidator(formGroup: FormGroup) {
    const passwordControl = formGroup.get('password');
    const confirmPasswordControl = formGroup.get('confirmPassword');

    if (!passwordControl || !confirmPasswordControl) {
      return null;
    }

    if (passwordControl.value !== confirmPasswordControl.value) {
      confirmPasswordControl.setErrors({ passwordMismatch: true });
    } else {
      if (confirmPasswordControl.hasError('passwordMismatch')) {
         confirmPasswordControl.setErrors(null);
      }
    }
     return null;
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
}