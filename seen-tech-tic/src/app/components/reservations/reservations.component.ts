import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackButtonComponent } from '../back-button/back-button.component';
import { HttpClient } from '@angular/common/http';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatOptionModule,
    BackButtonComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss'],
  providers: [DatePipe]
})
export class ReservationsComponent implements OnInit {
  reservations: Reservation[] = [];
  currentUserId: number | null = null;
  reservationForm!: FormGroup;
  showAddForm = false;
  editingReservationId: number | null = null;
  endTimeValue: string = '';
  formattedEndTime: string = '';

  originalReservationData: any = null; // To store original form data for comparison

  // New properties for custom date and hour controls
  allHours: string[] = [];
  occupiedHours: string[] = [];
  occupiedHoursFormatted: string[] = [];
  freeIntervals: string[] = [];

  minDate: Date = new Date(new Date().setHours(0, 0, 0, 0)); // Set minDate to today at midnight to disable past dates

  // New property for fields list
  fields: { id: number; name: string }[] = [
    { id: 1, name: 'Football Field 1' },
    { id: 2, name: 'Football Field 2' },
    { id: 3, name: 'Football Field 3' },
    { id: 4, name: 'Football Field 4' },
    { id: 5, name: 'Football Field 5' },
    { id: 6, name: 'Basketball Court 1' },
    { id: 7, name: 'Basketball Court 2' },
    { id: 8, name: 'Basketball Court 3' },
    { id: 9, name: 'Basketball Court 4' },
    { id: 10, name: 'Basketball Court 5' },
    { id: 11, name: 'Volleyball Court 1' },
    { id: 12, name: 'Volleyball Court 2' },
    { id: 13, name: 'Volleyball Court 3' },
    { id: 14, name: 'Volleyball Court 4' },
    { id: 15, name: 'Volleyball Court 5' }
  ];

  // Track which reservation edit buttons have been clicked
  editButtonClicked: Set<number> = new Set();

  searchUsername: string = '';
  searchedUser: any = null;
  participants: any[] = [];

  allUsers: any[] = [];
  userIdToUsername: { [key: number]: string } = {};

  disabledHours: string[] = [];

  updateDisabledHours(): void {
    const startDate = this.reservationForm.get('startDate')?.value;
    if (!startDate) {
      this.disabledHours = [];
      return;
    }
    const selectedDate = new Date(startDate);
    const today = new Date();
    // Reset time components for comparison
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (selectedDate.getTime() === today.getTime()) {
      // If selected date is today, disable hours before current hour
      const currentHour = new Date().getHours();
      this.disabledHours = [];
      for (let hour = 0; hour < currentHour; hour++) {
        this.disabledHours.push(hour.toString().padStart(2, '0') + ':00');
      }
    } else {
      this.disabledHours = [];
    }
  }

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private authService: AuthService,
    private router: Router,
    private datePipe: DatePipe,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  toggleAddForm(): void {
    if (this.showAddForm) {
      this.resetForm();
    } else {
      this.resetForm();
    }
    this.showAddForm = !this.showAddForm;
  }

  cancelAddReservation(): void {
    this.reservationForm.reset();
    this.reservationForm.markAsPristine();
    this.reservationForm.markAsUntouched();
    this.freeIntervals = [];
    // Hide the add form after clearing
    this.showAddForm = false;
    this.editingReservationId = null;
  }

