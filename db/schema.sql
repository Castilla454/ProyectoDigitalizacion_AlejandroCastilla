-- ========================================
-- PORTFOLIO GAMES - PostgreSQL Schema
-- ========================================

-- ========================================
-- USERS TABLE - Authentication
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ========================================
-- SCORES TABLE - Game Leaderboard
-- ========================================
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    score INTEGER NOT NULL,
    play_duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);

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
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    player_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_game_id ON game_ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON game_ratings(user_id);

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
