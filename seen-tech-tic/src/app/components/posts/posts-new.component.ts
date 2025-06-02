import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { BackButtonComponent } from '../back-button/back-button.component';

@Component({
  selector: 'app-posts-new',
  templateUrl: './posts-new.component.html',
  styleUrls: ['./posts-new.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, BackButtonComponent]
})
export class PostsNewComponent implements OnInit {
  @Output() postCreated = new EventEmitter<void>();

  postForm: FormGroup;
  reservations: Reservation[] = [];
  currentUserId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private postService: PostService,
    private authService: AuthService
  ) {
    this.postForm = this.fb.group({
      postTitle: ['', Validators.required],
      postDescription: ['', Validators.required],
      reservationId: [null]
    });
  }

  ngOnInit(): void {
    this.authService.currentUserId$.subscribe(id => {
      this.currentUserId = id;
      if (this.currentUserId) {
        this.loadUserReservations();
      }
    });
  }

  loadUserReservations(): void {
    this.reservationService.getAllReservations().subscribe({
      next: (data: Reservation[]) => {
        // Filter reservations by current user
        this.reservations = data.filter(reservation => reservation.authorId === this.currentUserId);
        console.log('Loaded and filtered user reservations:', this.reservations);
      },
      error: (err: any) => console.error('Failed to load reservations', err)
    });
  }

  onSubmit(): void {
    if (this.postForm.invalid || !this.currentUserId) {
      return;
    }
    const newPost = {
      postTitle: this.postForm.value.postTitle,
      postDescription: this.postForm.value.postDescription,
      authorId: this.currentUserId,
      reservationId: this.postForm.value.reservationId
    };
    this.postService.addPost(newPost).subscribe({
      next: () => {
        this.postForm.reset();
        this.postCreated.emit();
      },
      error: (err: any) => {
        if (err.error && err.error.includes('already exists')) {
          this.postForm.get('reservationId')?.setErrors({ 'reservationExists': true });
        } else {
          console.error('Failed to create post', err);
        }
      }
    });
  }
}
