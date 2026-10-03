const ROWS = 13;
const COLS = 10;
const CORE_ROW = ROWS - 1;

const STARTING_GOLD = 500;
const CORE_MAX_HP = 1000;
const TOTAL_WAVES = 8;

const BUILDINGS = {
    wall: {
        name: "Wall",
        symbol: "🧱",
        cost: 20,
        maxHp: 220,
        type: "defense"
    },

    turret: {
        name: "Machine Gun",
        symbol: "🔫",
        cost: 60,
        maxHp: 100,
        type: "attack",
        damage: 12,
        attackCooldown: 700,
        range: 4.5
    },

    ice: {
        name: "Ice Tower",
        symbol: "❄️",
        cost: 80,
        maxHp: 100,
        type: "attack",
        damage: 7,
        attackCooldown: 1200,
        range: 4.5,
        slow: 0.45,
        slowDuration: 1800
    },

    economy: {
        name: "Economy Building",
        symbol: "🏦",
        cost: 150,
        maxHp: 180,
        type: "economy",
        income: 150
    }
};


/* =========================
   Wave Settings
========================= */

const WAVE_CONFIG = [
    { enemies: 15, elites: 0, hp: 30 },
    { enemies: 20, elites: 0, hp: 35 },
    { enemies: 25, elites: 1, hp: 40 },
    { enemies: 30, elites: 1, hp: 45 },
    { enemies: 35, elites: 2, hp: 50 },
    { enemies: 40, elites: 2, hp: 60 },
    { enemies: 50, elites: 3, hp: 70 },
    { enemies: 35, elites: 0, hp: 80, boss: true }
];


/* =========================
   3 Choice Buffs
========================= */

const BUFFS = [

    {
        name: "🔥 火力提升",
        desc: "所有攻击建筑伤害 +15%",
        apply: s => s.damageMul *= 1.15
    },

    {
        name: "⚡ 极速射击",
        desc: "所有攻击建筑攻速 +12%",
        apply: s => s.attackSpeedMul *= 1.12
    },

    {
        name: "🧱 加固工程",
        desc: "所有建筑最大生命 +25%",
        apply: s => s.buildingHpMul *= 1.25
    },

    {
        name: "🏰 核心强化",
        desc: "Core 最大生命 +15%，并恢复 15%生命",
        apply: s => {
            s.coreMaxHpMul *= 1.15;
            s.coreHp += s.baseCoreMaxHp * 0.15;
            s.coreHp = Math.min(s.coreHp, getCoreMaxHp());
        }
    },

    {
        name: "💰 淘金热",
        desc: "所有敌人金币掉落 +15%",
        apply: s => s.goldDropMul *= 1.15
    },

    {
        name: "📈 利滚利",
        desc: "利息比例 +5%",
        apply: s => s.interestRate += 0.05
    },

    {
        name: "🏦 高效经营",
        desc: "经济大楼收入 +25%",
        apply: s => s.economyIncomeMul *= 1.25
    },

    {
        name: "🔧 快速施工",
        desc: "建筑建造费用 -10%",
        apply: s => s.buildCostMul *= 0.9
    },

    {
        name: "🔨 熟练工",
        desc: "建筑升级费用 -10%",
        apply: s => s.upgradeCostMul *= 0.9
    },

    {
        name: "🛠️ 紧急维修",
        desc: "每波结束恢复所有建筑 10% HP",
        apply: s => s.waveRepair += 0.10
    },

    {
        name: "💥 重型弹药",
        desc: "伤害 +25%，攻速 -10%",
        apply: s => {
            s.damageMul *= 1.25;
            s.attackSpeedMul *= 0.9;
        }
    },

    {
        name: "🧊 强力寒霜",
        desc: "冰塔减速效果 +30%",
        apply: s => s.slowMul *= 1.3
    },

    {
        name: "💣 爆炸弹头",
        desc: "攻击有20%概率造成范围伤害",
        apply: s => s.explosionChance += 0.2
    },

    {
        name: "⚡ 连锁电流",
        desc: "攻击有15%概率攻击附近第二个敌人",
        apply: s => s.chainChance += 0.15
    },

    {
        name: "🎯 精准打击",
        desc: "伤害 +10%，攻击范围 +0.5",
        apply: s => {
            s.damageMul *= 1.10;
            s.rangeBonus += 0.5;
        }
    },

    {
        name: "🪙 战斗奖金",
        desc: "每波结束额外获得 +50 Gold",
        apply: s => s.waveBonusGold += 50
    },

    {
        name: "💎 精英猎手",
        desc: "对精英伤害 +35%",
        apply: s => s.eliteDamageMul *= 1.35
    },

    {
        name: "☠️ 巨物杀手",
        desc: "对 Boss 伤害 +40%",
        apply: s => s.bossDamageMul *= 1.4
    },

    {
        name: "🧱 厚重墙体",
        desc: "墙受到的伤害 -25%",
        apply: s => s.wallDamageTakenMul *= 0.75
    },

    {
        name: "🚧 拆迁专家",
        desc: "建筑被摧毁时返还50%建造费用",
        apply: s => s.destroyRefund = 0.5
    },

    {
        name: "❤️ 背水一战",
        desc: "Core低于30% HP时，所有攻击建筑伤害 +35%",
        apply: s => s.lastStand = true
    }
];


