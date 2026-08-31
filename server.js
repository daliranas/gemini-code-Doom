/**
 * DOOM IA - Serveur Express & Socket.io
 * Base de données SQLite pour le Tableau des Scores (Leaderboard)
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. INITIALISATION BASE DE DONNÉES SQLITE
// ==========================================
const dbPath = path.join(__dirname, 'scores.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Erreur de connexion à SQLite:", err.message);
    } else {
        console.log("💾 Base de données SQLite connectée avec succès (scores.db)");
    }
});

// Création de la table des scores si elle n'existe pas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS highscores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            kills INTEGER NOT NULL,
            difficulty TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error("❌ Erreur création table highscores:", err.message);
        } else {
            // Insertion de scores par défaut si la table est vide
            db.get("SELECT COUNT(*) as count FROM highscores", (err, row) => {
                if (!err && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO highscores (player_name, score, kills, difficulty) VALUES (?, ?, ?, ?)");
                    stmt.run("DOOMGUY", 5000, 25, "hard");
                    stmt.run("DALIRANAS", 4200, 20, "nightmare");
                    stmt.run("JULES_AI", 3500, 18, "normal");
                    stmt.run("MARINE_SLAYER", 2000, 10, "easy");
                    stmt.finalize();
                    console.log("🏆 Scores par défaut initialisés dans SQLite.");
                }
            });
        }
    });
});

// ==========================================
// 2. API REST POUR LES SCORES
// ==========================================
// Obtenir le Top 10 des scores
app.get('/api/scores', (req, res) => {
    db.all("SELECT player_name, score, kills, difficulty, created_at FROM highscores ORDER BY score DESC LIMIT 10", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Enregistrer un nouveau score
app.post('/api/scores', (req, res) => {
    const { player_name, score, kills, difficulty } = req.body;
    const name = (player_name || 'MARINE').trim().substring(0, 15);
    const s = parseInt(score, 10) || 0;
    const k = parseInt(kills, 10) || 0;
    const diff = (difficulty || 'normal').substring(0, 12);

    const stmt = db.prepare("INSERT INTO highscores (player_name, score, kills, difficulty) VALUES (?, ?, ?, ?)");
    stmt.run(name, s, k, diff, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, id: this.lastID });
    });
    stmt.finalize();
});

// ==========================================
// 3. SOCKET.IO MULTIJOUEUR
// ==========================================
const players = {};

io.on('connection', (socket) => {
    console.log(`Marine connecté : ${socket.id}`);

    players[socket.id] = {
        id: socket.id,
        x: 4.5,
        y: 4.5,
        angle: 0,
        health: 100
    };

    socket.emit('init', { id: socket.id, players });
    socket.broadcast.emit('playerJoined', players[socket.id]);

    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            players[socket.id].health = data.health;
            socket.broadcast.emit('playerUpdate', players[socket.id]);
        }
    });

    socket.on('playerShoot', () => {
        socket.broadcast.emit('remoteShoot', socket.id);
    });

    socket.on('disconnect', () => {
        console.log(`Marine déconnecté : ${socket.id}`);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

// Servir la page principale
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🔥 DOOM IA Server actif sur http://localhost:${PORT}`);
    console.log(`=========================================`);
});
