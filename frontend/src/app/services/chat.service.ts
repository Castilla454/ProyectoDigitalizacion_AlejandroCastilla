import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = 'http://localhost:3000/api/chatbot';

    constructor(private http: HttpClient) { }

    sendMessage(option: string): Observable<{ response: string }> {
        return this.http.post<{ response: string }>(this.apiUrl, { option }).pipe(
            catchError(error => {
                console.error('Chat error', error);
                return of({ response: 'Error de conexión con el asistente.' });
            })
        );
    }
}
