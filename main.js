/**
 * Dodge the Blocks: Evolved - Main Engine
 */

// --- 1. CONFIGURATION & CONSTANTS ---
const CONFIG = {
    CANVAS_ID: 'gameCanvas',
    PLAYER_WIDTH: 50,
    PLAYER_HEIGHT: 50,
    PLAYER_SPEED: 0.8,
    BASE_SPAWN_RATE: 1000,
    NEAR_MISS_DIST: 60, // Distance to trigger near miss
    COMBO_DECAY: 3000, // ms before combo resets
    POWERUP_DURATION: 5000,
    COLORS: {
        PLAYER: '#38bdf8',
        ENEMY_NORMAL: '#f43f5e',
        ENEMY_FAST: '#a855f7',
        ENEMY_WOBBLE: '#10b981',
        ENEMY_TRACKING: '#f97316',
        ENEMY_SPLITTER: '#ec4899',
        POWERUP_SLOW: '#fbbf24',
        POWERUP_SHIELD: '#60a5fa',
        POWERUP_BOMB: '#ef4444',
        POWERUP_MAGNET: '#8b5cf6',
        POWERUP_DASH: '#14b8a6',
        POWERUP_SIZE: '#f472b6'
    }
};

// --- 2. SYSTEM CLASSES ---

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(freq, type, duration) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playSound(name) {
        switch (name) {
            case 'pickup': this.playTone(880, 'sine', 0.1); break;
            case 'hit': this.playTone(150, 'sawtooth', 0.3); break;
            case 'shoot': this.playTone(440, 'square', 0.1); break;
            case 'powerup': this.playTone(600, 'sine', 0.3); break;
            case 'nearmiss': this.playTone(1200, 'triangle', 0.05); break;
            case 'levelup':
                this.playTone(400, 'sine', 0.1);
                setTimeout(() => this.playTone(600, 'sine', 0.1), 100);
                setTimeout(() => this.playTone(800, 'sine', 0.2), 200);
                break;
        }
    }
}

class StorageSystem {
    constructor() {
        this.highScore = parseInt(localStorage.getItem('dtb_highscore')) || 0;
        this.theme = localStorage.getItem('dtb_theme') || 'neon';
        this.achievements = JSON.parse(localStorage.getItem('dtb_achievements')) || [];
    }

    save() {
        localStorage.setItem('dtb_highscore', this.highScore);
        localStorage.setItem('dtb_theme', this.theme);
        localStorage.setItem('dtb_achievements', JSON.stringify(this.achievements));
    }

    unlockAchievement(id, title) {
        if (!this.achievements.includes(id)) {
            this.achievements.push(id);
            this.save();
            // Simple toast implementation
            const toast = document.getElementById('toast');
            toast.textContent = `Achievement: ${title}`;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(x, y, color, count = 10) {
        // Simple particle limit for performance
        if (this.particles.length > 200) return;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color
            });
        }
    }

    update(dt) {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt * 0.002;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1.0;
    }
}

// --- 3. GAME ENTITIES ---

class Player {
    constructor(game) {
        this.game = game;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.x = game.width / 2 - this.width / 2;
        this.y = game.height - 60;
        this.speed = CONFIG.PLAYER_SPEED;
        this.color = CONFIG.COLORS.PLAYER;

        // Powerup States
        this.shielded = false;
        this.magnet = false;
        this.dashActive = false;
        this.dashTimer = 0;
        this.sizeActive = false;
    }

    update(dt) {
        // Movement
        let moveSpeed = this.speed;
        if (this.dashActive) moveSpeed *= 2.0;

        // Keyboard
        if (this.game.input.keys.ArrowLeft || this.game.input.keys.a) this.x -= moveSpeed * dt;
        if (this.game.input.keys.ArrowRight || this.game.input.keys.d) this.x += moveSpeed * dt;

        // Mouse/Touch
        if (this.game.input.pointer.active) {
            const targetX = this.game.input.pointer.x - this.width / 2;
            const diff = targetX - this.x;
            if (Math.abs(diff) > 5) {
                this.x += Math.sign(diff) * moveSpeed * dt;
            }
        }

        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.game.width) this.x = this.game.width - this.width;

