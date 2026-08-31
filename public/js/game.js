/**
 * DOOM IA - Contrôleur Principal du Jeu
 * Intégration SQLite3 : Enregistrement et Récupération du Tableau des Scores
 */

const I18N_DICTIONARY = {
    fr: {
        menu_subtitle: "EPISODE 1: LES PROFONDEURS DU CODE",
        new_game: "NOUVELLE PARTIE",
        diff_easy: "1. TROP JEUNE POUR MOURIR",
        diff_normal: "2. PAS TROP VIOLENT",
        diff_hard: "3. FAIS-MOI MAL",
        diff_nightmare: "4. CAUCHEMAR INFERNAL",
        settings_btn: "REGLAGES / GRAPHISMES",
        credits_btn: "CREDITS & MENTIONS LEGALES",
        enter_arena: "[ ENTRER DANS L'ARENE (ENTREE) ]",
        settings_title: "REGLAGES",
        settings_subtitle: "REGLAGES GRAPHIQUES, AUDIO & LANGUE",
        language_label: "LANGUE / LANGUAGE",
        res_label: "RESOLUTION RENDU 3D",
        lighting_label: "ECLAIRAGE DYNAMIQUE & FLASH",
        skybox_label: "CIEL PANORAMIQUE DEMONIAQUE",
        melt_label: "FONDU LIQUIDE (SCREEN MELT)",
        music_label: "MUSIQUE & SFX (TONE.JS)",
        back_btn: "[ RETOUR AU MENU ]",
        credits_title: "CREDITS",
        credits_subtitle: "PROJET EDUCATIF & EXPERIMENTAL",
        authors_label: "Projet concu et developpe par :",
        legal_p1: "AVERTISSEMENT & MENTIONS LEGALES : Ce projet est un projet purement educatif et experimental visant a demontrer la programmation d'un moteur de Raycasting 2.5D en JavaScript Canvas / Node.js.",
        legal_p2: "Ce logiciel n'est en aucun cas affilie, sponsorise, lie ou approuve par id Software ou Bethesda Softworks. DOOM est une marque deposee de id Software LLC / ZeniMax Media Inc.",
        level_finished: "NIVEAU TERMINE",
        stat_kills: "VICTIMES",
        stat_items: "OBJETS",
        stat_secret: "SECRETS",
        stat_time: "TEMPS",
        proceed_next: "[ NIVEAU SUIVANT (ENTREE) ]",
        you_died: "VOUS ETES MORT",
        respawn: "REAPPARAITRE (ENTREE)",
        main_menu: "MENU PRINCIPAL (ECHAP)",
        victory: "VICTOIRE",
        victory_sub: "L'ENFER A ETE PURIFIE !",
        play_again: "REJOUER (ENTREE)",
        hud_health: "SANTE",
        hud_armor: "ARMURE",
        hud_arms: "ARMES",
        hud_ammo: "BALLES",
        hud_plasma: "PLASMA",
        hud_keys: "CLES",
        ctrl_moves: "Mouvements",
        ctrl_weapons: "Arsenal (1-5)",
        ctrl_doors: "Portes/Secrets",
        ctrl_enter: "Valider",
        ctrl_map: "Minicarte"
    },
    en: {
        menu_subtitle: "EPISODE 1: KNEE-DEEP IN THE CODE",
        new_game: "NEW GAME",
        diff_easy: "1. I'M TOO YOUNG TO DIE",
        diff_normal: "2. HEY, NOT TOO ROUGH",
        diff_hard: "3. HURT ME PLENTY",
        diff_nightmare: "4. ULTRA-VIOLENCE / NIGHTMARE",
        settings_btn: "GRAPHICS / SETTINGS",
        credits_btn: "CREDITS & LEGAL",
        enter_arena: "[ ENTER THE ARENA (ENTER) ]",
        settings_title: "SETTINGS",
        settings_subtitle: "GRAPHICS, AUDIO & LANGUAGE",
        language_label: "LANGUAGE / LANGUE",
        res_label: "RENDER RESOLUTION",
        lighting_label: "DYNAMIC STROBE LIGHTING",
        skybox_label: "DEMONIC SKYBOX",
        melt_label: "SCREEN MELT TRANSITION",
        music_label: "MUSIC & SFX (TONE.JS)",
        back_btn: "[ BACK TO MENU ]",
        credits_title: "CREDITS",
        credits_subtitle: "EDUCATIONAL & EXPERIMENTAL PROJECT",
        authors_label: "Project designed and developed by:",
        legal_p1: "LEGAL DISCLAIMER & NOTICE: This is a purely educational and experimental project intended to demonstrate 2.5D Raycasting programming in JavaScript Canvas and Node.js.",
        legal_p2: "This software is in no way affiliated, sponsored, associated with, or endorsed by id Software or Bethesda Softworks. DOOM is a registered trademark of id Software LLC / ZeniMax Media Inc.",
        level_finished: "LEVEL FINISHED",
        stat_kills: "KILLS",
        stat_items: "ITEMS",
        stat_secret: "SECRET",
        stat_time: "TIME",
        proceed_next: "[ PROCEED TO NEXT LEVEL (ENTER) ]",
        you_died: "YOU DIED",
        respawn: "RESPAWN (ENTER)",
        main_menu: "MAIN MENU (ESC)",
        victory: "VICTORY",
        victory_sub: "HELL HAS BEEN CONQUERED!",
        play_again: "PLAY AGAIN (ENTER)",
        hud_health: "HEALTH",
        hud_armor: "ARMOR",
        hud_arms: "ARMS",
        hud_ammo: "BULLETS",
        hud_plasma: "PLASMA",
        hud_keys: "KEYS",
        ctrl_moves: "Movement",
        ctrl_weapons: "Weapons (1-5)",
        ctrl_doors: "Doors/Secrets",
        ctrl_enter: "Validate",
        ctrl_map: "Minimap"
    }
};

