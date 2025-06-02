import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  userId: number;
  username: string;
  description?: string;
  photoUrl?: string;
  // Add other properties as needed
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:5041/api/users'; // Corrected backend URL with 'users'

  constructor(private http: HttpClient) {}

  getCurrentUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.apiUrl + '/profile');
  }

  getUserProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`);
  }

  updateProfile(formData: FormData): Observable<UserProfile> {
    return this.http.put<UserProfile>(this.apiUrl + '/profile', formData);
  }
}