        // Dash Timer
        if (this.dashActive) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) this.dashActive = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.shielded ? 30 : 20;
        ctx.shadowColor = this.shielded ? '#fff' : this.color;

        // Dash effect (flicker)
        if (this.dashActive && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Shield Visual
        if (this.shielded) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    }

    activatePowerup(type) {
        this.game.audio.playSound('powerup');
        switch (type) {
            case 'shield': this.shielded = true; break;
            case 'magnet': this.magnet = true; setTimeout(() => this.magnet = false, CONFIG.POWERUP_DURATION); break;
            case 'dash': this.dashActive = true; this.dashTimer = CONFIG.POWERUP_DURATION; break;
            case 'size':
                if (!this.sizeActive) {
                    this.width /= 2; this.height /= 2; this.y += this.height; // Adjust Y to stay on floor
                    this.sizeActive = true;
                    setTimeout(() => {
                        this.y -= this.height; // Move up before expanding
                        this.width *= 2; this.height *= 2;
                        this.sizeActive = false;
                    }, CONFIG.POWERUP_DURATION);
                }
                break;
        }
    }
}

class Enemy {
    constructor(game, type = 'normal') {
        this.game = game;
        this.type = type;
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (game.width - this.width);
        this.y = -this.height;
        this.markedForDeletion = false;

        // Stats based on type
        this.speedMultiplier = 1.0;
        this.color = CONFIG.COLORS.ENEMY_NORMAL;
        this.oscillation = 0;

        this.initType();
    }

    initType() {
        switch (this.type) {
            case 'fast':
                this.width = 25;
                this.speedMultiplier = 1.8;
                this.color = CONFIG.COLORS.ENEMY_FAST;
                break;
            case 'wobble':
                this.speedMultiplier = 0.8;
                this.color = CONFIG.COLORS.ENEMY_WOBBLE;
                break;
            case 'tracking':
                this.speedMultiplier = 0.7;
                this.color = CONFIG.COLORS.ENEMY_TRACKING;
                break;
            case 'splitter':
                this.width = 60;
                this.height = 60;
                this.speedMultiplier = 0.6;
                this.color = CONFIG.COLORS.ENEMY_SPLITTER;
                break;
        }
    }

    update(dt) {
        let speed = this.game.baseEnemySpeed * this.speedMultiplier * this.game.timeScale;

        // Movement Logic
        this.y += speed * dt;

        if (this.type === 'wobble') {
            this.oscillation += dt * 0.005;
            this.x += Math.sin(this.oscillation) * 2 * this.game.timeScale;
        } else if (this.type === 'tracking') {
            const dx = (this.game.player.x + this.game.player.width / 2) - (this.x + this.width / 2);
            this.x += Math.sign(dx) * 0.1 * dt * this.game.timeScale;
        }

        // Splitter Logic
        if (this.type === 'splitter' && this.y + this.height >= this.game.height && !this.markedForDeletion) {
            this.markedForDeletion = true;
            this.game.spawnSplitChildren(this.x, this.y);
        }

        if (this.y > this.game.height) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Powerup {
    constructor(game, type) {
        this.game = game;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (game.width - this.width);
        this.y = -this.height;
        this.speed = 0.3;
        this.markedForDeletion = false;
        this.color = CONFIG.COLORS[`POWERUP_${type.toUpperCase()}`];
    }

    update(dt) {
        this.y += this.speed * this.game.timeScale * dt;

        // Magnet Effect
        if (this.game.player.magnet) {
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300) {
                this.x += (dx / dist) * 0.5 * dt;
                this.y += (dy / dist) * 0.5 * dt;
            }
        }

        if (this.y > this.game.height) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type[0].toUpperCase(), this.x + 15, this.y + 20);
    }
}

// --- 4. GAME ENGINE ---

