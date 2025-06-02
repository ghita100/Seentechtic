import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from './user.service'; // Import UserProfile

export interface Post {
  postId?: number;
  postTitle: string;
  postDescription: string;
  authorId: number;
  author?: UserProfile; // Use UserProfile type
  reservationId?: number | null;
  reservation?: any | null;
  comments?: Comment[];
  createdAt?: string;
}

export interface Comment {
  commentId?: number;
  commentContent: string;
  createdAt?: string;
  postId: number;
  authorId: number;
  author?: UserProfile; // Use UserProfile type
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = 'http://localhost:5041/api/post'; // Adjust backend URL and endpoint as needed

  constructor(private http: HttpClient) {}

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.apiUrl);
  }

  addPost(post: Post): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, post);
  }
  updatePost(post: Post): Observable<Post> {
  return this.http.put<Post>(`${this.apiUrl}/${post.postId}`, post);
}

  deletePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${postId}`);
  }

  getPostById(postId: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${postId}`);
  }
}
