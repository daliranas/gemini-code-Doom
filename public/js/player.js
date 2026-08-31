/**
 * DOOM IA - Contrôleur Joueur & Moteur d'Arsenal Lourd
 * Correction Lance-Roquettes :
 * - Spawn de la roquette bien en avant (0.8 bloc) pour éviter toute auto-collision au départ du tir
 * - Dégâts de souffle (Splash Damage) limités à une zone réaliste si le joueur est trop près de l'impact
 */

class DoomPlayer {
    constructor() {
        this.x = 4.5;
        this.y = 4.5;
        this.angle = 0;
        this.speed = 4.5;
        this.rotSpeed = 2.5;
        this.mouseSensitivity = 0.0035;
        this.radius = 0.22;

        this.health = 100;
        this.armor = 50;
        this.score = 0;
        this.kills = 0;

        this.ammo = 80;
        this.plasma = 40;
        this.rockets = 15;

        this.keysInventory = {
            blue: false,
            red: false,
            yellow: false
        };

        this.radsuitTimer = 0;
        this.damageFlashTimer = 0;
        this.shootTimer = 0;
        this.weaponBob = 0;

        this.currentWeapon = 2; // 1: Chainsaw, 2: Super Shotgun, 3: Chaingun, 4: Rocket Launcher, 5: BFG 9000
        this.weapons = {
            1: { name: 'CHAINSAW', damage: 30, range: 2.2, cooldown: 0.12, ammoType: null, cost: 0 },
            2: { name: 'SUPER SHOTGUN', damage: 130, range: 12.0, cooldown: 0.85, ammoType: 'bullets', cost: 2 },
            3: { name: 'CHAINGUN', damage: 24, range: 18.0, cooldown: 0.09, ammoType: 'bullets', cost: 1 },
            4: { name: 'ROCKET LAUNCHER', damage: 220, range: 24.0, cooldown: 0.75, ammoType: 'rockets', cost: 1 },
            5: { name: 'BFG 9000', damage: 600, range: 28.0, cooldown: 1.4, ammoType: 'plasma', cost: 20 }
        };

        this.keys = {
            forward: false,
            backward: false,
            strafeLeft: false,
            strafeRight: false,
            turnLeft: false,
            turnRight: false,
            shoot: false,
            sprint: false
        };

        this.initInput();
    }