class Game {
    constructor() {
        this.canvas = document.getElementById(CONFIG.CANVAS_ID);
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.audio = new AudioSystem();
        this.storage = new StorageSystem();
        this.particles = new ParticleSystem();

        this.input = {
            keys: {},
            pointer: { x: 0, y: 0, active: false }
        };

        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
        this.player = null;
        this.enemies = [];
        this.powerups = [];

        // Game State
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.level = 1;
        this.baseEnemySpeed = 0.3;
        this.timeScale = 1.0;
        this.spawnTimer = 0;
        this.eventTimer = 0;
        this.currentEvent = null;

        this.setupInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Apply Theme
        document.body.classList.add(this.storage.theme === 'classic' ? 'theme-classic' : 'theme-neon');

        // UI References
        this.ui = {
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            combo: document.getElementById('combo'),
            multiplier: document.getElementById('multiplier'),
            powerupList: document.getElementById('powerup-list'),
            eventBanner: document.getElementById('event-banner'),
            darkness: document.getElementById('darkness-overlay'),
            screens: {
                menu: document.getElementById('main-menu'),
                settings: document.getElementById('settings-menu'),
                achievements: document.getElementById('achievements-menu'),
                gameover: document.getElementById('game-over-screen'),
                pause: document.getElementById('pause-screen'),
                hud: document.getElementById('hud')
            }
        };

        this.setupUI();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    setupInput() {
        window.addEventListener('keydown', e => {
            this.input.keys[e.key] = true;
            if (e.key === 'Escape' || e.key === 'p') this.togglePause();
        });
        window.addEventListener('keyup', e => this.input.keys[e.key] = false);

        // Mouse/Touch
        const updatePointer = (x, y) => {
            this.input.pointer.x = x;
            this.input.pointer.y = y;
            this.input.pointer.active = true;
        };

        this.canvas.addEventListener('mousemove', e => updatePointer(e.clientX, e.clientY));
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => this.input.pointer.active = false);
    }

    setupUI() {
        // Main Menu
        document.getElementById('btn-start').onclick = () => this.start();
        document.getElementById('btn-settings').onclick = () => this.showScreen('settings');
        document.getElementById('btn-achievements').onclick = () => this.showAchievements();
        document.getElementById('high-score-display').textContent = `High Score: ${Math.floor(this.storage.highScore)}`;

        // Settings
        document.getElementById('btn-back-settings').onclick = () => this.showScreen('menu');
        document.getElementById('btn-toggle-theme').onclick = (e) => {
            this.storage.theme = this.storage.theme === 'neon' ? 'classic' : 'neon';
            document.body.className = this.storage.theme === 'neon' ? '' : 'theme-classic';
            e.target.textContent = this.storage.theme.toUpperCase();
            this.storage.save();
        };

        // Game Over / Pause
        document.getElementById('btn-restart').onclick = () => this.start();
        document.getElementById('btn-menu').onclick = () => this.showScreen('menu');
        document.getElementById('btn-resume').onclick = () => this.togglePause();
        document.getElementById('btn-quit').onclick = () => this.showScreen('menu');
        document.getElementById('btn-back-achievements').onclick = () => this.showScreen('menu');
    }

    showScreen(name) {
        Object.values(this.ui.screens).forEach(el => el.classList.add('hidden'));
        this.state = name === 'menu' ? 'MENU' : (name === 'game' ? 'PLAYING' : 'MENU');

        if (name === 'menu') this.ui.screens.menu.classList.remove('hidden');
        if (name === 'settings') this.ui.screens.settings.classList.remove('hidden');
        if (name === 'achievements') this.ui.screens.achievements.classList.remove('hidden');
        if (name === 'gameover') this.ui.screens.gameover.classList.remove('hidden');
        if (name === 'pause') this.ui.screens.pause.classList.remove('hidden');
        if (name === 'game') this.ui.screens.hud.classList.remove('hidden');
    }

