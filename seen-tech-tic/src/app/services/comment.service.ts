import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Comment {
  commentId?: number;
  commentContent: string;
  createdAt?: string;
  postId: number;
  authorId: number;
  author?: {
    userId: number;
    username: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = 'http://localhost:5041/api/comment';

  constructor(private http: HttpClient) {}

  addComment(comment: Comment): Observable<Comment> {
    const dto = {
      CommentContent: comment.commentContent,
      PostId: comment.postId,
      AuthorId: comment.authorId
    };
    return this.http.post<Comment>(this.apiUrl, dto);
  }

  deleteComment(commentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${commentId}`);
  }
}
