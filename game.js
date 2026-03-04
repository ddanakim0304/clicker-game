/* ================= SETUP ================= */
const sfxPerson  = new Audio('Audio/person.mp3');
const sfxUpgrade = new Audio('Audio/upgrade.mp3');
const sfxPoop    = new Audio('Audio/poop.mp3');
function playSound(sfx) { sfx.pause(); sfx.currentTime = 0; sfx.play().catch(() => {}); }

/* ================= TOOLTIP ================= */
const _tt = document.createElement('div');
_tt.id = 'js-tooltip';
document.body.appendChild(_tt);
function showTooltip(el, text) {
    _tt.innerText = text;
    _tt.style.display = 'block';
    const r = el.getBoundingClientRect();
    _tt.style.left = (r.left + r.width / 2) + 'px';
    _tt.style.top  = (r.top - 8) + 'px';
    // flip below if too close to top
    if (r.top - _tt.offsetHeight - 8 < 0) {
        _tt.style.top = (r.bottom + 8) + 'px';
        _tt.style.transform = 'translateX(-50%)';
    } else {
        _tt.style.transform = 'translateX(-50%) translateY(-100%)';
    }
}
function hideTooltip() { _tt.style.display = 'none'; }

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

let population = 0;
let currencyPoop = 0; // Money to spend
let totalPoop = 0;    // Lifetime poop (for leveling up)
let pps = 0;          // Poop Per Second

let entities =[];
let poopPiles = [];
let particles =[];
let speechBubbles = [];
const poopPhrases = [
    "Oops!", "It smells!", "It's not me!", "Helppppppppp", 
    "Code Brown!", "Pardon me...", "Uh oh", 
    "Who did that?", 
    "My bad!", "Do not enter!", "Emergency!",
    "Why is it green?", "Send help!"
];
let currentLevelIdx = 0;
let isSpaceMode = false;
let lastTime = performance.now();

/* ================= GENERATORS ================= */
const buildings = {
    chamberPot: { id: 'chamberPot', name: "Chamber Pot", icon: "🏺", count: 0, cost: 15, basePPS: 2, desc: "A simple pot.", tier: 0, phrases: ["Pot full!"] },
    portaPotty: { id: 'portaPotty', name: "Porta-Potty", icon: "🚪", count: 0, cost: 100, basePPS: 5, desc: "Smells terrible.", tier: 0, phrases: [] },
    restroom:   { id: 'restroom', name: "Public Restroom", icon: "🚻", count: 0, cost: 1100, basePPS: 15, desc: "Porcelain throne.", tier: 0, phrases: ["Restroom out of order!"] },
    tacoTruck:  { id: 'tacoTruck', name: "Taco Truck", icon: "🌮", count: 0, cost: 12000, basePPS: 50, desc: "Spicy food.", tier: 0, phrases: ["I shouldn't have had that taco.", "Ay caramba!", "Too spicy!!"] },
    sewer:      { id: 'sewer', name: "Sewer System", icon: "🕳️", count: 0, cost: 130000, basePPS: 150, desc: "Underground highway.", tier: 0, phrases: [] },
    bioReactor: { id: 'bioReactor', name: "Bio-Reactor", icon: "☢️", count: 0, cost: 2000000, basePPS: 2000, desc: "Pure poop energy.", tier: 0, phrases: ["Radioactive!!"] }
};