    showAchievements() {
        const list = document.getElementById('achievements-list');
        list.innerHTML = '';
        const allAchievements = [
            { id: 'survive_60', title: 'Survivor', desc: 'Survive 60 seconds' },
            { id: 'combo_10', title: 'Combo Master', desc: 'Reach 10x Combo' },
            { id: 'score_1000', title: 'High Roller', desc: 'Score 1000 points' }
        ];

        allAchievements.forEach(ach => {
            const div = document.createElement('div');
            div.className = `achievement-item ${this.storage.achievements.includes(ach.id) ? 'unlocked' : ''}`;
            div.innerHTML = `<div><h3>${ach.title}</h3><p>${ach.desc}</p></div><div>${this.storage.achievements.includes(ach.id) ? '✅' : '🔒'}</div>`;
            list.appendChild(div);
        });
        this.showScreen('achievements');
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.player) this.player.y = this.height - 60;
    }

    start() {
        this.audio.init();
        this.player = new Player(this);
        this.enemies = [];
        this.powerups = [];
        this.score = 0;
        this.combo = 0;
        this.level = 1;
        this.baseEnemySpeed = 0.3;
        this.timeScale = 1.0;
        this.lastTime = performance.now();
        this.state = 'PLAYING';
        this.showScreen('game');

        // Reset UI
        this.ui.powerupList.innerHTML = '';
        this.ui.eventBanner.classList.add('hidden');
        this.ui.darkness.classList.add('hidden');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.ui.screens.pause.classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.ui.screens.pause.classList.add('hidden');
            this.lastTime = performance.now();
        }
    }

    spawnSplitChildren(x, y) {
        for (let i = 0; i < 2; i++) {
            const child = new Enemy(this, 'normal');
            child.width = 20; child.height = 20;
            child.x = x + (i * 30);
            child.y = y - 50;
            child.speedMultiplier = -0.5; // Bounce up initially
            this.enemies.push(child);
        }
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // --- Logic ---
        this.player.update(dt);
        this.particles.update(dt);

        // Combo Decay
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.updateHUD();
            }
        }

        // Spawning
        let spawnRate = Math.max(200, CONFIG.BASE_SPAWN_RATE - (this.level * 50));
        if (this.currentEvent === 'METEOR') spawnRate = 100;

        this.spawnTimer += dt;
        if (this.spawnTimer > spawnRate / this.timeScale) {
            this.spawnTimer = 0;
            // Enemy Type Logic
            let type = 'normal';
            const r = Math.random();
            if (this.level > 2 && r > 0.7) type = 'fast';
            if (this.level > 4 && r > 0.8) type = 'wobble';
            if (this.level > 6 && r > 0.9) type = 'tracking';
            if (this.level > 8 && r > 0.95) type = 'splitter';

            this.enemies.push(new Enemy(this, type));

            // Powerup Spawn (5%)
            if (Math.random() < 0.05) {
                const types = ['slow', 'shield', 'bomb', 'magnet', 'dash', 'size'];
                this.powerups.push(new Powerup(this, types[Math.floor(Math.random() * types.length)]));
            }
        }

        // Events & Level Up
        this.eventTimer += dt;
        if (this.eventTimer > 30000) { // Every 30s
            this.level++;
            this.audio.playSound('levelup');
            this.eventTimer = 0;
            this.baseEnemySpeed += 0.05;

            // Trigger Event
            const rand = Math.random();
            if (rand > 0.7) this.triggerEvent('METEOR');
            else if (rand > 0.4) this.triggerEvent('DARKNESS');
        }

        // Entities Update & Collision
        this.enemies.forEach(e => {
            e.update(dt);

            // Collision
            if (this.checkCollision(this.player, e)) {
                if (this.player.shielded) {
                    this.player.shielded = false;
                    e.markedForDeletion = true;
                    this.particles.spawn(e.x, e.y, '#fff', 20);
                    this.audio.playSound('hit');
                } else if (!this.player.dashActive) { // Dash gives invincibility
                    this.gameOver();
                }
            }

            // Near Miss
            if (!e.nearMissed && !e.markedForDeletion) {
                const dist = Math.abs((this.player.x + this.player.width / 2) - (e.x + e.width / 2));
                const yDist = Math.abs((this.player.y + this.player.height / 2) - (e.y + e.height / 2));
                if (dist < CONFIG.NEAR_MISS_DIST && yDist < CONFIG.NEAR_MISS_DIST) {
                    e.nearMissed = true;
                    this.combo++;
                    this.comboTimer = CONFIG.COMBO_DECAY;
                    this.audio.playSound('nearmiss');
                    this.updateHUD();
                }
            }
        });

        this.powerups.forEach(p => {
            p.update(dt);
            if (this.checkCollision(this.player, p)) {
                this.activatePowerup(p.type);
                p.markedForDeletion = true;
            }
        });

        // Cleanup
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.powerups = this.powerups.filter(p => !p.markedForDeletion);

        // Score
        const multiplier = 1 + (this.combo * 0.1);
        this.score += (dt * 0.01) * multiplier;
        this.updateHUD();

        // Achievements Check
        if (this.score > 1000) this.storage.unlockAchievement('score_1000', 'High Roller');
        if (this.combo >= 10) this.storage.unlockAchievement('combo_10', 'Combo Master');
    }

    triggerEvent(type) {
        this.currentEvent = type;
        this.ui.eventBanner.textContent = type === 'METEOR' ? 'METEOR SHOWER!' : 'DARKNESS FALLS!';
        this.ui.eventBanner.classList.remove('hidden');

        if (type === 'DARKNESS') this.ui.darkness.classList.remove('hidden');

        setTimeout(() => {
            this.currentEvent = null;
            this.ui.eventBanner.classList.add('hidden');
            this.ui.darkness.classList.add('hidden');
        }, 10000); // 10s duration
    }

    activatePowerup(type) {
        if (type === 'slow') {
            this.timeScale = 0.5;
            setTimeout(() => this.timeScale = 1.0, CONFIG.POWERUP_DURATION);
            this.addPowerupBadge('SLOW TIME');
        } else if (type === 'bomb') {
            this.enemies.forEach(e => {
                e.markedForDeletion = true;
                this.particles.spawn(e.x, e.y, '#f00', 10);
                this.score += 50;
            });
            this.audio.playSound('shoot');
        } else {
            this.player.activatePowerup(type);
            this.addPowerupBadge(type.toUpperCase());
        }
    }

    addPowerupBadge(text) {
        const badge = document.createElement('div');
        badge.className = 'powerup-badge';
        badge.textContent = text;
        this.ui.powerupList.appendChild(badge);
        setTimeout(() => badge.remove(), CONFIG.POWERUP_DURATION);
    }

    checkCollision(r1, r2) {
        return (r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height && r1.y + r1.height > r2.y);
    }

    updateHUD() {
        this.ui.score.textContent = Math.floor(this.score);
        this.ui.level.textContent = this.level;
        this.ui.combo.textContent = `x${this.combo}`;
        this.ui.multiplier.textContent = `${(1 + this.combo * 0.1).toFixed(1)}x`;

        // Darkness spotlight
        if (this.currentEvent === 'DARKNESS') {
            this.ui.darkness.style.setProperty('--x', `${this.player.x + this.player.width / 2}px`);
            this.ui.darkness.style.setProperty('--y', `${this.player.y + this.player.height / 2}px`);
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.audio.playSound('hit');

        if (this.score > this.storage.highScore) {
            this.storage.highScore = Math.floor(this.score);
            this.storage.save();
        }

        document.getElementById('go-score').textContent = Math.floor(this.score);
        document.getElementById('go-best').textContent = this.storage.highScore;
        this.showScreen('gameover');
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.update(dt);

        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
            if (this.player) this.player.draw(this.ctx);
            this.enemies.forEach(e => e.draw(this.ctx));
            this.powerups.forEach(p => p.draw(this.ctx));
            this.particles.draw(this.ctx);
        }

        requestAnimationFrame(this.loop);
    }
}

// Start
const game = new Game();
