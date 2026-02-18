import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Score {
    id: number;
    game_id: string;
    player_name: string;
    score: number;
    play_duration_seconds?: number;
    created_at: string;
    rank?: number;
}

export interface LeaderboardEntry {
    rank: number;
    player_name: string;
    score: number;
    created_at: string;
}

export interface GameAnalytics {
    game_id: string;
    play_count: number;
    high_score: number;
    avg_score?: number;
    last_played_at?: string;
}

export interface Rating {
    id: number;
    game_id: string;
    rating: number;
    comment?: string;
    player_name: string;
    created_at: string;
}

export interface RatingsResponse {
    stats: {
        total_ratings: number;
        avg_rating: number;
    };
    reviews: Rating[];
}

@Injectable({
    providedIn: 'root'
})
export class ScoreService {
    private apiUrl = '/api';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getAuthHeaders(): HttpHeaders {
        const token = this.authService.token;
        return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    }

    // ========================================
    // Scores / Leaderboard
    // ========================================

    /**
     * Get top scores for a specific game
     */
    getScores(gameId: string, limit: number = 10): Observable<Score[]> {
        return this.http.get<Score[]>(`${this.apiUrl}/scores/${gameId}?limit=${limit}`);
    }

    /**
     * Submit a new score
     */
    submitScore(gameId: string, playerName: string, score: number, playDuration?: number): Observable<Score> {
        return this.http.post<Score>(`${this.apiUrl}/scores`, {
            gameId,
            playerName,
            score,
            playDuration
        });
    }

    /**
     * Get leaderboard (top 10) for a game
     */
    getLeaderboard(gameId: string): Observable<LeaderboardEntry[]> {
        return this.http.get<LeaderboardEntry[]>(`${this.apiUrl}/leaderboard/${gameId}`);
    }

    // ========================================
    // Analytics
    // ========================================

    /**
     * Get analytics for a specific game
     */
    getGameAnalytics(gameId: string): Observable<GameAnalytics> {
        return this.http.get<GameAnalytics>(`${this.apiUrl}/analytics/${gameId}`);
    }

    /**
     * Get all games analytics
     */
    getAllAnalytics(): Observable<GameAnalytics[]> {
        return this.http.get<GameAnalytics[]>(`${this.apiUrl}/analytics`);
    }

    /**
     * Track a game play (increment play count)
     */
    trackPlay(gameId: string): Observable<{ success: boolean }> {
        return this.http.post<{ success: boolean }>(`${this.apiUrl}/analytics/${gameId}/play`, {});
    }

    // ========================================
    // Ratings
    // ========================================

    /**
     * Get ratings and reviews for a game
     */
    getRatings(gameId: string): Observable<RatingsResponse> {
        return this.http.get<RatingsResponse>(`${this.apiUrl}/ratings/${gameId}`);
    }

    /**
     * Submit a rating/review
     */
    submitRating(gameId: string, rating: number, comment?: string, playerName?: string): Observable<Rating> {
        return this.http.post<Rating>(`${this.apiUrl}/ratings`, {
            gameId,
            rating,
            comment,
            playerName
        }, { headers: this.getAuthHeaders() });
    }
}
