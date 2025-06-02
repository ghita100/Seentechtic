import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PostService, Post } from '../../services/post.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService, UserProfile } from '../../services/user.service';
import { FormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { BackButtonComponent } from '../back-button/back-button.component';
import { CommentService, Comment } from '../../services/comment.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BackButtonComponent, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  posts: Post[] = [];
  currentUserId: number | null = null;
  userProfile: UserProfile | null = null;
  isEditing = false;
  profileForm!: FormGroup;
  selectedFile: File | null = null;
  passwordVisible = false;
  newCommentContent: { [postId: number]: string } = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private postService: PostService,
    private userService: UserService,
    private commentService: CommentService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.authService.currentUserId$.subscribe(id => {
      this.currentUserId = id;
      console.log('Current user ID:', id);

      if (this.currentUserId) {
        this.loadUserPosts();
        this.loadUserProfile();
      } else {
        console.warn('User not authenticated.');
      }
    });

    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      newPassword: ['', [Validators.minLength(6), this.noTrailingOrMultipleSpacesValidator()]],
      confirmNewPassword: ['', []]
    }, { validator: this.passwordMatchValidator });

    this.profileForm.disable();
  }

  loadUserPosts() {
    this.postService.getPosts().subscribe(posts => {
      console.log('Posts received:', posts);
      this.posts = posts.filter(post => post.authorId === this.currentUserId);
      // Initialize comments array if not present
      this.posts.forEach(post => {
        if (!post.comments) {
          post.comments = [];
        }
      });
      console.log('Filtered posts:', this.posts);
    }, error => {
      console.error('Error loading posts:', error);
    });
  }

  loadUserProfile() {
    this.userService.getCurrentUserProfile().subscribe(profile => {
      this.userProfile = profile;
      this.profileForm.patchValue({ username: profile.username });
      console.log('User profile loaded:', profile);
    }, error => {
      console.error('Failed to load user profile:', error);
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.userProfile) {
          this.userProfile.photoUrl = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.profileForm.enable();
      this.profileForm.patchValue({ newPassword: '', confirmNewPassword: '' });
    } else {
      this.profileForm.disable();
      this.profileForm.reset();
      this.loadUserProfile();
      this.selectedFile = null;
    }
  }

  saveProfile() {
    if (!this.userProfile || !this.profileForm.valid) return;

    const formData = new FormData();
    const formValues = this.profileForm.value;

    if (formValues.username !== this.userProfile.username) {
      formData.append('username', formValues.username);
    }

    if (formValues.newPassword) {
      formData.append('password', formValues.newPassword);
    }

    if (this.selectedFile) {
      formData.append('profilePicture', this.selectedFile);
    }

    if (this.selectedFile || formData.has('username') || formData.has('password')) {
      this.userService.updateProfile(formData).subscribe({
        next: (updatedProfile) => {
          this.userProfile = updatedProfile;
          if (this.userProfile && this.userProfile.photoUrl && !this.userProfile.photoUrl.startsWith('data:image')) {
            this.userProfile.photoUrl = 'data:image/png;base64,' + this.userProfile.photoUrl;
          }
          this.isEditing = false;
          this.profileForm.disable();
          this.profileForm.patchValue({ newPassword: '', confirmNewPassword: '' });
          this.selectedFile = null;
        },
        error: (error) => {
          console.error('Failed to update profile:', error);

          let errorMessage = 'Failed to update profile. Please try again.'; // Default message

          if (error.error && typeof error.error === 'object') {
            // Check for a general message first (backend might return this for same password error)
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errors) {
              // Handle ModelState errors for specific fields
              const modelStateErrors = error.error.errors;
              for (const key in modelStateErrors) {
                if (modelStateErrors.hasOwnProperty(key)) {
                  const formControl = this.profileForm.get(key.toLowerCase());
                  if (formControl) {
                    const currentErrors = formControl.errors || {};
                    formControl.setErrors({...currentErrors, backend: modelStateErrors[key].join(' ')});
                  }
                }
              }
              // If there were specific field errors, don't show the general alert
              errorMessage = '';
            }
          }

          if (errorMessage) {
            alert(errorMessage);
          }
        }
      });
    } else {
      this.toggleEdit();
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  editPost(post: Post) {
    console.log('editPost called with post:', post);
    if (post.postId) {
      console.log('Navigating to edit post with ID:', post.postId);
      this.router.navigate(['/posts/edit', post.postId]);
    } else {
      alert('Post ID is missing, cannot edit.');
    }
  }

  deletePost(postId: number | undefined) {
    if (!postId) return;
    this.postService.deletePost(postId).subscribe({
      next: () => {
        this.posts = this.posts.filter(post => post.postId !== postId);
        console.log(`Post ${postId} deleted`);
        this.snackBar.open('Postare ștearsă cu succes!', 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
      },
      error: (err) => {
        alert('Failed to delete post');
        console.error(err);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  addComment(post: Post) {
    if (!this.currentUserId) {
      alert('You must be logged in to add a comment.');
      return;
    }

    const content = this.newCommentContent[post.postId || 0];
    if (!content || content.trim() === '') {
      alert('Please enter a comment.');
      return;
    }

    const newComment: Comment = {
      commentContent: content,
      postId: post.postId || 0,
      authorId: this.currentUserId
    };

    this.commentService.addComment(newComment).subscribe({
      next: (comment) => {
        if (!post.comments) {
          post.comments = [];
        }
        post.comments.push(comment);
        this.newCommentContent[post.postId || 0] = '';
      },
      error: (error) => {
        console.error('Failed to add comment:', error);
        alert('Failed to add comment. Please try again.');
      }
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPasswordControl = formGroup.get('newPassword');
    const confirmNewPasswordControl = formGroup.get('confirmNewPassword');

    if (!newPasswordControl || !confirmNewPasswordControl) {
      return null;
    }

    if (confirmNewPasswordControl.hasError('passwordMismatch') && newPasswordControl.value === confirmNewPasswordControl.value) {
      confirmNewPasswordControl.setErrors(null);
    }

    if (newPasswordControl.value !== confirmNewPasswordControl.value && confirmNewPasswordControl.value) {
      confirmNewPasswordControl.setErrors({ passwordMismatch: true });
    } else if (!confirmNewPasswordControl.value && confirmNewPasswordControl.hasError('passwordMismatch')) {
      confirmNewPasswordControl.setErrors(null);
    }

    if (!newPasswordControl.value && confirmNewPasswordControl.hasError('passwordMismatch')) {
      confirmNewPasswordControl.setErrors(null);
    }

    return null;
  }

  noTrailingOrMultipleSpacesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value as string;

      if (value.endsWith(' ')) {
        return { trailingSpaces: true };
      }

      if (value.includes('  ')) {
        return { multipleSpaces: true };
      }

      return null;
    };
  }

  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    if (!control || !control.errors) {
      return '';
    }

    if (control.hasError('required')) {
      return 'This field is required';
    }
    if (control.hasError('minlength')) {
      return `Must be at least ${control.errors['minlength']?.requiredLength} characters`;
    }
    if (control.hasError('trailingSpaces')) {
      return 'Password cannot end with spaces';
    }
    if (control.hasError('multipleSpaces')) {
      return 'Password cannot contain multiple consecutive spaces';
    }
    if (control.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    if (control.hasError('backend')) {
      return control.errors['backend'];
    }

    return '';
  }
}
