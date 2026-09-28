const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const waveEl = document.getElementById("wave");
const coinsEl = document.getElementById("coins");
const livesEl = document.getElementById("lives");

const overlay = document.getElementById("overlay");
const overlayIcon = document.getElementById("overlayIcon");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");

const pauseButton = document.getElementById("pauseButton");
const shopButton = document.getElementById("shopButton");
const achievementButton = document.getElementById("achievementButton");
const shopPanel = document.getElementById("shopPanel");
const achievementPanel = document.getElementById("achievementPanel");
const achievementList = document.getElementById("achievementList");
const toast = document.getElementById("toast");

const W = canvas.width;
const H = canvas.height;

const SAVE_KEY = "spaceInvadersSaveV1";

let save = loadSave();

const keys = {};
let gameRunning = false;
let paused = false;
let animationId = 0;
let lastTime = 0;
let enemyMoveTimer = 0;
let enemyDirection = 1;
let enemyShotTimer = 0;
let ufoTimer = 0;
let waveClearTimer = 0;
let waveMessageTimer = 0;

let score = 0;
let wave = 1;
let lives = 3 + save.extraLives;
let player;
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let shields = [];
let particles = [];
let stars = [];
let ufo = null;

let rapidFireLevel = save.rapidFire;
let engineLevel = save.engine;
let powerLevel = save.power;
let extraLifeLevel = save.extraLives;

const achievements = [
    {
        id: "firstShot",
        title: "First Contact",
        description: "Destroy your first invader.",
        reward: 10,
        check: () => save.totalKills >= 1
    },
    {
        id: "tenKills",
        title: "Alien Hunter",
        description: "Destroy 10 invaders.",
        reward: 20,
        check: () => save.totalKills >= 10
    },
    {
        id: "fiftyKills",
        title: "Space Ace",
        description: "Destroy 50 invaders.",
        reward: 40,
        check: () => save.totalKills >= 50
    },
    {
        id: "hundredKills",
        title: "Galaxy Defender",
        description: "Destroy 100 invaders.",
        reward: 75,
        check: () => save.totalKills >= 100
    },
    {
        id: "wave5",
        title: "Still Standing",
        description: "Reach wave 5.",
        reward: 50,
        check: () => save.bestWave >= 5
    },
    {
        id: "wave10",
        title: "Invader Nightmare",
        description: "Reach wave 10.",
        reward: 100,
        check: () => save.bestWave >= 10
    },
    {
        id: "score1000",
        title: "High Scorer",
        description: "Score 1,000 points in one run.",
        reward: 50,
        check: () => save.bestScore >= 1000
    },
    {
        id: "score10000",
        title: "Legendary Defender",
        description: "Score 10,000 points in one run.",
        reward: 150,
        check: () => save.bestScore >= 10000
    },
    {
        id: "ufo",
        title: "UFO Hunter",
        description: "Destroy a mystery UFO.",
        reward: 75,
        check: () => save.ufoKills >= 1
    },
    {
        id: "combo",
        title: "No Escape",
        description: "Destroy 10 invaders without missing.",
        reward: 60,
        check: () => save.bestKillStreak >= 10
    }
];

function defaultSave() {
    return {
        coins: 0,
        highScore: 0,
        totalKills: 0,
        bestScore: 0,
        bestWave: 0,
        ufoKills: 0,
        bestKillStreak: 0,
        rapidFire: 0,
        engine: 0,
        power: 0,
        extraLives: 0,
        unlocked: []
    };
}

function loadSave() {
    try {
        const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
        return { ...defaultSave(), ...(stored || {}) };
    } catch {
        return defaultSave();
    }
}

function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    updateUI();
}

function updateUI() {
    scoreEl.textContent = score.toLocaleString();
    highScoreEl.textContent = save.highScore.toLocaleString();
    waveEl.textContent = wave;
    coinsEl.textContent = save.coins.toLocaleString();
    livesEl.textContent = lives;

    document.getElementById("rapidFireLevel").textContent = `Level ${rapidFireLevel}`;
    document.getElementById("engineLevel").textContent = `Level ${engineLevel}`;
    document.getElementById("powerLevel").textContent = `Level ${powerLevel}`;
    document.getElementById("lifeLevel").textContent = `Level ${extraLifeLevel}`;

    document.getElementById("rapidFireBuy").textContent = `${getUpgradeCost("rapidFire")} 🪙`;
    document.getElementById("engineBuy").textContent = `${getUpgradeCost("engine")} 🪙`;
    document.getElementById("powerBuy").textContent = `${getUpgradeCost("power")} 🪙`;
    document.getElementById("lifeBuy").textContent = `${getUpgradeCost("life")} 🪙`;
}

