import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { BlogService, BlogPost } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-blog-post',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './blog-post.component.html',
    styleUrls: ['./blog-post.component.css']
})
export class BlogPostComponent implements OnInit {
    post: BlogPost | null = null;
    isLoading = true;
    error: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private blogService: BlogService,
        public authService: AuthService
    ) { }

    ngOnInit() {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (slug) {
            this.loadPost(slug);
        }
    }

    loadPost(slug: string) {
        this.isLoading = true;
        this.blogService.getPost(slug).subscribe({
            next: (post: BlogPost) => {
                this.post = post;
                this.isLoading = false;
            },
            error: (err: any) => {
                this.error = 'Post no encontrado';
                this.isLoading = false;
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

    isAuthor(): boolean {
        const user = this.authService.currentUser;
        return !!user && !!this.post && user.id === this.post.author_id;
    }

    deletePost() {
        if (!this.post) return;
        if (confirm('¿Estás seguro de que quieres eliminar este post?')) {
            this.blogService.deletePost(this.post.id).subscribe({
                next: () => {
                    this.router.navigate(['/blog']);
                },
                error: (err: any) => {
                    this.error = 'Error al eliminar el post';
                }
            });
        }
    }

    renderContent(content: string): string {
        if (!content) return '';
        // Simple markdown-like rendering
        let html = content
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Inline code
            .replace(/`(.+?)`/g, '<code>$1</code>')
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
            // Links
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            // Images
            .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="blog-image" />')
            // Line breaks / paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        return '<p>' + html + '</p>';
    }
}