/* ================= UPGRADES (Multipliers) ================= */
const upgrades = {
    // Click upgrades
    click1: { id: 'click1', name: "Carpooling",    icon: "🚗", cost: 10000,      bought: false, revealed: false, desc: "Clicking spawns 2 people.",   phrases: [],              buildingKey: null },
    click2: { id: 'click2', name: "Bus Route",     icon: "🚌", cost: 150000,     bought: false, revealed: false, desc: "Clicking spawns 10 people.",  phrases: ["Bus is FULL!"], buildingKey: null },
    // Entity speed/output
    curry:  { id: 'curry',  name: "Spicy Curry",   icon: "🍛", cost: 250000,     bought: false, revealed: false, desc: "People poop 2× faster!",      phrases: ["Too much curry"], buildingKey: null },
    prune:  { id: 'prune',  name: "Prune Juice",   icon: "🧃", cost: 80000000,   bought: false, revealed: false, desc: "People drop 2× poop!",        phrases: ["Prune power!"], buildingKey: null },
    // Chamber Pot tiers
    chamberPot_1: { id: 'chamberPot_1', name: "2-Ply TP",       icon: "🧻", cost: 500,        bought: false, revealed: false, desc: "Chamber Pots ×2.",  buildingKey: 'chamberPot' },
    chamberPot_2: { id: 'chamberPot_2', name: "3-Ply TP", icon: "🧻🧻", cost: 5000,       bought: false, revealed: false, desc: "Chamber Pots ×4.",  buildingKey: 'chamberPot' },
    chamberPot_3: { id: 'chamberPot_3', name: "10-Ply TP",    icon: "🧻🧻🧻", cost: 80000,      bought: false, revealed: false, desc: "Chamber Pots ×8.",  buildingKey: 'chamberPot' },
    // Porta-Potty tiers
    portaPotty_1: { id: 'portaPotty_1', name: "Air Freshener",     icon: "🌸",       cost: 2000,       bought: false, revealed: false, desc: "Porta-Potties ×2.", buildingKey: 'portaPotty' },
    portaPotty_2: { id: 'portaPotty_2', name: "2x Air Freshener",  icon: "🌸🌸",     cost: 25000,      bought: false, revealed: false, desc: "Porta-Potties ×4.", buildingKey: 'portaPotty' },
    portaPotty_3: { id: 'portaPotty_3', name: "3x Air Freshener",  icon: "🌸🌸🌸",   cost: 300000,     bought: false, revealed: false, desc: "Porta-Potties ×8.", buildingKey: 'portaPotty' },
    // Restroom tiers
    restroom_1:   { id: 'restroom_1',   name: "Heated Bidet",      icon: "🚿",       cost: 5500,       bought: false, revealed: false, desc: "Restrooms ×2.",     buildingKey: 'restroom'   },
    restroom_2:   { id: 'restroom_2',   name: "2x Heated Bidet",   icon: "🚿🚿",     cost: 55000,      bought: false, revealed: false, desc: "Restrooms ×4.",     buildingKey: 'restroom'   },
    restroom_3:   { id: 'restroom_3',   name: "3x Heated Bidet",   icon: "🚿🚿🚿",   cost: 600000,     bought: false, revealed: false, desc: "Restrooms ×8.",     buildingKey: 'restroom'   },
    // Taco Truck tiers
    tacoTruck_1:  { id: 'tacoTruck_1',  name: "Hot Sauce",         icon: "🌶️",       cost: 60000,      bought: false, revealed: false, desc: "Taco Trucks ×2.",   buildingKey: 'tacoTruck'  },
    tacoTruck_2:  { id: 'tacoTruck_2',  name: "2x Hot Sauce",      icon: "�️🌶️",     cost: 600000,     bought: false, revealed: false, desc: "Taco Trucks ×4.",   buildingKey: 'tacoTruck'  },
    tacoTruck_3:  { id: 'tacoTruck_3',  name: "3x Hot Sauce",      icon: "🌶️🌶️🌶️",   cost: 6000000,    bought: false, revealed: false, desc: "Taco Trucks ×8.",   buildingKey: 'tacoTruck'  },
    // Sewer tiers
    sewer_1:      { id: 'sewer_1',      name: "Wider Pipes",       icon: "🔧",       cost: 650000,     bought: false, revealed: false, desc: "Sewer System ×2.",  buildingKey: 'sewer'      },
    sewer_2:      { id: 'sewer_2',      name: "2x Wider Pipes",    icon: "🔧🔧",     cost: 6500000,    bought: false, revealed: false, desc: "Sewer System ×4.",  buildingKey: 'sewer'      },
    sewer_3:      { id: 'sewer_3',      name: "3x Wider Pipes",    icon: "🔧🔧🔧",   cost: 65000000,   bought: false, revealed: false, desc: "Sewer System ×8.",  buildingKey: 'sewer'      },
    // Bio-Reactor tiers
    bioReactor_1: { id: 'bioReactor_1', name: "Uranium Core",      icon: "🔋",       cost: 10000000,   bought: false, revealed: false, desc: "Bio-Reactor ×2.",   buildingKey: 'bioReactor' },
    bioReactor_2: { id: 'bioReactor_2', name: "2x Uranium Core",   icon: "🔋🔋",     cost: 100000000,  bought: false, revealed: false, desc: "Bio-Reactor ×4.",   buildingKey: 'bioReactor' },
    bioReactor_3: { id: 'bioReactor_3', name: "3x Uranium Core",   icon: "🔋🔋🔋",   cost: 1000000000, bought: false, revealed: false, desc: "Bio-Reactor ×8.",   buildingKey: 'bioReactor' },
};

