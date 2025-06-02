import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PostService, Post, Comment } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { HeaderComponent } from '../../components/header/header.component';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BackButtonComponent } from '../back-button/back-button.component';
import { UserService, UserProfile } from '../../services/user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    BackButtonComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  profileIcon = 'assets/profile-icon.png';
  userProfilePhotoUrl: string | null = null;

  posts: Post[] = [];
  currentUserId: number | null = null;
  reservations: Reservation[] = [];

  constructor(
    private router: Router,
    private postService: PostService,
    private authService: AuthService,
    private commentService: CommentService,
    private reservationService: ReservationService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.authService.currentUserId$.subscribe((id: number | null) => {
      this.currentUserId = id;
      console.log('Current User ID:', this.currentUserId);
    });
    this.loadPostsWithCommentAuthors();
    this.loadReservations();
    this.loadUserProfilePhoto();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  loadReservations() {
    this.reservationService.getAllReservations().subscribe({
      next: (data: any) => {
        console.log('Reservations loaded:', JSON.stringify(data, null, 2));
        if (data && data.$values && Array.isArray(data.$values)) {
          this.reservations = data.$values;
        } else if (Array.isArray(data)) {
          this.reservations = data;
        } else {
          console.error('Unexpected reservations data format', data);
          this.reservations = [];
        }
      },
      error: (err: any) => console.error('Failed to load reservations', err)
    });
  }

  loadPostsWithCommentAuthors() {
    this.postService.getPosts().subscribe({
      next: (data: any) => {
        console.log('Posts loaded:', JSON.stringify(data, null, 2));
        if (data && data.$values && Array.isArray(data.$values)) {
          this.posts = data.$values;
          this.fetchCommentAuthorProfiles();
        } else if (Array.isArray(data)) {
          this.posts = data;
          this.fetchCommentAuthorProfiles();
        } else {
          console.error('Unexpected posts data format', data);
          this.posts = [];
        }
      },
      error: (err: any) => console.error('Failed to load posts', err)
    });
  }

  fetchCommentAuthorProfiles() {
    this.posts.forEach(post => {
      if (post.comments && post.comments.length > 0) {
        post.comments.forEach(comment => {
          if (comment.authorId && !comment.author) {
            this.userService.getUserProfile(comment.authorId).subscribe({
              next: (profile: UserProfile) => {
                comment.author = profile;
              },
              error: (err) => {
                console.error(`Failed to load profile for user ${comment.authorId}:`, err);
                comment.author = { userId: comment.authorId, username: 'Anonim' };
              }
            });
          }
        });
      }
    });
  }

  addPost() {
    if (!this.currentUserId) {
      alert('You must be logged in to add a post.');
      return;
    }
    const postTitle = prompt('Enter post title:');
    const postDescription = prompt('Enter post description:');
    if (postTitle && postDescription) {
      const newPost: Post = {
        postTitle,
        postDescription,
        authorId: this.currentUserId,
        reservationId: null,
        createdAt: new Date().toISOString()
      };
      this.postService.addPost(newPost).subscribe({
        next: (post: Post) => {
          this.posts.unshift(post);
        },
        error: (err: any) => console.error('Failed to add post', err)
      });
    }
  }

  addComment(post: Post) {
    if (!this.currentUserId) {
      alert('You must be logged in to add a comment.');
      return;
    }
    const commentContent = prompt('Enter your comment:');
    if (commentContent) {
      const newComment: Comment = {
        commentContent,
        postId: post.postId!,
        authorId: this.currentUserId,
        createdAt: new Date().toISOString()
      };
      this.commentService.addComment(newComment).subscribe({
        next: (comment: Comment) => {
          if (!Array.isArray(post.comments)) {
            post.comments = [];
          }
          this.userService.getCurrentUserProfile().subscribe({
            next: (currentUserProfile: UserProfile) => {
              comment.author = currentUserProfile;
              if (post.comments) {
                post.comments.unshift(comment);
              }
            },
            error: (err) => {
              console.error('Failed to fetch current user profile for new comment:', err);
              comment.author = { userId: this.currentUserId!, username: 'You' };
              if (post.comments) {
                post.comments.unshift(comment);
              }
            }
          });
        },
        error: (err: any) => console.error('Failed to add comment', err)
      });
    }
  }

  navigateToPosts() {
    this.router.navigate(['/posts']);
  }

  navigateToReservations() {
    this.router.navigate(['/reservations']);
  }

  contactUs() {
    window.location.href = 'mailto:seen-tech-tic@gmail.com';
  }

  loadUserProfilePhoto() {
    this.userService.getCurrentUserProfile().subscribe({
      next: (profile: UserProfile) => {
        if (profile && profile.photoUrl) {
          this.userProfilePhotoUrl = profile.photoUrl;
        } else {
          this.userProfilePhotoUrl = null;
        }
      },
      error: (err) => {
        console.error('Error loading user profile photo:', err);
        this.userProfilePhotoUrl = null;
      }
    });
  }
}