function getUpgradeCost(type) {
    const levels = {
        rapidFire: rapidFireLevel,
        engine: engineLevel,
        power: powerLevel,
        life: extraLifeLevel
    };
    const base = {
        rapidFire: 50,
        engine: 75,
        power: 100,
        life: 150
    };
    return Math.floor(base[type] * Math.pow(1.65, levels[type]));
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function checkAchievements() {
    for (const achievement of achievements) {
        if (!save.unlocked.includes(achievement.id) && achievement.check()) {
            save.unlocked.push(achievement.id);
            save.coins += achievement.reward;
            showToast(`🏆 ${achievement.title} +${achievement.reward} coins`);
            saveGame();
        }
    }
    renderAchievements();
}

function renderAchievements() {
    achievementList.innerHTML = "";

    for (const achievement of achievements) {
        const unlocked = save.unlocked.includes(achievement.id);
        const item = document.createElement("article");
        item.className = `achievement ${unlocked ? "unlocked" : "locked"}`;
        item.innerHTML = `
            <h3>${unlocked ? "🏆" : "🔒"} ${achievement.title}</h3>
            <p>${achievement.description}</p>
            <span class="reward">${unlocked ? "UNLOCKED" : `REWARD: ${achievement.reward} 🪙`}</span>
        `;
        achievementList.appendChild(item);
    }
}

function setupStars() {
    stars = [];
    for (let i = 0; i < 95; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 12 + 4,
            alpha: Math.random() * .65 + .2
        });
    }
}

function createPlayer() {
    return {
        x: W / 2 - 28,
        y: H - 62,
        width: 56,
        height: 25,
        speed: 330 + engineLevel * 45,
        cooldown: 0,
        invincible: 0
    };
}

function createWave() {
    enemies = [];
    playerBullets = [];
    enemyBullets = [];
    shields = [];
    enemyDirection = 1;
    enemyMoveTimer = 0;
    enemyShotTimer = 0;
    ufo = null;

    const rows = Math.min(4 + Math.floor((wave - 1) / 3), 7);
    const cols = 10;
    const spacingX = 68;
    const startX = (W - (cols - 1) * spacingX) / 2;
    const startY = 75;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            enemies.push({
                x: startX + col * spacingX,
                y: startY + row * 43,
                width: 34,
                height: 25,
                row,
                alive: true,
                frame: Math.random() * Math.PI * 2
            });
        }
    }

    const shieldY = H - 155;
    for (const x of [155, 310, 465, 620]) {
        const blocks = [];
        for (let bx = 0; bx < 7; bx++) {
            for (let by = 0; by < 3; by++) {
                if (!(by === 2 && (bx === 0 || bx === 1 || bx === 5 || bx === 6))) {
                    blocks.push({
                        x: x - 30 + bx * 10,
                        y: shieldY + by * 10,
                        hp: 3
                    });
                }
            }
        }
        shields.push(blocks);
    }
}

function startGame() {
    score = 0;
    wave = 1;
    lives = 3 + extraLifeLevel;
    player = createPlayer();
    particles = [];
    waveClearTimer = 0;
    waveMessageTimer = 0;
    gameRunning = true;
    paused = false;
    lastTime = performance.now();

    createWave();
    overlay.classList.add("hidden");
    pauseButton.textContent = "PAUSE";
    updateUI();
    playSound("start");
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    paused = false;

    if (score > save.highScore) save.highScore = score;
    if (score > save.bestScore) save.bestScore = score;
    if (wave > save.bestWave) save.bestWave = wave;

    saveGame();
    checkAchievements();

    overlayIcon.textContent = "💥";
    overlayTitle.textContent = "GAME OVER";
    overlayText.textContent = `Final score: ${score.toLocaleString()} • Wave ${wave}`;
    startButton.textContent = "PLAY AGAIN";
    overlay.classList.remove("hidden");
    pauseButton.textContent = "PAUSE";

    playSound("gameover");
}

function nextWave() {
    wave++;
    if (wave > save.bestWave) save.bestWave = wave;
    saveGame();
    lives = Math.min(lives + 1, 5 + extraLifeLevel);
    waveMessageTimer = 1500;
    createWave();
    checkAchievements();
    playSound("wave");
}

function togglePause() {
    if (!gameRunning) return;
    paused = !paused;
    pauseButton.textContent = paused ? "RESUME" : "PAUSE";
    if (!paused) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    }
}