/* =========================
   Game State
========================= */

let state = {
    gold: STARTING_GOLD,

    wave: 1,
    phase: "prepare",

    coreHp: CORE_MAX_HP,
    baseCoreMaxHp: CORE_MAX_HP,
    coreMaxHpMul: 1,

    buildings: [],
    enemies: [],

    selectedBuilding: null,

    nextBuildingId: 1,
    nextEnemyId: 1,

    spawnTimer: 0,
    waveKills: 0,
    waveTotal: 0,

    interestRate: 0.10,

    damageMul: 1,
    attackSpeedMul: 1,
    buildingHpMul: 1,

    goldDropMul: 1,
    economyIncomeMul: 1,

    buildCostMul: 1,
    upgradeCostMul: 1,

    slowMul: 1,
    explosionChance: 0,
    chainChance: 0,
    rangeBonus: 0,

    waveRepair: 0,
    waveBonusGold: 0,

    eliteDamageMul: 1,
    bossDamageMul: 1,

    wallDamageTakenMul: 1,

    destroyRefund: 0,
    lastStand: false,

    gameOver: false,
    victory: false,

    lastTime: performance.now()
};


const board = document.getElementById("game-board");
const statusEl = document.getElementById("status");
const goldEl = document.getElementById("gold");
const waveEl = document.getElementById("wave");


/* =========================
   Extra CSS
========================= */

function injectStyles() {

    const style = document.createElement("style");

    style.textContent = `

        #game-board {
            position: relative;
        }

        .cell {
            cursor: pointer;
        }

        .core-full {
            grid-column: 1 / 11;
            grid-row: 13;

            background: #f59e0b;
            border: 2px solid #fbbf24;

            display: flex;
            align-items: center;
            justify-content: center;

            font-weight: bold;

            position: relative;
            z-index: 3;
        }

        .building {
            position: relative;
            width: 90%;
            height: 90%;

            display: flex;
            align-items: center;
            justify-content: center;

            cursor: pointer;
        }

        .building.selected-building {
            outline: 3px solid white;
        }

        .building-hp {
            position: absolute;

            left: 5%;
            right: 5%;
            bottom: 3%;

            height: 5px;

            background: #111827;
            border-radius: 4px;

            overflow: hidden;
        }

        .building-hp > div {
            height: 100%;
            background: #22c55e;
        }

        .enemy {
            position: absolute;

            width: 7%;
            aspect-ratio: 1;

            border-radius: 50%;

            background: #ef4444;

            z-index: 8;

            pointer-events: none;
        }

        .enemy.elite {
            background: #a855f7;
        }

        .enemy.boss {
            background: #7f1d1d;

            box-shadow:
                0 0 0 3px #fbbf24;
        }

        .enemy-hp {
            position: absolute;

            left: -20%;
            right: -20%;
            top: -9px;

            height: 4px;

            background: #111827;

            border-radius: 4px;
        }

        .enemy-hp > div {
            height: 100%;
            background: #22c55e;
        }

        .damage-number {
            position: absolute;

            z-index: 30;

            color: white;

            font-weight: bold;
            font-size: 12px;

            pointer-events: none;

            animation: damageFloat .55s ease-out forwards;
        }

        @keyframes damageFloat {

            from {
                opacity: 1;
                transform: translateY(0);
            }

            to {
                opacity: 0;
                transform: translateY(-18px);
            }
        }

        .game-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;

            gap: 8px;

            padding: 8px;

            background: #1f2937;
        }

        .game-controls button {
            min-height: 44px;

            border: none;
            border-radius: 8px;

            background: #4b5563;
            color: white;

            font-weight: bold;
        }

        .game-controls button.primary {
            background: #16a34a;
        }

        .game-controls button:disabled {
            opacity: .45;
        }

        .building-info {
            padding: 8px;

            background: #111827;

            font-size: 12px;
            line-height: 1.5;
        }

        .buff-overlay {
            position: absolute;

            inset: 0;

            z-index: 50;

            background: rgba(15,23,42,.96);

            display: flex;

            flex-direction: column;

            justify-content: center;

            padding: 16px;
        }

        .buff-title {
            font-size: 20px;

            font-weight: bold;

            text-align: center;

            margin-bottom: 12px;
        }

        .buff-card {
            width: 100%;

            margin: 5px 0;

            padding: 14px;

            border: 1px solid #4b5563;
            border-radius: 10px;

            background: #1f2937;
            color: white;

            text-align: left;
        }

        .buff-card strong {
            display: block;

            font-size: 16px;

            margin-bottom: 5px;
        }

        .buff-card span {
            color: #d1d5db;

            font-size: 12px;
        }

        .core-hp {
            position: absolute;

            left: 4%;
            right: 4%;

            bottom: 5px;

            height: 6px;

            background: #78350f;

            border-radius: 5px;

            overflow: hidden;
        }

        .core-hp > div {
            height: 100%;

            background: #22c55e;
        }
    `;

    document.head.appendChild(style);
}


