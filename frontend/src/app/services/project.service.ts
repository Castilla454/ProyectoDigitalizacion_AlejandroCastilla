import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Project {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    technologies: string[];
    playUrl: string;
    codeUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProjectService {
    // Assuming the node server runs on port 3000
    private apiUrl = 'http://localhost:3000/api/projects';

    constructor(private http: HttpClient) { }

    getProjects(): Observable<Project[]> {
        return this.http.get<Project[]>(this.apiUrl).pipe(
            catchError(error => {
                console.error('Error fetching projects', error);
                return of([]);
            })
        );
    }
}