function shoot() {
    if (!gameRunning || paused || !player || player.cooldown > 0) return;

    playerBullets.push({
        x: player.x + player.width / 2,
        y: player.y - 5,
        width: 4,
        height: 14,
        speed: 600,
        damage: 1 + Math.floor(powerLevel / 2)
    });

    player.cooldown = Math.max(0.14 - rapidFireLevel * 0.018, 0.045);
    playSound("shoot");
}

function enemyShoot() {
    const alive = enemies.filter(e => e.alive);
    if (!alive.length) return;

    const columns = new Map();
    for (const enemy of alive) {
        const col = Math.round(enemy.x / 68);
        if (!columns.has(col) || enemy.y > columns.get(col).y) {
            columns.set(col, enemy);
        }
    }

    const shooters = [...columns.values()];
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];

    enemyBullets.push({
        x: shooter.x,
        y: shooter.y + shooter.height,
        width: 5,
        height: 13,
        speed: 185 + wave * 10
    });
}

function damagePlayer() {
    if (player.invincible > 0) return;

    lives--;
    player.invincible = 1.8;
    player.x = W / 2 - player.width / 2;
    enemyBullets = [];
    createParticles(player.x + player.width / 2, player.y, 18);
    playSound("hit");

    if (lives <= 0) {
        endGame();
    }
}

function destroyEnemy(enemy) {
    enemy.alive = false;
    const points = (enemy.row + 1) * 10 * wave;
    score += points;
    save.coins += Math.max(1, Math.floor(points / 25));
    save.totalKills++;

    createParticles(enemy.x, enemy.y, 10);
    playSound("enemy");
    checkAchievements();
}

function destroyUFO() {
    if (!ufo) return;

    score += 500 * wave;
    save.coins += 25 + wave * 2;
    save.ufoKills++;
    createParticles(ufo.x, ufo.y, 30);
    ufo = null;
    showToast("🛸 UFO DESTROYED! +BONUS");
    playSound("ufo");
    checkAchievements();
}

function update(dt) {
    if (!player) return;

    for (const star of stars) {
        star.y += star.speed * dt;
        if (star.y > H) {
            star.y = 0;
            star.x = Math.random() * W;
        }
    }

    if (keys.ArrowLeft || keys.a || keys.A) {
        player.x -= player.speed * dt;
    }
    if (keys.ArrowRight || keys.d || keys.D) {
        player.x += player.speed * dt;
    }

    player.x = Math.max(10, Math.min(W - player.width - 10, player.x));

    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invincible = Math.max(0, player.invincible - dt);

    enemyMoveTimer += dt * 1000;
    enemyShotTimer += dt * 1000;
    ufoTimer += dt * 1000;

    const aliveEnemies = enemies.filter(e => e.alive);
    if (!aliveEnemies.length) {
        waveClearTimer += dt * 1000;
        if (waveClearTimer > 700) {
            nextWave();
        }
    } else {
        const speed = Math.min(170 + wave * 16 + (enemies.length - aliveEnemies.length) * 2, 390);
        const moveInterval = Math.max(1050 - speed * 3.2, 125);

        if (enemyMoveTimer >= moveInterval) {
            enemyMoveTimer = 0;

            let edgeHit = false;
            for (const enemy of aliveEnemies) {
                enemy.x += enemyDirection * 20;
                if (enemy.x < 28 || enemy.x > W - 28) edgeHit = true;
            }

            if (edgeHit) {
                enemyDirection *= -1;
                for (const enemy of aliveEnemies) {
                    enemy.y += 20;
                }
            }
        }

        for (const enemy of aliveEnemies) {
            enemy.frame += dt * 5;
            if (enemy.y + enemy.height >= player.y - 10) {
                endGame();
                return;
            }
        }

        if (enemyShotTimer > Math.max(500 - wave * 12, 180)) {
            enemyShotTimer = 0;
            enemyShoot();
        }
    }

    if (ufoTimer > 8500 && !ufo && Math.random() < .5) {
        ufo = {
            x: -40,
            y: 42,
            width: 38,
            height: 18,
            speed: 130 + wave * 5
        };
        ufoTimer = 0;
        playSound("ufoAppear");
    }

    if (ufo) {
        ufo.x += ufo.speed * dt;
        if (ufo.x > W + 50) ufo = null;
    }

    for (const bullet of playerBullets) {
        bullet.y -= bullet.speed * dt;
    }

    for (const bullet of enemyBullets) {
        bullet.y += bullet.speed * dt;
    }

    playerBullets = playerBullets.filter(b => b.y + b.height > 0);
    enemyBullets = enemyBullets.filter(b => b.y < H + 20);

    for (const bullet of playerBullets) {
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            if (rectHit(bullet, enemy)) {
                bullet.y = -100;
                enemy.hp = (enemy.hp || 1) - bullet.damage;

                if (enemy.hp <= 0) {
                    destroyEnemy(enemy);
                } else {
                    createParticles(enemy.x, enemy.y, 4);
                }
                break;
            }
        }

        if (ufo && rectHit(bullet, ufo)) {
            bullet.y = -100;
            destroyUFO();
        }
    }

    for (const bullet of enemyBullets) {
        if (rectHit(bullet, player)) {
            bullet.y = H + 100;
            damagePlayer();
        }
    }

    for (const group of shields) {
        for (const block of group) {
            if (block.hp <= 0) continue;

            for (const bullet of [...playerBullets, ...enemyBullets]) {
                if (rectHit(bullet, { x: block.x, y: block.y, width: 9, height: 9 })) {
                    block.hp--;
                    bullet.y = bullet.y < block.y ? -100 : H + 100;
                    createParticles(block.x, block.y, 2);
                }
            }
        }
    }

    updateParticles(dt);
    updateUI();
}

