import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BlogService, BlogPost, BlogListResponse } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-blog',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './blog.component.html',
    styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
    posts: BlogPost[] = [];
    currentPage = 1;
    totalPages = 1;
    total = 0;
    isLoading = true;
    error: string | null = null;

    constructor(
        public blogService: BlogService,
        public authService: AuthService
    ) { }

    ngOnInit() {
        this.loadPosts();
    }

    loadPosts(page: number = 1) {
        this.isLoading = true;
        this.error = null;
        this.currentPage = page;

        this.blogService.getPosts(page).subscribe({
            next: (data: BlogListResponse) => {
                this.posts = data.posts;
                this.totalPages = data.totalPages;
                this.total = data.total;
                this.isLoading = false;
            },
            error: (err: any) => {
                this.error = 'Error al cargar los posts';
                this.isLoading = false;
                console.error(err);
            }
        });
    }

    formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getReadingTime(content: string): number {
        if (!content) return 1;
        const words = content.split(/\s+/).length;
        return Math.max(1, Math.ceil(words / 200));
    }
}
