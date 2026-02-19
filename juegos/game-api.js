/**
 * GameAPI - Bridge between games and the main application backend.
 * Checks for authentication and handles score submission/analytics.
 */
(function () {
    const API_BASE = '/api';

    // Helper to get JWT token from localStorage (where Angular saves it)
    function getToken() {
        return localStorage.getItem('token');
    }

    const GameAPI = {
        /**
         * Submit a score for a game
         * @param {string} gameId - The ID of the game (e.g., '2048')
         * @param {number} score - The score achieved
         * @param {number} [playDuration=0] - Duration of the game in seconds
         * @returns {Promise<object>} - Result from server
         */
        submitScore: async (gameId, score, playDuration = 0) => {
            console.log(`Submitting score for ${gameId}: ${score}`);
            try {
                const token = getToken();
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                // If not logged in, we need a playerName. Use 'Anonymous' if not provided?
                // The server uses req.user if present. If not, it needs playerName.
                // We'll prompt user if not logged in? Or just send 'Invitado'.

                let playerName = 'Invitado';
                if (token) {
                    // We let the server extract username from token
                    // But we still need to send 'playerName' field as backup or it fails validation?
                    // Server check: if (!gameId || !score || (!playerName && !req.user))
                    // So if req.user exists, playerName is optional.
                } else {
                    // Prompt for name? For now, just 'Invitado'
                    // In a real integration, the game might ask the user.
                }

                const response = await fetch(`${API_BASE}/scores`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        gameId,
                        score,
                        playDuration,
                        playerName: playerName
                    })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const result = await response.json();
                console.log('Score submitted successfully!', result);

                if (result.newAchievements && result.newAchievements.length > 0) {
                    console.log('Achievements unlocked:', result.newAchievements);
                    // Could trigger a UI notification here if we had access to parent window
                    try {
                        // Attempt to notify parent window (Angular app)
                        window.parent.postMessage({ type: 'ACHIEVEMENT_UNLOCKED', achievements: result.newAchievements }, '*');
                    } catch (e) { /* ignore */ }
                }

                return result;
            } catch (err) {
                console.error('Error submitting score:', err);
                throw err;
            }
        },

        /**
         * Track a game play (increment play count)
         * @param {string} gameId 
         */
        trackPlay: async (gameId) => {
            try {
                const token = getToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                await fetch(`${API_BASE}/analytics/${gameId}/play`, {
                    method: 'POST',
                    headers: headers
                });
            } catch (err) {
                console.error('Error tracking play:', err);
            }
        }
    };

    // Expose to window
    window.GameAPI = GameAPI;
    console.log('GameAPI loaded for', window.location.pathname);

})();