/* =========================
   Board
========================= */

function createBoard() {

    board.innerHTML = "";

    for (let row = 0; row < CORE_ROW; row++) {

        for (let col = 0; col < COLS; col++) {

            const cell = document.createElement("div");

            cell.className = "cell";

            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener("click", () => {
                handleCellClick(row, col);
            });

            board.appendChild(cell);
        }
    }


    const core = document.createElement("div");

    core.className = "core-full";

    core.innerHTML = `
        CORE
        <div class="core-hp">
            <div id="core-hp-bar"></div>
        </div>
    `;

    board.appendChild(core);
}


function getCell(row, col) {

    return board.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
}


/* =========================
   Controls
========================= */

function setupControls() {

    let controls = document.querySelector(".game-controls");

    if (!controls) {

        controls = document.createElement("div");

        controls.className = "game-controls";

        document
            .querySelector(".build-menu")
            .after(controls);
    }

    controls.innerHTML = `
        <button id="start-wave-btn" class="primary">
            开始第 1 波
        </button>

        <button id="restart-btn">
            重新开始
        </button>
    `;


    document
        .getElementById("start-wave-btn")
        .addEventListener("click", startWave);


    document
        .getElementById("restart-btn")
        .addEventListener("click", resetGame);
}


/* =========================
   Building Buttons
========================= */

function setupBuildButtons() {

    const menu = document.querySelector(".build-menu");


    if (!menu.querySelector('[data-building="economy"]')) {

        const button = document.createElement("button");

        button.dataset.building = "economy";

        button.innerHTML = `
            🏦 Economy
            <span>150G</span>
        `;

        menu.appendChild(button);
    }


    menu
        .querySelectorAll("button[data-building]")
        .forEach(button => {

            button.addEventListener("click", () => {

                selectBuilding(
                    button.dataset.building
                );
            });
        });
}


/* =========================
   Building Placement
========================= */

function selectBuilding(type) {

    if (state.phase !== "prepare") {

        setStatus(
            "只有波次开始前才能建造建筑。"
        );

        return;
    }


    state.selectedBuilding = type;


    document
        .querySelectorAll(".build-menu button")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.building === type
            );
        });


    setStatus(
        `已选择 ${BUILDINGS[type].name}，点击地图放置。`
    );
}


function handleCellClick(row, col) {

    const existing = state.buildings.find(
        building =>
            building.row === row &&
            building.col === col
    );


    if (existing) {

        showBuildingInfo(existing);

        return;
    }


    if (state.phase !== "prepare") {

        setStatus(
            "波次进行中不能新建建筑。"
        );

        return;
    }


    if (!state.selectedBuilding) {

        setStatus(
            "请先选择建筑。"
        );

        return;
    }


    placeBuilding(
        row,
        col,
        state.selectedBuilding
    );
}


function getBuildCost(type) {

    return Math.max(
        1,
        Math.round(
            BUILDINGS[type].cost *
            state.buildCostMul
        )
    );
}


function getUpgradeCost(building) {

    return Math.max(
        1,
        Math.round(
            BUILDINGS[building.type].cost *
            (0.8 + building.level * 0.6) *
            state.upgradeCostMul
        )
    );
}


function placeBuilding(row, col, type) {

    if (
        row < 0 ||
        row >= CORE_ROW ||
        col < 0 ||
        col >= COLS
    ) {

        setStatus(
            "Core区域不能建造。"
        );

        return;
    }


    if (
        state.buildings.some(
            b =>
                b.row === row &&
                b.col === col
        )
    ) {

        setStatus(
            "这里已经有建筑。"
        );

        return;
    }


    const cost = getBuildCost(type);


    if (state.gold < cost) {

        setStatus(
            `金币不足，需要 ${cost} Gold。`
        );

        return;
    }


    const def = BUILDINGS[type];

    const hp =
        Math.round(
            def.maxHp *
            state.buildingHpMul
        );


    state.gold -= cost;


    state.buildings.push({

        id: state.nextBuildingId++,

        type,

        row,
        col,

        level: 1,

        hp,
        maxHp: hp,

        cooldown: 0
    });


    state.selectedBuilding = null;


    document
        .querySelectorAll(".build-menu button")
        .forEach(button =>
            button.classList.remove("selected")
        );


    setStatus(
        `${def.name} 建造完成。`
    );


    render();
}


