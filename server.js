require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

// ========================================
// PostgreSQL Connection
// ========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.connect()
    .then(async client => {
        console.log('✅ Connected to PostgreSQL database');

        try {
            // Initialize Schema if needed
            const schemaPath = path.join(__dirname, 'db', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await client.query(schemaSql);

                // Ensure users table has display_name and avatar_url
                await client.query(`
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='display_name') THEN 
                            ALTER TABLE users ADD COLUMN display_name VARCHAR(100); 
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN 
                            ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500); 
                        END IF;
                    END $$;
                `);

                console.log('✅ Database schema verified/initialized');
            } else {
                console.log('⚠️ db/schema.sql not found, skipping initialization');
            }
        } catch (err) {
            console.error('❌ Error initializing database schema:', err);
        } finally {
            client.release();
        }
    })
    .catch(err => {
        console.log('⚠️ PostgreSQL not connected (running without database):', err.message);
    });

// ========================================
// Middleware
// ========================================
app.use(cors());
app.use(express.json());

// Auth middleware - extracts user from JWT if present
function authOptional(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Token invalid, continue without user
        }
    }
    next();
}

// Auth middleware - requires valid JWT
function authRequired(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
}

// ========================================
// Mock Data (Fallback if no DB)
// ========================================
const projects = require('./data/projects.json');
const mockBlogPosts = require('./data/blog-posts.json');

// ========================================
// API Routes - Auth
// ========================================

// Register
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: username, email, password' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        // Check if user exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El usuario o email ya existe' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, display_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, display_name, role, created_at`,
            [username, email, passwordHash, displayName || username]
        );

        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ error: 'Error del servidor', message: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan campos: email y password' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error del servidor', message: err.message });
    }
});

// Get profile
app.get('/api/auth/profile', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, username, email, display_name, avatar_url, role, created_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const user = result.rows[0];
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            role: user.role,
            createdAt: user.created_at
        });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

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
app.post('/api/scores', authOptional, async (req, res) => {
    const { gameId, playerName, score, playDuration } = req.body;

    if (!gameId || !score || (!playerName && !req.user)) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        const user = req.user;
        const finalPlayerName = user ? user.username : playerName;
        const userId = user ? user.id : null;

        const result = await pool.query(
            `INSERT INTO scores (game_id, player_name, user_id, score, play_duration_seconds)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, game_id, player_name, score, created_at`,
            [gameId, finalPlayerName, userId, score, playDuration || 0]
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

        // Check for achievements (if logged in)
        let newAchievements = [];
        if (userId) {
            // 1. Check Top Scorer (Rank 1)
            const rankCheck = await pool.query(
                `SELECT rank FROM (
                    SELECT id, RANK() OVER (ORDER BY score DESC) as rank 
                    FROM scores WHERE game_id = $1
                ) as ranks WHERE id = $2`,
                [gameId, result.rows[0].id]
            );

            if (rankCheck.rows.length > 0 && parseInt(rankCheck.rows[0].rank) === 1) {
                await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 6) ON CONFLICT DO NOTHING', [userId]); // id 6 = top_scorer
                newAchievements.push('top_scorer');
            }

            // 2. Play Achievements (Play Count)
            const playCount = await pool.query('SELECT COUNT(*) FROM scores WHERE user_id = $1', [userId]);
            const count = parseInt(playCount.rows[0].count);
            if (count >= 1) await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 1) ON CONFLICT DO NOTHING', [userId]); // first_play
            if (count >= 10) await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 2) ON CONFLICT DO NOTHING', [userId]); // ten_plays
            if (count >= 50) await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 3) ON CONFLICT DO NOTHING', [userId]); // fifty_plays

            // 3. Unique Games
            const uniqueGames = await pool.query('SELECT COUNT(DISTINCT game_id) FROM scores WHERE user_id = $1', [userId]);
            const uniqueCount = parseInt(uniqueGames.rows[0].count);
            if (uniqueCount >= 8) await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 7) ON CONFLICT DO NOTHING', [userId]); // all_games
        }

        // Get the rank of this score
        const rankResult = await pool.query(
            `SELECT COUNT(*) + 1 as rank 
             FROM scores 
             WHERE game_id = $1 AND score > $2`,
            [gameId, score]
        );

        res.status(201).json({
            ...result.rows[0],
            rank: parseInt(rankResult.rows[0].rank),
            newAchievements
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
app.post('/api/analytics/:gameId/play', authOptional, async (req, res) => {
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

        // Also award 'first_play' achievement if user is logged in
        if (req.user) {
            await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 1) ON CONFLICT DO NOTHING', [req.user.id]);
        }

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
            `SELECT gr.rating, gr.comment, 
                    COALESCE(u.display_name, gr.player_name, 'Anónimo') as player_name,
                    gr.created_at
             FROM game_ratings gr
             LEFT JOIN users u ON gr.user_id = u.id
             WHERE gr.game_id = $1 
             ORDER BY gr.created_at DESC 
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

