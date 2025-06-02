import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel
import { PostService, Post, Comment } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { Router } from '@angular/router';
import { BackButtonComponent } from '../back-button/back-button.component';
import { UserService, UserProfile } from '../../services/user.service';
import { forkJoin, of } from 'rxjs'; // Import forkJoin and of
import { switchMap, catchError, map } from 'rxjs/operators'; // Import operators and map
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PostsNewComponent } from './posts-new.component';
import { PostsEditComponent } from './posts-edit.component';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PostsNewComponent,
    PostsEditComponent,
    BackButtonComponent
  ],
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.scss']
})
export class PostsComponent implements OnInit {
  posts: Post[] = [];
  currentUserId: number | null = null;
  newCommentContent: { [postId: number]: string } = {};
  editingPostId?: number;
  reservationsMap: Map<number, Reservation> = new Map();
  showAddPostForm = false;

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private commentService: CommentService,
    private reservationService: ReservationService,
    private router: Router,
    private userService: UserService, // Inject UserService
    private cdr: ChangeDetectorRef, // Inject ChangeDetectorRef
    private snackBar: MatSnackBar // Inject MatSnackBar
  ) {}

  ngOnInit() {
    this.authService.currentUserId$.subscribe((id: number | null) => {
      this.currentUserId = id;
    });
    this.loadPostsWithAuthorProfiles();
  }

  loadPostsWithAuthorProfiles() {
    this.postService.getPosts().pipe(
      switchMap((data: any) => {
        let posts: Post[];
        if (data && data.$values && Array.isArray(data.$values)) {
          posts = data.$values;
        } else if (Array.isArray(data)) {
          posts = data;
        } else {
          posts = [];
        }

        // Sort posts and initialize comments
        posts = posts.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        posts.forEach(post => {
          if (!post.comments) {
            post.comments = [];
          }
        });

        console.log('Initial posts data:', JSON.parse(JSON.stringify(posts))); // Log initial data

        // Collect unique authorIds from comments that need profile fetching
        const authorIdsToFetch = new Set<number>();
        posts.forEach(post => {
          if (post.comments) {
            post.comments.forEach(comment => {
              // Add authorId if it exists and author profile is not already present
              if (comment.authorId && (!comment.author || !comment.author.photoUrl)) {
                 authorIdsToFetch.add(comment.authorId);
              }
            });
          }
        });

        const fetchObservables: { [key: number]: Observable<UserProfile | { userId: number, username: string, photoUrl: undefined }> } = {};
        authorIdsToFetch.forEach(authorId => {
            fetchObservables[authorId] = this.userService.getUserProfile(authorId).pipe(
              catchError(err => {
                console.error(`Failed to load profile for user ${authorId}:`, err);
                // Return a default profile structure on error, ensure it has userId
                return of({ userId: authorId, username: 'Anonim', photoUrl: undefined });
              })
            );
        });

        // Use forkJoin to wait for all unique profile fetches to complete
        // If no profiles need fetching, forkJoin on an empty object completes immediately
        const profileFetch = Object.keys(fetchObservables).length > 0 ? forkJoin(fetchObservables) : of({});

        return profileFetch.pipe(
           map(fetchedProfiles => {
            console.log('Fetched profiles:', fetchedProfiles); // Log fetched profiles
            // Distribute the fetched profiles back to the comments using authorId
            posts.forEach(post => {
              if (post.comments) {
                post.comments.forEach(comment => {
                   // Use authorId to get the correct profile from the fetchedProfiles object
                   if (comment.authorId && (fetchedProfiles as any)[comment.authorId]) { // Check if a profile was fetched for this authorId
                    console.log(`Assigning profile for comment by user ${comment.authorId}:`, (fetchedProfiles as any)[comment.authorId]); // Log assignment
                    comment.author = (fetchedProfiles as any)[comment.authorId]; // Assign the fetched profile
                  } else if (comment.authorId && !comment.author) { // Assign a default if fetching failed and author was initially missing
                     console.log(`Assigning default profile for comment by user ${comment.authorId}:`, { userId: comment.authorId, username: 'Anonim', photoUrl: undefined }); // Log default assignment
                     comment.author = { userId: comment.authorId, username: 'Anonim', photoUrl: undefined } as UserProfile;
                  }
                });
              }
            });
            console.log('Posts after profile assignment:', JSON.parse(JSON.stringify(posts))); // Log final data structure
            // After processing profiles, load reservations
            this.loadAllReservationsAndMap();
            return posts; // Return the updated posts
          })
        );
      }),
      catchError(err => {
        console.error('Failed to load posts with author profiles', err);
        this.loadAllReservationsAndMap(); // Still attempt to load reservations
        return of([]); // Return empty array on error
      })
    ).subscribe(updatedPosts => {
      this.posts = updatedPosts;
      // loadAllReservationsAndMap is now called inside the switchMap after profile processing
    });
  }

  loadAllReservationsAndMap() {
    this.reservationService.getAllReservations().subscribe({
      next: (reservations: Reservation[]) => {
        this.reservationsMap.clear();
        // Store all reservations, not just user's reservations
        reservations.forEach(reservation => {
          this.reservationsMap.set(reservation.reservationId || 0, reservation);
        });
        this.assignReservationsToPosts();
      },
      error: (err: any) => console.error('Failed to load reservations', err)
    });
  }

  private assignReservationsToPosts(): void {
    this.posts.forEach(post => {
      if (post.reservationId) {
        const reservation = this.reservationsMap.get(post.reservationId);
        if (reservation) {
          post.reservation = {
            ...reservation,
            fieldId: (reservation as any).fieldId ?? (reservation as any).FieldId,
            startTime: (reservation as any).startTime ?? (reservation as any).StartTime,
            endTime: (reservation as any).endTime ?? (reservation as any).EndTime,
            authorId: (reservation as any).authorId ?? (reservation as any).AuthorId,
          };
        }
      }
    });
  }

  addComment(post: Post) {
    if (!this.currentUserId) {
      alert('You must be logged in to add a comment.');
      return;
    }
    const content = this.newCommentContent[post.postId || 0];
    if (!content || content.trim() === '') {
      alert('Comment content cannot be empty.');
      return;
    }
    const newComment: Comment = {
      commentContent: content,
      postId: post.postId || 0,
      authorId: this.currentUserId
    };
    this.commentService.addComment(newComment).subscribe({
      next: (comment: Comment) => {
         if (!Array.isArray(post.comments)) { // Ensure comments is an array
            post.comments = [];
          }
        // Fetch the current user's profile to get the photoUrl after adding the comment
        this.userService.getCurrentUserProfile().subscribe({
          next: (currentUserProfile: UserProfile) => {
            comment.author = currentUserProfile; // Assign the current user's profile
             if (post.comments) { // Add this check for linter
                post.comments.push(comment); // Add the comment with the author's profile
             }
            this.newCommentContent[post.postId || 0] = '';
          },
           error: (err) => {
              console.error('Failed to fetch current user profile for new comment:', err);
              // Fallback on error with a default profile structure
              comment.author = { userId: this.currentUserId!, username: 'You', photoUrl: undefined };
               if (post.comments) { // Add this check for linter
                 post.comments.push(comment); // Add the comment even if profile fetching fails
               }
              this.newCommentContent[post.postId || 0] = '';
            }
        });
      },
      error: (err: any) => console.error('Failed to add comment', err)
    });
  }

  deleteComment(post: Post, comment: Comment) {
    if (!comment.commentId) {
      console.error('Comment ID is missing');
      return;
    }

    this.commentService.deleteComment(comment.commentId).subscribe({
      next: () => {
        if (post.comments) {
          post.comments = post.comments.filter(c => c.commentId !== comment.commentId);
        }
        this.snackBar.open('Comentariul a fost șters cu succes', 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
      },
      error: (err) => {
        console.error('Failed to delete comment:', err);
        this.snackBar.open('Eroare la ștergerea comentariului', 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openEditPost(post: Post) {
    if (!this.currentUserId) {
      alert('You must be logged in to edit a post.');
      return;
    }
    if (post.authorId !== this.currentUserId) {
      alert('Nu ai permisiunea să modifici această postare.');
      return;
    }
    this.editingPostId = post.postId;
  }

  onPostUpdated(post: Post) {
    this.editingPostId = undefined;
    this.loadPostsWithAuthorProfiles(); // Reload posts with updated data
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  deletePost(post: Post) {
    if (!this.currentUserId) {
      alert('You must be logged in to delete a post.');
      return;
    }
    if (post.authorId !== this.currentUserId) {
      alert('Nu ai permisiunea să ștergi această postare.');
      return;
    }
    if (confirm('Are you sure you want to delete this post?')) {
      this.postService.deletePost(post.postId || 0).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p.postId !== post.postId);
        },
        error: (err: any) => console.error('Failed to delete post', err)
      });
    }
  }

  onPostCreated() {
    this.showAddPostForm = false;
    this.loadPostsWithAuthorProfiles(); // Reload posts with new post included
    // Add success snackbar
    this.snackBar.open('Postare adaugata cu scucces!', 'Închide', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  canJoinReservation(reservation: Reservation | undefined): boolean {
    if (!reservation || !this.currentUserId) return false;
    const isParticipant = reservation.participantIds?.includes(this.currentUserId);
    const isFull = (reservation.participantIds?.length || 0) >= ((reservation as any).maxParticipants || 1);
    return !isParticipant && !isFull;
  }

  joinReservation(reservationId: number): void {
    this.reservationService.joinReservation(reservationId).subscribe({
      next: (response) => {
        // Check if the response is a string (success message) or an object
        const successMessage = typeof response === 'string' ? response : 'Te-ai alăturat rezervării cu succes!';
        this.snackBar.open(successMessage, 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        // Reload posts and reservations to update the UI
        this.loadPostsWithAuthorProfiles();
        this.loadAllReservationsAndMap();
      },
      error: (err) => {
        // Extract error message from the error response
        const errorMessage = err?.error?.message || err?.error || err?.message || 'Nu s-a putut alătura';
        this.snackBar.open(errorMessage, 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  getMaxParticipants(reservation: any): number {
    return reservation && reservation.maxParticipants != null ? reservation.maxParticipants : 1;
  }
}