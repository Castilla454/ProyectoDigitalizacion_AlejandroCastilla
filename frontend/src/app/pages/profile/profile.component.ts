import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';

interface ProfileData {
    user: {
        id: number;
        username: string;
        email: string;
        displayName: string;
        avatarUrl: string | null;
        role: string;
        createdAt: string;
    };
    totalGamesPlayed: number;
    topScores: any[];
    ratings: any[];
    favorites: any[];
    achievements: any[];
}

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
    profile: ProfileData | null = null;
    isLoading = true;
    error: string | null = null;

    constructor(
        private http: HttpClient,
        public authService: AuthService
    ) { }

    ngOnInit() {
        if (!this.authService.isLoggedIn) {
            this.isLoading = false;
            this.error = 'Debes iniciar sesión para ver tu perfil';
            return;
        }
        this.loadProfile();
    }

    private getHeaders(): HttpHeaders {
        const token = this.authService.token;
        return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    }

    loadProfile() {
        this.http.get<ProfileData>('/api/profile/stats', {
            headers: this.getHeaders()
        }).subscribe({
            next: (data) => {
                this.profile = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Profile load error:', err);
                this.error = 'Error al cargar el perfil. Por favor intenta de nuevo.';
                this.isLoading = false;
            }
        });
    }

    logout() {
        this.authService.logout();
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    getAvatarUrl(): string {
        if (this.profile?.user.avatarUrl) {
            return this.profile.user.avatarUrl;
        }
        return 'https://ui-avatars.com/api/?name=' + (this.profile?.user.username || 'User') + '&background=random';
    }

    getUnlockedAchievementsCount(): number {
        if (!this.profile) return 0;
        return this.profile.achievements.filter(a => a.unlocked_at).length;
    }

    getPlayerRank(): string {
        const count = this.getUnlockedAchievementsCount();
        if (count >= 20) return 'Leyenda';
        if (count >= 10) return 'Experto';
        if (count >= 5) return 'Avanzado';
        return 'Novato';
    }

    getGameTitle(gameId: string): string {
        const names: { [key: string]: string } = {
            '2048': '2048',
            'BlackJack': 'BlackJack',
            'Conecta4': 'Conecta 4',
            'GeneradorContraseñas': 'Gen. Contraseñas',
            'JuegoMemoria': 'Juego Memoria',
            'SudokuDos': 'Sudoku',
            'TicTacToe': 'Tic Tac Toe',
            'Wordle': 'Wordle'
        };
        return names[gameId] || gameId;
    }
}
