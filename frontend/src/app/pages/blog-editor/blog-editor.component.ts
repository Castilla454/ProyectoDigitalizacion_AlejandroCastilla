import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BlogService, BlogPost } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-blog-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './blog-editor.component.html',
    styleUrls: ['./blog-editor.component.css']
})
export class BlogEditorComponent implements OnInit {
    isEditMode = false;
    editId: number | null = null;
    isLoading = false;
    isSaving = false;
    error: string | null = null;
    success: string | null = null;

    title = '';
    content = '';
    excerpt = '';
    coverImageUrl = '';
    published = false;

    showPreview = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private blogService: BlogService,
        public authService: AuthService
    ) { }

    ngOnInit() {
        if (!this.authService.isLoggedIn) {
            this.router.navigate(['/auth']);
            return;
        }

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode = true;
            this.editId = parseInt(id);
            this.loadPost();
        }
    }

    loadPost() {
        if (!this.editId) return;
        this.isLoading = true;

        // Load from my-posts list and find by id
        this.blogService.getMyPosts().subscribe({
            next: (posts: BlogPost[]) => {
                const post = posts.find(p => p.id === this.editId);
                if (post) {
                    this.title = post.title;
                    this.excerpt = post.excerpt || '';
                    this.coverImageUrl = post.cover_image_url || '';
                    this.published = post.published;

                    // Need to load full content via slug
                    this.blogService.getPost(post.slug).subscribe({
                        next: (fullPost: BlogPost) => {
                            this.content = fullPost.content;
                            this.isLoading = false;
                        },
                        error: () => {
                            this.error = 'Error al cargar el contenido del post';
                            this.isLoading = false;
                        }
                    });
                } else {
                    this.error = 'Post no encontrado';
                    this.isLoading = false;
                }
            },
            error: () => {
                this.error = 'Error al cargar el post';
                this.isLoading = false;
            }
        });
    }

    onSubmit() {
        if (!this.title.trim() || !this.content.trim()) {
            this.error = 'El título y el contenido son obligatorios';
            return;
        }

        this.isSaving = true;
        this.error = null;

        const data = {
            title: this.title,
            content: this.content,
            excerpt: this.excerpt || undefined,
            coverImageUrl: this.coverImageUrl || undefined,
            published: this.published
        };

        const observable = this.isEditMode && this.editId
            ? this.blogService.updatePost(this.editId, data)
            : this.blogService.createPost(data);

        observable.subscribe({
            next: (post: BlogPost) => {
                this.isSaving = false;
                this.success = this.isEditMode ? 'Post actualizado' : 'Post creado';
                setTimeout(() => {
                    this.router.navigate(['/blog', post.slug]);
                }, 1000);
            },
            error: (err: any) => {
                this.isSaving = false;
                this.error = err.error?.error || 'Error al guardar el post';
            }
        });
    }

    togglePreview() {
        this.showPreview = !this.showPreview;
    }

    renderPreview(content: string): string {
        if (!content) return '<p class="empty">Sin contenido todavía...</p>';
        let html = content
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return '<p>' + html + '</p>';
    }
}
