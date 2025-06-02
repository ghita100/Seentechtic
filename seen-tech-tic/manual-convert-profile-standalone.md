# How to Convert ProfileComponent to Standalone Component

To convert your ProfileComponent to a standalone component, update the `profile.component.ts` file as follows:

1. Import `CommonModule` from `@angular/common`.

2. Add `standalone: true` and `imports: [CommonModule]` to the `@Component` decorator.

3. Remove the component from any module declarations (e.g., AppModule).

Here is the full updated code for `profile.component.ts`:

```typescript
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PostService, Post } from '../../services/post.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  posts: Post[] = [];
  currentUserId: number | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private postService: PostService
  ) {}

  ngOnInit() {
    this.authService.currentUserId$.subscribe(id => {
      this.currentUserId = id;
      console.log('Current user ID:', id);

      if (this.currentUserId) {
        this.loadUserPosts();
      } else {
        console.warn('User not authenticated.');
      }
    });
  }

  loadUserPosts() {
    this.postService.getPosts().subscribe(posts => {
      console.log('Posts received:', posts);

      this.posts = posts.filter(post => post.authorId === this.currentUserId);
      console.log('Filtered posts:', this.posts);
    }, error => {
      console.error('Error loading posts:', error);
    });
  }

  editPost(post: Post) {
    alert(`Edit post: ${post.postTitle}`);
  }

  deletePost(postId: number | undefined) {
    if (!postId) return;
    this.postService.deletePost(postId).subscribe({
      next: () => {
        this.posts = this.posts.filter(post => post.postId !== postId);
        console.log(`Post ${postId} deleted`);
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
}
```

After this, update your routing module to use the standalone ProfileComponent in the route configuration.

If you need help with that, please let me know.