/* =========================
   Upgrade
========================= */

function getBuildingDamage(building) {

    const def = BUILDINGS[building.type];

    if (def.type !== "attack") {
        return 0;
    }


    let damage =
        def.damage *
        (1 + 0.35 * (building.level - 1)) *
        state.damageMul;


    if (
        state.lastStand &&
        state.coreHp / getCoreMaxHp() < 0.3
    ) {

        damage *= 1.35;
    }


    return Math.round(damage);
}


function showBuildingInfo(building) {

    const def = BUILDINGS[building.type];

    const upgradeCost =
        getUpgradeCost(building);


    const canUpgrade =
        state.phase === "prepare" &&
        state.gold >= upgradeCost;


    statusEl.innerHTML = `

        <div class="building-info">

            <strong>
                ${def.symbol}
                ${def.name}
                Lv.${building.level}
            </strong>

            <br>

            HP:
            ${Math.ceil(building.hp)}
            /
            ${Math.ceil(building.maxHp)}

            ${
                def.type === "attack"
                    ? `<br>伤害：${getBuildingDamage(building)}`
                    : ""
            }

            ${
                def.type === "economy"
                    ? `
                        <br>
                        每回合：
                        ${Math.round(
                            def.income *
                            state.economyIncomeMul
                        )} Gold
                    `
                    : ""
            }

            ${
                def.type === "attack"
                    ? `
                        <br>
                        <button
                            id="upgrade-selected"
                            ${canUpgrade ? "" : "disabled"}
                        >
                            升级：${upgradeCost}G
                        </button>
                    `
                    : ""
            }

        </div>
    `;


    const button =
        document.getElementById(
            "upgrade-selected"
        );


    if (button) {

        button.addEventListener(
            "click",
            () => upgradeBuilding(building)
        );
    }
}


function upgradeBuilding(building) {

    if (state.phase !== "prepare") {

        setStatus(
            "只能在波次开始前升级建筑。"
        );

        return;
    }


    const cost =
        getUpgradeCost(building);


    if (state.gold < cost) {

        setStatus(
            `金币不足，需要 ${cost}G。`
        );

        return;
    }


    state.gold -= cost;

    building.level++;


    const oldMax =
        building.maxHp;


    building.maxHp =
        Math.round(
            BUILDINGS[building.type].maxHp *
            state.buildingHpMul *
            (1 + 0.25 * (building.level - 1))
        );


    building.hp +=
        building.maxHp - oldMax;


    setStatus(
        `${BUILDINGS[building.type].name} 升到 Lv.${building.level}。`
    );


    render();

    showBuildingInfo(building);
}


/* =========================
   Wave
========================= */

function startWave() {

    if (
        state.gameOver ||
        state.victory
    ) {
        return;
    }


    if (state.phase !== "prepare") {

        setStatus(
            "现在不能开始下一波。"
        );

        return;
    }


    const config =
        WAVE_CONFIG[state.wave - 1];


    state.phase = "wave";

    state.spawnTimer = 0;

    state.waveKills = 0;

    state.waveTotal =
        config.enemies +
        config.elites +
        (config.boss ? 1 : 0);


    setStatus(
        `第 ${state.wave} 波开始！`
    );
}


function spawnEnemy(type = "normal") {

    const config =
        WAVE_CONFIG[state.wave - 1];


    let hp = config.hp;

    let speed = 0.7;

    let damage = 12;

    let gold =
        10 +
        Math.floor(Math.random() * 6);


    if (type === "elite") {

        hp *= 3;

        speed *= 0.85;

        damage *= 1.8;

        gold =
            30 +
            Math.floor(Math.random() * 21);
    }


    if (type === "boss") {

        hp = 900;

        speed = 0.45;

        damage = 35;

        gold = 250;
    }


    state.enemies.push({

        id: state.nextEnemyId++,

        type,

        x: COLS / 2,

        y: -0.6,

        hp,

        maxHp: hp,

        speed,

        damage,

        gold,

        targetId: null,

        path: [],

        pathIndex: 0,

        attackCooldown: 0,

        slowUntil: 0,

        slowAmount: 1
    });
}


function chooseSpawnType() {

    const config =
        WAVE_CONFIG[state.wave - 1];


    if (
        config.boss &&
        !state.enemies.some(
            enemy => enemy.type === "boss"
        )
    ) {

        return "boss";
    }


    const eliteCount =
        state.enemies.filter(
            enemy => enemy.type === "elite"
        ).length;


    if (
        eliteCount < config.elites &&
        Math.random() < 0.18
    ) {

        return "elite";
    }


    return "normal";
}


/* =========================
   Enemy Pathfinding
========================= */

function isBuildingAt(row, col) {

    return state.buildings.some(
        building =>
            building.row === row &&
            building.col === col
    );
}