  ngOnInit(): void {
    this.authService.currentUserId$.subscribe(id => this.currentUserId = id);
    this.loadReservations();
    this.loadAllUsers();

    // Initialize allHours with 6 AM to 10 PM in "X AM/PM" format
    this.allHours = [];
    for (let hour = 6; hour <= 22; hour++) {
      let displayHour = hour % 12;
      if (displayHour === 0) displayHour = 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      this.allHours.push(`${displayHour} ${ampm}`);
    }

    this.reservationForm = this.fb.group({
      startDate: ['', Validators.required],
      startHour: ['', [Validators.required, this.occupiedHourValidator.bind(this)]],
      endTime: ['', Validators.required],
      fieldId: ['', [Validators.required, Validators.min(1)]],
      maxParticipants: [1, [Validators.required, Validators.min(1)]]
    });

    // Watch for changes in fieldId, startDate, and startHour to update occupied hours and validation
    this.reservationForm.get('fieldId')?.valueChanges.subscribe((value) => {
      console.log('fieldId changed to:', value);
      this.updateOccupiedHours();
    });
    this.reservationForm.get('startDate')?.valueChanges.subscribe(() => {
      this.updateOccupiedHours();
      this.updateDisabledHours();
    });
    this.reservationForm.get('startHour')?.valueChanges.subscribe((value) => {
      if (!value) return;
      // Convert value to "HH:00" format for comparison with occupiedHours
      let hourNum: number;
      if (/^\d{1,2}$/.test(value.trim())) {
        hourNum = parseInt(value.trim(), 10);
      } else {
        hourNum = this.parse12HourTo24Hour(value);
      }
      const hourStr = hourNum.toString().padStart(2, '0') + ':00';

      console.log('startHour value:', value);
      console.log('Normalized hourStr:', hourStr);
      console.log('Occupied hours:', this.occupiedHours);

      if (this.occupiedHours.includes(hourStr) || this.disabledHours.includes(hourStr)) {
        alert('Ora selectată este deja ocupată sau nu este disponibilă. Te rugăm să alegi o altă oră.');
        this.reservationForm.get('startHour')?.setValue('', { emitEvent: false });
      } else {
        this.updateOccupiedHours();
        this.updateEndTime();
      }
    });

    this.updateDisabledHours(); // Initialize disabled hours on component load
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadReservations(): void {
    this.reservationService.getAllReservations().subscribe({
      next: (data: any) => {
        const allReservations = Array.isArray(data?.$values) ? data.$values : data ?? [];
        
        // Filter reservations to include only those where the current user is the author or a participant
        this.reservations = allReservations.filter((reservation: Reservation) => {
          // Check if the current user is the author
          const isAuthor = reservation.authorId === this.currentUserId;

          // Check if the current user is a participant (if participantIds is an array and includes the user ID)
          const isParticipant = Array.isArray(reservation.participantIds) && this.currentUserId !== null && reservation.participantIds.includes(this.currentUserId);
            
          // Include the reservation if the user is either the author or a participant
          return isAuthor || isParticipant;
        });

        // Sort the filtered reservations
        this.reservations.sort((a: Reservation, b: Reservation) => {
          const dateA = new Date(a.startTime).getTime();
          const dateB = new Date(b.startTime).getTime();
          // Sort by date (most recent first)
          return dateB - dateA;
        });

      },
      error: (err: any) => console.error('Eroare la încărcare rezervări', err)
    });
  }

  updateEndTime(): void {
    const startDate = this.reservationForm.get('startDate')?.value;
    const startHour = this.reservationForm.get('startHour')?.value;
    if (!startDate || !startHour) {
      this.reservationForm.get('endTime')?.setValue('');
      return;
    }

    const hour = this.parse12HourTo24Hour(startHour);

    // Combine startDate and hour to create a Date object for start time
    const startDateObj = new Date(startDate);
    startDateObj.setHours(hour, 0, 0, 0);

    // Add one hour for end time
    const endDate = new Date(startDateObj.getTime() + 60 * 60 * 1000);

    // Format endDate to ISO string for form control
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = endDate.getFullYear();
    const month = pad(endDate.getMonth() + 1);
    const day = pad(endDate.getDate());
    const hours = pad(endDate.getHours());
    const minutes = pad(endDate.getMinutes());

    const endTimeValue = `${year}-${month}-${day}T${hours}:${minutes}`;
    this.reservationForm.get('endTime')?.setValue(endTimeValue, { emitEvent: false });
  }

  updateOccupiedHours(): void {
    const fieldIdRaw = this.reservationForm.get('fieldId')?.value;
    const fieldId = Number(fieldIdRaw);
    const startDate = this.reservationForm.get('startDate')?.value;

    if (!fieldIdRaw || isNaN(fieldId) || fieldId <= 0 || !startDate) {
      this.occupiedHours = [];
      return;
    }
    // Normalize date to local date string yyyy-mm-dd to avoid timezone issues
    const dateObj = new Date(startDate);
    const localDateStr = dateObj.getFullYear() + '-' +
      (dateObj.getMonth() + 1).toString().padStart(2, '0') + '-' +
      dateObj.getDate().toString().padStart(2, '0');

    console.log('updateOccupiedHours called with fieldId:', fieldId, 'startDate:', localDateStr);

    this.reservationService.getOccupiedHours(fieldId, localDateStr).subscribe({
      next: (hours: string[]) => {
        console.log('Occupied hours fetched:', hours);
        // Normalize occupied hours to "HH:00" format for consistent comparison
        this.occupiedHours = hours.map(h => {
          // h is in format like "9 AM", convert to "09:00"
          const hourNum = this.parse12HourTo24Hour(h);
          return hourNum.toString().padStart(2, '0') + ':00';
        });
        // Also create formatted occupied hours in "X AM/PM" format for template class binding
        this.occupiedHoursFormatted = hours.map(h => {
          // Normalize to consistent "X AM/PM" format
          const hourNum = this.parse12HourTo24Hour(h);
          let displayHour = hourNum % 12;
          if (displayHour === 0) displayHour = 12;
          const ampm = hourNum >= 12 ? 'PM' : 'AM';
          return `${displayHour} ${ampm}`;
        });
        this.updateDisabledHours(); // Update disabled hours after fetching occupied hours
      },
      error: (err: any) => {
        console.error('Error fetching occupied hours:', err);
        this.occupiedHours = [];
      }
    });
  }

  occupiedHourValidator(control: any) {
    if (!control.value) return null;
    const date = new Date(control.value);
    const hourStr = date.getHours().toString().padStart(2, '0') + ':00';
    if (this.occupiedHours.includes(hourStr) || this.disabledHours.includes(hourStr)) {
      return { occupiedHour: true };
    }
    return null;
  }

  private parse12HourTo24Hour(time12h: string): number {
    const trimmed = time12h.trim();
    if (/^\d{1,2}$/.test(trimmed)) {
      // Input is already in 24-hour format like "22"
      return parseInt(trimmed, 10);
    }
    const [hourStr, ampm] = trimmed.split(' ');
    let hour = parseInt(hourStr, 10);
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    return hour;
  }

  onSearchUsername() {
    if (this.searchUsername.trim().length === 0) {
      this.searchedUser = null;
      return;
    }
    this.http.get<any>(`http://localhost:5041/api/users/search?username=${this.searchUsername.trim()}`)
      .subscribe({
        next: user => this.searchedUser = user,
        error: () => this.searchedUser = null
      });
  }

  addParticipant(user: any) {
    if (!this.participants.find(u => u.userId === user.userId)) {
      this.participants.push(user);
    }
    this.searchedUser = null;
    this.searchUsername = '';
  }

  removeParticipant(user: any) {
    this.participants = this.participants.filter(u => u.userId !== user.userId);
  }

    addReservation(): void {
        if (!this.currentUserId) {
            alert('Trebuie să fii logat pentru a face o rezervare.');
            return;
        }

        if (!this.reservationForm || this.reservationForm.invalid) {
            alert('Completează toate câmpurile.');
            this.reservationForm?.markAllAsTouched();
            return;
        }

        const startDate: string = this.reservationForm.get('startDate')?.value;
        const startHour: string = this.reservationForm.get('startHour')?.value;
        if (!startDate || !startHour) {
            alert('Completează toate câmpurile.');
            return;
        }

        // Check if editing and no changes made
        if (this.editingReservationId !== null && this.originalReservationData) {
            const currentData = this.reservationForm.getRawValue();
            // Compare participants as well (sorted arrays)
            const currentParticipants = this.participants.map(u => u.userId).sort();
            const originalParticipants = (this.originalReservationData.participants || []).slice().sort();
            const isUnchanged =
                JSON.stringify(currentData) === JSON.stringify(this.originalReservationData) &&
                JSON.stringify(currentParticipants) === JSON.stringify(originalParticipants);
            if (isUnchanged) {
                alert('Apasă pe anulare dacă nu vrei să modifici');
                return;
            }
        }

        const hour = this.parse12HourTo24Hour(startHour);
        const startDateObj = new Date(startDate);
        startDateObj.setHours(hour, 0, 0, 0);
        const startTime = startDateObj.toISOString();


        const endTime: string = this.reservationForm.get('endTime')?.value;
        const fieldId: number = Number(this.reservationForm.get('fieldId')?.value);

        if (!startTime || !endTime || !fieldId) {
            alert('Completează toate câmpurile.');
            return;
        }

        const startIso = this.parseDateLocalToUTC(startTime);
        const endIso = this.parseDateLocalToUTC(endTime);

        const formValue = this.reservationForm.value;
        const reservationData = {
            startTime: startIso,
            endTime: endIso,
            fieldId: formValue.fieldId,
            maxParticipants: formValue.maxParticipants,
            authorId: this.currentUserId,
            participantIds: this.participants.map(u => u.userId)
        };

        if (this.editingReservationId) {
            this.reservationService.updateReservation(this.editingReservationId, {
                ...reservationData,
                ReservationId: this.editingReservationId
            }).subscribe({
                next: () => {
                    this.snackBar.open('Rezervarea a fost modificată cu succes!', 'Închide', {
                        duration: 3000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top',
                        panelClass: ['success-snackbar']
                    });
                    const editedId = this.editingReservationId;
                    if (editedId !== null) {
                        this.editButtonClicked.delete(editedId);
                    }
                    this.resetForm();
                    this.loadReservations();
                    const fieldId = Number(this.reservationForm.get('fieldId')?.value);
                    if (fieldId) {
                      this.calculateFreeIntervals(fieldId);
                    }
                    this.updateOccupiedHours();
                    this.editingReservationId = null;
                    this.showAddForm = false;
                },
                error: (err: any) => {
                    console.error('Eroare la modificare rezervare:', err);
                    const errorMessage = err?.error?.message || err?.error || err?.message || 'A apărut o eroare la modificare.';
                    this.snackBar.open('Eroare la modificare rezervare: ' + errorMessage, 'Închide', {
                        duration: 3000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top',
                        panelClass: ['error-snackbar']
                    });
                }
            });
        } else {
            this.reservationService.addReservation(reservationData).subscribe({
                next: () => {
                    this.snackBar.open('Rezervare salvată cu succes!', 'Închide', {
                        duration: 3000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top',
                        panelClass: ['success-snackbar']
                    });
                    this.resetForm();
                    this.loadReservations();
                    const fieldId = Number(this.reservationForm.get('fieldId')?.value);
                    if (fieldId) {
                      this.calculateFreeIntervals(fieldId);
                    }
                },
                error: (err: any) => {
                    console.error('Eroare la salvare rezervare:', err);
                    const errorMsg = err?.error || err?.message || '';
                    if (err.status === 400 && typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('already booked')) {
                        alert('Terenul este deja rezervat în intervalul selectat.');
                        const fieldId = Number(this.reservationForm.get('fieldId')?.value);
                        if (fieldId) {
                            this.calculateFreeIntervals(fieldId);
                        }
                    } else {
                        alert('Eroare: ' + errorMsg);
                    }
                }
            });
        }
    }

  calculateFreeIntervals(fieldId: number): void {
    const reservationsForField = this.reservations.filter(r => r.fieldId === fieldId);

    const startHour = 6;
    const endHour = 22;

    const intervals: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      intervals.push(`${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`);
    }

    const freeIntervals = intervals.filter(interval => {
      const [startStr, endStr] = interval.split(' - ');
      const intervalStart = new Date();
      intervalStart.setHours(parseInt(startStr.split(':')[0]), 0, 0, 0);
      const intervalEnd = new Date();
      intervalEnd.setHours(parseInt(endStr.split(':')[0]), 0, 0, 0);

      for (const res of reservationsForField) {
        const resStart = new Date(res.startTime);
        const resEnd = new Date(res.endTime);

        if ((intervalStart < resEnd) && (intervalEnd > resStart)) {
          return false;
        }
      }
      return true;
    });

    this.freeIntervals = freeIntervals;
  }