const levels = [
  { name: "House",
    goal: 100,
    w: 800, h: 600, r: 8, bg: "#ffffff",
    desc: "It starts with a roommate..."
  },

  { name: "Village",
    goal: 500,
    w: 1000, h: 750, r: 7, bg: "#fafafa",
    desc: "Word spreads."
  },

  { name: "City",
    goal: 2500,
    w: 1200, h: 900, r: 6, bg: "#f5f5f5",
    desc: "Traffic jams caused by the poop trucks."
  },

  { name: "Country",
    goal: 10000,
    w: 1500, h: 1100, r: 5, bg: "#f0f0f0",
    desc: "Tourism plummets."
  },

  { name: "Continent",
    goal: 40000,
    w: 2000, h: 1500, r: 4, bg: "#eaeaea",
    desc: "Satellites detect a suspicious brown expansion."
  },

  { name: "Earth",
    goal: 100000,
    w: 2500, h: 1800, r: 3, bg: "#e0e0e0",
    desc: "Congratulations! The entire planet smells."
  },

  // --- BEYOND EARTH ---

  { name: "Solar System",
    goal: 500000,
    w: 3000, h: 2200, r: 3, bg: "#dcdcdc",
    desc: "NASA files an official complaint."
  },

  { name: "Galaxy",
    goal: 2500000,
    w: 3500, h: 2600, r: 2, bg: "#d0d0d0",
    desc: "Aliens spot you and decide not to visit."
  },

  { name: "Local Group",
    goal: 10000000,
    w: 4000, h: 3000, r: 2, bg: "#c8c8c8",
    desc: "Andromeda requests you stop sending the smell over."
  },

  { name: "Universe",
    goal: 50000000,
    w: 5000, h: 3500, r: 1, bg: "#c0c0c0",
    desc: "Cosmic background radiation now smells weird."
  },

  // --- BEYOND UNIVERSE ---

  { name: "Multiverse",
    goal: 250000000,
    w: 6000, h: 4000, r: 1, bg: "#9e9e9e",
    desc: "Infinite universes, infinite toilets to clog."
  },

  { name: "Omniverse",
    goal: 1000000000,
    w: 7000, h: 4500, r: 1, bg: "#b0b0b0",
    desc: "All universes kneel before the stench."
  },

  { name: "Hyperverse",
    goal: 5000000000,
    w: 8000, h: 5000, r: 1, bg: "#8b8b8b",
    desc: "Dimensions collapse under poop pressure."
  },

  { name: "Eterniverse",
    goal: 20000000000,
    w: 9000, h: 5500, r: 1, bg: "#7c7c7c",
    desc: "Time loops itself to avoid the smell."
  },

  { name: "Omni-Temporal Realm",
    goal: 100000000000,
    w: 10000, h: 6000, r: 1, bg: "#6b6b6b",
    desc: "Your poop is now both past and future."
  },

  { name: "Conceptual Plane",
    goal: 500000000000,
    w: 11000, h: 6500, r: 1, bg: "#4b4b4b",
    desc: "Poop manifests as pure idea."
  },

  { name: "Platonic Idealverse",
    goal: 2000000000000,
    w: 12000, h: 7000, r: 1, bg: "#3f3f3f",
    desc: "The perfect form of poop… has been achieved."
  },

  { name: "Meta-Existence Layer",
    goal: 10000000000000,
    w: 13000, h: 7500, r: 1, bg: "#2b2b2b",
    desc: "Poop be or not Poop be."
  },

  { name: "Developer Console",
    goal: 50000000000000,
    w: 14000, h: 8000, r: 1, bg: "#191919",
    desc: "You see the code. It judges you."
  },

  { name: "The Final Level",
    goal: 99999999999999,
    w: 15000, h: 8500, r: 1, bg: "#000000",
    desc: "You've won. There is nowhere left for poop to go."
  }
];

