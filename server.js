/**
 * DOOM 1993 Raycasting Demo - Node.js Local Web Server
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route par défaut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur si non requis en tant que module
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n==================================================`);
        console.log(`🔥 DOOM 1993 Raycasting Server lancé sur le port ${PORT}`);
        console.log(`👉 http://localhost:${PORT}`);
        console.log(`==================================================\n`);
    });
}

module.exports = app;
