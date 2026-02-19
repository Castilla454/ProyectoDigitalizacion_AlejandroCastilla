import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'auth',
        loadComponent: () => import('./components/auth/auth.component').then(m => m.AuthComponent)
    },
    {
        path: 'blog',
        loadComponent: () => import('./pages/blog/blog.component').then(m => m.BlogComponent)
    },
    {
        path: 'blog/editor',
        loadComponent: () => import('./pages/blog-editor/blog-editor.component').then(m => m.BlogEditorComponent)
    },
    {
        path: 'blog/editor/:id',
        loadComponent: () => import('./pages/blog-editor/blog-editor.component').then(m => m.BlogEditorComponent)
    },
    {
        path: 'blog/:slug',
        loadComponent: () => import('./pages/blog-post/blog-post.component').then(m => m.BlogPostComponent)
    },
    {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
    },
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