/* ================= LOGIC ================= */

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        let speed = isSpaceMode ? 2 : 1;
        this.vx = (Math.random() - 0.5) * 2 * speed;
        this.vy = (Math.random() - 0.5) * 2 * speed;
        this.radius = levels[currentLevelIdx].r;
        this.color = `hsl(0, 0%, ${30 + Math.random() * 30}%)`;
        this.poopTimer = Math.random() * 200 + 100;
    }

    update(w, h) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > w) { this.vx *= -1; this.x = Math.max(0, Math.min(w, this.x)); }
        if (this.y < 0 || this.y > h) { this.vy *= -1; this.y = Math.max(0, Math.min(h, this.y)); }

        this.poopTimer--;
        if (this.poopTimer <= 0) {
            this.makePoop();
            
            // Curry Upgrade makes them poop faster
            let speedMult = upgrades.curry.bought ? 2 : 1;
            let baseTimer = Math.floor(200 / speedMult);
            this.poopTimer = Math.max(30, baseTimer + Math.random() * 50);
        }
    }

    makePoop() {
        // Prune upgrade makes them drop 2
        let amount = upgrades.prune.bought ? 2 : 1;
        
        // Cap visual poop arrays to prevent crashing browser
        if (poopPiles.length < 5000) {
            for(let i=0; i<amount; i++) {
                poopPiles.push({
                    x: this.x + (Math.random() - 0.5) * 20,
                    y: this.y + (Math.random() - 0.5) * 20
                });
            }
        }

        currencyPoop += amount;
        totalPoop += amount;
        spawnFloater(this.x, this.y, `💩+${amount}`);
        
        // 3% chance to say something funny if still on Earth
        if (currentLevelIdx <= 5 && Math.random() < 0.03 && speechBubbles.length < 15) {
            // Build active pool: generic + unlocked building/upgrade phrases
            let pool = [...poopPhrases];
            Object.values(buildings).forEach(b => { if (b.count > 0) pool.push(...b.phrases); });
            Object.values(upgrades).forEach(u => { if (u.bought && u.phrases) pool.push(...u.phrases); });
            const txt = pool[Math.floor(Math.random() * pool.length)];
            speechBubbles.push({ entity: this, text: txt, life: 120, offsetY: -12 });
        }

        checkLevelUp();
    }

    draw() {
        if (population > 5000) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, 2, 2);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }
}

function drawPoop() {
    ctx.font = "16px Arial";
    for (let pile of poopPiles) {
        if (population > 5000) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(pile.x-1, pile.y-1, 2, 2);
        } else {
            ctx.fillText('💩', pile.x-8, pile.y+8);
        }
    }
}

/* ================= CONTROLS ================= */

function addPersonClick() {
    playSound(sfxPerson);
    let spawnCount = 1;
    if (upgrades.click1.bought) spawnCount = 2;
    if (upgrades.click2.bought) spawnCount = 10;

    for (let i = 0; i < spawnCount; i++) {
        entities.push(new Entity(Math.random() * canvas.width, Math.random() * canvas.height));
        population++;
    }
    calcPPS();
    updateUI();
}

function updateClickBtnLabel() {
    let spawnCount = 1;
    if (upgrades.click1.bought) spawnCount = 2;
    if (upgrades.click2.bought) spawnCount = 10;
    const label = spawnCount === 1 ? '+1 Person' : `+${spawnCount} People`;
    document.getElementById('click-btn').innerText = label;
}

function calcPPS() {
    let newPPS = 0;

    // Each building uses its tier multiplier: 2^tier
    for (const b of Object.values(buildings)) {
        newPPS += b.count * b.basePPS * Math.pow(2, b.tier);
    }

    // Canvas entities poop rate
    let speedMult = upgrades.curry.bought ? 2 : 1;
    let avgTimer = Math.max(30, Math.floor(200 / speedMult) + 25);
    let pruneMult = upgrades.prune.bought ? 2 : 1;
    newPPS += population * (60 / avgTimer) * pruneMult;

    pps = newPPS;
}

function buyBuilding(key) {
    let b = buildings[key];
    if (currencyPoop >= b.cost) {
        playSound(sfxUpgrade);
        currencyPoop -= b.cost;
        b.count++;
        b.cost = Math.floor(b.cost * 1.15); // Standard idle scaling
        calcPPS();
        renderShop();
    }
}

