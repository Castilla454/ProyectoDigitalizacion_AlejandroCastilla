import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BlogPost {
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    cover_image_url: string | null;
    author_id: number;
    published: boolean;
    created_at: string;
    updated_at: string;
    author_username?: string;
    author_display_name?: string;
}

export interface BlogListResponse {
    posts: BlogPost[];
    total: number;
    page: number;
    totalPages: number;
}

@Injectable({
    providedIn: 'root'
})
export class BlogService {
    private apiUrl = '/api/blog';

    constructor(private http: HttpClient) { }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            Authorization: `Bearer ${token}`
        });
    }

    getPosts(page: number = 1, limit: number = 10): Observable<BlogListResponse> {
        return this.http.get<BlogListResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`);
    }

    getPost(slug: string): Observable<BlogPost> {
        return this.http.get<BlogPost>(`${this.apiUrl}/${slug}`);
    }

    getMyPosts(): Observable<BlogPost[]> {
        return this.http.get<BlogPost[]>(`${this.apiUrl}/my-posts`, {
            headers: this.getAuthHeaders()
        });
    }

    createPost(data: {
        title: string;
        content: string;
        excerpt?: string;
        coverImageUrl?: string;
        published?: boolean;
    }): Observable<BlogPost> {
        return this.http.post<BlogPost>(this.apiUrl, data, {
            headers: this.getAuthHeaders()
        });
    }

    updatePost(id: number, data: {
        title?: string;
        content?: string;
        excerpt?: string;
        coverImageUrl?: string;
        published?: boolean;
    }): Observable<BlogPost> {
        return this.http.put<BlogPost>(`${this.apiUrl}/${id}`, data, {
            headers: this.getAuthHeaders()
        });
    }

    deletePost(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`, {
            headers: this.getAuthHeaders()
        });
    }
}
