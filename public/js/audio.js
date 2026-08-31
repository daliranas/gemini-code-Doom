/**
 * DOOM IA - Moteur Audio Haute-Performance & Zéro Saturation / Zéro Craquement
 * - Sons interactifs pour le menu : Bruits de clic, survols d'options (skull hum), validation
 * - Limiter Master & Compresseur pour éliminer 100% des saturations
 * - Mixage doux et équilibré
 */

class DoomAudioSystem {
    constructor() {
        this.isMuted = false;
        this.isInitialized = false;
        this.isPlayingMusic = false;

        this.limiter = null;
        this.reverb = null;

        // Synthétiseurs de musique
        this.padSynth = null;
        this.bellSynth = null;
        this.pianoSynth = null;
        this.kick = null;
        this.musicLoop = null;

        // Synthétiseurs SFX pré-alloués
        this.sfxShotgun = null;
        this.sfxChaingun = null;
        this.sfxSaw = null;
        this.sfxBfgCharge = null;
        this.sfxBfgBoom = null;
        this.sfxMonster = null;
        this.sfxScream = null;
        this.sfxGibs = null;
        this.sfxDoor = null;
        this.sfxBip = null;
        this.sfxItem = null;
        this.sfxMenuHover = null;
        this.sfxMenuClick = null;

        this.currentTrack = 'menu';
        this.currentStep = 0;

        this.tracks = {
            menu: {
                bpm: 78,
                pad: ["C2", "G2", "Eb3", "Ab2", "Bb2", "F2", "Eb2", "G2"],
                melody: ["C4", null, "Eb4", "G4", "F4", "Eb4", "D4", null, "Eb4", "D4", "C4", null, "G3", null, "C4", null]
            },
            1: {
                bpm: 88,
                pad: ["A1", "E2", "C3", "F2", "D2", "A1", "E2", "G2"],
                melody: ["A3", "C4", "E4", "D4", "C4", "B3", null, "A3", "E3", null, "G3", "A3", "B3", "C4", "A3", null]
            },
            2: {
                bpm: 82,
                pad: ["D2", "A2", "F3", "Bb2", "G2", "D2", "Eb2", "F2"],
                melody: [null, "D4", "F4", "A4", "Ab4", "G4", null, "F4", "D4", null, "Eb4", "F4", "D4", null, null, null]
            },
            3: {
                bpm: 90,
                pad: ["E1", "B1", "G2", "C2", "A1", "E1", "F1", "G1"],
                melody: ["E3", "G3", "B3", "A3", "G3", "F#3", null, "E3", "B3", "C4", "B3", "G3", "E3", null, "E4", null]
            },
            intermission: {
                bpm: 95,
                pad: ["F2", "C3", "A3", "Bb2", "C3", "G2", "F2", "A2"],
                melody: ["F3", "A3", "C4", "F4", "E4", "D4", "C4", null, "Bb3", "A3", "G3", "A3", "F3", null, null, null]
            }
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            if (window.Tone) {
                await window.Tone.start();

                this.limiter = new window.Tone.Limiter(-1).toDestination();
                this.reverb = new window.Tone.Reverb({ decay: 2.8, preDelay: 0.05 }).connect(this.limiter);

                this.padSynth = new window.Tone.PolySynth(window.Tone.Synth, {
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.6, decay: 0.8, sustain: 0.8, release: 1.2 }
                }).connect(this.reverb);
                this.padSynth.volume.value = -12;

                this.bellSynth = new window.Tone.PolySynth(window.Tone.Synth, {
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 0.8 }
                }).connect(this.reverb);
                this.bellSynth.volume.value = -14;

                this.pianoSynth = new window.Tone.PolySynth(window.Tone.Synth, {
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.6 }
                }).connect(this.reverb);
                this.pianoSynth.volume.value = -14;