// Submit a rating (requires auth)
app.post('/api/ratings', authRequired, async (req, res) => {
    const { gameId, rating, comment } = req.body;

    if (!gameId || !rating) {
        return res.status(400).json({ error: 'Faltan campos: gameId, rating' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'La valoración debe ser entre 1 y 5' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO game_ratings (game_id, user_id, rating, comment, player_name)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (game_id, user_id) DO UPDATE SET
               rating = $3,
               comment = $4,
               created_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [gameId, req.user.id, rating, comment || null, req.user.username]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving rating:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// ========================================
// API Routes - Blog
// ========================================

// Helper: generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 200);
}

// Get all published blog posts (with pagination)
app.get('/api/blog', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM blog_posts WHERE published = true'
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image_url,
                    bp.published, bp.created_at, bp.updated_at,
                    u.username as author_username, u.display_name as author_display_name
             FROM blog_posts bp
             LEFT JOIN users u ON bp.author_id = u.id
             WHERE bp.published = true
             ORDER BY bp.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        // If DB has no posts, use mock data
        const posts = result.rows.length > 0 ? result.rows : mockBlogPosts;
        const finalTotal = result.rows.length > 0 ? total : mockBlogPosts.length;

        res.json({
            posts: posts.slice(offset, offset + limit),
            total: finalTotal,
            page,
            totalPages: Math.ceil(finalTotal / limit)
        });
    } catch (err) {
        // Fallback to mock data if DB fails
        console.log('Blog DB error, using mock data:', err.message);
        const published = mockBlogPosts.filter(p => p.published);
        res.json({
            posts: published.slice(offset, offset + limit),
            total: published.length,
            page,
            totalPages: Math.ceil(published.length / limit)
        });
    }
});

// Get all posts (including drafts) for the author
app.get('/api/blog/my-posts', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, slug, excerpt, cover_image_url, published, created_at, updated_at
             FROM blog_posts
             WHERE author_id = $1
             ORDER BY updated_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user posts:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Get single blog post by slug
app.get('/api/blog/:slug', authOptional, async (req, res) => {
    const { slug } = req.params;

    try {
        const result = await pool.query(
            `SELECT bp.*, u.username as author_username, u.display_name as author_display_name
             FROM blog_posts bp
             LEFT JOIN users u ON bp.author_id = u.id
             WHERE bp.slug = $1`,
            [slug]
        );

        if (result.rows.length === 0) {
            // Try mock data
            const mockPost = mockBlogPosts.find(p => p.slug === slug);
            if (mockPost) return res.json(mockPost);
            return res.status(404).json({ error: 'Post no encontrado' });
        }

        const post = result.rows[0];
        if (!post.published && (!req.user || req.user.id !== post.author_id)) {
            return res.status(404).json({ error: 'Post no encontrado' });
        }

        res.json(post);
    } catch (err) {
        // Fallback to mock data
        const mockPost = mockBlogPosts.find(p => p.slug === slug);
        if (mockPost) return res.json(mockPost);
        console.error('Error fetching blog post:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Create a blog post
app.post('/api/blog', authRequired, async (req, res) => {
    const { title, content, excerpt, coverImageUrl, published } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Faltan campos: title y content son obligatorios' });
    }

    let slug = generateSlug(title);

    try {
        // Ensure unique slug
        const existing = await pool.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            slug = slug + '-' + Date.now();
        }

        const result = await pool.query(
            `INSERT INTO blog_posts (title, slug, content, excerpt, cover_image_url, author_id, published)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, slug, content, excerpt || null, coverImageUrl || null, req.user.id, published || false]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating blog post:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Update a blog post
app.put('/api/blog/:id', authRequired, async (req, res) => {
    const { id } = req.params;
    const { title, content, excerpt, coverImageUrl, published } = req.body;

    try {
        // Check ownership
        const post = await pool.query('SELECT author_id FROM blog_posts WHERE id = $1', [id]);
        if (post.rows.length === 0) {
            return res.status(404).json({ error: 'Post no encontrado' });
        }
        if (post.rows[0].author_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para editar este post' });
        }

        const result = await pool.query(
            `UPDATE blog_posts
             SET title = COALESCE($1, title),
                 content = COALESCE($2, content),
                 excerpt = COALESCE($3, excerpt),
                 cover_image_url = COALESCE($4, cover_image_url),
                 published = COALESCE($5, published),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [title, content, excerpt, coverImageUrl, published, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating blog post:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// Delete a blog post
app.delete('/api/blog/:id', authRequired, async (req, res) => {
    const { id } = req.params;

    try {
        const post = await pool.query('SELECT author_id FROM blog_posts WHERE id = $1', [id]);
        if (post.rows.length === 0) {
            return res.status(404).json({ error: 'Post no encontrado' });
        }
        if (post.rows[0].author_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este post' });
        }

        await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
        res.json({ success: true, message: 'Post eliminado' });
    } catch (err) {
        console.error('Error deleting blog post:', err);
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

// ========================================
// API Routes - Favorites
// ========================================

// Toggle favorite
app.post('/api/favorites/toggle', authRequired, async (req, res) => {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: 'Falta gameId' });

    try {
        const existing = await pool.query(
            'SELECT id FROM user_favorites WHERE user_id = $1 AND game_id = $2',
            [req.user.id, gameId]
        );

        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND game_id = $2', [req.user.id, gameId]);
            res.json({ favorited: false });
        } else {
            await pool.query('INSERT INTO user_favorites (user_id, game_id) VALUES ($1, $2)', [req.user.id, gameId]);
            res.json({ favorited: true });
        }
    } catch (err) {
        console.error('Error toggling favorite:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get user favorites
app.get('/api/favorites', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT game_id, created_at FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching favorites:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Check if game is favorited
app.get('/api/favorites/check/:gameId', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id FROM user_favorites WHERE user_id = $1 AND game_id = $2',
            [req.user.id, req.params.gameId]
        );
        res.json({ favorited: result.rows.length > 0 });
    } catch (err) {
        res.json({ favorited: false });
    }
});

// ========================================
// API Routes - Achievements
// ========================================

// Get all achievements with user's unlock status
app.get('/api/achievements', authOptional, async (req, res) => {
    try {
        let query;
        let params = [];
        if (req.user) {
            query = `SELECT a.*, ua.unlocked_at
                     FROM achievements a
                     LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
                     ORDER BY a.id`;
            params = [req.user.id];
        } else {
            query = `SELECT a.*, NULL as unlocked_at FROM achievements a ORDER BY a.id`;
        }
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        // Fallback with mock achievements
        const mockAchievements = [
            { id: 1, key: 'first_play', title: 'Primer Paso', description: 'Juega tu primera partida', icon: 'fa-play', rarity: 'common', unlocked_at: null },
            { id: 2, key: 'ten_plays', title: 'Jugador Habitual', description: 'Juega 10 partidas', icon: 'fa-gamepad', rarity: 'common', unlocked_at: null },
            { id: 3, key: 'fifty_plays', title: 'Veterano', description: 'Juega 50 partidas', icon: 'fa-trophy', rarity: 'rare', unlocked_at: null },
            { id: 4, key: 'first_rating', title: 'Crítico Novato', description: 'Valora tu primer juego', icon: 'fa-star', rarity: 'common', unlocked_at: null },
            { id: 5, key: 'five_ratings', title: 'Crítico Experto', description: 'Valora 5 juegos', icon: 'fa-star-half-alt', rarity: 'rare', unlocked_at: null },
            { id: 6, key: 'top_scorer', title: 'Número Uno', description: 'Consigue el primer puesto en un ranking', icon: 'fa-crown', rarity: 'epic', unlocked_at: null },
            { id: 7, key: 'all_games', title: 'Explorador', description: 'Juega todos los juegos disponibles', icon: 'fa-compass', rarity: 'epic', unlocked_at: null },
            { id: 8, key: 'collector', title: 'Coleccionista', description: 'Añade 5 juegos a favoritos', icon: 'fa-heart', rarity: 'rare', unlocked_at: null }
        ];
        res.json(mockAchievements);
    }
});

// Get user's achievements
app.get('/api/achievements/user', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, ua.unlocked_at
             FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.id
             WHERE ua.user_id = $1
             ORDER BY ua.unlocked_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user achievements:', err);
        res.json([]);
    }
});

// Check and award achievements for a user
app.post('/api/achievements/check', authRequired, async (req, res) => {
    try {
        const userId = req.user.id;
        const newlyUnlocked = [];

        // Get all achievements
        const achievements = await pool.query('SELECT * FROM achievements');

        // Get user stats
        const playCount = await pool.query('SELECT COUNT(*) FROM scores WHERE player_name IN (SELECT username FROM users WHERE id = $1)', [userId]);
        const ratingCount = await pool.query('SELECT COUNT(*) FROM game_ratings WHERE user_id = $1', [userId]);
        const favoriteCount = await pool.query('SELECT COUNT(*) FROM user_favorites WHERE user_id = $1', [userId]);
        const uniqueGames = await pool.query('SELECT COUNT(DISTINCT game_id) FROM scores WHERE player_name IN (SELECT username FROM users WHERE id = $1)', [userId]);

        const stats = {
            total_plays: parseInt(playCount.rows[0].count),
            total_ratings: parseInt(ratingCount.rows[0].count),
            total_favorites: parseInt(favoriteCount.rows[0].count),
            unique_games: parseInt(uniqueGames.rows[0].count)
        };

        for (const achievement of achievements.rows) {
            const userHas = await pool.query(
                'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
                [userId, achievement.id]
            );

            if (userHas.rows.length === 0) {
                const value = stats[achievement.condition_type] || 0;
                if (value >= achievement.condition_value) {
                    await pool.query(
                        'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [userId, achievement.id]
                    );
                    newlyUnlocked.push(achievement);
                }
            }
        }

        res.json({ newlyUnlocked, stats });
    } catch (err) {
        console.error('Error checking achievements:', err);
        res.json({ newlyUnlocked: [], stats: {} });
    }
});

// ========================================
// API Routes - User Profile (Extended)
// ========================================

app.get('/api/profile/stats', authRequired, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await pool.query(
            'SELECT id, username, email, display_name, avatar_url, role, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (user.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const scores = await pool.query(
            `SELECT s.game_id, s.score, s.created_at
             FROM scores s
             WHERE s.player_name = $1
             ORDER BY s.score DESC LIMIT 10`,
            [user.rows[0].username] // Use proper username from DB
        );

        const ratings = await pool.query(
            'SELECT game_id, rating, comment, created_at FROM game_ratings WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        const favorites = await pool.query(
            'SELECT game_id, created_at FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        const achievements = await pool.query(
            `SELECT a.*, ua.unlocked_at FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.id
             WHERE ua.user_id = $1 ORDER BY ua.unlocked_at DESC`,
            [userId]
        );

        const totalAchievements = await pool.query('SELECT COUNT(*) FROM achievements');

        const u = user.rows[0];
        res.json({
            user: {
                id: u.id, username: u.username, email: u.email,
                displayName: u.display_name, avatarUrl: u.avatar_url,
                role: u.role, createdAt: u.created_at
            },
            topScores: scores.rows,
            ratings: ratings.rows,
            favorites: favorites.rows,
            achievements: achievements.rows,
            totalAchievements: parseInt(totalAchievements.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching profile stats:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========================================
// API Routes - Ratings
// ========================================

// Get ratings for a game
app.get('/api/ratings/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const result = await pool.query(
            `SELECT r.id, r.game_id, r.rating, r.comment, r.created_at, u.username as player_name
             FROM game_ratings r
             JOIN users u ON r.user_id = u.id
             WHERE r.game_id = $1
             ORDER BY r.created_at DESC`,
            [gameId]
        );

        const stats = await pool.query(
            `SELECT COUNT(*) as total_ratings, AVG(rating) as avg_rating
             FROM game_ratings
             WHERE game_id = $1`,
            [gameId]
        );

        res.json({
            stats: stats.rows[0],
            reviews: result.rows
        });
    } catch (err) {
        console.error('Error fetching ratings:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Submit a rating
app.post('/api/ratings', authRequired, async (req, res) => {
    const { gameId, rating, comment } = req.body;
    if (!gameId || !rating) return res.status(400).json({ error: 'Faltan campos' });

    try {
        // Check if user already rated
        const existing = await pool.query(
            'SELECT id FROM game_ratings WHERE user_id = $1 AND game_id = $2',
            [req.user.id, gameId]
        );

        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(
                'UPDATE game_ratings SET rating = $1, comment = $2, created_at = CURRENT_TIMESTAMP WHERE id = $3',
                [rating, comment, existing.rows[0].id]
            );
        } else {
            // Insert new
            await pool.query(
                'INSERT INTO game_ratings (user_id, game_id, rating, comment) VALUES ($1, $2, $3, $4)',
                [req.user.id, gameId, rating, comment]
            );
        }

        // Award achievement "First Rating" (id=4) and "Five Ratings" (id=5)
        const ratingsCount = await pool.query('SELECT COUNT(*) FROM game_ratings WHERE user_id = $1', [req.user.id]);
        const count = parseInt(ratingsCount.rows[0].count);

        if (count >= 1) {
            await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 4) ON CONFLICT DO NOTHING', [req.user.id]);
        }
        if (count >= 5) {
            await pool.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 5) ON CONFLICT DO NOTHING', [req.user.id]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error submitting rating:', err);
        res.status(500).json({ error: 'Database error' });
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

    res.json({ response: responseText });
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
