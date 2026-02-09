-- ========================================
-- PORTFOLIO GAMES - PostgreSQL Schema
-- ========================================

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- SCORES TABLE - Game Leaderboard
-- ========================================
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    play_duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);

-- ========================================
-- GAME ANALYTICS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS game_analytics (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) UNIQUE NOT NULL,
    play_count INTEGER DEFAULT 0,
    total_play_time_seconds INTEGER DEFAULT 0,
    avg_score DECIMAL(10, 2),
    high_score INTEGER,
    last_played_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- GAME RATINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS game_ratings (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    player_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratings_game_id ON game_ratings(game_id);

-- ========================================
-- CHATBOT MESSAGES LOG
-- ========================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    message_type VARCHAR(10) CHECK (message_type IN ('user', 'bot')),
    message_text TEXT NOT NULL,
    option_selected VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INITIAL SEED DATA - Games Analytics
-- ========================================
INSERT INTO game_analytics (game_id, play_count) VALUES
    ('2048', 0),
    ('BlackJack', 0),
    ('Conecta4', 0),
    ('GeneradorContraseñas', 0),
    ('JuegoMemoria', 0),
    ('SudokuDos', 0),
    ('TicTacToe', 0),
    ('Wordle', 0)
ON CONFLICT (game_id) DO NOTHING;