  private resetForm() {
    this.reservationForm.reset();
    this.reservationForm.markAsPristine();
    this.reservationForm.markAsUntouched();
    this.showAddForm = false;
    this.editingReservationId = null;
    this.freeIntervals = [];
    this.editButtonClicked.clear();
  }

  deleteReservation(reservation: Reservation) {
    if (!reservation.reservationId) {
      this.snackBar.open('Reservation ID missing!', 'Închide', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirmare ștergere',
        message: 'Ești sigur că vrei să ștergi această rezervare?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // User confirmed deletion
        this.reservationService.deleteReservation(reservation.reservationId).subscribe({
          next: () => {
            this.reservations = this.reservations.filter(r => r.reservationId !== reservation.reservationId);
            this.snackBar.open('Rezervarea a fost ștearsă.', 'Închide', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['success-snackbar']
            });
          },
          error: (err) => {
            console.error('Eroare la ștergere rezervare:', err);
            const errorMessage = err?.error?.message || err?.error || err?.message || 'A apărut o eroare la ștergere.';
            this.snackBar.open('Eroare la ștergere rezervare: ' + errorMessage, 'Închide', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  editReservation(reservation: Reservation) {
    // If this reservation's edit button was already clicked, do nothing
    if (reservation.reservationId && this.editButtonClicked.has(reservation.reservationId)) {
      return;
    }
    // Mark this reservation's edit button as clicked
    if (reservation.reservationId) {
      this.editButtonClicked.add(reservation.reservationId);
    }

    this.editingReservationId = reservation.reservationId ?? null;
    this.showAddForm = true;

    if (reservation.startTime) {
      const startDateObj = new Date(reservation.startTime);
      const year = startDateObj.getFullYear();
      const month = (startDateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = startDateObj.getDate().toString().padStart(2, '0');
      const hours = startDateObj.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12;
      const startDateStr = `${year}-${month}-${day}`;
      const startHourStr = `${hour12} ${ampm}`;

      this.reservationForm.setValue({
        startDate: startDateStr,
        startHour: startHourStr,
        endTime: reservation.endTime ? this.toInputDateTimeLocal(reservation.endTime) : '',
        fieldId: reservation.fieldId ?? '',
        maxParticipants: this.getMaxParticipants(reservation)
      });

      this.updateEndTime();

      // Store original form data for change detection, including participants
      this.originalReservationData = {
        ...this.reservationForm.getRawValue(),
        participants: (reservation.participantIds || []).slice().sort()
      };
    } else {
      this.reservationForm.setValue({
        startDate: '',
        startHour: '',
        endTime: '',
        fieldId: reservation.fieldId ?? '',
        maxParticipants: 1
      });
      this.originalReservationData = null;
    }
  }

  private toInputDateTimeLocal(dateStr: string): string {
    const date = new Date(dateStr);

    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
  }

  public parseDateLocalToUTC(dateTimeLocal: string): string {
    const localDate = new Date(dateTimeLocal);
    // Adjust for timezone offset to keep local time unchanged in UTC string
    const offsetMs = localDate.getTimezoneOffset() * 60000;
    const utcDate = new Date(localDate.getTime() - offsetMs);
    return utcDate.toISOString();
  }

  loadAllUsers() {
    this.http.get<any[]>('http://localhost:5041/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).subscribe(users => {
      this.allUsers = users;
      this.userIdToUsername = {};
      for (const user of users) {
        this.userIdToUsername[user.userId] = user.username;
      }
    });
  }

  getUsername(id: number): string {
    return this.userIdToUsername[id] || `ID ${id}`;
  }

  getMaxParticipants(reservation: any): number {
    return reservation && reservation.maxParticipants ? reservation.maxParticipants : 1;
  }

  isParticipant(reservation: Reservation): boolean {
    if (!this.currentUserId || !reservation.participantIds) {
      return false;
    }
    return reservation.participantIds.includes(this.currentUserId);
  }

  joinReservation(reservation: Reservation): void {
    if (!reservation.reservationId || this.currentUserId === null) {
      this.snackBar.open('ID-ul rezervării lipsește sau utilizatorul nu este autentificat.', 'Închide', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.reservationService.joinReservation(reservation.reservationId).subscribe({
      next: (response) => {
        const successMessage = typeof response === 'string' ? response : 'Te-ai alăturat rezervării cu succes!';
        this.snackBar.open(successMessage, 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.loadReservations(); // Refresh the list
      },
      error: (err) => {
        console.error('Error joining reservation:', err);
        const errorMessage = err?.error?.message || err?.error || err?.message || 'Eroare la alăturarea la rezervare';
        this.snackBar.open('Eroare la alăturarea la rezervare: ' + errorMessage, 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  leaveReservation(reservation: Reservation): void {
    if (!reservation.reservationId || this.currentUserId === null) {
      this.snackBar.open('ID-ul rezervării lipsește sau utilizatorul nu este autentificat.', 'Închide', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.reservationService.leaveReservation(reservation.reservationId).subscribe({
      next: (response) => {
        const successMessage = typeof response === 'string' ? response : 'Ai părăsit rezervarea cu succes!';
        this.snackBar.open(successMessage, 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.loadReservations(); // Refresh the list
      },
      error: (err) => {
        console.error('Error leaving reservation:', err);
        const errorMessage = err?.error?.message || err?.error || err?.message || 'Eroare la părăsirea rezervării';
        this.snackBar.open('Eroare la părăsirea rezervării: ' + errorMessage, 'Închide', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}