function getNeighbors(row, col) {

    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];


    return directions
        .map(([dr, dc]) => [
            row + dr,
            col + dc
        ])
        .filter(
            ([r, c]) =>
                r >= 0 &&
                r < CORE_ROW &&
                c >= 0 &&
                c < COLS
        );
}


function findPath(
    startRow,
    startCol,
    targetRow,
    targetCol
) {

    const queue = [
        [startRow, startCol]
    ];


    const cameFrom = new Map();


    const key = (r, c) =>
        `${r},${c}`;


    cameFrom.set(
        key(startRow, startCol),
        null
    );


    while (queue.length) {

        const [row, col] =
            queue.shift();


        if (
            row === targetRow &&
            col === targetCol
        ) {

            const path = [];

            let current = [
                row,
                col
            ];


            while (current) {

                path.unshift(current);

                current =
                    cameFrom.get(
                        key(
                            current[0],
                            current[1]
                        )
                    );
            }


            return path;
        }


        for (
            const [nextRow, nextCol]
            of getNeighbors(row, col)
        ) {

            const k =
                key(nextRow, nextCol);


            if (cameFrom.has(k)) {
                continue;
            }


            if (
                isBuildingAt(
                    nextRow,
                    nextCol
                ) &&
                !(
                    nextRow === targetRow &&
                    nextCol === targetCol
                )
            ) {

                continue;
            }


            cameFrom.set(
                k,
                [row, col]
            );


            queue.push([
                nextRow,
                nextCol
            ]);
        }
    }


    return null;
}


function chooseEnemyTarget(enemy) {

    const startRow =
        Math.max(
            0,
            Math.min(
                CORE_ROW - 1,
                Math.floor(enemy.y)
            )
        );


    const startCol =
        Math.max(
            0,
            Math.min(
                COLS - 1,
                Math.floor(enemy.x)
            )
        );


    let best = null;


    /*
        怪物不是全地图直接追最近建筑。

        它会计算：
        “我真正走过去需要多少格？”

        这样墙才能真正影响路线。
    */

    for (
        const building
        of state.buildings
    ) {

        for (
            const [row, col]
            of getNeighbors(
                building.row,
                building.col
            )
        ) {

            const path =
                findPath(
                    startRow,
                    startCol,
                    row,
                    col
                );


            if (!path) {
                continue;
            }


            if (
                !best ||
                path.length < best.score
            ) {

                best = {
                    building,
                    path,
                    score: path.length
                };
            }
        }
    }


    if (best) {

        enemy.targetId =
            best.building.id;

        enemy.path =
            best.path;

        enemy.pathIndex = 0;

        return;
    }


    /*
        如果没有可达建筑，
        就继续前往 Core。
    */

    enemy.targetId = null;

    const path =
        findPath(
            startRow,
            startCol,
            CORE_ROW - 1,
            startCol
        );


    enemy.path =
        path || [];

    enemy.pathIndex = 0;
}


/* =========================
   Enemy Update
========================= */

function updateEnemies(dt, now) {

    if (state.phase === "wave") {

        const alive =
            state.enemies.length;


        if (
            state.waveKills + alive <
            state.waveTotal
        ) {

            state.spawnTimer -= dt;


            if (state.spawnTimer <= 0) {

                spawnEnemy(
                    chooseSpawnType()
                );


                state.spawnTimer =
                    Math.max(
                        280,
                        1500 -
                        state.wave * 100
                    );
            }
        }
    }


    for (
        const enemy
        of state.enemies
    ) {

        enemy.attackCooldown -= dt;


        if (
            enemy.slowUntil <= now
        ) {

            enemy.slowAmount = 1;
        }


        if (
            !enemy.path.length ||
            enemy.pathIndex >=
            enemy.path.length
        ) {

            chooseEnemyTarget(enemy);
        }


        const target =
            enemy.targetId
                ? state.buildings.find(
                    b =>
                        b.id ===
                        enemy.targetId
                )
                : null;


        if (target) {

            const distance =
                Math.hypot(
                    enemy.x -
                    (target.col + 0.5),

                    enemy.y -
                    (target.row + 0.5)
                );


            if (distance <= 1.05) {

                if (
                    enemy.attackCooldown <= 0
                ) {

                    attackBuilding(
                        enemy,
                        target
                    );
                }


                continue;
            }
        }


        if (
            !target &&
            CORE_ROW -
            enemy.y <= 1.15
        ) {

            if (
                enemy.attackCooldown <= 0
            ) {

                attackCore(enemy);
            }


            continue;
        }


        moveEnemy(
            enemy,
            dt
        );
    }


    state.enemies =
        state.enemies.filter(
            enemy =>
                enemy.hp > 0
        );
}