    reset(difficulty = 'easy') {
        this.x = 4.5;
        this.y = 4.5;
        this.angle = 0;
        this.health = (difficulty === 'easy') ? 120 : (difficulty === 'nightmare' ? 80 : 100);
        this.armor = (difficulty === 'easy') ? 80 : (difficulty === 'nightmare' ? 20 : 50);
        this.ammo = (difficulty === 'easy') ? 100 : 60;
        this.plasma = (difficulty === 'easy') ? 60 : 30;
        this.rockets = 15;
        this.score = 0;
        this.kills = 0;
        this.keysInventory = { blue: false, red: false, yellow: false };
        this.radsuitTimer = 0;
        this.damageFlashTimer = 0;
        this.shootTimer = 0;
        this.currentWeapon = 2;
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp') this.keys.forward = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = true;
            if (e.code === 'KeyA' || e.code === 'KeyQ') this.keys.strafeLeft = true;
            if (e.code === 'KeyD') this.keys.strafeRight = true;
            if (e.code === 'ArrowLeft') this.keys.turnLeft = true;
            if (e.code === 'ArrowRight') this.keys.turnRight = true;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = true;
            if (e.code === 'Space' || e.code === 'KeyE') this.interact();

            if (e.code === 'Digit1') this.switchWeapon(1);
            if (e.code === 'Digit2') this.switchWeapon(2);
            if (e.code === 'Digit3') this.switchWeapon(3);
            if (e.code === 'Digit4') this.switchWeapon(4);
            if (e.code === 'Digit5') this.switchWeapon(5);
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp') this.keys.forward = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = false;
            if (e.code === 'KeyA' || e.code === 'KeyQ') this.keys.strafeLeft = false;
            if (e.code === 'KeyD') this.keys.strafeRight = false;
            if (e.code === 'ArrowLeft') this.keys.turnLeft = false;
            if (e.code === 'ArrowRight') this.keys.turnRight = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = false;
        });

        const canvas = document.getElementById('viewport');
        const viewportWrapper = document.getElementById('viewport-wrapper');

        const requestLock = () => {
            if (window.doomGame && window.doomGame.state === 'PLAYING') {
                const target = canvas || viewportWrapper || document.body;
                if (target.requestPointerLock) {
                    target.requestPointerLock();
                } else if (target.mozRequestPointerLock) {
                    target.mozRequestPointerLock();
                }
            }
        };

        if (viewportWrapper) {
            viewportWrapper.addEventListener('click', () => {
                requestLock();
                this.shoot();
            });
        } else if (canvas) {
            canvas.addEventListener('click', () => {
                requestLock();
                this.shoot();
            });
        }

        let lastClientX = null;
        window.addEventListener('mousemove', (e) => {
            if (!window.doomGame || window.doomGame.state !== 'PLAYING') return;

            const isLocked = document.pointerLockElement === canvas || 
                             document.pointerLockElement === viewportWrapper || 
                             document.pointerLockElement === document.body;

            if (isLocked) {
                const movementX = e.movementX || e.mozMovementX || 0;
                this.angle += movementX * this.mouseSensitivity;
            } else if (lastClientX !== null && e.buttons === 1) {
                const deltaX = e.clientX - lastClientX;
                this.angle += deltaX * this.mouseSensitivity;
            }
            lastClientX = e.clientX;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && window.doomGame && window.doomGame.state === 'PLAYING') {
                this.keys.shoot = true;
                this.shoot();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.keys.shoot = false;
        });
    }

    switchWeapon(id) {
        if (this.weapons[id]) {
            this.currentWeapon = id;
            if (window.doomAudio) window.doomAudio.playSFX('item');
            if (window.doomGame) {
                window.doomGame.showLog(`ARME : ${this.weapons[id].name}`);
                window.doomGame.updateHUD();
            }
        }
    }

    interact() {
        if (!window.doomRaycaster) return;

        const angles = [this.angle, this.angle - 0.3, this.angle + 0.3];
        const dists = [0.8, 1.4, 2.0];

        for (let a of angles) {
            for (let d of dists) {
                const frontX = this.x + Math.cos(a) * d;
                const frontY = this.y + Math.sin(a) * d;
                const mx = Math.floor(frontX);
                const my = Math.floor(frontY);
                const cell = window.doomRaycaster.getMapCell(mx, my);

                if (cell === 6) {
                    window.doomRaycaster.openDoor(mx, my);
                    if (window.doomGame) window.doomGame.showLog("PORTE OUVERTE !");
                    return;
                } else if (cell === 7) {
                    if (this.keysInventory.blue) {
                        window.doomRaycaster.openDoor(mx, my);
                        if (window.doomGame) window.doomGame.showLog("ACCÈS AUTORISÉ (CLÉ BLEUE) !");
                    } else {
                        if (window.doomAudio) window.doomAudio.playSFX('player_hurt');
                        if (window.doomGame) window.doomGame.showLog("VERROUILLÉ : CARTE BLEUE REQUISE !");
                    }
                    return;
                } else if (cell === 8) {
                    if (this.keysInventory.red) {
                        window.doomRaycaster.openDoor(mx, my);
                        if (window.doomGame) window.doomGame.showLog("ACCÈS AUTORISÉ (CLÉ ROUGE) !");
                    } else {
                        if (window.doomAudio) window.doomAudio.playSFX('player_hurt');
                        if (window.doomGame) window.doomGame.showLog("VERROUILLÉ : CARTE ROUGE REQUISE !");
                    }
                    return;
                } else if (cell === 9) {
                    if (this.keysInventory.yellow) {
                        window.doomRaycaster.openDoor(mx, my);
                        if (window.doomGame) window.doomGame.showLog("ACCÈS AUTORISÉ (CLÉ JAUNE) !");
                    } else {
                        if (window.doomAudio) window.doomAudio.playSFX('player_hurt');
                        if (window.doomGame) window.doomGame.showLog("VERROUILLÉ : CARTE JAUNE REQUISE !");
                    }
                    return;
                } else if (cell === 12) {
                    window.doomRaycaster.openDoor(mx, my);
                    return;
                } else if (cell === 5) {
                    if (window.doomGame) window.doomGame.setGameState('VICTORY');
                    return;
                }
            }
        }
    }

    shoot() {
        if (this.shootTimer > 0) return;

        const w = this.weapons[this.currentWeapon];

        if (w.ammoType === 'bullets' && this.ammo < w.cost) {
            if (window.doomGame) window.doomGame.showLog("MUNITIONS ÉPUISÉES !");
            return;
        }
        if (w.ammoType === 'rockets' && this.rockets < w.cost) {
            if (window.doomGame) window.doomGame.showLog("PLUS DE ROQUETTES !");
            return;
        }
        if (w.ammoType === 'plasma' && this.plasma < w.cost) {
            if (window.doomGame) window.doomGame.showLog("CELLULES PLASMA VIDES !");
            return;
        }

        if (w.ammoType === 'bullets') this.ammo -= w.cost;
        if (w.ammoType === 'rockets') this.rockets -= w.cost;
        if (w.ammoType === 'plasma') this.plasma -= w.cost;

        this.shootTimer = w.cooldown;

        if (window.doomAudio) {
            if (this.currentWeapon === 1) window.doomAudio.playSFX('chainsaw');
            else if (this.currentWeapon === 2) window.doomAudio.playSFX('shotgun');
            else if (this.currentWeapon === 3) window.doomAudio.playSFX('chaingun');
            else if (this.currentWeapon === 4) {
                window.doomAudio.playSFX('shotgun');
                if (window.doomRaycaster) {
                    // Spawn de la roquette à 0.8 bloc en avant avec marqueur 'player_rocket' pour éviter de toucher le joueur au tir
                    window.doomRaycaster.projectiles.push({
                        type: 'player_rocket',
                        x: this.x + Math.cos(this.angle) * 0.8,
                        y: this.y + Math.sin(this.angle) * 0.8,
                        vx: Math.cos(this.angle) * 8.5,
                        vy: Math.sin(this.angle) * 8.5,
                        damage: 220,
                        life: 4.0
                    });
                }
            } else if (this.currentWeapon === 5) {
                window.doomAudio.playSFX('bfg_charge');
                setTimeout(() => {
                    if (window.doomAudio) window.doomAudio.playSFX('bfg_boom');
                }, 350);
            }
        }

        if (window.doomRaycaster && this.currentWeapon !== 4) {
            window.doomRaycaster.processPlayerShot(this, w);
        }

        if (window.doomGame) window.doomGame.updateHUD();
    }

    takeDamage(amount) {
        let absorbed = 0;
        if (this.armor > 0) {
            absorbed = Math.min(this.armor, amount * 0.6);
            this.armor -= absorbed;
        }
        const effectiveDamage = amount - absorbed;
        this.health -= effectiveDamage;
        this.damageFlashTimer = 0.25;

        if (window.doomAudio) window.doomAudio.playSFX('player_hurt');

        if (this.health <= 0) {
            this.health = 0;
            if (window.doomGame) window.doomGame.setGameState('GAMEOVER');
        }

        if (window.doomGame) window.doomGame.updateHUD();
    }

    update(dt) {
        if (this.shootTimer > 0) this.shootTimer -= dt;

        if (this.keys.shoot && this.currentWeapon === 3) {
            this.shoot();
        }

        if (this.radsuitTimer > 0) {
            this.radsuitTimer -= dt;
            if (this.radsuitTimer <= 0 && window.doomGame) {
                window.doomGame.showLog("COMBINAISON ANTI-RADIATION DÉCHARGÉE !");
            }
        }

        if (window.doomRaycaster) {
            const currentTile = window.doomRaycaster.getMapCell(this.x, this.y);
            if (currentTile === 10 && this.radsuitTimer <= 0) {
                this.takeDamage(18 * dt);
            } else if (currentTile === 11 && this.radsuitTimer <= 0) {
                this.takeDamage(45 * dt);
            }
        }

        if (this.keys.turnLeft) this.angle -= this.rotSpeed * dt;
        if (this.keys.turnRight) this.angle += this.rotSpeed * dt;

        const currentSpeed = (this.keys.sprint ? this.speed * 1.55 : this.speed) * dt;
        let moveX = 0;
        let moveY = 0;

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        if (this.keys.forward) { moveX += cos; moveY += sin; }
        if (this.keys.backward) { moveX -= cos; moveY -= sin; }
        if (this.keys.strafeLeft) { moveX += sin; moveY -= cos; }
        if (this.keys.strafeRight) { moveX -= sin; moveY += cos; }

        const len = Math.hypot(moveX, moveY);
        if (len > 0) {
            moveX = (moveX / len) * currentSpeed;
            moveY = (moveY / len) * currentSpeed;
            this.weaponBob += dt * 14;

            const isPassable = (x, y) => {
                if (!window.doomRaycaster) return true;
                const cell = window.doomRaycaster.getMapCell(x, y);
                return (cell === 0 || cell === 10 || cell === 11 || cell === 13 || cell === 15);
            };

            const r = this.radius;

            const targetX = this.x + moveX;
            const targetY = this.y + moveY;

            if (isPassable(targetX + Math.sign(moveX) * r, this.y)) {
                this.x = targetX;
            }
            if (isPassable(this.x, targetY + Math.sign(moveY) * r)) {
                this.y = targetY;
            }
        }
    }
}

window.DoomPlayer = DoomPlayer;