class DoomGame {
    constructor() {
        this.state = 'MENU';
        this.difficulty = 'easy';
        this.language = 'fr';
        this.lastTime = 0;
        this.logTimer = 0;
        this.levelStartTime = 0;
        this.ambientSoundTimer = 4.0;

        // Éléments DOM
        this.canvas = document.getElementById('viewport');
        this.faceCanvas = document.getElementById('doomguy-face');
        this.faceCtx = this.faceCanvas ? this.faceCanvas.getContext('2d') : null;
        this.damageFlash = document.getElementById('damage-flash');
        this.gameLogEl = document.getElementById('game-log');

        this.crosshair = document.getElementById('crosshair');
        this.interactionPrompt = document.getElementById('interaction-prompt');
        this.promptText = document.getElementById('prompt-text');

        this.hudHealth = document.getElementById('hud-health');
        this.hudArmor = document.getElementById('hud-armor');
        this.hudWeapon = document.getElementById('hud-weapon');
        this.hudAmmo = document.getElementById('hud-ammo');
        this.hudRockets = document.getElementById('hud-rockets');
        this.hudPlasma = document.getElementById('hud-plasma');
        this.keyBlueBadge = document.getElementById('key-blue-badge');
        this.keyRedBadge = document.getElementById('key-red-badge');
        this.keyYellowBadge = document.getElementById('key-yellow-badge');

        this.mainMenu = document.getElementById('main-menu');
        this.settingsModal = document.getElementById('settings-modal');
        this.creditsModal = document.getElementById('credits-modal');
        this.scoresModal = document.getElementById('scores-modal');
        this.intermissionMenu = document.getElementById('intermission-menu');
        this.gameoverMenu = document.getElementById('gameover-menu');
        this.victoryMenu = document.getElementById('victory-menu');

        this.tallyKills = document.getElementById('tally-kills');
        this.tallyItems = document.getElementById('tally-items');
        this.tallySecret = document.getElementById('tally-secret');
        this.tallyTime = document.getElementById('tally-time');
        this.intermissionFloorName = document.getElementById('intermission-floor-name');

        this.player = new window.DoomPlayer();
        this.raycaster = new window.DoomRaycaster(this.canvas);
        window.doomRaycaster = this.raycaster;

        this.socket = null;
        this.initSocket();
        this.initUI();
        this.setLanguage('fr');
    }