function moveEnemy(enemy, dt) {

    if (!enemy.path.length) {

        enemy.y +=
            enemy.speed *
            enemy.slowAmount *
            dt /
            1000;

        return;
    }


    const index =
        Math.min(
            enemy.pathIndex + 1,
            enemy.path.length - 1
        );


    const [
        targetRow,
        targetCol
    ] = enemy.path[index];


    const targetX =
        targetCol + 0.5;

    const targetY =
        targetRow + 0.5;


    const dx =
        targetX - enemy.x;

    const dy =
        targetY - enemy.y;


    const distance =
        Math.hypot(dx, dy);


    if (distance < 0.05) {

        enemy.pathIndex = index;

        return;
    }


    const movement =
        enemy.speed *
        enemy.slowAmount *
        dt /
        1000;


    enemy.x +=
        dx /
        distance *
        Math.min(
            movement,
            distance
        );


    enemy.y +=
        dy /
        distance *
        Math.min(
            movement,
            distance
        );
}


/* =========================
   Enemy Attacks
========================= */

function attackBuilding(
    enemy,
    building
) {

    let damage =
        enemy.damage;


    if (
        building.type === "wall"
    ) {

        damage *=
            state.wallDamageTakenMul;
    }


    building.hp -= damage;

    enemy.attackCooldown = 900;


    showDamage(
        building.col,
        building.row,
        Math.round(damage)
    );


    if (building.hp <= 0) {

        if (
            state.destroyRefund > 0
        ) {

            state.gold += Math.round(
                getBuildCost(
                    building.type
                ) *
                state.destroyRefund
            );
        }


        state.buildings =
            state.buildings.filter(
                b =>
                    b.id !==
                    building.id
            );


        enemy.targetId = null;

        enemy.path = [];
    }
}


function attackCore(enemy) {

    state.coreHp -=
        enemy.damage;


    enemy.attackCooldown = 900;


    showCoreDamage(
        Math.round(enemy.damage)
    );


    if (state.coreHp <= 0) {

        state.coreHp = 0;

        state.gameOver = true;

        state.phase = "gameover";

        setStatus(
            "💀 Core 被摧毁，防守失败。"
        );
    }
}


/* =========================
   Building Combat
========================= */

function getEnemyDamageMultiplier(enemy) {

    let multiplier = 1;


    if (
        enemy.type === "elite"
    ) {

        multiplier *=
            state.eliteDamageMul;
    }


    if (
        enemy.type === "boss"
    ) {

        multiplier *=
            state.bossDamageMul;
    }


    return multiplier;
}


function updateBuildings(
    dt,
    now
) {

    for (
        const building
        of state.buildings
    ) {

        if (
            building.type !==
            "turret" &&
            building.type !==
            "ice"
        ) {

            continue;
        }


        building.cooldown -= dt;


        if (
            building.cooldown > 0
        ) {

            continue;
        }


        const def =
            BUILDINGS[
                building.type
            ];


        const range =
            def.range +
            state.rangeBonus;


        let target = null;

        let bestDistance =
            Infinity;


        for (
            const enemy
            of state.enemies
        ) {

            const distance =
                Math.hypot(

                    enemy.x -
                    (building.col + 0.5),

                    enemy.y -
                    (building.row + 0.5)

                );


            if (
                distance <= range &&
                distance <
                bestDistance
            ) {

                bestDistance =
                    distance;

                target =
                    enemy;
            }
        }


        if (!target) {
            continue;
        }


        let damage =
            getBuildingDamage(
                building
            );


        damage *=
            getEnemyDamageMultiplier(
                target
            );


        target.hp -= damage;


        building.cooldown =
            def.attackCooldown /
            state.attackSpeedMul /
            (
                1 +
                0.15 *
                (building.level - 1)
            );


        showDamageAtEnemy(
            target,
            Math.round(damage)
        );


        /*
            冰塔减速
        */

        if (
            building.type === "ice"
        ) {

            target.slowAmount =
                Math.max(
                    0.25,
                    1 -
                    def.slow *
                    state.slowMul
                );


            target.slowUntil =
                now +
                def.slowDuration;
        }


        /*
            爆炸
        */

        if (
            state.explosionChance > 0 &&
            Math.random() <
            state.explosionChance
        ) {

            for (
                const other
                of state.enemies
            ) {

                if (
                    other.id ===
                    target.id
                ) {
                    continue;
                }


                const distance =
                    Math.hypot(
                        other.x -
                        target.x,

                        other.y -
                        target.y
                    );


                if (
                    distance <= 1.2
                ) {

                    const splash =
                        damage *
                        0.5;


                    other.hp -=
                        splash;


                    showDamageAtEnemy(
                        other,
                        Math.round(
                            splash
                        )
                    );
                }
            }
        }


        /*
            连锁攻击
        */

        if (
            state.chainChance > 0 &&
            Math.random() <
            state.chainChance
        ) {

            const nearby =
                state.enemies
                    .filter(
                        e =>
                            e.id !==
                            target.id
                    )
                    .sort(
                        (a, b) =>
                            Math.hypot(
                                a.x -
                                target.x,

                                a.y -
                                target.y
                            ) -
                            Math.hypot(
                                b.x -
                                target.x,

                                b.y -
                                target.y
                            )
                    )[0];


            if (
                nearby &&
                Math.hypot(
                    nearby.x -
                    target.x,

                    nearby.y -
                    target.y
                ) <= 2
            ) {

                const chainDamage =
                    damage *
                    0.5;


                nearby.hp -=
                    chainDamage;


                showDamageAtEnemy(
                    nearby,
                    Math.round(
                        chainDamage
                    )
                );
            }
        }
    }


    /*
        结算死亡
    */

    const dead =
        state.enemies.filter(
            enemy =>
                enemy.hp <= 0
        );


    for (
        const enemy
        of dead
    ) {

        const reward =
            Math.round(
                enemy.gold *
                state.goldDropMul
            );


        state.gold +=
            reward;


        state.waveKills++;
    }
}