function rectHit(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function createParticles(x, y, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - .5) * 220,
            vy: (Math.random() - .5) * 220,
            life: .45 + Math.random() * .45,
            size: 2 + Math.random() * 4
        });
    }
}

function updateParticles(dt) {
    for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#070b18";
    ctx.fillRect(0, 0, W, H);

    drawStars();

    if (!player) return;

    drawShields();
    drawEnemies();
    drawPlayerBullets();
    drawEnemyBullets();
    drawUFO();
    drawPlayer();
    drawParticles();

    if (waveMessageTimer > 0) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = 'bold 42px "Arial"';
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#6554c0";
        ctx.shadowBlur = 18;
        ctx.fillText(`WAVE ${wave}`, W / 2, H / 2);
        ctx.restore();
        waveMessageTimer -= 16.67;
    }

    if (paused) {
        ctx.fillStyle = "rgba(5, 8, 20, .72)";
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.textAlign = "center";
        ctx.font = 'bold 45px "Arial"';
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PAUSED", W / 2, H / 2);
        ctx.font = '18px "Arial"';
        ctx.fillText("Press P or PAUSE to resume", W / 2, H / 2 + 38);
        ctx.restore();
    }
}

function drawStars() {
    for (const star of stars) {
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
}

function drawPlayer() {
    if (player.invincible > 0 && Math.floor(player.invincible * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.fillStyle = "#67e8ff";
    ctx.shadowColor = "#67e8ff";
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(player.width, player.height);
    ctx.lineTo(player.width * .68, player.height - 4);
    ctx.lineTo(player.width / 2, player.height - 13);
    ctx.lineTo(player.width * .32, player.height - 4);
    ctx.lineTo(0, player.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(player.width / 2 - 5, 7, 10, 10);

    ctx.restore();
}

function drawEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const bob = Math.sin(enemy.frame) * 2;
        ctx.save();
        ctx.translate(enemy.x, enemy.y + bob);
        ctx.fillStyle = enemy.row % 2 === 0 ? "#b77cff" : "#67e8ff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;

        ctx.fillRect(-16, -8, 32, 15);
        ctx.fillRect(-11, -13, 22, 6);
        ctx.fillRect(-12, 7, 5, 7);
        ctx.fillRect(7, 7, 5, 7);
        ctx.fillRect(-21, -3, 5, 9);
        ctx.fillRect(16, -3, 5, 9);

        ctx.fillStyle = "#070b18";
        ctx.fillRect(-9, -4, 5, 5);
        ctx.fillRect(4, -4, 5, 5);

        ctx.restore();
    }
}

function drawPlayerBullets() {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#67e8ff";
    ctx.shadowBlur = 12;

    for (const bullet of playerBullets) {
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
    }

    ctx.restore();
}

function drawEnemyBullets() {
    ctx.save();
    ctx.fillStyle = "#ff6b9d";
    ctx.shadowColor = "#ff6b9d";
    ctx.shadowBlur = 10;

    for (const bullet of enemyBullets) {
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
    }

    ctx.restore();
}

function drawShields() {
    for (const group of shields) {
        for (const block of group) {
            if (block.hp <= 0) continue;

            ctx.globalAlpha = block.hp / 3;
            ctx.fillStyle = "#6dff9b";
            ctx.fillRect(block.x, block.y, 8, 8);
        }
    }
    ctx.globalAlpha = 1;
}

function drawUFO() {
    if (!ufo) return;

    ctx.save();
    ctx.translate(ufo.x, ufo.y);
    ctx.fillStyle = "#ff5f7e";
    ctx.shadowColor = "#ff5f7e";
    ctx.shadowBlur = 16;

    ctx.fillRect(-18, -3, 36, 9);
    ctx.fillRect(-11, -8, 22, 7);
    ctx.fillRect(-7, -12, 14, 5);
    ctx.fillRect(-13, 6, 5, 4);
    ctx.fillRect(8, 6, 5, 4);

    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const dt = Math.min((timestamp - lastTime) / 1000, .033);
    lastTime = timestamp;

    if (!paused) {
        update(dt);
    }

    draw();

    animationId = requestAnimationFrame(gameLoop);
}

function buyUpgrade(type) {
    const cost = getUpgradeCost(type);

    if (save.coins < cost) {
        showToast("Not enough coins!");
        playSound("error");
        return;
    }

    save.coins -= cost;

    if (type === "rapidFire") rapidFireLevel++;
    if (type === "engine") engineLevel++;
    if (type === "power") powerLevel++;
    if (type === "life") extraLifeLevel++;

    if (player && type === "engine") {
        player.speed = 330 + engineLevel * 45;
    }

    save.rapidFire = rapidFireLevel;
    save.engine = engineLevel;
    save.power = powerLevel;
    save.extraLives = extraLifeLevel;

    saveGame();
    showToast("Upgrade purchased!");
    playSound("buy");
}

function resetProgress() {
    if (!confirm("Reset all Space Invaders progress? This cannot be undone.")) return;

    localStorage.removeItem(SAVE_KEY);
    save = loadSave();

    rapidFireLevel = 0;
    engineLevel = 0;
    powerLevel = 0;
    extraLifeLevel = 0;

    score = 0;
    wave = 1;
    lives = 3;

    updateUI();
    renderAchievements();
    showToast("Progress reset.");
}

let audioContext = null;

function getAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSound(type) {
    try {
        const audio = getAudio();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        const sounds = {
            shoot: [520, 0.045, "square"],
            enemy: [180, 0.08, "square"],
            hit: [90, 0.18, "sawtooth"],
            start: [300, 0.2, "square"],
            wave: [600, 0.25, "square"],
            gameover: [100, 0.4, "sawtooth"],
            ufo: [850, 0.25, "triangle"],
            ufoAppear: [700, 0.12, "triangle"],
            buy: [720, 0.08, "square"],
            error: [120, 0.1, "square"]
        };

        const [frequency, duration, waveType] = sounds[type] || sounds.shoot;

        oscillator.type = waveType;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.045, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
    } catch {
        // Audio is optional.
    }
}

function bindHoldButton(button, key) {
    const down = e => {
        e.preventDefault();
        keys[key] = true;
    };

    const up = e => {
        e.preventDefault();
        keys[key] = false;
    };

    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
}

window.addEventListener("keydown", e => {
    keys[e.key] = true;

    if (["ArrowLeft", "ArrowRight", " ", "a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === " ") {
        shoot();
    }

    if (e.key.toLowerCase() === "p") {
        togglePause();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key] = false;
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);

shopButton.addEventListener("click", () => {
    shopPanel.classList.toggle("hidden");
    achievementPanel.classList.add("hidden");
});

achievementButton.addEventListener("click", () => {
    achievementPanel.classList.toggle("hidden");
    shopPanel.classList.add("hidden");
    renderAchievements();
});

document.querySelectorAll(".closeButton").forEach(button => {
    button.addEventListener("click", () => {
        document.getElementById(button.dataset.close).classList.add("hidden");
    });
});

document.getElementById("rapidFireBuy").addEventListener("click", () => buyUpgrade("rapidFire"));
document.getElementById("engineBuy").addEventListener("click", () => buyUpgrade("engine"));
document.getElementById("powerBuy").addEventListener("click", () => buyUpgrade("power"));
document.getElementById("lifeBuy").addEventListener("click", () => buyUpgrade("life"));
document.getElementById("resetProgress").addEventListener("click", resetProgress);

bindHoldButton(document.getElementById("leftButton"), "ArrowLeft");
bindHoldButton(document.getElementById("rightButton"), "ArrowRight");

document.getElementById("fireButton").addEventListener("pointerdown", e => {
    e.preventDefault();
    shoot();
});

setupStars();
renderAchievements();
updateUI();
draw();
