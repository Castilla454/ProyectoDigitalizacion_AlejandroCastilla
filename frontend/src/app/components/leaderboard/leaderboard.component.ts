import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreService, LeaderboardEntry } from '../../services/score.service';

@Component({
    selector: 'app-leaderboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './leaderboard.component.html',
    styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
    @Input() gameId: string = '';
    @Input() gameTitle: string = 'Juego';

    leaderboard: LeaderboardEntry[] = [];
    isLoading = true;
    error: string | null = null;

    constructor(private scoreService: ScoreService) { }

    ngOnInit() {
        if (this.gameId) {
            this.loadLeaderboard();
        }
    }

    loadLeaderboard() {
        this.isLoading = true;
        this.error = null;

        this.scoreService.getLeaderboard(this.gameId).subscribe({
            next: (data) => {
                this.leaderboard = data;
                this.isLoading = false;
            },
            error: (err) => {
                this.error = 'No se pudieron cargar las puntuaciones';
                this.isLoading = false;
                console.error('Error loading leaderboard:', err);
            }
        });
    }

    getMedalClass(rank: number): string {
        switch (rank) {
            case 1: return 'gold';
            case 2: return 'silver';
            case 3: return 'bronze';
            default: return '';
        }
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
        });
    }
}