/* =========================
   Wave Economy
========================= */

function applyWaveEndIncome() {

    let economyIncome = 0;


    for (
        const building
        of state.buildings
    ) {

        if (
            building.type ===
            "economy"
        ) {

            economyIncome +=
                Math.round(
                    BUILDINGS.economy.income *
                    state.economyIncomeMul
                );
        }
    }


    const interest =
        Math.round(
            state.gold *
            state.interestRate
        );


    state.gold +=
        economyIncome;


    state.gold +=
        interest;


    state.gold +=
        state.waveBonusGold;


    /*
        修理
    */

    if (
        state.waveRepair > 0
    ) {

        for (
            const building
            of state.buildings
        ) {

            building.hp =
                Math.min(
                    building.maxHp,

                    building.hp +
                    building.maxHp *
                    state.waveRepair
                );
        }
    }


    setStatus(
        `本波奖励：经济 +${economyIncome}G，`
        +
        `利息 +${interest}G`
        +
        `，额外 +${state.waveBonusGold}G`
    );
}


/* =========================
   Buff Choice
========================= */

function getRandomBuffs() {

    const pool =
        [...BUFFS];

    const result = [];


    while (
        result.length < 3 &&
        pool.length
    ) {

        const index =
            Math.floor(
                Math.random() *
                pool.length
            );


        result.push(
            pool.splice(
                index,
                1
            )[0]
        );
    }


    return result;
}


function showBuffChoice() {

    state.phase = "buff";


    const overlay =
        document.createElement("div");


    overlay.className =
        "buff-overlay";


    overlay.innerHTML = `
        <div class="buff-title">
            🎁 选择一个强化
        </div>
    `;


    getRandomBuffs()
        .forEach(buff => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "buff-card";


            button.innerHTML = `
                <strong>
                    ${buff.name}
                </strong>

                <span>
                    ${buff.desc}
                </span>
            `;


            button.addEventListener(
                "click",
                () => {

                    buff.apply(state);


                    overlay.remove();


                    if (
                        state.wave >=
                        TOTAL_WAVES
                    ) {

                        state.victory =
                            true;

                        state.phase =
                            "victory";


                        setStatus(
                            "🎉 你成功守住了 Core！"
                        );


                        render();

                        return;
                    }


                    state.wave++;


                    state.phase =
                        "prepare";


                    state.enemies = [];


                    setStatus(
                        `第 ${state.wave} 波准备阶段`
                    );


                    render();
                }
            );


            overlay.appendChild(
                button
            );
        });


    board.appendChild(
        overlay
    );
}


/* =========================
   Damage UI
========================= */

