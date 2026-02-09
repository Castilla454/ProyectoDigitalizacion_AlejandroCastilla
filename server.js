require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// PostgreSQL Connection
// ========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect()
    .then(client => {
        console.log('✅ Connected to PostgreSQL database');
        client.release();
    })
    .catch(err => {
        console.log('⚠️ PostgreSQL not connected (running without database):', err.message);
    });

// ========================================
// Middleware
// ========================================
app.use(cors());
app.use(express.json());

// ========================================
// Mock Data (Fallback if no DB)
// ========================================
const projects = require('./data/projects.json');

// ========================================
// API Routes - Projects
// ========================================
app.get('/api/projects', (req, res) => {
    res.json(projects);
});

// ========================================
// API Routes - Scores (Leaderboard)
// ========================================

// Get top scores for a game
app.get('/api/scores/:gameId', async (req, res) => {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const result = await pool.query(
            `SELECT id, player_name, score, play_duration_seconds, created_at 
             FROM scores 
             WHERE game_id = $1 
             ORDER BY score DESC 
             LIMIT $2`,
            [gameId, limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching scores:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Submit a new score
app.post('/api/scores', async (req, res) => {
    const { gameId, playerName, score, playDuration } = req.body;

    if (!gameId || !playerName || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields: gameId, playerName, score' });
    }

    try {
        // Insert the score
        const result = await pool.query(
            `INSERT INTO scores (game_id, player_name, score, play_duration_seconds)
             VALUES ($1, $2, $3, $4)
             RETURNING id, game_id, player_name, score, created_at`,
            [gameId, playerName, score, playDuration || null]
        );

        // Update analytics
        await pool.query(
            `INSERT INTO game_analytics (game_id, play_count, high_score, last_played_at)
             VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (game_id) DO UPDATE SET
               play_count = game_analytics.play_count + 1,
               high_score = GREATEST(game_analytics.high_score, $2),
               last_played_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP`,
            [gameId, score]
        );

        // Get the rank of this score
        const rankResult = await pool.query(
            `SELECT COUNT(*) + 1 as rank 
             FROM scores 
             WHERE game_id = $1 AND score > $2`,
            [gameId, score]
        );

        res.status(201).json({
            ...result.rows[0],
            rank: parseInt(rankResult.rows[0].rank)
        });
    } catch (err) {
        console.error('Error saving score:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Get leaderboard (top 10 by default)
app.get('/api/leaderboard/:gameId', async (req, res) => {
    const { gameId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
                player_name,
                score,
                created_at
             FROM scores 
             WHERE game_id = $1 
             ORDER BY score DESC 
             LIMIT 10`,
            [gameId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// ========================================
// API Routes - Analytics
// ========================================

// Get analytics for a game
app.get('/api/analytics/:gameId', async (req, res) => {
    const { gameId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM game_analytics WHERE game_id = $1`,
            [gameId]
        );

        if (result.rows.length === 0) {
            return res.json({ game_id: gameId, play_count: 0, high_score: null });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Get all games analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM game_analytics ORDER BY play_count DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all analytics:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Track game play (increment count)
app.post('/api/analytics/:gameId/play', async (req, res) => {
    const { gameId } = req.params;

    try {
        await pool.query(
            `INSERT INTO game_analytics (game_id, play_count, last_played_at)
             VALUES ($1, 1, CURRENT_TIMESTAMP)
             ON CONFLICT (game_id) DO UPDATE SET
               play_count = game_analytics.play_count + 1,
               last_played_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP`,
            [gameId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error tracking play:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// ========================================
// API Routes - Ratings
// ========================================

// Get ratings for a game
app.get('/api/ratings/:gameId', async (req, res) => {
    const { gameId } = req.params;

    try {
        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_ratings,
                ROUND(AVG(rating), 1) as avg_rating
             FROM game_ratings 
             WHERE game_id = $1`,
            [gameId]
        );

        const recent = await pool.query(
            `SELECT rating, comment, player_name, created_at
             FROM game_ratings 
             WHERE game_id = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [gameId]
        );

        res.json({
            stats: stats.rows[0],
            reviews: recent.rows
        });
    } catch (err) {
        console.error('Error fetching ratings:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Submit a rating
app.post('/api/ratings', async (req, res) => {
    const { gameId, rating, comment, playerName } = req.body;

    if (!gameId || !rating) {
        return res.status(400).json({ error: 'Missing required fields: gameId, rating' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO game_ratings (game_id, rating, comment, player_name)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [gameId, rating, comment || null, playerName || 'Anónimo']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving rating:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// ========================================
// API Routes - Chatbot
// ========================================
app.post('/api/chatbot', async (req, res) => {
    const { message, option, sessionId } = req.body;
    let responseText = "Lo siento, no entiendo esa consulta.";

    switch (option) {
        case 'contact':
            responseText = "Puedes contactarme en: email@example.com o LinkedIn.";
            break;
        case 'hire':
            responseText = "¡Genial! Actualmente estoy abierto a nuevas oportunidades. ¿Tienes algún proyecto en mente?";
            break;
        case 'report':
            responseText = "Gracias por el reporte. Por favor envíame los detalles a bugs@example.com.";
            break;
        default:
            responseText = "¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte? Selecciona una opción.";
            break;
    }

    // Log chat message to database (if connected)
    try {
        if (option) {
            await pool.query(
                `INSERT INTO chat_messages (session_id, message_type, message_text, option_selected)
                 VALUES ($1, 'user', $2, $3)`,
                [sessionId || 'anonymous', option, option]
            );
            await pool.query(
                `INSERT INTO chat_messages (session_id, message_type, message_text)
                 VALUES ($1, 'bot', $2)`,
                [sessionId || 'anonymous', responseText]
            );
        }
    } catch (err) {
        // Silently fail if DB not connected
        console.log('Chat logging skipped (no DB)');
    }

    setTimeout(() => {
        res.json({ response: responseText });
    }, 500);
});

// ========================================
// Static Files
// ========================================
const angularDistPath = path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser');
const juegosPath = path.join(__dirname, 'juegos');

if (fs.existsSync(juegosPath)) {
    app.use('/juegos', express.static(juegosPath));
}

if (fs.existsSync(angularDistPath)) {
    app.use(express.static(angularDistPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(angularDistPath, 'index.html'));
        }
    });
} else {
    app.get('/', (req, res) => {
        res.send('Backend API is running. Frontend not yet built. Please run "npm run build:frontend".');
    });
}

// ========================================
// Start Server
// ========================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   - GET  /api/projects`);
    console.log(`   - GET  /api/scores/:gameId`);
    console.log(`   - POST /api/scores`);
    console.log(`   - GET  /api/leaderboard/:gameId`);
    console.log(`   - GET  /api/analytics/:gameId`);
    console.log(`   - POST /api/analytics/:gameId/play`);
    console.log(`   - GET  /api/ratings/:gameId`);
    console.log(`   - POST /api/ratings`);
});
