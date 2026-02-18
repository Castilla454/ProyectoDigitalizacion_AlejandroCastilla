import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ScoreService, RatingsResponse } from '../../services/score.service';

@Component({
    selector: 'app-game-rating',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './game-rating.component.html',
    styleUrls: ['./game-rating.component.css']
})
export class GameRatingComponent implements OnInit {
    @Input() gameId: string = '';
    @Input() gameTitle: string = '';

    isOpen = false;
    avgRating = 0;
    totalRatings = 0;
    reviews: any[] = [];
    userRating = 0;
    hoverRating = 0;
    userComment = '';
    isSubmitting = false;
    submitSuccess = false;

    constructor(
        public authService: AuthService,
        private scoreService: ScoreService
    ) {}

    ngOnInit() {
        if (this.gameId) {
            this.loadRatings();
        }
    }

    loadRatings() {
        this.scoreService.getRatings(this.gameId).subscribe({
            next: (data: RatingsResponse) => {
                this.avgRating = parseFloat(data.stats.avg_rating as any) || 0;
                this.totalRatings = parseInt(data.stats.total_ratings as any) || 0;
                this.reviews = data.reviews || [];
            },
            error: () => {}
        });
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
    }

    setRating(star: number) {
        this.userRating = star;
    }

    submitRating() {
        if (!this.userRating || !this.authService.isLoggedIn) return;

        this.isSubmitting = true;
        this.scoreService.submitRating(
            this.gameId,
            this.userRating,
            this.userComment || undefined,
            this.authService.currentUser?.username
        ).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.submitSuccess = true;
                this.loadRatings();
                setTimeout(() => this.submitSuccess = false, 3000);
            },
            error: () => {
                this.isSubmitting = false;
            }
        });
    }

    getStarArray(): number[] {
        return [1, 2, 3, 4, 5];
    }

    getStarClass(star: number, rating: number): string {
        if (star <= rating) return 'fas fa-star filled';
        if (star - 0.5 <= rating) return 'fas fa-star-half-alt filled';
        return 'far fa-star';
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
}