function showDamage(
    col,
    row,
    damage
) {

    const cell =
        getCell(
            row,
            col
        );


    if (!cell) {
        return;
    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        "damage-number";


    element.textContent =
        `-${damage}`;


    element.style.left =
        "40%";

    element.style.top =
        "20%";


    cell.appendChild(
        element
    );


    setTimeout(
        () => element.remove(),
        600
    );
}


function showDamageAtEnemy(
    enemy,
    damage
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "damage-number";


    element.textContent =
        `-${damage}`;


    element.style.left =
        `${enemy.x / COLS * 100}%`;


    element.style.top =
        `${enemy.y / ROWS * 100}%`;


    board.appendChild(
        element
    );


    setTimeout(
        () => element.remove(),
        600
    );
}


function showCoreDamage(
    damage
) {

    const core =
        board.querySelector(
            ".core-full"
        );


    if (!core) {
        return;
    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        "damage-number";


    element.textContent =
        `-${damage}`;


    element.style.left =
        "50%";


    element.style.top =
        "30%";


    core.appendChild(
        element
    );


    setTimeout(
        () => element.remove(),
        600
    );
}


/* =========================
   Wave Completion
========================= */

function checkWaveComplete() {

    if (
        state.phase !== "wave"
    ) {
        return;
    }


    if (
        state.waveKills >=
        state.waveTotal &&

        state.enemies.length === 0
    ) {

        applyWaveEndIncome();

        showBuffChoice();
    }
}


/* =========================
   Render
========================= */

function render() {

    document
        .querySelectorAll(".cell")
        .forEach(
            cell =>
                cell.innerHTML = ""
        );


    document
        .querySelectorAll(".building")
        .forEach(
            element =>
                element.remove()
        );


    document
        .querySelectorAll(".enemy")
        .forEach(
            element =>
                element.remove()
        );


    /*
        Buildings
    */

    for (
        const building
        of state.buildings
    ) {

        const cell =
            getCell(
                building.row,
                building.col
            );


        if (!cell) {
            continue;
        }


        const element =
            document.createElement(
                "div"
            );


        element.className =
            `building ${building.type}`;


        element.innerHTML = `

            ${BUILDINGS[
                building.type
            ].symbol}

            <div class="building-hp">

                <div
                    style="
                        width:
                        ${Math.max(
                            0,
                            building.hp /
                            building.maxHp *
                            100
                        )}%
                    "
                ></div>

            </div>
        `;


        element.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                showBuildingInfo(
                    building
                );
            }
        );


        cell.appendChild(
            element
        );
    }


    /*
        Enemies
    */

    for (
        const enemy
        of state.enemies
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.className =
            `enemy ${enemy.type}`;


        element.style.left =
            `${enemy.x / COLS * 100 - 3.5}%`;


        element.style.top =
            `${enemy.y / ROWS * 100}%`;


        element.innerHTML = `

            <div class="enemy-hp">

                <div
                    style="
                        width:
                        ${Math.max(
                            0,
                            enemy.hp /
                            enemy.maxHp *
                            100
                        )}%
                    "
                ></div>

            </div>
        `;


        board.appendChild(
            element
        );
    }


    /*
        Core HP
    */

    const coreBar =
        document.getElementById(
            "core-hp-bar"
        );


    if (coreBar) {

        coreBar.style.width =
            `${Math.max(
                0,
                state.coreHp /
                getCoreMaxHp() *
                100
            )}%`;
    }


    goldEl.textContent =
        Math.floor(
            state.gold
        );


    waveEl.textContent =
        Math.min(
            state.wave,
            TOTAL_WAVES
        );


    const startButton =
        document.getElementById(
            "start-wave-btn"
        );


    if (startButton) {

        startButton.disabled =
            state.phase !== "prepare";


        if (
            state.phase ===
            "prepare"
        ) {

            startButton.textContent =
                `开始第 ${state.wave} 波`;
        }

        else if (
            state.phase ===
            "wave"
        ) {

            startButton.textContent =
                "战斗中...";
        }

        else {

            startButton.textContent =
                "选择 Buff...";
        }
    }
}


/* =========================
   Reset
========================= */

function resetGame() {

    state = {

        gold: STARTING_GOLD,

        wave: 1,

        phase: "prepare",

        coreHp: CORE_MAX_HP,

        baseCoreMaxHp:
            CORE_MAX_HP,

        coreMaxHpMul: 1,

        buildings: [],

        enemies: [],

        selectedBuilding: null,

        nextBuildingId: 1,

        nextEnemyId: 1,

        spawnTimer: 0,

        waveKills: 0,

        waveTotal: 0,

        interestRate: 0.10,

        damageMul: 1,

        attackSpeedMul: 1,

        buildingHpMul: 1,

        goldDropMul: 1,

        economyIncomeMul: 1,

        buildCostMul: 1,

        upgradeCostMul: 1,

        slowMul: 1,

        explosionChance: 0,

        chainChance: 0,

        rangeBonus: 0,

        waveRepair: 0,

        waveBonusGold: 0,

        eliteDamageMul: 1,

        bossDamageMul: 1,

        wallDamageTakenMul: 1,

        destroyRefund: 0,

        lastStand: false,

        gameOver: false,

        victory: false,

        lastTime:
            performance.now()
    };


    setStatus(
        "准备开始。你有 500 Gold，可以自由布置基地。"
    );


    render();
}


/* =========================
   Main Loop
========================= */

function gameLoop(now) {

    const dt =
        Math.min(
            50,
            now -
            state.lastTime
        );


    state.lastTime =
        now;


    if (
        !state.gameOver &&
        !state.victory &&
        state.phase === "wave"
    ) {

        updateEnemies(
            dt,
            now
        );


        updateBuildings(
            dt,
            now
        );


        checkWaveComplete();
    }


    render();


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================
   Start
========================= */

injectStyles();

createBoard();

setupControls();

setupBuildButtons();

resetGame();

requestAnimationFrame(
    gameLoop
);