function buyUpgrade(key) {
    let u = upgrades[key];
    if (currencyPoop >= u.cost && !u.bought) {
        playSound(sfxUpgrade);
        currencyPoop -= u.cost;
        u.bought = true;
        // Building-specific upgrades increment their tier (multiplier doubles)
        if (u.buildingKey) buildings[u.buildingKey].tier++;
        calcPPS();
        renderShop();
    }
}

function checkLevelUp() {
    const lvl = levels[currentLevelIdx];
    if (totalPoop >= lvl.goal && currentLevelIdx < levels.length - 1) {
        currentLevelIdx++;
        const nextLvl = levels[currentLevelIdx];

        canvas.width = nextLvl.w;
        canvas.height = nextLvl.h;
        canvas.style.background = nextLvl.bg;
        fitCanvasToStage();

        entities.forEach(e => e.radius = nextLvl.r);

        const popup = document.getElementById('lvl-popup');
        document.getElementById('popup-title').innerText = nextLvl.name;
        document.getElementById('popup-desc').innerText = nextLvl.desc;
        popup.classList.add('show');
        playSound(sfxPoop);
        setTimeout(() => popup.classList.remove('show'), 3000);
    }
}

function fitCanvasToStage() {
    const stage = document.getElementById('game-stage');
    const availW = stage.clientWidth * 0.95;
    const availH = stage.clientHeight - 90 - 60; // minus padding-top and button area
    const scale  = Math.min(availW / canvas.width, availH / canvas.height);
    canvas.style.width  = Math.round(canvas.width  * scale) + 'px';
    canvas.style.height = Math.round(canvas.height * scale) + 'px';
}

function spawnFloater(x, y, text) {
    if (population > 2000) return;
    particles.push({x, y, text, life: 30});
}

/* ================= UI RENDERING ================= */

function makeUpgradeIcon(key, u) {
    let div = document.createElement('div');
    div.className = 'upgrade-icon' + (currencyPoop >= u.cost ? '' : ' disabled');
    div.dataset.upgradeKey = key;
    div.innerHTML = u.icon;
    const uTip = `${u.name}\nCost: ${u.cost.toLocaleString()} 💩\n${u.desc}`;
    div.addEventListener('mouseenter', () => showTooltip(div, uTip));
    div.addEventListener('mouseleave', hideTooltip);
    div.onclick = () => buyUpgrade(key);
    return div;
}

function renderShop() {
    // 1. Render Upgrades
    const upgContainer = document.getElementById('upgrades-container');
    upgContainer.innerHTML = '';
    for (const key of Object.keys(upgrades)) {
        const u = upgrades[key];
        if (u.bought || !u.revealed) continue;
        upgContainer.appendChild(makeUpgradeIcon(key, u));
    }

    // Render Buildings — always show owned; show one next-unlockable
    const bldContainer = document.getElementById('buildings-container');
    bldContainer.innerHTML = '';
    const buildingKeys = Object.keys(buildings);
    let shownNextUnlockable = false;
    for (let i = 0; i < buildingKeys.length; i++) {
        let key = buildingKeys[i];
        let b = buildings[key];
        const owned = b.count > 0;
        const nextInChain = !shownNextUnlockable && (i === 0 || buildings[buildingKeys[i - 1]].count > 0);
        if (!owned && !nextInChain) continue;
        if (!owned) shownNextUnlockable = true;

        const tierClass = b.tier > 0 ? ` tier-${Math.min(b.tier, 3)}` : '';
        const mult = Math.pow(2, b.tier);
        let div = document.createElement('div');
        div.className = 'upgrade-card' + tierClass + (currencyPoop >= b.cost ? '' : ' disabled');
        div.dataset.buildingKey = key;
        const bTip = `${b.name}\n${b.basePPS * mult} poop/s (×${mult})\n${b.desc}`;
        div.addEventListener('mouseenter', () => showTooltip(div, bTip));
        div.addEventListener('mouseleave', hideTooltip);
        div.onclick = () => buyBuilding(key);
        div.innerHTML = `
            <div class="card-left card-content">
                <div class="card-icon">${b.icon}</div>
                <div>
                    <div class="card-title">${b.name}</div>
                    <div class="card-cost">${Math.floor(b.cost).toLocaleString()} 💩</div>
                </div>
            </div>
            <div style="text-align:center">
                <div class="card-lvl">${b.count}</div>
                ${b.tier > 0 ? `<div style="font-size:9px;color:#888;margin-top:2px">×${mult}</div>` : ''}
            </div>
        `;
        bldContainer.appendChild(div);
    }
}

