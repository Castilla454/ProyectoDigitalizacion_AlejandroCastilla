import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
    id: number;
    username: string;
    email: string;
    displayName: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = '/api/auth';
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadUserFromStorage();
    }

    private loadUserFromStorage(): void {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            try {
                this.currentUserSubject.next(JSON.parse(user));
            } catch {
                this.logout();
            }
        }
    }

    get currentUser(): User | null {
        return this.currentUserSubject.value;
    }

    get isLoggedIn(): boolean {
        return !!this.currentUserSubject.value;
    }

    get token(): string | null {
        return localStorage.getItem('token');
    }

    register(username: string, email: string, password: string, displayName?: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
            username, email, password, displayName
        }).pipe(
            tap((response: AuthResponse) => {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.currentUserSubject.next(response.user);
            })
        );
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
            email, password
        }).pipe(
            tap((response: AuthResponse) => {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.currentUserSubject.next(response.user);
            })
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
    }

    getProfile(): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/profile`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
    }
}