    setLanguage(lang) {
        if (!I18N_DICTIONARY[lang]) return;
        this.language = lang;

        const dict = I18N_DICTIONARY[lang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerText = dict[key];
            }
        });

        const menuSub = document.getElementById('menu-sub-title');
        if (menuSub) menuSub.innerText = dict.menu_subtitle;
    }

    async loadScores() {
        const tbody = document.getElementById('scores-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 10px; color: #888;">CHARGEMENT DEPUIS SQLITE...</td></tr>';

        try {
            const res = await fetch('/api/scores');
            const scores = await res.json();

            tbody.innerHTML = '';
            if (scores.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 10px; color: #888;">AUCUN SCORE ENREGISTRÉ</td></tr>';
                return;
            }

            scores.forEach((s, idx) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #331111';
                tr.innerHTML = `
                    <td style="padding: 6px; color: #ffaa00;">#${idx + 1}</td>
                    <td style="padding: 6px; color: #00e5ff; font-weight: bold;">${s.player_name}</td>
                    <td style="padding: 6px; color: #ffea00;">${s.score} PTS</td>
                    <td style="padding: 6px; color: #ff3333;">${s.kills}</td>
                    <td style="padding: 6px; color: #aaa;">${s.difficulty.toUpperCase()}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 10px; color: #ff2222;">ERREUR CHARGEMENT SQLITE</td></tr>';
        }
    }

    async saveScore(nameInputId) {
        const input = document.getElementById(nameInputId);
        const name = input ? input.value.trim() || 'MARINE' : 'MARINE';

        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_name: name,
                    score: this.player.score,
                    kills: this.player.kills,
                    difficulty: this.difficulty
                })
            });
            this.showLog("🏆 SCORE ENREGISTRÉ DANS SQLITE !");
            setTimeout(() => this.setGameState('SCORES'), 400);
        } catch (e) {
            console.error(e);
        }
    }

    initSocket() {
        if (typeof io !== 'undefined') {
            try {
                this.socket = io();

                this.socket.on('init', (data) => {
                    Object.keys(data.players).forEach(id => {
                        if (id !== data.id) {
                            this.raycaster.remotePlayers[id] = data.players[id];
                        }
                    });
                });

                this.socket.on('playerJoined', (player) => {
                    this.raycaster.remotePlayers[player.id] = player;
                    this.showLog(this.language === 'fr' ? "UN MARINE A REJOINT L'ARENE !" : "A MARINE JOINED THE ARENA!");
                });

                this.socket.on('playerUpdate', (player) => {
                    this.raycaster.remotePlayers[player.id] = player;
                });

                this.socket.on('remoteShoot', () => {
                    if (window.doomAudio) window.doomAudio.playSFX('shotgun');
                });

                this.socket.on('playerLeft', (id) => {
                    delete this.raycaster.remotePlayers[id];
                });
            } catch (e) {
                console.log("Mode Solo actif.");
            }
        }
    }

    initUI() {
        const btnPlayAction = document.getElementById('btn-play-action');
        const btnNewGame = document.getElementById('btn-newgame');
        const btnScores = document.getElementById('btn-scores');
        const btnScoresBack = document.getElementById('btn-scores-back');
        const btnGraphics = document.getElementById('btn-graphics');
        const btnCredits = document.getElementById('btn-credits');
        const btnSettingsBack = document.getElementById('btn-settings-back');
        const btnCreditsBack = document.getElementById('btn-credits-back');

        const btnSaveScore = document.getElementById('btn-save-score');
        const btnSaveVictoryScore = document.getElementById('btn-save-victory-score');

        const diffSubmenu = document.getElementById('diff-submenu');
        const diffItems = document.querySelectorAll('.doom-sub-item[data-diff]');
        const resButtons = document.querySelectorAll('.btn-setting-res');
        const langButtons = document.querySelectorAll('.btn-setting-lang');
        const btnIntermissionNext = document.getElementById('btn-intermission-next');

        const btnRespawn = document.getElementById('btn-respawn');
        const btnMenuBack = document.getElementById('btn-menu-back');
        const btnReplay = document.getElementById('btn-replay');
        const btnMute = document.getElementById('btn-mute');

        const chkMusic = document.getElementById('chk-music');
        const chkLighting = document.getElementById('chk-lighting');
        const chkSkybox = document.getElementById('chk-skybox');
        const chkMelt = document.getElementById('chk-melt');

        if (this.interactionPrompt) {
            this.interactionPrompt.addEventListener('click', () => {
                this.player.interact();
            });
        }

        document.querySelectorAll('.doom-menu-item, .doom-sub-item, .btn-setting-res, .btn-setting-lang, .doom-btn').forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (window.doomAudio) window.doomAudio.playSFX('menu_hover');
            });
        });

        window.addEventListener('click', () => {
            if (window.doomAudio && this.state === 'MENU' && (!chkMusic || chkMusic.checked) && !window.doomAudio.isPlayingMusic) {
                window.doomAudio.startMusic('menu');
            }
        }, { once: false });

        if (btnPlayAction) {
            btnPlayAction.addEventListener('click', () => {
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
                this.startGame();
            });
        }

        if (btnNewGame) {
            btnNewGame.addEventListener('click', () => {
                diffSubmenu.classList.toggle('hidden');
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
            });
        }

        if (btnScores) {
            btnScores.addEventListener('click', () => {
                this.setGameState('SCORES');
                this.loadScores();
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
            });
        }

        if (btnScoresBack) {
            btnScoresBack.addEventListener('click', () => {
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
                this.setGameState('MENU');
            });
        }

        if (btnSaveScore) {
            btnSaveScore.addEventListener('click', () => this.saveScore('player-name-input'));
        }

        if (btnSaveVictoryScore) {
            btnSaveVictoryScore.addEventListener('click', () => this.saveScore('victory-player-name'));
        }

        if (btnGraphics) {
            btnGraphics.addEventListener('click', () => {
                this.setGameState('SETTINGS');
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
            });
        }

        if (btnCredits) {
            btnCredits.addEventListener('click', () => {
                this.setGameState('CREDITS');
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
            });
        }

        if (btnSettingsBack) {
            btnSettingsBack.addEventListener('click', () => {
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
                this.setGameState('MENU');
            });
        }

        if (btnCreditsBack) {
            btnCreditsBack.addEventListener('click', () => {
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
                this.setGameState('MENU');
            });
        }

        langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                langButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const lang = btn.getAttribute('data-lang');
                this.setLanguage(lang);
                if (window.doomAudio) window.doomAudio.playSFX('menu_click');
            });
        });

        resButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                resButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const res = btn.getAttribute('data-res');
                if (res === 'low') {
                    this.raycaster.setResolution(240, 150);
                } else if (res === 'normal') {
                    this.raycaster.setResolution(320, 200);
                } else if (res === 'high') {
                    this.raycaster.setResolution(640, 400);
                } else if (res === 'fullhd') {
                    this.raycaster.setResolution(960, 600);
                }
                if (window.doomAudio) window.doomAudio.playSFX('tally_bip');
            });
        });

        diffItems.forEach(item => {
            item.addEventListener('click', () => {
                diffItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.difficulty = item.getAttribute('data-diff');
                if (window.doomAudio) window.doomAudio.playSFX('monster_growl');
                setTimeout(() => this.startGame(), 200);
            });
        });

        const proceedNextFloor = () => {
            this.setGameState('VICTORY');
        };

        if (btnIntermissionNext) btnIntermissionNext.addEventListener('click', proceedNextFloor);
        if (btnRespawn) btnRespawn.addEventListener('click', () => this.startGame());
        if (btnMenuBack) btnMenuBack.addEventListener('click', () => this.setGameState('MENU'));
        if (btnReplay) btnReplay.addEventListener('click', () => this.startGame());

        if (btnMute) {
            btnMute.addEventListener('click', () => {
                if (window.doomAudio) {
                    const isMuted = window.doomAudio.toggleMute();
                    btnMute.innerText = isMuted ? 'UNMUTE 🔇' : 'MUTE 🔊';
                }
            });
        }

        if (chkLighting) {
            chkLighting.addEventListener('change', (e) => {
                this.raycaster.enableLighting = e.target.checked;
            });
        }

        if (chkSkybox) {
            chkSkybox.addEventListener('change', (e) => {
                this.raycaster.enableSkybox = e.target.checked;
            });
        }

        if (chkMelt) {
            chkMelt.addEventListener('change', (e) => {
                this.raycaster.enableMelt = e.target.checked;
            });
        }

        if (chkMusic) {
            chkMusic.addEventListener('change', (e) => {
                if (window.doomAudio) {
                    if (e.target.checked) {
                        const targetTrack = this.state === 'MENU' ? 'menu' : (this.state === 'INTERMISSION' ? 'intermission' : 1);
                        window.doomAudio.startMusic(targetTrack);
                    } else {
                        window.doomAudio.stopMusic();
                    }
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            const code = e.code;

            if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') {
                if (this.state === 'INTERMISSION') {
                    e.preventDefault();
                    proceedNextFloor();
                    return;
                }
                if (this.state === 'MENU') {
                    e.preventDefault();
                    this.startGame();
                    return;
                }
                if (this.state === 'SETTINGS' || this.state === 'CREDITS' || this.state === 'SCORES') {
                    e.preventDefault();
                    this.setGameState('MENU');
                    return;
                }
            }

            if (code === 'Escape') {
                if (this.state === 'PLAYING') {
                    this.setGameState('MENU');
                } else if (this.state === 'SETTINGS' || this.state === 'CREDITS' || this.state === 'SCORES') {
                    this.setGameState('MENU');
                } else if (this.state === 'MENU') {
                    this.startGame();
                } else if (this.state === 'INTERMISSION') {
                    proceedNextFloor();
                }
            }

            if (code === 'KeyM') {
                this.raycaster.showMinimap = !this.raycaster.showMinimap;
            }

            if (code === 'KeyU') {
                if (btnMute) btnMute.click();
            }
        });
    }

    checkCenterInteraction() {
        if (this.state !== 'PLAYING' || !this.interactionPrompt) return;

        const checkDist = 1.6;
        const frontX = this.player.x + Math.cos(this.player.angle) * checkDist;
        const frontY = this.player.y + Math.sin(this.player.angle) * checkDist;
        const targetCell = this.raycaster.getMapCell(frontX, frontY);

        if (targetCell === 6) {
            this.interactionPrompt.classList.remove('hidden');
            this.promptText.innerText = this.language === 'fr' ? "[E] OUVRIR LA PORTE / CLIC" : "[E] OPEN DOOR / CLICK";
        } else if (targetCell === 7) {
            this.interactionPrompt.classList.remove('hidden');
            const hasKey = this.player.keysInventory.blue;
            this.promptText.innerText = hasKey ? (this.language === 'fr' ? "[E] DÉVERROUILLER (CLÉ BLEUE)" : "[E] UNLOCK (BLUE KEY)") : (this.language === 'fr' ? "VERROUILLÉ : CLÉ BLEUE REQUISE" : "LOCKED : BLUE KEY REQUIRED");
        } else if (targetCell === 8) {
            this.interactionPrompt.classList.remove('hidden');
            const hasKey = this.player.keysInventory.red;
            this.promptText.innerText = hasKey ? (this.language === 'fr' ? "[E] DÉVERROUILLER (CLÉ ROUGE)" : "[E] UNLOCK (RED KEY)") : (this.language === 'fr' ? "VERROUILLÉ : CLÉ ROUGE REQUISE" : "LOCKED : RED KEY REQUIRED");
        } else if (targetCell === 9) {
            this.interactionPrompt.classList.remove('hidden');
            const hasKey = this.player.keysInventory.yellow;
            this.promptText.innerText = hasKey ? (this.language === 'fr' ? "[E] DÉVERROUILLER (CLÉ JAUNE)" : "[E] UNLOCK (YELLOW KEY)") : (this.language === 'fr' ? "VERROUILLÉ : CLÉ JAUNE REQUISE" : "LOCKED : YELLOW KEY REQUIRED");
        } else if (targetCell === 12) {
            this.interactionPrompt.classList.remove('hidden');
            this.promptText.innerText = this.language === 'fr' ? "[E] ACTIVER PASSAGE SECRET" : "[E] ACTIVATE SECRET WALL";
        } else if (targetCell === 5) {
            this.interactionPrompt.classList.remove('hidden');
            this.promptText.innerText = this.language === 'fr' ? "[E] ASCENSEUR FINAL (VICTOIRE)" : "[E] FINAL ELEVATOR (VICTORY)";
        } else {
            this.interactionPrompt.classList.add('hidden');
        }
    }

    startGame() {
        const chkMusic = document.getElementById('chk-music');
        if (window.doomAudio) {
            window.doomAudio.init();
            if (!chkMusic || chkMusic.checked) {
                window.doomAudio.startMusic(1);
            }
        }

        this.raycaster.startMeltTransition();
        this.player.reset(this.difficulty);
        this.raycaster.currentFloor = 1;
        this.raycaster.map = this.raycaster.generateUnifiedWorldMap();
        this.raycaster.resetEntities(this.difficulty);
        this.raycaster.secretsFound = 0;
        this.levelStartTime = Date.now();
        this.setGameState('PLAYING');
        this.showLog(this.language === 'fr' ? "ZONE CONTINUE UAC & 4 GRANDS BOSS DE ZONE !" : "UNIFIED ZONE : UAC & 4 ZONE BOSSES!");
        this.updateHUD();
    }

    showIntermission() {
        const elapsedSec = Math.floor((Date.now() - this.levelStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');

        if (this.intermissionFloorName) {
            this.intermissionFloorName.innerText = "MISSION PURIFICATION COMPLÈTE";
        }

        this.setGameState('INTERMISSION');

        let killsPercent = 0;
        const targetKills = 100;
        const tallyInterval = setInterval(() => {
            if (killsPercent < targetKills) {
                killsPercent += 5;
                if (this.tallyKills) this.tallyKills.innerText = `${killsPercent}%`;
                if (window.doomAudio) window.doomAudio.playSFX('tally_bip');
            } else {
                clearInterval(tallyInterval);
                if (this.tallyItems) this.tallyItems.innerText = "92%";
                if (this.tallySecret) this.tallySecret.innerText = `${this.raycaster.secretsFound}/4`;
                if (this.tallyTime) this.tallyTime.innerText = `${mins}:${secs}`;
                if (window.doomAudio) window.doomAudio.playSFX('monster_growl');
            }
        }, 40);
    }

    setGameState(newState) {
        this.state = newState;
        this.mainMenu.classList.add('hidden');
        this.settingsModal.classList.add('hidden');
        this.creditsModal.classList.add('hidden');
        if (this.scoresModal) this.scoresModal.classList.add('hidden');
        this.intermissionMenu.classList.add('hidden');
        this.gameoverMenu.classList.add('hidden');
        this.victoryMenu.classList.add('hidden');
        if (this.interactionPrompt) this.interactionPrompt.classList.add('hidden');

        const chkMusic = document.getElementById('chk-music');

        if (newState === 'MENU') {
            this.mainMenu.classList.remove('hidden');
            if (window.doomAudio && (!chkMusic || chkMusic.checked)) {
                window.doomAudio.startMusic('menu');
            }
        } else if (newState === 'SCORES') {
            if (this.scoresModal) this.scoresModal.classList.remove('hidden');
        } else if (newState === 'SETTINGS') {
            this.settingsModal.classList.remove('hidden');
        } else if (newState === 'CREDITS') {
            this.creditsModal.classList.remove('hidden');
        } else if (newState === 'PLAYING') {
            if (window.doomAudio && (!chkMusic || chkMusic.checked)) {
                window.doomAudio.startMusic(1);
            }
        } else if (newState === 'INTERMISSION') {
            this.intermissionMenu.classList.remove('hidden');
            if (window.doomAudio && (!chkMusic || chkMusic.checked)) {
                window.doomAudio.startMusic('intermission');
            }
        } else if (newState === 'GAMEOVER') {
            document.getElementById('gameover-stats').innerText = `VICTIMES: ${this.player.kills} - SCORE: ${this.player.score}`;
            this.gameoverMenu.classList.remove('hidden');
            if (window.doomAudio) window.doomAudio.stopMusic();
        } else if (newState === 'VICTORY') {
            document.getElementById('victory-stats').innerText = `VICTOIRE TOTALE ! VICTIMES: ${this.player.kills} - SCORE: ${this.player.score}`;
            this.victoryMenu.classList.remove('hidden');
            if (window.doomAudio) window.doomAudio.stopMusic();
        }
    }

    showLog(msg) {
        if (this.gameLogEl) {
            this.gameLogEl.innerText = msg;
            this.logTimer = 3.5;
        }
    }

    updateHUD() {
        if (this.hudHealth) this.hudHealth.innerText = `${Math.max(0, Math.ceil(this.player.health))}%`;
        if (this.hudArmor) this.hudArmor.innerText = `${Math.max(0, Math.ceil(this.player.armor))}%`;
        if (this.hudWeapon) this.hudWeapon.innerText = this.player.weapons[this.player.currentWeapon].name;
        if (this.hudAmmo) this.hudAmmo.innerText = `${this.player.ammo}`;
        if (this.hudRockets) this.hudRockets.innerText = `${this.player.rockets}`;
        if (this.hudPlasma) this.hudPlasma.innerText = `${this.player.plasma}`;

        if (this.keyBlueBadge) this.keyBlueBadge.style.background = this.player.keysInventory.blue ? '#00e5ff' : '#222';
        if (this.keyRedBadge) this.keyRedBadge.style.background = this.player.keysInventory.red ? '#ff2222' : '#222';
        if (this.keyYellowBadge) this.keyYellowBadge.style.background = this.player.keysInventory.yellow ? '#ffd700' : '#222';

        this.drawDoomguyFace();
    }

    drawDoomguyFace() {
        if (!this.faceCtx) return;
        const ctx = this.faceCtx;
        const W = 50, H = 54;
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        const h = this.player.health;
        const skinColor = h > 60 ? '#f0b28e' : (h > 30 ? '#d48866' : '#a85544');
        const isShooting = this.player.shootTimer > 0.1;

        ctx.fillStyle = skinColor;
        ctx.fillRect(10, 8, 30, 36);

        ctx.fillStyle = '#3a1f0d';
        ctx.fillRect(10, 6, 30, 8);
        ctx.fillRect(8, 10, 4, 12);
        ctx.fillRect(38, 10, 4, 12);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 20, 7, 5);
        ctx.fillRect(29, 20, 7, 5);

        ctx.fillStyle = '#111111';
        let lookX = 16;
        if (this.player.keys.turnLeft) lookX = 14;
        if (this.player.keys.turnRight) lookX = 18;
        ctx.fillRect(lookX, 21, 3, 3);
        ctx.fillRect(lookX + 15, 21, 3, 3);

        ctx.fillStyle = '#221105';
        ctx.fillRect(13, 17, 9, 3);
        ctx.fillRect(28, 17, 9, 3);

        ctx.fillStyle = '#b87552';
        ctx.fillRect(23, 24, 4, 6);

        if (isShooting) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(18, 33, 14, 5);
            ctx.fillStyle = '#551111';
            ctx.fillRect(19, 35, 12, 2);
        } else if (h < 40) {
            ctx.fillStyle = '#660000';
            ctx.fillRect(18, 33, 14, 6);
            ctx.fillStyle = '#990000';
            ctx.fillRect(10, 18, 3, 12);
            ctx.fillRect(34, 30, 6, 8);
        } else {
            ctx.fillStyle = '#441818';
            ctx.fillRect(19, 34, 12, 3);
        }
    }

    update(dt) {
        if (this.logTimer > 0) {
            this.logTimer -= dt;
            if (this.logTimer <= 0 && this.gameLogEl) this.gameLogEl.innerText = '';
        }

        if (this.player.damageFlashTimer > 0) {
            this.player.damageFlashTimer -= dt;
            if (this.damageFlash) {
                this.damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
            }
        } else if (this.damageFlash) {
            this.damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }

        this.raycaster.updateMelt(dt);

        if (this.state === 'PLAYING') {
            this.player.update(dt);
            this.raycaster.updateEntities(dt, this.player);
            this.checkCenterInteraction();

            this.ambientSoundTimer -= dt;
            if (this.ambientSoundTimer <= 0) {
                this.ambientSoundTimer = 5.0 + Math.random() * 6.0;
                if (window.doomAudio) {
                    const r = Math.random();
                    if (r < 0.4) window.doomAudio.playSFX('monster_growl');
                    else if (r < 0.7) window.doomAudio.playSFX('caco_moan');
                    else window.doomAudio.playSFX('hell_whisper');
                }
            }

            if (this.socket && this.socket.connected) {
                this.socket.emit('playerMove', {
                    x: this.player.x,
                    y: this.player.y,
                    angle: this.player.angle,
                    health: this.player.health
                });
            }
        }
    }

    render() {
        this.raycaster.render(this.player);
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.doomGame = new DoomGame();
    window.doomGame.setGameState('MENU');
    requestAnimationFrame((t) => window.doomGame.loop(t));
});
