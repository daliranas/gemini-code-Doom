/**
 * DOOM IA - Moteur Raycasting Haute Fidélité (Map Unique 64x64)
 * - Correction boucle textures : double boucle for(y) for(x) rétablie
 * - 4 Boss de zones avec barres de vie aérées
 * - Ligne de vue stricte (Line of Sight)
 */

class DoomRaycaster {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });

        this.width = 320;
        this.height = 200;
        this.halfHeight = this.height / 2;
        this.texSize = 128;
        this.fov = Math.PI / 3;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.imgData = this.ctx.createImageData(this.width, this.height);
        this.pixelBuf = new Uint32Array(this.imgData.data.buffer);
        this.zBuffer = new Float32Array(this.width);

        this.enableLighting = true;
        this.enableSkybox = true;
        this.enableMelt = true;
        this.showMinimap = true;

        this.currentFloor = 1;
        this.maxFloors = 1;
        this.secretsFound = 0;
        this.totalSecrets = 4;

        this.animatedDoors = {};

        this.isMelting = false;
        this.meltColumns = new Int32Array(this.width);
        this.prevFrameBuf = new Uint32Array(this.width * this.height);
        this.meltDone = false;

        this.mapWidth = 64;
        this.mapHeight = 64;

        this.map = this.generateUnifiedWorldMap();
        this.textures = {};
        this.sprites = [];
        this.projectiles = [];
        this.remotePlayers = {};

        this.generateUltraHDTextures();
    }

    colorRGBA(r, g, b, a = 255) {
        return (a << 24) | (b << 16) | (g << 8) | r;
    }

    setResolution(w, h) {
        this.width = w;
        this.height = h;
        this.halfHeight = h / 2;
        this.canvas.width = w;
        this.canvas.height = h;
        this.imgData = this.ctx.createImageData(w, h);
        this.pixelBuf = new Uint32Array(this.imgData.data.buffer);
        this.zBuffer = new Float32Array(w);
        this.meltColumns = new Int32Array(w);
        this.prevFrameBuf = new Uint32Array(w * h);
    }

    startMeltTransition() {
        if (!this.enableMelt) return;
        this.isMelting = true;
        for (let i = 0; i < this.pixelBuf.length; i++) {
            this.prevFrameBuf[i] = this.pixelBuf[i];
        }
        for (let x = 0; x < this.width; x++) {
            this.meltColumns[x] = -Math.floor(Math.random() * (this.height / 5));
        }
    }

    updateMelt(dt) {
        if (!this.isMelting) return;

        let allDown = true;
        const speed = Math.floor(dt * this.height * 1.8);

        for (let x = 0; x < this.width; x++) {
            if (this.meltColumns[x] < this.height) {
                this.meltColumns[x] += Math.max(3, Math.floor(Math.random() * speed));
                allDown = false;
            }
        }

        if (allDown) {
            this.isMelting = false;
        }
    }

    isOutdoor(x, y) {
        const mx = Math.floor(x);
        const my = Math.floor(y);
        return (mx >= 17 && mx <= 62 && my >= 1 && my <= 26);
    }

    generateUnifiedWorldMap() {
        const W = 64, H = 64;
        const m = new Array(W * H).fill(0);
        const setM = (x, y, v) => {
            if (x >= 0 && x < W && y >= 0 && y < H) {
                m[y * W + x] = v;
            }
        };

        for (let i = 0; i < W; i++) {
            setM(i, 0, 1); setM(i, H - 1, 4);
            setM(0, i, 1); setM(W - 1, i, 4);
        }

        // 1. COMPLEXE UAC (Nord-Ouest : 1-16)
        for (let y = 1; y <= 16; y++) {
            for (let x = 1; x <= 16; x++) {
                if (x === 16 && y !== 7 && y !== 8 && y !== 9) setM(x, y, 2);
                if (y === 16 && x !== 7 && x !== 8 && x !== 9) setM(x, y, 2);
            }
        }
        setM(7, 10, 15); setM(8, 10, 15); setM(9, 10, 15);
        setM(7, 11, 15); setM(8, 11, 15); setM(9, 11, 15);

        setM(16, 7, 6); setM(16, 8, 6); setM(16, 9, 6);
        setM(7, 16, 15); setM(8, 16, 15); setM(9, 16, 15);

        setM(1, 8, 12);
        setM(0, 8, 0);

        // 2. GRANDE COUR EXTÉRIEURE (Nord-Est : 17-62)
        for (let x = 17; x < 63; x++) {
            if (x !== 37 && x !== 38 && x !== 39 && x !== 49 && x !== 50 && x !== 51) {
                setM(x, 26, 2);
            }
        }
        setM(37, 24, 15); setM(38, 24, 15); setM(39, 24, 15);
        setM(37, 25, 15); setM(38, 25, 15); setM(39, 25, 15);
        setM(37, 26, 7); setM(38, 26, 7); setM(39, 26, 7);

        setM(49, 24, 15); setM(50, 24, 15); setM(51, 24, 15);
        setM(49, 25, 15); setM(50, 25, 15); setM(51, 25, 15);
        setM(49, 26, 15); setM(50, 26, 15); setM(51, 26, 15);

        setM(28, 8, 1); setM(28, 18, 1);
        setM(46, 8, 1); setM(46, 18, 1);

        for (let y = 10; y <= 16; y++) {
            for (let x = 32; x <= 42; x++) {
                setM(x, y, 10);
            }
        }
        setM(37, 13, 13);
        setM(62, 12, 12);

        // 3. GALERIE CENTRALE
        for (let x = 1; x < 63; x++) {
            if (x !== 11 && x !== 12 && x !== 13 && x !== 47 && x !== 48 && x !== 49) {
                setM(x, 34, 14);
            }
        }
        for (let y = 30; y <= 34; y++) {
            setM(11, y, 15); setM(12, y, 15); setM(13, y, 15);
        }
        setM(47, 34, 8); setM(48, 34, 8); setM(49, 34, 8);

        // 4. CAVERNES MINÉRALES
        for (let y = 35; y < 63; y++) {
            for (let x = 1; x < 33; x++) {
                const caveNoise = ((x * 17) ^ (y * 23)) % 11;
                if ((caveNoise === 0 || (x % 5 === 0 && y % 5 === 0)) && (x !== 20 || y !== 50)) {
                    setM(x, y, 14);
                }
            }
        }
        setM(18, 42, 15); setM(19, 42, 15); setM(20, 42, 15);

        for (let y = 44; y <= 52; y++) {
            for (let x = 8; x <= 18; x++) {
                setM(x, y, 11);
            }
        }

        for (let y = 35; y < 63; y++) {
            if (y !== 47 && y !== 48 && y !== 49) setM(33, y, 14);
        }
        setM(33, 47, 9); setM(33, 48, 9); setM(33, 49, 9);

        // 5. SANCTUAIRE DU BOSS FINAL
        for (let y = 35; y < 63; y++) {
            for (let x = 34; x < 63; x++) {
                const dBossCenter = Math.hypot(x - 48, y - 48);
                if (dBossCenter > 10 && dBossCenter < 12.5 && y > 38) {
                    setM(x, y, 4);
                } else if (dBossCenter > 13.5 && dBossCenter < 15.5 && y > 38) {
                    setM(x, y, 11);
                }
            }
        }
        for (let y = 36; y <= 38; y++) {
            setM(47, y, 15); setM(48, y, 15); setM(49, y, 15);
        }
        setM(48, 58, 5);

        return m;
    }

    getMapCell(x, y) {
        const mx = Math.floor(x);
        const my = Math.floor(y);
        if (mx < 0 || mx >= this.mapWidth || my < 0 || my >= this.mapHeight) return 1;
        return this.map[my * this.mapWidth + mx];
    }

    openDoor(mx, my) {
        if (mx >= 0 && mx < this.mapWidth && my >= 0 && my < this.mapHeight) {
            const cell = this.map[my * this.mapWidth + mx];
            if (cell === 12) {
                this.secretsFound++;
                if (window.doomGame) {
                    window.doomGame.showLog(`🏆 SECRET DÉCOUVERT ! (${this.secretsFound}/${this.totalSecrets})`);
                    if (window.doomAudio) window.doomAudio.playSFX('key_pickup');
                }
                this.map[my * this.mapWidth + mx] = 0;
            } else if (cell === 6 || cell === 7 || cell === 8 || cell === 9) {
                this.map[my * this.mapWidth + mx] = 0;

                const key = `${mx}_${my}`;
                this.animatedDoors[key] = {
                    mx, my, type: cell,
                    offset: 0.0,
                    state: 'opening'
                };
                if (window.doomAudio) window.doomAudio.playSFX('door_open');
            }
        }
    }

    updateDoors(dt) {
        Object.keys(this.animatedDoors).forEach(k => {
            const d = this.animatedDoors[k];
            if (d.state === 'opening') {
                d.offset += dt * 2.0;
                if (d.offset >= 1.0) {
                    d.offset = 1.0;
                    d.state = 'open';
                    delete this.animatedDoors[k];
                }
            }
        });
    }

    generateUltraHDTextures() {
        const S = this.texSize;
        this.textures = {
            1: new Uint32Array(S * S),
            2: new Uint32Array(S * S),
            3: new Uint32Array(S * S),
            4: new Uint32Array(S * S),
            5: new Uint32Array(S * S),
            6: new Uint32Array(S * S),
            7: new Uint32Array(S * S),
            8: new Uint32Array(S * S),
            9: new Uint32Array(S * S),
            12: new Uint32Array(S * S),
            14: new Uint32Array(S * S),
            15: new Uint32Array(S * S),
            floor_tile: new Uint32Array(S * S),
            floor_cave: new Uint32Array(S * S),
            floor_slime: new Uint32Array(S * S),
            floor_lava: new Uint32Array(S * S),
            ceiling_tile: new Uint32Array(S * S),
            sky: new Uint32Array(1024 * 512),
            zombieman_idle: new Uint32Array(S * S),
            zombieman_die: new Uint32Array(S * S),
            imp_idle: new Uint32Array(S * S),
            imp_walk: new Uint32Array(S * S),
            imp_die: new Uint32Array(S * S),
            caco_idle: new Uint32Array(S * S),
            caco_die: new Uint32Array(S * S),
            baron_idle: new Uint32Array(S * S),
            baron_die: new Uint32Array(S * S),
            cyber_idle: new Uint32Array(S * S),
            cyber_die: new Uint32Array(S * S),
            spider_idle: new Uint32Array(S * S),
            spider_die: new Uint32Array(S * S),
            lostsoul_idle: new Uint32Array(S * S),
            lostsoul_die: new Uint32Array(S * S),
            gibs: new Uint32Array(S * S),
            fireball: new Uint32Array(S * S),
            rocket: new Uint32Array(S * S),
            barrel: new Uint32Array(S * S),
            radsuit: new Uint32Array(S * S),
            lore_pad: new Uint32Array(S * S),
            medkit: new Uint32Array(S * S),
            ammo_box: new Uint32Array(S * S),
            plasma_pack: new Uint32Array(S * S),
            key_blue: new Uint32Array(S * S),
            key_red: new Uint32Array(S * S),
            key_yellow: new Uint32Array(S * S),
            other_player: new Uint32Array(S * S)
        };

        // 1. CIEL HD
        for (let y = 0; y < 512; y++) {
            for (let x = 0; x < 1024; x++) {
                const skyGrad = y / 512;
                let r = Math.floor(130 * (1 - skyGrad) + 35);
                let g = Math.floor(18 * (1 - skyGrad));
                let b = Math.floor(30 * (1 - skyGrad));

                if (y < 200 && ((x * 37) ^ (y * 53)) % 401 === 0) {
                    r = 255; g = 230; b = 180;
                }

                const mountain1 = 300 + Math.sin(x / 45) * 45 + Math.cos(x / 20) * 18;
                const mountain2 = 360 + Math.sin(x / 25) * 30 + Math.cos(x / 12) * 12;
                if (y > mountain1) { r = 35; g = 10; b = 15; }
                if (y > mountain2) { r = 18; g = 5; b = 8; }

                const dMoon = Math.hypot(x - 300, y - 140);
                if (dMoon < 45) {
                    const moonNoise = ((x ^ y) % 11) * 3;
                    r = 255; g = 140 + moonNoise; b = 40;
                } else if (dMoon < 52) {
                    r = 180; g = 60; b = 20;
                }

                this.textures.sky[y * 1024 + x] = this.colorRGBA(r, g, b);
            }
        }

        // 2. TEXTURES MURS ET SOLS
        for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
                const brickH = 32; const brickW = 64;
                const row = Math.floor(y / brickH);
                const localX = (x + (row % 2 === 1 ? brickW / 2 : 0)) % brickW;
                const localY = y % brickH;
                const isBorder = (localX < 2 || localY < 2);
                const isHighlight = (localX === 2 || localY === 2);

                if (isBorder) this.textures[1][y * S + x] = this.colorRGBA(22, 10, 10);
                else if (isHighlight) this.textures[1][y * S + x] = this.colorRGBA(195, 70, 50);
                else {
                    const noise = ((x * 17) ^ (y * 29)) % 24;
                    this.textures[1][y * S + x] = this.colorRGBA(135 + noise, 40 + noise / 2, 32);
                }

                const isPanelBorder = (x < 3 || x > 124 || y < 3 || y > 124 || Math.abs(x - 64) < 2 || Math.abs(y - 64) < 2);
                const isRivet = ((x >= 8 && x <= 12) || (x >= 52 && x <= 56) || (x >= 72 && x <= 76) || (x >= 116 && x <= 120)) &&
                                ((y >= 8 && y <= 12) || (y >= 52 && y <= 56) || (y >= 72 && y <= 76) || (y >= 116 && y <= 120));
                const isCenterPipe = (x >= 58 && x <= 70);

                if (isRivet) this.textures[2][y * S + x] = this.colorRGBA(255, 240, 160);
                else if (isCenterPipe) {
                    const pipeGlow = Math.floor(Math.sin((x - 58) / 12 * Math.PI) * 120);
                    this.textures[2][y * S + x] = this.colorRGBA(30, 120 + pipeGlow, 180 + pipeGlow / 2);
                } else if (isPanelBorder) this.textures[2][y * S + x] = this.colorRGBA(20, 24, 28);
                else {
                    const steelGrain = ((x * 19) ^ (y * 23)) % 15;
                    this.textures[2][y * S + x] = this.colorRGBA(115 + steelGrain, 122 + steelGrain, 128 + steelGrain);
                }

                const stoneCrack = ((x * 13) ^ (y * 17)) % 31 === 0;
                const mossArea = (y > 90 && ((x * y) % 11 === 0));
                if (stoneCrack) this.textures[3][y * S + x] = this.colorRGBA(15, 12, 18);
                else if (mossArea) this.textures[3][y * S + x] = this.colorRGBA(25, 95, 30);
                else {
                    const grain = ((x * 11) ^ (y * 7)) % 22;
                    this.textures[3][y * S + x] = this.colorRGBA(75 + grain, 78 + grain, 72 + grain);
                }

                const dCenterRune = Math.hypot(x - 64, y - 64);
                const isPentagram = Math.abs(dCenterRune - 38) < 4 || (Math.abs(x - 64) < 3 && y > 24 && y < 104) || (Math.abs(y - 64) < 3 && x > 24 && x < 104);
                if (isPentagram) this.textures[4][y * S + x] = this.colorRGBA(255, 60, 10);
                else {
                    const lavaVein = ((x * 5) ^ (y * 9)) % 37 === 0;
                    this.textures[4][y * S + x] = lavaVein ? this.colorRGBA(230, 40, 0) : this.colorRGBA(45 + ((x * y) % 25), 15, 22);
                }

                const isGridBeam = (x % 16 < 2 || y % 16 < 2);
                this.textures[5][y * S + x] = isGridBeam ? this.colorRGBA(0, 240, 255) : this.colorRGBA(10, 50, 110);

                const rockNoise = Math.sin(x / 8) * Math.cos(y / 8) + ((x ^ y) % 19) / 19;
                const isCrystalVein = (Math.abs(x - y * 0.8) < 3 || Math.abs(x + y * 0.6 - 100) < 3);
                if (isCrystalVein) {
                    this.textures[14][y * S + x] = this.colorRGBA(0, 255, 210);
                } else {
                    const rBase = Math.floor(55 + rockNoise * 20);
                    const gBase = Math.floor(45 + rockNoise * 15);
                    const bBase = Math.floor(40 + rockNoise * 15);
                    this.textures[14][y * S + x] = this.colorRGBA(rBase, gBase, bBase);
                }

                const stepIndex = Math.floor(y / 16);
                const stepLocalY = y % 16;
                const isStepEdge = stepLocalY === 0 || stepLocalY === 1;
                const isStepShadow = stepLocalY === 15;
                if (isStepEdge) this.textures[15][y * S + x] = this.colorRGBA(240, 240, 250);
                else if (isStepShadow) this.textures[15][y * S + x] = this.colorRGBA(15, 15, 20);
                else {
                    const stepGrad = stepIndex * 8;
                    this.textures[15][y * S + x] = this.colorRGBA(70 + stepGrad, 72 + stepGrad, 80 + stepGrad);
                }

                const isHydraulicPiston = (x >= 12 && x <= 24) || (x >= 104 && x <= 116);
                const isHazardStripe = (y < 20 || y > 108) && ((x + y) % 24 < 12);
                const isLockPanel = (x >= 44 && x <= 84 && y >= 44 && y <= 84);
                const isKeyLight = (x >= 54 && x <= 74 && y >= 54 && y <= 74);

                if (isHazardStripe) this.textures[6][y * S + x] = this.colorRGBA(240, 190, 20);
                else if (isHydraulicPiston) this.textures[6][y * S + x] = this.colorRGBA(160, 165, 175);
                else if (isLockPanel) this.textures[6][y * S + x] = this.colorRGBA(30, 35, 40);
                else this.textures[6][y * S + x] = this.colorRGBA(90, 95, 102);

                if (isKeyLight) this.textures[7][y * S + x] = this.colorRGBA(0, 220, 255);
                else if (isHazardStripe) this.textures[7][y * S + x] = this.colorRGBA(0, 120, 220);
                else this.textures[7][y * S + x] = isHydraulicPiston ? this.colorRGBA(140, 150, 180) : this.colorRGBA(40, 55, 95);

                if (isKeyLight) this.textures[8][y * S + x] = this.colorRGBA(255, 30, 30);
                else if (isHazardStripe) this.textures[8][y * S + x] = this.colorRGBA(220, 30, 30);
                else this.textures[8][y * S + x] = isHydraulicPiston ? this.colorRGBA(180, 140, 140) : this.colorRGBA(95, 40, 40);

                if (isKeyLight) this.textures[9][y * S + x] = this.colorRGBA(255, 230, 0);
                else if (isHazardStripe) this.textures[9][y * S + x] = this.colorRGBA(230, 190, 0);
                else this.textures[9][y * S + x] = isHydraulicPiston ? this.colorRGBA(180, 175, 140) : this.colorRGBA(95, 88, 35);

                const isCrackLine = (Math.abs(x - y) < 4 || Math.abs(x + y - 128) < 4);
                this.textures[12][y * S + x] = isCrackLine ? this.colorRGBA(255, 210, 20) : this.textures[1][y * S + x];

                const isFloorJoint = (x % 32 < 2 || y % 32 < 2);
                this.textures.floor_tile[y * S + x] = isFloorJoint ? this.colorRGBA(25, 20, 20) : this.colorRGBA(60 + ((x ^ y) % 15), 45 + ((x ^ y) % 12), 40);
                this.textures.floor_cave[y * S + x] = this.colorRGBA(42 + ((x * y) % 12), 34 + ((x * y) % 8), 28);

                const slimeBubble = Math.sin(x / 8) * Math.cos(y / 8);
                this.textures.floor_slime[y * S + x] = this.colorRGBA(20, Math.floor(180 + slimeBubble * 60), 30);

                const lavaBubble = Math.sin(x / 6) * Math.cos(y / 6);
                this.textures.floor_lava[y * S + x] = this.colorRGBA(Math.floor(220 + lavaBubble * 35), 40, 15);

                const isCeilJoint = (x % 16 === 0 || y % 16 === 0);
                this.textures.ceiling_tile[y * S + x] = isCeilJoint ? this.colorRGBA(15, 15, 15) : this.colorRGBA(35, 30, 32);
            }
        }

        // 3. SPRITES AVEC LES 4 BOSS PAR ZONE (Double boucle for(y) for(x))
        for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
                const isBaronHead = Math.hypot(x - 64, y - 30) < 22;
                const isBaronHorns = (y >= 6 && y <= 34 && (Math.abs(x - 36) < 8 || Math.abs(x - 92) < 8));
                const isBaronEyes = (y >= 26 && y <= 32 && (x >= 52 && x <= 58 || x >= 70 && x <= 76));
                const isBaronTorso = (x >= 32 && x <= 96 && y >= 44 && y <= 90);
                const isBaronLegs = (x >= 38 && x <= 90 && y >= 90 && y <= 124);

                let baron = 0;
                if (isBaronEyes) baron = this.colorRGBA(0, 255, 100);
                else if (isBaronHorns) baron = this.colorRGBA(35, 35, 40);
                else if (isBaronHead || isBaronTorso) baron = this.colorRGBA(210, 100, 95);
                else if (isBaronLegs) baron = this.colorRGBA(85, 55, 40);
                this.textures.baron_idle[y * S + x] = baron;
                this.textures.baron_die[y * S + x] = (y > 90) ? this.colorRGBA(190, 15, 15) : 0;

                const isBrain = Math.hypot(x - 64, y - 40) < 32 && y < 58;
                const isBrainVeins = isBrain && ((x * 7) ^ (y * 11)) % 13 === 0;
                const isSpiderEyes = (y >= 38 && y <= 44 && (x >= 44 && x <= 50 || x >= 78 && x <= 84));
                const isGatlingGun = (x >= 52 && x <= 76 && y >= 56 && y <= 94);
                const isCyberLegs = (y >= 70 && y <= 124 && (Math.abs(x - 20) < 8 || Math.abs(x - 108) < 8 || Math.abs(x - 40) < 6 || Math.abs(x - 88) < 6));

                let spider = 0;
                if (isSpiderEyes) spider = this.colorRGBA(255, 0, 0);
                else if (isBrainVeins) spider = this.colorRGBA(160, 20, 20);
                else if (isBrain) spider = this.colorRGBA(220, 160, 160);
                else if (isGatlingGun) spider = (x % 4 === 0) ? this.colorRGBA(30, 30, 30) : this.colorRGBA(110, 115, 120);
                else if (isCyberLegs) spider = this.colorRGBA(140, 145, 150);
                this.textures.spider_idle[y * S + x] = spider;
                this.textures.spider_die[y * S + x] = (y > 90) ? this.colorRGBA(180, 20, 20) : 0;

                const isCyHead = Math.hypot(x - 64, y - 32) < 26;
                const isCyHorns = (y >= 8 && y <= 44 && (Math.abs(x - 28) < 10 || Math.abs(x - 100) < 10));
                const isCyEyes = (y >= 28 && y <= 34 && (x >= 50 && x <= 58 || x >= 70 && x <= 78));
                const isCyTorso = (x >= 28 && x <= 100 && y >= 48 && y <= 96);
                const isCyGunArm = (x >= 12 && x <= 32 && y >= 56 && y <= 96);
                const isCyLegs = (x >= 36 && x <= 92 && y >= 96 && y <= 124);

                let cyber = 0;
                if (isCyEyes) cyber = this.colorRGBA(255, 230, 0);
                else if (isCyHorns) cyber = this.colorRGBA(220, 210, 180);
                else if (isCyGunArm) cyber = this.colorRGBA(70, 75, 80);
                else if (isCyHead || isCyTorso || isCyLegs) cyber = this.colorRGBA(190 + (x % 10), 80, 80);
                this.textures.cyber_idle[y * S + x] = cyber;
                this.textures.cyber_die[y * S + x] = (y > 92) ? this.colorRGBA(180, 10, 10) : 0;

                const dCaco = Math.hypot(x - 64, y - 60);
                const isCacoEye = Math.hypot(x - 64, y - 48) < 14;
                const isCacoPupil = Math.hypot(x - 64, y - 48) < 6;
                const isCacoMouth = (y >= 72 && y <= 88 && Math.abs(x - 64) < 28);
                const isCacoHorns = (y >= 16 && y <= 36 && (Math.abs(x - 40) < 6 || Math.abs(x - 88) < 6));

                let caco = 0;
                if (isCacoPupil) caco = this.colorRGBA(0, 0, 0);
                else if (isCacoEye) caco = this.colorRGBA(0, 255, 120);
                else if (isCacoMouth) caco = (x % 8 === 0) ? this.colorRGBA(245, 245, 245) : this.colorRGBA(120, 0, 0);
                else if (isCacoHorns) caco = this.colorRGBA(180, 180, 190);
                else if (dCaco < 44) caco = this.colorRGBA(200 + ((x * y) % 30), 25, 25);
                this.textures.caco_idle[y * S + x] = caco;
                this.textures.caco_die[y * S + x] = (y > 92) ? this.colorRGBA(180, 10, 10) : 0;

                const isZombieHelmet = Math.hypot(x - 64, y - 28) < 16;
                const isZombieEyes = (y >= 26 && y <= 30 && (x >= 56 && x <= 60 || x >= 68 && x <= 72));
                const isZombieArmor = (x >= 44 && x <= 84 && y >= 40 && y <= 76);
                const isRifle = (x >= 32 && x <= 54 && y >= 52 && y <= 72);
                const isZombieLegs = (x >= 48 && x <= 80 && y >= 76 && y <= 118);

                let zomb = 0;
                if (isZombieEyes) zomb = this.colorRGBA(255, 220, 0);
                else if (isRifle) zomb = this.colorRGBA(20, 20, 20);
                else if (isZombieArmor) zomb = this.colorRGBA(50, 110, 60);
                else if (isZombieHelmet || isZombieLegs) zomb = this.colorRGBA(120, 100, 70);
                this.textures.zombieman_idle[y * S + x] = zomb;
                this.textures.zombieman_die[y * S + x] = (y > 94) ? this.colorRGBA(180, 10, 10) : 0;

                const impHead = Math.hypot(x - 64, y - 36) < 22;
                const impHorn = (x >= 40 && x <= 48 && y >= 14 && y <= 32) || (x >= 80 && x <= 88 && y >= 14 && y <= 32);
                const impEyes = (y >= 32 && y <= 38) && ((x >= 52 && x <= 58) || (x >= 70 && x <= 76));
                const impBody = (x >= 40 && x <= 88 && y >= 48 && y <= 90);
                const impArm = (x >= 20 && x <= 38 && y >= 52 && y <= 84) || (x >= 90 && x <= 108 && y >= 52 && y <= 84);
                const impLeg = (x >= 36 && x <= 54 && y >= 90 && y <= 120) || (x >= 74 && x <= 92 && y >= 90 && y <= 120);

                let imp = 0;
                if (impEyes) imp = this.colorRGBA(255, 30, 0);
                else if (impHorn) imp = this.colorRGBA(190, 180, 160);
                else if (impHead || impBody || impArm || impLeg) imp = this.colorRGBA(140 + ((x ^ y) % 8) * 6, 70, 45);
                this.textures.imp_idle[y * S + x] = imp;
                this.textures.imp_walk[y * S + x] = imp;
                this.textures.imp_die[y * S + x] = (y > 92) ? this.colorRGBA(130, 15, 15) : 0;

                let med = 0;
                if (x >= 28 && x <= 100 && y >= 36 && y <= 108) {
                    const isCross = (x >= 56 && x <= 72 && y >= 48 && y <= 96) || (x >= 40 && x <= 88 && y >= 64 && y <= 80);
                    const isShadow = (y >= 104 || x >= 96);
                    if (isCross) med = this.colorRGBA(230, 20, 20);
                    else if (isShadow) med = this.colorRGBA(180, 180, 190);
                    else med = this.colorRGBA(245, 245, 250);
                }
                this.textures.medkit[y * S + x] = med;

                let ab = 0;
                if (x >= 24 && x <= 104 && y >= 44 && y <= 112) {
                    const isLatch = (x >= 56 && x <= 72 && y >= 64 && y <= 80);
                    const isBulletTip = (y >= 50 && y <= 58 && x % 8 < 5);
                    if (isBulletTip) ab = this.colorRGBA(255, 215, 0);
                    else if (isLatch) ab = this.colorRGBA(220, 220, 220);
                    else ab = this.colorRGBA(35, 75, 40);
                }
                this.textures.ammo_box[y * S + x] = ab;

                let pp = 0;
                if (x >= 32 && x <= 96 && y >= 40 && y <= 112) {
                    const isCore = (x >= 48 && x <= 80 && y >= 52 && y <= 98);
                    pp = isCore ? this.colorRGBA(0, 255, 140) : this.colorRGBA(20, 60, 45);
                }
                this.textures.plasma_pack[y * S + x] = pp;

                const isCard = (x >= 44 && x <= 84 && y >= 52 && y <= 100);
                const isChip = (x >= 56 && x <= 72 && y >= 64 && y <= 80);
                this.textures.key_blue[y * S + x] = isChip ? this.colorRGBA(255, 255, 255) : (isCard ? this.colorRGBA(0, 150, 255) : 0);
                this.textures.key_red[y * S + x] = isChip ? this.colorRGBA(255, 255, 255) : (isCard ? this.colorRGBA(255, 30, 30) : 0);
                this.textures.key_yellow[y * S + x] = isChip ? this.colorRGBA(255, 255, 255) : (isCard ? this.colorRGBA(255, 220, 0) : 0);

                const dSkull = Math.hypot(x - 64, y - 64);
                const isFlame = dSkull < 52 && dSkull > 26;
                const isBone = dSkull <= 26;
                const isEyes = (y >= 52 && y <= 60 && (x >= 50 && x <= 58 || x >= 70 && x <= 78));
                const isTeeth = (y >= 76 && y <= 84 && Math.abs(x - 64) < 16);

                let ls = 0;
                if (isEyes) ls = this.colorRGBA(255, 255, 0);
                else if (isTeeth) ls = this.colorRGBA(245, 245, 245);
                else if (isBone) ls = this.colorRGBA(225, 220, 205);
                else if (isFlame) ls = ((x + y) % 3 === 0) ? this.colorRGBA(255, 140, 0) : this.colorRGBA(240, 30, 0);
                this.textures.lostsoul_idle[y * S + x] = ls;
                this.textures.lostsoul_die[y * S + x] = (y > 80) ? this.colorRGBA(220, 15, 15) : 0;

                let gib = 0;
                if (y >= 80 && y <= 124 && x >= 8 && x <= 120) {
                    gib = ((x ^ y) % 5 === 0) ? this.colorRGBA(180, 10, 10) : this.colorRGBA(230, 20, 20);
                }
                this.textures.gibs[y * S + x] = gib;

                const dFire = Math.hypot(x - 64, y - 64);
                let fire = 0;
                if (dFire < 36) {
                    if (dFire < 14) fire = this.colorRGBA(255, 255, 220);
                    else if (dFire < 26) fire = this.colorRGBA(255, 160, 0);
                    else fire = this.colorRGBA(240, 40, 0);
                }
                this.textures.fireball[y * S + x] = fire;

                let rk = 0;
                if (x >= 48 && x <= 80 && y >= 32 && y <= 96) {
                    const isTip = (y <= 48 && Math.abs(x - 64) <= (48 - y) * 2);
                    const isFlameR = (y >= 88);
                    if (isFlameR) rk = this.colorRGBA(255, 120, 0);
                    else if (isTip) rk = this.colorRGBA(220, 30, 30);
                    else rk = this.colorRGBA(75, 80, 85);
                }
                this.textures.rocket[y * S + x] = rk;

                let rad = 0;
                if (x >= 36 && x <= 92 && y >= 32 && y <= 108) {
                    const isVisor = (y >= 40 && y <= 52 && x >= 52 && x <= 76);
                    rad = isVisor ? this.colorRGBA(0, 255, 120) : this.colorRGBA(240, 240, 245);
                }
                this.textures.radsuit[y * S + x] = rad;

                let pad = 0;
                if (x >= 40 && x <= 88 && y >= 44 && y <= 100) {
                    const isScreen = (x >= 48 && x <= 80 && y >= 52 && y <= 88);
                    pad = isScreen ? this.colorRGBA(0, 230, 255) : this.colorRGBA(40, 45, 50);
                }
                this.textures.lore_pad[y * S + x] = pad;

                let bar = 0;
                if (x >= 36 && x <= 92 && y >= 44 && y <= 116) {
                    const isToxicSlime = (y >= 44 && y <= 56 && x >= 48 && x <= 80);
                    if (isToxicSlime) bar = this.colorRGBA(40, 255, 40);
                    else if (y === 64 || y === 92 || x === 36 || x === 92) bar = this.colorRGBA(20, 20, 20);
                    else bar = this.colorRGBA(125, 130, 135);
                }
                this.textures.barrel[y * S + x] = bar;
            }
        }
    }

    resetEntities(difficulty = 'easy') {
        const mult = (difficulty === 'nightmare') ? 2.0 : (difficulty === 'hard' ? 1.5 : (difficulty === 'normal' ? 1.0 : 0.8));

        this.sprites = [
            // ====================================================
            // ZONE 1 : COMPLEXE UAC (Départ aéré, Baron au fond de la salle)
            // ====================================================
            { type: 'enemy', subType: 'zombieman', x: 13.5, y: 5.5, hp: 30 * mult, maxHp: 30 * mult, speed: 1.1, state: 'patrol', anim: 0, shootCooldown: 1.6, dead: false },
            { type: 'enemy', subType: 'imp', x: 5.5, y: 13.5, hp: 40 * mult, maxHp: 40 * mult, speed: 1.3, state: 'patrol', anim: 0, shootCooldown: 2.0, dead: false },
            { type: 'enemy', subType: 'baron', name: 'LE BARON DE L\'ENFER', isBoss: true, x: 14.5, y: 14.5, hp: 350 * mult, maxHp: 350 * mult, speed: 1.15, state: 'patrol', anim: 0, shootCooldown: 1.8, dead: false },
            { type: 'barrel', x: 14.5, y: 3.5, hp: 15, dead: false },
            { type: 'key_blue', x: 2.5, y: 14.5, taken: false },
            { type: 'item_medkit', x: 2.5, y: 2.5, taken: false },
            { type: 'item_ammo_box', x: 2.5, y: 8.5, taken: false },

            // ====================================================
            // ZONE 2 : GRANDE COUR EXTÉRIEURE
            // ====================================================
            { type: 'enemy', subType: 'caco', name: 'LE CACODÉMON TITAN', isBoss: true, x: 42.5, y: 14.5, hp: 400 * mult, maxHp: 400 * mult, speed: 1.25, state: 'patrol', anim: 0, shootCooldown: 1.6, dead: false },
            { type: 'enemy', subType: 'lostsoul', x: 26.5, y: 8.5, hp: 30 * mult, maxHp: 30 * mult, speed: 2.8, state: 'patrol', anim: 0, shootCooldown: 1.5, dead: false },
            { type: 'enemy', subType: 'zombieman', x: 48.5, y: 14.5, hp: 30 * mult, maxHp: 30 * mult, speed: 1.1, state: 'patrol', anim: 0, shootCooldown: 1.6, dead: false },
            { type: 'barrel', x: 40.5, y: 20.5, hp: 15, dead: false },
            { type: 'item_radsuit', x: 30.5, y: 13.5, taken: false },
            { type: 'key_red', x: 58.5, y: 6.5, taken: false },
            { type: 'item_ammo_box', x: 52.5, y: 22.5, taken: false },

            // ====================================================
            // ZONE 3 : CAVERNES PROFONDES
            // ====================================================
            { type: 'enemy', subType: 'cyber', name: 'LE CYBERDEMON SUPRÊME', isBoss: true, x: 20.5, y: 50.5, hp: 600 * mult, maxHp: 600 * mult, speed: 1.1, state: 'patrol', anim: 0, shootCooldown: 2.0, dead: false },
            { type: 'enemy', subType: 'lostsoul', x: 10.5, y: 40.5, hp: 30 * mult, maxHp: 30 * mult, speed: 2.8, state: 'patrol', anim: 0, shootCooldown: 1.5, dead: false },
            { type: 'enemy', subType: 'imp', x: 22.5, y: 44.5, hp: 40 * mult, maxHp: 40 * mult, speed: 1.3, state: 'patrol', anim: 0, shootCooldown: 2.0, dead: false },
            { type: 'key_yellow', x: 4.5, y: 58.5, taken: false },
            { type: 'item_medkit', x: 26.5, y: 54.5, taken: false },
            { type: 'item_plasma_pack', x: 28.5, y: 38.5, taken: false },

            // ====================================================
            // ZONE 4 : SANCTUAIRE DU BOSS FINAL
            // ====================================================
            { type: 'enemy', subType: 'spider', name: 'LE SPIDER MASTERMIND GÉANT', isBoss: true, x: 48.5, y: 48.5, hp: 800 * mult, maxHp: 800 * mult, speed: 1.25, state: 'patrol', anim: 0, shootCooldown: 0.45, dead: false },
            { type: 'enemy', subType: 'lostsoul', x: 54.5, y: 42.5, hp: 30 * mult, maxHp: 30 * mult, speed: 3.0, state: 'patrol', anim: 0, shootCooldown: 1.2, dead: false },
            { type: 'barrel', x: 44.5, y: 52.5, hp: 15, dead: false },
            { type: 'barrel', x: 52.5, y: 52.5, hp: 15, dead: false },
            { type: 'item_medkit', x: 38.5, y: 56.5, taken: false },
            { type: 'item_ammo_box', x: 58.5, y: 56.5, taken: false },
            { type: 'item_plasma_pack', x: 48.5, y: 40.5, taken: false }
        ];
    }

    hasLineOfSight(x1, y1, x2, y2) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist > 22.0) return false;

        const steps = Math.ceil(dist * 16);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const cx = x1 + (x2 - x1) * t;
            const cy = y1 + (y2 - y1) * t;
            const cell = this.getMapCell(cx, cy);

            if (cell > 0 && cell !== 10 && cell !== 11 && cell !== 13 && cell !== 15) {
                return false;
            }
        }
        return true;
    }

    processPlayerShot(player, weapon) {
        let hit = false;
        this.sprites.forEach(s => {
            if ((s.type === 'enemy' || s.type === 'barrel') && !s.dead) {
                const dx = s.x - player.x;
                const dy = s.y - player.y;
                const dist = Math.hypot(dx, dy);
                const enemyAngle = Math.atan2(dy, dx) - player.angle;
                const normAngle = Math.atan2(Math.sin(enemyAngle), Math.cos(enemyAngle));

                const cone = weapon.ammoType === 'plasma' ? 0.45 : (player.currentWeapon === 2 ? 0.35 : 0.22);

                if (Math.abs(normAngle) < cone && dist <= weapon.range) {
                    if (this.hasLineOfSight(player.x, player.y, s.x, s.y)) {
                        const isGibKill = (player.currentWeapon === 2 && dist < 3.5) || (player.currentWeapon === 5) || (player.currentWeapon === 4);
                        const dmg = weapon.damage + Math.floor(Math.random() * (weapon.damage * 0.3));
                        s.hp -= dmg;
                        s.state = 'chase';
                        hit = true;
                        if (window.doomAudio) window.doomAudio.playSFX('hit');

                        if (player.currentWeapon === 5) {
                            this.sprites.forEach(other => {
                                if (other !== s && other.type === 'enemy' && !other.dead) {
                                    const d = Math.hypot(other.x - player.x, other.y - player.y);
                                    if (d < 24 && this.hasLineOfSight(player.x, player.y, other.x, other.y)) {
                                        other.hp -= 300;
                                    }
                                }
                            });
                        }

                        if (s.hp <= 0) {
                            s.dead = true;
                            s.isGibbed = isGibKill;
                            if (isGibKill && window.doomAudio) window.doomAudio.playSFX('gibs');

                            if (s.type === 'barrel') {
                                if (window.doomAudio) window.doomAudio.playSFX('shotgun');
                                if (window.doomGame) window.doomGame.showLog("EXPLOSION DE BARIL !");
                                this.sprites.forEach(other => {
                                    if (other !== s && !other.dead) {
                                        const d = Math.hypot(other.x - s.x, other.y - s.y);
                                        if (d < 3.5) other.hp -= 90;
                                    }
                                });
                            } else {
                                player.kills++;
                                player.score += s.isBoss ? 2000 : (s.subType === 'caco' ? 250 : 100);
                                if (!isGibKill && window.doomAudio) window.doomAudio.playSFX('monster_die');
                                if (window.doomGame) window.doomGame.showLog(s.isBoss ? `👑 BOSS ${s.name} TERRASSÉ !` : `${s.subType.toUpperCase()} PURGÉ !`);

                                if (s.subType === 'spider') {
                                    setTimeout(() => {
                                        if (window.doomGame) window.doomGame.setGameState('VICTORY');
                                    }, 1000);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    updateEntities(dt, player) {
        this.updateDoors(dt);

        if (this.getMapCell(player.x, player.y) === 13) {
            player.x = 48.5;
            player.y = 12.5;
            player.damageFlashTimer = 0.3;
            if (window.doomAudio) window.doomAudio.playSFX('teleport');
            if (window.doomGame) window.doomGame.showLog("TÉLÉPORTATION VERS LA COUR EXTÉRIEURE !");
        }

        if (this.getMapCell(player.x, player.y) === 5) {
            if (window.doomGame) window.doomGame.setGameState('VICTORY');
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            const cell = this.getMapCell(p.x, p.y);
            const isHitWall = (cell !== 0 && cell !== 10 && cell !== 11 && cell !== 13 && cell !== 15);

            if (p.type === 'player_rocket') {
                let rocketExploded = isHitWall;

                this.sprites.forEach(s => {
                    if ((s.type === 'enemy' || s.type === 'barrel') && !s.dead) {
                        const distToMonster = Math.hypot(s.x - p.x, s.y - p.y);
                        if (distToMonster < 0.9) {
                            rocketExploded = true;
                        }
                    }
                });

                if (rocketExploded || p.life <= 0) {
                    if (window.doomAudio) window.doomAudio.playSFX('shotgun');

                    this.sprites.forEach(s => {
                        if ((s.type === 'enemy' || s.type === 'barrel') && !s.dead) {
                            const d = Math.hypot(s.x - p.x, s.y - p.y);
                            if (d < 4.2) {
                                const splashDmg = Math.floor(p.damage * (1 - d / 4.2));
                                s.hp -= splashDmg;
                                s.state = 'chase';
                                if (s.hp <= 0) {
                                    s.dead = true;
                                    s.isGibbed = true;
                                    player.kills++;
                                    player.score += s.isBoss ? 2000 : 200;
                                    if (window.doomAudio) window.doomAudio.playSFX('gibs');
                                }
                            }
                        }
                    });

                    const distToPlayer = Math.hypot(p.x - player.x, p.y - player.y);
                    if (distToPlayer < 1.4) {
                        player.takeDamage(25 * (1 - distToPlayer / 1.4));
                    }

                    this.projectiles.splice(i, 1);
                    continue;
                }
                continue;
            }

            if (isHitWall) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const distPlayer = Math.hypot(p.x - player.x, p.y - player.y);
            if (distPlayer < 0.45) {
                player.takeDamage(p.damage);
                if (window.doomAudio) window.doomAudio.playSFX('hit');
                if (window.doomGame) window.doomGame.showLog(`TOUCHÉ PAR ${p.type.toUpperCase()} !`);
                this.projectiles.splice(i, 1);
                continue;
            }

            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }

        this.sprites.forEach(s => {
            if (!s.taken) {
                const dist = Math.hypot(s.x - player.x, s.y - player.y);
                if (dist < 0.75) {
                    if (s.type === 'item_lore') {
                        s.taken = true;
                        if (window.doomAudio) window.doomAudio.playSFX('key_pickup');
                        if (window.doomGame) window.doomGame.showLog(s.text);
                    } else if (s.type === 'item_radsuit') {
                        s.taken = true;
                        player.radsuitTimer = 30.0;
                        if (window.doomAudio) window.doomAudio.playSFX('key_pickup');
                        if (window.doomGame) { window.doomGame.showLog("COMBINAISON ANTI-RADIATION (30s) !"); window.doomGame.updateHUD(); }
                    } else if (s.type === 'key_blue') {
                        s.taken = true;
                        player.keysInventory.blue = true;
                        if (window.doomAudio) window.doomAudio.playSFX('key_pickup');
                        if (window.doomGame) { window.doomGame.showLog("CARTE ACCÈS BLEUE ACQUISE !"); window.doomGame.updateHUD(); }
                    } else if (s.type === 'key_red') {
                        s.taken = true;
                        player.keysInventory.red = true;
                        if (window.doomAudio) window.doomAudio.playSFX('key_pickup');
                        if (window.doomGame) { window.doomGame.showLog("CARTE ACCÈS ROUGE ACQUISE !"); window.doomGame.updateHUD(); }
                    } else if (s.type === 'key_yellow') {
                        s.taken = true;
                        player.keysInventory.yellow = true;
                        if (window.doomAudio) window.doomAudio.playSFX('key_pickup');
                        if (window.doomGame) { window.doomGame.showLog("CARTE ACCÈS JAUNE ACQUISE !"); window.doomGame.updateHUD(); }
                    } else if (s.type === 'item_medkit' && player.health < 100) {
                        s.taken = true;
                        player.health = Math.min(100, player.health + 35);
                        if (window.doomAudio) window.doomAudio.playSFX('item');
                        if (window.doomGame) { window.doomGame.showLog("+35 SANTÉ !"); window.doomGame.updateHUD(); }
                    } else if (s.type === 'item_ammo_box' && player.ammo < 99) {
                        s.taken = true;
                        player.ammo = Math.min(99, player.ammo + 50);
                        player.rockets = Math.min(30, player.rockets + 5);
                        if (window.doomAudio) window.doomAudio.playSFX('item');
                        if (window.doomGame) { window.doomGame.showLog("+50 BALLES & +5 ROQUETTES !"); window.doomGame.updateHUD(); }
                    } else if (s.type === 'item_plasma_pack' && player.plasma < 99) {
                        s.taken = true;
                        player.plasma = Math.min(99, player.plasma + 40);
                        if (window.doomAudio) window.doomAudio.playSFX('item');
                        if (window.doomGame) { window.doomGame.showLog("+40 PACK CELLULES PLASMA !"); window.doomGame.updateHUD(); }
                    }
                }
            }
        });

        this.sprites.forEach(s => {
            if (s.type === 'enemy' && !s.dead) {
                const distToPlayer = Math.hypot(player.x - s.x, player.y - s.y);
                s.anim = Math.floor((Date.now() / 250) % 2);

                const hasLOS = this.hasLineOfSight(s.x, s.y, player.x, player.y);

                if (distToPlayer < 18.0 && hasLOS) {
                    s.state = 'chase';
                }

                if (s.state === 'chase') {
                    const dirX = (player.x - s.x) / distToPlayer;
                    const dirY = (player.y - s.y) / distToPlayer;
                    const step = s.speed * dt;

                    if (s.subType === 'lostsoul') {
                        if (hasLOS) {
                            s.x += dirX * step;
                            s.y += dirY * step;
                        }
                        if (distToPlayer < 1.2) {
                            player.takeDamage(28 * dt);
                            if (Math.random() < 0.05 && window.doomAudio) window.doomAudio.playSFX('lostsoul_scream');
                        }
                    } else {
                        if (distToPlayer > 3.5 && hasLOS) {
                            const nextCellX = this.getMapCell(s.x + dirX * step * 1.5, s.y);
                            const nextCellY = this.getMapCell(s.x, s.y + dirY * step * 1.5);
                            if (nextCellX === 0 || nextCellX === 10 || nextCellX === 11 || nextCellX === 13 || nextCellX === 15) s.x += dirX * step;
                            if (nextCellY === 0 || nextCellY === 10 || nextCellY === 11 || nextCellY === 13 || nextCellY === 15) s.y += dirY * step;
                        }

                        if (s.shootCooldown > 0) s.shootCooldown -= dt;

                        if (s.shootCooldown <= 0 && distToPlayer < 16.0 && hasLOS) {
                            if (s.subType === 'spider') {
                                s.shootCooldown = 0.4;
                                this.projectiles.push({
                                    type: 'fireball',
                                    x: s.x + dirX * 0.6, y: s.y + dirY * 0.6,
                                    vx: dirX * 7.5, vy: dirY * 7.5,
                                    damage: 22, life: 4.0
                                });
                                if (window.doomAudio) window.doomAudio.playSFX('chaingun');
                            } else if (s.subType === 'baron') {
                                s.shootCooldown = 1.6;
                                this.projectiles.push({
                                    type: 'fireball',
                                    x: s.x + dirX * 0.6, y: s.y + dirY * 0.6,
                                    vx: dirX * 5.0, vy: dirY * 5.0,
                                    damage: 28, life: 4.0
                                });
                                if (window.doomAudio) window.doomAudio.playSFX('player_hurt');
                            } else if (s.subType === 'zombieman') {
                                s.shootCooldown = 1.6;
                                player.takeDamage(12);
                                if (window.doomAudio) window.doomAudio.playSFX('shotgun');
                                if (window.doomGame) window.doomGame.showLog("TIRÉ PAR UN SOLDAT ZOMBIEMAN !");
                            } else {
                                s.shootCooldown = s.subType === 'cyber' ? 1.8 : 2.4;
                                const projSpeed = s.subType === 'cyber' ? 5.5 : 4.2;
                                const projDmg = s.subType === 'cyber' ? 35 : 18;
                                const projType = s.subType === 'cyber' ? 'rocket' : 'fireball';

                                this.projectiles.push({
                                    type: projType,
                                    x: s.x + dirX * 0.6, y: s.y + dirY * 0.6,
                                    vx: dirX * projSpeed, vy: dirY * projSpeed,
                                    damage: projDmg, life: 4.0
                                });

                                if (window.doomAudio) {
                                    if (s.subType === 'cyber') window.doomAudio.playSFX('shotgun');
                                    else window.doomAudio.playSFX('player_hurt');
                                }
                            }
                        }

                        if (distToPlayer <= 0.8) {
                            const dps = s.isBoss ? 45 : 18;
                            player.takeDamage(dps * dt);
                        }
                    }
                }
            }
        });
    }

    render(player) {
        const dirX = Math.cos(player.angle);
        const dirY = Math.sin(player.angle);
        const fovScale = Math.tan(this.fov / 2);
        const planeX = -dirY * fovScale;
        const planeY = dirX * fovScale;

        const strobe = (Math.sin(Date.now() / 80) > 0.6) ? 1.2 : 0.85;
        const muzzleLight = (player.shootTimer > 0.08) ? 1.4 : 1.0;

        const playerInOutdoor = this.isOutdoor(player.x, player.y);

        const ceilTex = this.textures.ceiling_tile;
        const skyOffset = Math.floor((player.angle / (Math.PI * 2)) * 1024);

        for (let y = this.halfHeight; y < this.height; y++) {
            const p = y - this.halfHeight;
            const rowDistance = p === 0 ? 100 : (this.halfHeight / p);

            let shade = Math.max(0.15, Math.min(1.0, 2.2 / (rowDistance * 0.35 + 0.5))) * strobe * muzzleLight;
            if (!this.enableLighting) shade = 0.85;

            const floorStepX = rowDistance * (planeX * 2) / this.width;
            const floorStepY = rowDistance * (planeY * 2) / this.width;

            let floorX = player.x + rowDistance * (dirX - planeX);
            let floorY = player.y + rowDistance * (dirY - planeY);

            const rowOffsetFloor = y * this.width;
            const rowOffsetCeil = (this.height - y - 1) * this.width;
            const ceilYIndex = this.height - y - 1;

            for (let x = 0; x < this.width; x++) {
                const tx = Math.floor((floorX * this.texSize)) & (this.texSize - 1);
                const ty = Math.floor((floorY * this.texSize)) & (this.texSize - 1);

                const tileAtPoint = this.getMapCell(floorX, floorY);
                let floorTex = this.textures.floor_tile;
                if (tileAtPoint === 10) floorTex = this.textures.floor_slime;
                else if (tileAtPoint === 11) floorTex = this.textures.floor_lava;
                else if (floorY >= 34 && floorX < 34) floorTex = this.textures.floor_cave;

                const rawFloor = floorTex[ty * this.texSize + tx];
                const rf = Math.floor((rawFloor & 0xFF) * shade);
                const gf = Math.floor(((rawFloor >> 8) & 0xFF) * shade);
                const bf = Math.floor(((rawFloor >> 16) & 0xFF) * shade);
                this.pixelBuf[rowOffsetFloor + x] = this.colorRGBA(rf, gf, bf);

                if (playerInOutdoor && this.enableSkybox) {
                    const skyY = Math.floor((ceilYIndex / this.halfHeight) * 256);
                    const skyX = (Math.floor((x / this.width) * 512) + skyOffset + 1024) % 1024;
                    this.pixelBuf[rowOffsetCeil + x] = this.textures.sky[skyY * 1024 + skyX];
                } else {
                    const rawCeil = ceilTex[ty * this.texSize + tx];
                    const rc = Math.floor((rawCeil & 0xFF) * shade * 0.7);
                    const gc = Math.floor(((rawCeil >> 8) & 0xFF) * shade * 0.7);
                    const bc = Math.floor(((rawCeil >> 16) & 0xFF) * shade * 0.7);
                    this.pixelBuf[rowOffsetCeil + x] = this.colorRGBA(rc, gc, bc);
                }

                floorX += floorStepX;
                floorY += floorStepY;
            }
        }

        for (let x = 0; x < this.width; x++) {
            const cameraX = (2 * x / this.width) - 1;
            const rayDirX = dirX + planeX * cameraX;
            const rayDirY = dirY + planeY * cameraX;

            let mapX = Math.floor(player.x);
            let mapY = Math.floor(player.y);

            const deltaDistX = Math.abs(1 / rayDirX);
            const deltaDistY = Math.abs(1 / rayDirY);

            let stepX, stepY;
            let sideDistX, sideDistY;

            if (rayDirX < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaDistX; }
            else { stepX = 1; sideDistX = (mapX + 1.0 - player.x) * deltaDistX; }

            if (rayDirY < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaDistY; }
            else { stepY = 1; sideDistY = (mapY + 1.0 - player.y) * deltaDistY; }

            let hit = 0;
            let side = 0;
            let wallType = 1;
            let doorOffset = 0;

            while (hit === 0) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }
                const cell = this.getMapCell(mapX, mapY);
                if (cell > 0 && cell !== 10 && cell !== 11 && cell !== 13 && cell !== 15) {
                    hit = 1;
                    wallType = cell;

                    const doorKey = `${mapX}_${mapY}`;
                    if (this.animatedDoors[doorKey]) {
                        doorOffset = this.animatedDoors[doorKey].offset;
                    }
                }
            }

            let perpWallDist = (side === 0) ? (mapX - player.x + (1 - stepX) / 2) / rayDirX : (mapY - player.y + (1 - stepY) / 2) / rayDirY;
            perpWallDist = Math.max(0.05, perpWallDist);

            this.zBuffer[x] = perpWallDist;

            const lineHeight = Math.floor(this.height / perpWallDist);
            const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + this.halfHeight));
            const drawEnd = Math.min(this.height - 1, Math.floor(lineHeight / 2 + this.halfHeight));

            let wallX = (side === 0) ? player.y + perpWallDist * rayDirY : player.x + perpWallDist * rayDirX;
            wallX -= Math.floor(wallX);

            let texX = Math.floor(wallX * this.texSize);
            if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
                texX = this.texSize - texX - 1;
            }

            let light = (1.0 / (perpWallDist * 0.2 + 0.5)) * strobe * muzzleLight;
            if (side === 1) light *= 0.72;
            if (!this.enableLighting) light = side === 1 ? 0.8 : 1.0;
            light = Math.min(1.0, Math.max(0.05, light));

            const tex = this.textures[wallType] || this.textures[1];
            const step = this.texSize / lineHeight;
            let texPos = (drawStart - this.halfHeight + lineHeight / 2) * step;

            const doorPixelShift = Math.floor(doorOffset * this.texSize);

            for (let y = drawStart; y <= drawEnd; y++) {
                let texY = Math.min(this.texSize - 1, Math.max(0, Math.floor(texPos) + doorPixelShift));
                texPos += step;

                if (texY < this.texSize) {
                    const rawColor = tex[texY * this.texSize + texX];
                    const r = Math.floor((rawColor & 0xFF) * light);
                    const g = Math.floor(((rawColor >> 8) & 0xFF) * light);
                    const b = Math.floor(((rawColor >> 16) & 0xFF) * light);
                    this.pixelBuf[y * this.width + x] = this.colorRGBA(r, g, b);
                }
            }
        }

        this.renderSprites(player, dirX, dirY, planeX, planeY);

        if (this.isMelting && this.enableMelt) {
            for (let x = 0; x < this.width; x++) {
                const offsetY = Math.max(0, this.meltColumns[x]);
                for (let y = this.height - 1; y >= offsetY; y--) {
                    this.pixelBuf[y * this.width + x] = this.prevFrameBuf[(y - offsetY) * this.width + x];
                }
            }
        }

        this.ctx.putImageData(this.imgData, 0, 0);

        if (player.radsuitTimer > 0) {
            this.ctx.fillStyle = 'rgba(0, 255, 100, 0.15)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        this.renderBossHealthBars(player);

        this.renderWeapon(player);
        if (this.showMinimap) {
            this.renderMinimap(player);
        }
    }

    renderBossHealthBars(player) {
        this.sprites.forEach(s => {
            if (s.isBoss && !s.dead) {
                const dist = Math.hypot(s.x - player.x, s.y - player.y);
                if (dist < 18.0 && this.hasLineOfSight(player.x, player.y, s.x, s.y)) {
                    const barWidth = 140 * (this.height / 200);
                    const barHeight = 8 * (this.height / 200);
                    const barX = (this.width - barWidth) / 2;
                    const barY = 44 * (this.height / 200);

                    const hpRatio = Math.max(0, s.hp / s.maxHp);

                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    this.ctx.fillRect(barX - 4, barY - 14, barWidth + 8, barHeight + 18);
                    this.ctx.strokeStyle = '#ff2222';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(barX - 4, barY - 14, barWidth + 8, barHeight + 18);

                    this.ctx.font = '6px "Press Start 2P", monospace';
                    this.ctx.fillStyle = '#ffcc00';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(s.name, this.width / 2, barY - 4);

                    this.ctx.fillStyle = '#330000';
                    this.ctx.fillRect(barX, barY, barWidth, barHeight);

                    this.ctx.fillStyle = '#ff1100';
                    this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
                }
            }
        });
    }

    renderSprites(player, dirX, dirY, planeX, planeY) {
        const allSprites = [...this.sprites];

        this.projectiles.forEach(p => {
            allSprites.push({
                type: 'projectile',
                subType: (p.type === 'player_rocket' ? 'rocket' : p.type),
                x: p.x,
                y: p.y
            });
        });

        Object.keys(this.remotePlayers).forEach(id => {
            const p = this.remotePlayers[id];
            allSprites.push({ type: 'remote_player', x: p.x, y: p.y, id: id });
        });

        const sorted = allSprites.map(s => {
            const dx = s.x - player.x;
            const dy = s.y - player.y;
            return { sprite: s, dist: dx * dx + dy * dy };
        }).sort((a, b) => b.dist - a.dist);

        const invDet = 1.0 / (planeX * dirY - dirX * planeY);

        sorted.forEach(item => {
            const s = item.sprite;
            if ((s.type === 'item_medkit' || s.type === 'item_ammo_box' || s.type === 'item_plasma_pack' || s.type === 'item_radsuit' || s.type === 'item_lore' || s.type.startsWith('key_')) && s.taken) return;

            const spriteX = s.x - player.x;
            const spriteY = s.y - player.y;

            const transformX = invDet * (dirY * spriteX - dirX * spriteY);
            const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

            if (transformY <= 0.1) return;

            const scaleMultiplier = s.subType === 'spider' ? 1.85 : (s.subType === 'cyber' ? 1.55 : (s.subType === 'baron' ? 1.4 : (s.subType === 'caco' ? (s.isBoss ? 1.6 : 1.2) : (s.subType === 'lostsoul' ? 0.8 : (s.type === 'projectile' ? 0.6 : 1.0)))));

            const spriteScreenX = Math.floor((this.width / 2) * (1 + transformX / transformY));
            const spriteHeight = Math.abs(Math.floor((this.height / transformY) * scaleMultiplier));
            const spriteWidth = spriteHeight;

            const drawStartY = Math.max(0, Math.floor(-spriteHeight / 2 + this.halfHeight));
            const drawEndY = Math.min(this.height - 1, Math.floor(spriteHeight / 2 + this.halfHeight));

            const drawStartX = Math.max(0, Math.floor(-spriteWidth / 2 + spriteScreenX));
            const drawEndX = Math.min(this.width - 1, Math.floor(spriteWidth / 2 + spriteScreenX));

            let tex = this.textures.imp_idle;
            if (s.type === 'projectile') {
                tex = s.subType === 'rocket' ? this.textures.rocket : this.textures.fireball;
            } else if (s.type === 'enemy') {
                if (s.isGibbed) tex = this.textures.gibs;
                else if (s.subType === 'spider') tex = s.dead ? this.textures.spider_die : this.textures.spider_idle;
                else if (s.subType === 'baron') tex = s.dead ? this.textures.baron_die : this.textures.baron_idle;
                else if (s.subType === 'zombieman') tex = s.dead ? this.textures.zombieman_die : this.textures.zombieman_idle;
                else if (s.subType === 'lostsoul') tex = s.dead ? this.textures.lostsoul_die : this.textures.lostsoul_idle;
                else if (s.subType === 'caco') tex = s.dead ? this.textures.caco_die : this.textures.caco_idle;
                else if (s.subType === 'cyber') tex = s.dead ? this.textures.cyber_die : this.textures.cyber_idle;
                else tex = s.dead ? this.textures.imp_die : (s.anim === 1 ? this.textures.imp_walk : this.textures.imp_idle);
            } else if (s.type === 'barrel') {
                tex = this.textures.barrel;
            } else if (s.type === 'item_radsuit') {
                tex = this.textures.radsuit;
            } else if (s.type === 'item_lore') {
                tex = this.textures.lore_pad;
            } else if (s.type === 'key_blue') {
                tex = this.textures.key_blue;
            } else if (s.type === 'key_red') {
                tex = this.textures.key_red;
            } else if (s.type === 'key_yellow') {
                tex = this.textures.key_yellow;
            } else if (s.type === 'item_medkit') {
                tex = this.textures.medkit;
            } else if (s.type === 'item_ammo_box') {
                tex = this.textures.ammo_box;
            } else if (s.type === 'item_plasma_pack') {
                tex = this.textures.plasma_pack;
            } else if (s.type === 'remote_player') {
                tex = this.textures.other_player;
            }

            let light = (s.type === 'projectile' || s.subType === 'lostsoul') ? 1.0 : (1.0 / (transformY * 0.2 + 0.5));
            if (!this.enableLighting) light = 1.0;
            light = Math.min(1.0, Math.max(0.1, light));

            for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
                const texX = Math.floor((stripe - (-spriteWidth / 2 + spriteScreenX)) * this.texSize / spriteWidth);

                if (transformY < this.zBuffer[stripe] && texX >= 0 && texX < this.texSize) {
                    for (let y = drawStartY; y <= drawEndY; y++) {
                        const d = (y - this.halfHeight) * 2 + spriteHeight;
                        const texY = Math.min(this.texSize - 1, Math.max(0, Math.floor(d * this.texSize / (spriteHeight * 2))));

                        const rawColor = tex[texY * this.texSize + texX];
                        const alpha = (rawColor >> 24) & 0xFF;

                        if (alpha > 50) {
                            const r = Math.floor((rawColor & 0xFF) * light);
                            const g = Math.floor(((rawColor >> 8) & 0xFF) * light);
                            const b = Math.floor(((rawColor >> 16) & 0xFF) * light);
                            this.pixelBuf[y * this.width + stripe] = this.colorRGBA(r, g, b);
                        }
                    }
                }
            }
        });
    }

    renderWeapon(player) {
        const centerX = this.width / 2;
        const baseY = this.height + Math.sin(player.weaponBob) * (this.height / 50);
        const weaponId = player.currentWeapon;
        const scale = this.height / 200;

        if (weaponId === 1) {
            const sawShake = (Math.random() - 0.5) * 3 * scale;
            this.ctx.fillStyle = '#cc2200';
            this.ctx.fillRect(centerX - 22 * scale + sawShake, baseY - 32 * scale, 24 * scale, 32 * scale);

            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.fillRect(centerX - 10 * scale + sawShake, baseY - 58 * scale, 14 * scale, 36 * scale);

            this.ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 6; i++) {
                this.ctx.fillRect(centerX - 12 * scale + sawShake, baseY - (56 - i * 5) * scale, 4 * scale, 3 * scale);
            }
        } else if (weaponId === 2) {
            if (player.shootTimer > 0.25) {
                this.ctx.fillStyle = '#ffff44';
                this.ctx.beginPath();
                this.ctx.arc(centerX - 10 * scale, baseY - 52 * scale, 22 * scale, 0, Math.PI * 2);
                this.ctx.arc(centerX + 10 * scale, baseY - 52 * scale, 22 * scale, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = '#1c1c1c';
            this.ctx.fillRect(centerX - 18 * scale, baseY - 48 * scale, 16 * scale, 50 * scale);
            this.ctx.fillRect(centerX + 2 * scale, baseY - 48 * scale, 16 * scale, 50 * scale);

            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(centerX - 15 * scale, baseY - 46 * scale, 4 * scale, 46 * scale);
            this.ctx.fillRect(centerX + 5 * scale, baseY - 46 * scale, 4 * scale, 46 * scale);

            this.ctx.fillStyle = '#532915';
            this.ctx.fillRect(centerX - 20 * scale, baseY - 12 * scale, 40 * scale, 18 * scale);
        } else if (weaponId === 3) {
            const spin = Math.floor(Date.now() / 50) % 3;
            if (player.shootTimer > 0.02) {
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.beginPath();
                this.ctx.arc(centerX, baseY - 52 * scale, 18 * scale, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = '#2b2b2b';
            this.ctx.fillRect(centerX - 14 * scale, baseY - 44 * scale, 28 * scale, 46 * scale);

            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(centerX - (10 - spin * 2) * scale, baseY - 54 * scale, 6 * scale, 20 * scale);
            this.ctx.fillRect(centerX + (2 - spin * 2) * scale, baseY - 54 * scale, 6 * scale, 20 * scale);
        } else if (weaponId === 4) {
            if (player.shootTimer > 0.3) {
                this.ctx.fillStyle = '#ff7700';
                this.ctx.beginPath();
                this.ctx.arc(centerX, baseY - 52 * scale, 24 * scale, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = '#3a443a';
            this.ctx.fillRect(centerX - 18 * scale, baseY - 56 * scale, 36 * scale, 58 * scale);

            this.ctx.fillStyle = '#111111';
            this.ctx.beginPath();
            this.ctx.arc(centerX, baseY - 56 * scale, 14 * scale, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (weaponId === 5) {
            if (player.shootTimer > 0.5) {
                this.ctx.fillStyle = '#00ff66';
                this.ctx.beginPath();
                this.ctx.arc(centerX, baseY - 56 * scale, 32 * scale, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(centerX, baseY - 56 * scale, 16 * scale, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = '#1b3b22';
            this.ctx.fillRect(centerX - 32 * scale, baseY - 44 * scale, 64 * scale, 46 * scale);

            this.ctx.fillStyle = '#00ff88';
            this.ctx.fillRect(centerX - 12 * scale, baseY - 36 * scale, 24 * scale, 16 * scale);

            this.ctx.fillStyle = '#0a1a0e';
            this.ctx.fillRect(centerX - 24 * scale, baseY - 48 * scale, 48 * scale, 10 * scale);
        }
    }

    renderMinimap(player) {
        const mapSize = Math.floor(84 * (this.height / 200));
        const scale = mapSize / this.mapWidth;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(6, 6, mapSize, mapSize);
        this.ctx.strokeStyle = '#881111';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(6, 6, mapSize, mapSize);

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const c = this.getMapCell(x, y);
                if (c > 0) {
                    if (c === 10) this.ctx.fillStyle = '#00ff44';
                    else if (c === 11) this.ctx.fillStyle = '#ff4400';
                    else if (c === 13) this.ctx.fillStyle = '#00ffaa';
                    else if (c === 14) this.ctx.fillStyle = '#665544';
                    else if (c === 15) this.ctx.fillStyle = '#aaaaee';
                    else if (c === 5) this.ctx.fillStyle = '#00e5ff';
                    else if (c === 12) this.ctx.fillStyle = '#ffaa00';
                    else if (c === 7) this.ctx.fillStyle = '#0088ff';
                    else if (c === 8) this.ctx.fillStyle = '#ff0000';
                    else if (c === 9) this.ctx.fillStyle = '#ffff00';
                    else if (c === 6) this.ctx.fillStyle = '#aaaaaa';
                    else this.ctx.fillStyle = '#553322';

                    this.ctx.fillRect(6 + x * scale, 6 + y * scale, Math.max(1, scale), Math.max(1, scale));
                }
            }
        }

        this.projectiles.forEach(p => {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillRect(6 + p.x * scale - 1, 6 + p.y * scale - 1, 2, 2);
        });

        this.sprites.forEach(s => {
            if (s.type === 'enemy' && !s.dead) {
                this.ctx.fillStyle = s.isBoss ? '#ff0055' : (s.subType === 'zombieman' ? '#00ff00' : '#ffaa00');
                const sz = s.isBoss ? 3.5 : 2.0;
                this.ctx.fillRect(6 + s.x * scale - 1, 6 + s.y * scale - 1, sz, sz);
            } else if (s.type === 'barrel' && !s.dead) {
                this.ctx.fillStyle = '#33ff33';
                this.ctx.fillRect(6 + s.x * scale - 1, 6 + s.y * scale - 1, 1.5, 1.5);
            } else if (!s.taken && s.type.startsWith('key_')) {
                this.ctx.fillStyle = s.type === 'key_blue' ? '#00ffff' : (s.type === 'key_red' ? '#ff3333' : '#ffff00');
                this.ctx.fillRect(6 + s.x * scale - 1.5, 6 + s.y * scale - 1.5, 2.5, 2.5);
            } else if (!s.taken && (s.type === 'item_medkit' || s.type === 'item_ammo_box' || s.type === 'item_plasma_pack' || s.type === 'item_radsuit' || s.type === 'item_lore')) {
                this.ctx.fillStyle = '#00ffcc';
                this.ctx.fillRect(6 + s.x * scale - 1, 6 + s.y * scale - 1, 1.5, 1.5);
            }
        });

        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(6 + player.x * scale, 6 + player.y * scale, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

window.DoomRaycaster = DoomRaycaster;
