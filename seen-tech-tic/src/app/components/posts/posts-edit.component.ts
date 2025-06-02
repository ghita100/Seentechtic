import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PostService, Post } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService, UserProfile } from '../../services/user.service';
import { BackButtonComponent } from '../back-button/back-button.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-posts-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BackButtonComponent],
  templateUrl: './posts-edit.component.html',
  styleUrls: ['./posts-edit.component.scss']
})
export class PostsEditComponent implements OnInit, OnChanges {
  currentUserId: number | null = null;
  postForm!: FormGroup;
  showEditForm = false;
  reservations: Reservation[] = [];
  selectedReservationId: number | null = null;

  userProfile?: UserProfile;

  @Input() editPost?: Post;
  @Output() postUpdated = new EventEmitter<Post>();

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private authService: AuthService,
    private reservationService: ReservationService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.authService.currentUserId$.subscribe(id => this.currentUserId = id);
    this.loadReservations();

    this.userService.getCurrentUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
      }
    });

    this.postForm = this.fb.group({
      postTitle: ['', Validators.required],
      postDescription: ['', Validators.required],
      reservationId: [null]
    });

    this.route.paramMap.subscribe(params => {
      const postId = params.get('id');
      if (postId) {
        this.loadPostById(+postId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editPost'] && this.editPost) {
      this.showEditForm = true;
      this.postForm.patchValue({
        postTitle: this.editPost.postTitle,
        postDescription: this.editPost.postDescription,
        reservationId: this.editPost.reservationId || null
      });
      this.selectedReservationId = this.editPost.reservationId || null;
    } else if (changes['editPost'] && !this.editPost) {
      this.resetForm();
    }
  }

  loadPostById(postId: number): void {
    this.postService.getPostById(postId).subscribe({
      next: (post: Post) => {
        this.editPost = post;
        this.showEditForm = true;
        this.postForm.patchValue({
          postTitle: post.postTitle,
          postDescription: post.postDescription,
          reservationId: post.reservationId || null
        });
        this.selectedReservationId = post.reservationId || null;
      },
      error: err => {
        console.error('Failed to load post', err);
        alert('Eroare: Postarea nu a putut fi încărcată sau nu există. Veți fi redirecționat către dashboard.');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 0);
      }
    });
  }

  loadReservations(): void {
    this.reservationService.getAllReservations().subscribe({
      next: (data: Reservation[]) => {
        this.reservations = data.filter(reservation => reservation.authorId === this.currentUserId);
        console.log('Loaded and filtered user reservations:', this.reservations);
      },
      error: err => console.error('Failed to load reservations', err)
    });
  }

  updatePost(): void {
    if (!this.currentUserId) {
      alert('Trebuie să fii logat pentru a modifica o postare.');
      return;
    }

    if (this.postForm.invalid) {
      alert('Completează toate câmpurile.');
      this.postForm.markAllAsTouched();
      return;
    }

    if (!this.editPost) {
      alert('Postarea de modificat nu este specificată.');
      return;
    }

    const { postTitle, postDescription, reservationId } = this.postForm.value;

    const updatedPost: Post = {
      ...this.editPost,
      postTitle,
      postDescription,
      reservationId
    };

    this.postService.updatePost(updatedPost).subscribe({
      next: (post: Post) => {
        this.resetForm();
        this.postUpdated.emit(post);
        this.snackBar.open('Postare modificată cu succes!', 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/profile']);
      },
      error: err => {
        console.error('Eroare la modificarea postării:', err);
        if (err.error && err.error.includes('already exists')) {
          this.postForm.get('reservationId')?.setErrors({ 'reservationExists': true });
          this.snackBar.open('Există deja o postare pentru această rezervare!', 'Închide', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        } else {
          alert('A apărut o eroare la modificarea postării.');
        }
      }
    });
  }

  resetForm(): void {
    this.postForm.reset();
    this.showEditForm = false;
    this.editPost = undefined;
    this.selectedReservationId = null;
  }

  cancel(): void {
    this.resetForm();
    this.router.navigate(['/profile']);
  }
}