function updateShopStates() {
    // Reveal upgrades when affordable — append directly, no full rebuild
    const upgContainer = document.getElementById('upgrades-container');
    for (const key of Object.keys(upgrades)) {
        const u = upgrades[key];
        if (u.bought || u.revealed) continue;
        // Building-tier upgrades: require building owned + previous tier bought
        if (u.buildingKey) {
            if (buildings[u.buildingKey].count === 0) continue;
            const tierNum = parseInt(key.split('_').pop());
            if (tierNum > 1) {
                const prevKey = u.buildingKey + '_' + (tierNum - 1);
                if (!upgrades[prevKey] || !upgrades[prevKey].bought) continue;
            }
        }
        if (currencyPoop >= u.cost) {
            u.revealed = true;
            upgContainer.appendChild(makeUpgradeIcon(key, u));
        }
    }

    // Update disabled states on existing icons
    document.querySelectorAll('.upgrade-icon[data-upgrade-key]').forEach(el => {
        const u = upgrades[el.dataset.upgradeKey];
        if (u) el.classList.toggle('disabled', currencyPoop < u.cost);
    });
    document.querySelectorAll('.upgrade-card[data-building-key]').forEach(el => {
        const b = buildings[el.dataset.buildingKey];
        if (b) el.classList.toggle('disabled', currencyPoop < b.cost);
    });
}

function updateUI() {
    document.getElementById('pop-count').innerText = population.toLocaleString();
    document.getElementById('poop-count').innerText = Math.floor(currencyPoop).toLocaleString();
    document.getElementById('pps-display').innerText = `${pps.toFixed(1)} per second`;
    document.getElementById('stat-total').innerText = Math.floor(totalPoop).toLocaleString();

    const lvl = levels[currentLevelIdx];
    document.getElementById('lvl-name').innerText = lvl.name;
    document.getElementById('next-goal').innerText = `💩 Goal: ${lvl.goal.toLocaleString()}`;

    let prevGoal = (currentLevelIdx === 0) ? 0 : levels[currentLevelIdx-1].goal;
    let range = lvl.goal - prevGoal;
    let current = totalPoop - prevGoal;
    let pct = (current / range) * 100;
    document.getElementById('lvl-progress').style.width = Math.min(100, Math.max(0, pct)) + "%";

    // Update shop disabled states without rebuilding DOM
    updateShopStates();
    updateClickBtnLabel();
}

/* ================= LOOP ================= */

function drawSpeechBubbles() {
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = speechBubbles.length - 1; i >= 0; i--) {
        let b = speechBubbles[i];
        
        // Follow entity
        let x = b.entity.x;
        let y = b.entity.y + b.offsetY;

        ctx.save();
        ctx.translate(x, y);

        // Measure text
        const metrics = ctx.measureText(b.text);
        const w = metrics.width + 8;
        const h = 14;
        const yOff = -h - 4;

        // Draw bubble background
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        
        // Bubble body
        ctx.beginPath();
        ctx.rect(-w/2, yOff, w, h);
        ctx.fill();
        ctx.stroke();

        // Triangle tail
        ctx.beginPath();
        ctx.moveTo(-3, yOff + h); 
        ctx.lineTo(0, yOff + h + 4);
        ctx.lineTo(3, yOff + h);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = "#000";
        ctx.fillText(b.text, 0, yOff + h/2);

        ctx.restore();

        b.life--;
        if (b.life <= 0) speechBubbles.splice(i, 1);
    }
}

function loop(currentTime) {
    let dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Passive Poop Generation
    if (pps > 0) {
        let generated = pps * dt;
        currencyPoop += generated;
        totalPoop += generated;
        checkLevelUp();
    }

    ctx.fillStyle = levels[currentLevelIdx].bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let entity of entities) {
        entity.update(canvas.width, canvas.height);
        entity.draw();
    }
    
    drawPoop();
    drawSpeechBubbles();

    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillStyle = "#999";
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        ctx.globalAlpha = p.life / 30;
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
        p.y -= 1;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    updateUI();
    requestAnimationFrame(loop);
}

// Init
canvas.width = levels[0].w;
canvas.height = levels[0].h;
fitCanvasToStage();
window.addEventListener('resize', fitCanvasToStage);
renderShop();
updateUI();
requestAnimationFrame(loop);