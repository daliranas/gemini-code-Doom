# 🎮 DOOM IA - Retro Raycasting Engine

Moteur de rendu 3D Raycasting (DDA 2.5D) développé en HTML5 Canvas, JavaScript modulaire et Node.js.

---

## 👥 Crédits & Auteurs

Ce projet a été imaginé, développé et conçu par :
- ⭐ **Daliranas**
- ⭐ **Jules**
- ⭐ **Google IA**

---

## ⚖️ Mentions Légales & Avertissement Éducatif

> [!IMPORTANT]
> **Projet Éducatif et Pédagogique** :
> Ce projet est une réalisation **strictement éducative et expérimentale**, créée dans le but d'enseigner et d'explorer les mathématiques du Raycasting 2.5D (DDA), la manipulation de buffers graphiques en Canvas 2D (`ImageData`), la synthèse audio en Web Audio API / Tone.js et le réseau multijoueur temps réel avec Socket.io.
>
> Ce logiciel **n'est en aucun cas affilié, sponsorisé, lié ou approuvé par id Software LLC, Bethesda Softworks ou ZeniMax Media Inc.**
> DOOM est une marque déposée de id Software LLC / ZeniMax Media Inc. Tous les actifs visuels et sonores de ce projet sont générés de manière procédurale par code.

---

## 🚀 Fonctionnalités Implémentées

1. **Moteur Raycasting DDA Haute Précision** :
   - Cartes d'arènes 32x32 par étage avec support de 3 étages distincts.
   - Texturation procédurale intégrale (Briques UAC, Plaques Métal, Runes de sang, Téléporteurs).
   - Ciel panoramique démoniaque tournant avec l'angle de caméra.
   - Éclairage dynamique stroboscopique et flashs de lumière lors des tirs.

2. **Arsenal Complet & Changement d'Armes (<kbd>1</kbd> - <kbd>4</kbd>)** :
   - <kbd>1</kbd> : **Tronçonneuse (Chainsaw)** — Attaque de mêlée continue sans munition.
   - <kbd>2</kbd> : **Super Shotgun** — Double canon scié à forte dispersion.
   - <kbd>3</kbd> : **Chaingun** — Mitrailleuse Gatling à cadence de tir ultra-rapide.
   - <kbd>4</kbd> : **BFG 9000** — Canon à plasma lourd infligeant des dégâts de zone à tous les démons visibles.

3. **Système de Clés UAC & Portes Coulissantes (<kbd>E</kbd> / <kbd>Espace</kbd>)** :
   - Portes normales et portes sécurisées verrouillées par Cartes d'Accès (**Clé Bleue**, **Clé Rouge**, **Clé Jaune**).
   - Murs secrets fissurés dissimulant des caches d'armes et des passages dérobés.

4. **Bestiaire & Menaces en Temps Réel** :
   - **Imps** (Démons cracheurs de boules de feu).
   - **Cacodémons** (Démons sphériques flottants à œil vert).
   - **Cyberdemon** (Boss titan armé d'un lance-roquettes).
   - **Lost Souls** (Crânes volants enflammés qui chargent en ligne droite).
   - **Barils Toxiques Explosifs** et **Sols de Slime Acide / Lave** (avec Combinaison Anti-Radiation temporaire).

5. **Signature Authentique & Ambiance Audio** :
   - Effet de fondu liquide au changement de niveau (**Screen Melt Transition**).
   - Écran de statistiques officiel de fin de niveau (**Level Finished Tally Screen**).
   - Ambiance Dark Ambient gothique douce avec synthétiseur Tone.js et limiteur master anti-saturation.

---

## 🛠️ Installation & Lancement

```bash
# 1. Installation des dépendances
npm install

# 2. Lancement du serveur Node.js
npm start
```
Accédez au jeu dans votre navigateur sur `http://localhost:3000`.

---

## ⌨️ Raccourcis Clavier

| Touche | Action |
| :--- | :--- |
| <kbd>Z</kbd> / <kbd>Q</kbd> / <kbd>S</kbd> / <kbd>D</kbd> ou <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> | Déplacements & Rotation |
| <kbd>Souris</kbd> / <kbd>Clic Gauche</kbd> | Visée libre (Pointer Lock) & Tir |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> | Sélection de l'Arsenal |
| <kbd>E</kbd> / <kbd>Espace</kbd> | Ouvrir Portes & Découvrir les Secrets |
| <kbd>Entrée</kbd> | Valider / Passer au niveau suivant / Rejouer |
| <kbd>Shift</kbd> | Sprint rapide |
| <kbd>M</kbd> | Afficher / Masquer la Minicarte |
| <kbd>U</kbd> | Couper / Réactiver le son |
| <kbd>Échap</kbd> | Pause / Retour au Menu |