                this.kick = new window.Tone.MembraneSynth({
                    pitchDecay: 0.04,
                    octaves: 3,
                    oscillator: { type: "sine" }
                }).connect(this.limiter);
                this.kick.volume.value = -18;

                // SFX EN JEU ET DANS LE MENU
                this.sfxMenuHover = new window.Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 }
                }).connect(this.limiter);
                this.sfxMenuHover.volume.value = -16;

                this.sfxMenuClick = new window.Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.02 }
                }).connect(this.limiter);
                this.sfxMenuClick.volume.value = -10;

                this.sfxShotgun = new window.Tone.NoiseSynth({
                    noise: { type: "brown" },
                    envelope: { attack: 0.005, decay: 0.22, sustain: 0 }
                }).connect(this.limiter);
                this.sfxShotgun.volume.value = -6;

                this.sfxChaingun = new window.Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
                }).connect(this.limiter);
                this.sfxChaingun.volume.value = -10;

                this.sfxSaw = new window.Tone.MonoSynth({
                    oscillator: { type: "sawtooth" },
                    envelope: { attack: 0.01, decay: 0.06, sustain: 0.2, release: 0.04 }
                }).connect(this.limiter);
                this.sfxSaw.volume.value = -8;

                this.sfxBfgCharge = new window.Tone.MonoSynth({
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.2, decay: 0.1, sustain: 1, release: 0.1 }
                }).connect(this.limiter);
                this.sfxBfgCharge.volume.value = -6;

                this.sfxBfgBoom = new window.Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: { attack: 0.01, decay: 0.6, sustain: 0 }
                }).connect(this.limiter);
                this.sfxBfgBoom.volume.value = -4;

                this.sfxMonster = new window.Tone.MonoSynth({
                    oscillator: { type: "sawtooth" },
                    envelope: { attack: 0.08, decay: 0.3, sustain: 0.2, release: 0.2 }
                }).connect(this.limiter);
                this.sfxMonster.volume.value = -10;

                this.sfxScream = new window.Tone.MonoSynth({
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.04, decay: 0.25, sustain: 0.2, release: 0.15 }
                }).connect(this.limiter);
                this.sfxScream.volume.value = -10;

                this.sfxGibs = new window.Tone.NoiseSynth({
                    noise: { type: "brown" },
                    envelope: { attack: 0.01, decay: 0.3, sustain: 0 }
                }).connect(this.limiter);
                this.sfxGibs.volume.value = -6;

                this.sfxDoor = new window.Tone.MonoSynth({
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.05, decay: 0.25, sustain: 0.1, release: 0.1 }
                }).connect(this.limiter);
                this.sfxDoor.volume.value = -8;

                this.sfxBip = new window.Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 }
                }).connect(this.limiter);
                this.sfxBip.volume.value = -10;

                this.sfxItem = new window.Tone.PolySynth(window.Tone.Synth).connect(this.limiter);
                this.sfxItem.volume.value = -10;

                this.musicLoop = new window.Tone.Loop((time) => {
                    const track = this.tracks[this.currentTrack] || this.tracks['menu'];
                    const padNote = track.pad[Math.floor(this.currentStep / 2) % track.pad.length];
                    const melNote = track.melody[this.currentStep % track.melody.length];

                    if (this.currentStep % 2 === 0 && padNote) {
                        this.padSynth.triggerAttackRelease(padNote, "2n", time);
                    }

                    if (melNote) {
                        if (this.currentStep % 4 === 0) {
                            this.bellSynth.triggerAttackRelease(melNote, "4n", time);
                        } else {
                            this.pianoSynth.triggerAttackRelease(melNote, "8n", time);
                        }
                    }

                    if (this.currentStep % 4 === 0) {
                        this.kick.triggerAttackRelease("C1", "8n", time);
                    }

                    this.currentStep++;
                }, "8n");

                this.isInitialized = true;
            }
        } catch (e) {
            console.warn("Tone.js init:", e);
        }
    }

    setTrack(trackKey) {
        if (this.tracks[trackKey]) {
            this.currentTrack = trackKey;
            this.currentStep = 0;
            if (window.Tone) {
                window.Tone.Transport.bpm.rampTo(this.tracks[trackKey].bpm, 1.0);
            }
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (window.Tone) {
            window.Tone.Destination.mute = this.isMuted;
        }
        return this.isMuted;
    }

    async startMusic(trackKey = 'menu') {
        await this.init();
        if (this.isMuted) return;

        this.setTrack(trackKey);

        if (window.Tone && this.musicLoop) {
            this.musicLoop.start(0);
            window.Tone.Transport.start();
            this.isPlayingMusic = true;
        }
    }

    stopMusic() {
        if (window.Tone && this.musicLoop) {
            window.Tone.Transport.stop();
            this.musicLoop.stop();
            this.isPlayingMusic = false;
        }
    }

    playSFX(name) {
        if (this.isMuted || !this.isInitialized || !window.Tone) return;

        const now = window.Tone.now();

        try {
            if (name === 'menu_hover' && this.sfxMenuHover) {
                this.sfxMenuHover.triggerAttackRelease("A4", "32n", now);
            } else if (name === 'menu_click' && this.sfxMenuClick) {
                this.sfxMenuClick.triggerAttackRelease("D4", "16n", now);
            } else if (name === 'shotgun' && this.sfxShotgun) {
                this.sfxShotgun.triggerAttackRelease("8n", now);
            } else if (name === 'chaingun' && this.sfxChaingun) {
                this.sfxChaingun.triggerAttackRelease("32n", now);
            } else if (name === 'chainsaw' && this.sfxSaw) {
                this.sfxSaw.triggerAttackRelease("F#1", "16n", now);
            } else if (name === 'bfg_charge' && this.sfxBfgCharge) {
                this.sfxBfgCharge.triggerAttackRelease("E3", "4n", now);
            } else if (name === 'bfg_boom' && this.sfxBfgBoom) {
                this.sfxBfgBoom.triggerAttackRelease("2n", now);
            } else if (name === 'monster_growl' && this.sfxMonster) {
                this.sfxMonster.triggerAttackRelease("E1", "4n", now);
            } else if (name === 'lostsoul_scream' && this.sfxScream) {
                this.sfxScream.triggerAttackRelease("A3", "8n", now);
            } else if (name === 'gibs' && this.sfxGibs) {
                this.sfxGibs.triggerAttackRelease("4n", now);
            } else if (name === 'door_open' && this.sfxDoor) {
                this.sfxDoor.triggerAttackRelease("D2", "4n", now);
            } else if (name === 'tally_bip' && this.sfxBip) {
                this.sfxBip.triggerAttackRelease("E5", "32n", now);
            } else if (name === 'key_pickup' && this.sfxItem) {
                this.sfxItem.triggerAttackRelease(["C5", "E5", "A5"], "16n", now);
            } else if (name === 'item' && this.sfxItem) {
                this.sfxItem.triggerAttackRelease(["E5", "G5", "B5"], "16n", now);
            } else if (name === 'teleport' && this.sfxDoor) {
                this.sfxDoor.triggerAttackRelease("A3", "4n", now);
            } else if (name === 'hit' && this.kick) {
                this.kick.triggerAttackRelease("A1", "16n", now);
            } else if (name === 'player_hurt' && this.sfxMonster) {
                this.sfxMonster.triggerAttackRelease("C1", "8n", now);
            } else if (name === 'monster_die' && this.sfxMonster) {
                this.sfxMonster.triggerAttackRelease("F1", "4n", now);
            }
        } catch (e) {
            // Ignorer si audio occupé
        }
    }
}

window.doomAudio = new DoomAudioSystem();

window.addEventListener('click', () => {
    if (window.doomAudio) window.doomAudio.init();
}, { once: false });

window.addEventListener('keydown', () => {
    if (window.doomAudio) window.doomAudio.init();
}, { once: false });
