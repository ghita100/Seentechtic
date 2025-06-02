import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Define a basic interface for the Field, matching the backend structure
export interface Field {
  fieldId: number;
  fieldName: string;
  // Add other field properties if needed
}

export interface Reservation {
  reservationId: number;
  startTime: string;
  endTime: string;
  authorId: number;
  fieldId: number;
  maxParticipants: number;
  participantIds?: number[];
  fieldName?: string;
  post?: {
    postId: number;
    postTitle: string;
    postDescription: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = 'http://localhost:5041/api/reservation';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // Adjust if token is stored elsewhere
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  addReservation(reservation: any): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, reservation, { headers: this.getAuthHeaders() });
  }

  getAllReservations(): Observable<Reservation[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<Reservation[]>(this.apiUrl, { headers });
  }

  // New method to get occupied hours for a field and date
  getOccupiedHours(fieldId: number, date: string): Observable<string[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    const params = { fieldId: fieldId.toString(), date };
    return this.http.get<string[]>(`${this.apiUrl}/occupied-hours`, { headers, params });
  }

  getReservation(reservationId: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${reservationId}`, { headers: this.getAuthHeaders() });
  }

  deleteReservation(reservationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${reservationId}`, { headers: this.getAuthHeaders() });
  }

  updateReservation(reservationId: number, reservation: any): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${reservationId}`, reservation, { headers: this.getAuthHeaders() });
  }

  joinReservation(reservationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/join`, {}, { 
      headers: this.getAuthHeaders(),
      responseType: 'text' // Expect a text response
    });
  }

  leaveReservation(reservationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${reservationId}/leave`, {
      headers: this.getAuthHeaders(),
      responseType: 'text' // Expect a text response
    });
  }
}