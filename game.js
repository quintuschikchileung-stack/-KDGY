const ROWS = 13;
const COLS = 10;
const CORE_ROW = ROWS - 1;
const STARTING_GOLD = 300;
const TOTAL_WAVES = 8;

const BUILDINGS = {
    wall: {
        name: "Wall",
        cost: 30,
        symbol: "🧱",
        type: "defense",
        maxHp: 220
    },

    turret: {
        name: "Machine Gun",
        cost: 60,
        symbol: "🔫",
        type: "attack",
        damage: 10,
        range: 4.5,
        attackCooldown: 700,
        maxHp: 100
    },

    ice: {
        name: "Ice Tower",
        cost: 80,
        symbol: "❄️",
        type: "attack",
        damage: 5,
        range: 4.5,
        attackCooldown: 1200,
        maxHp: 100
    }
};

const WAVE_DATA = [
    { enemies: 5, hp: 35, speed: 1.2 },
    { enemies: 7, hp: 45, speed: 1.25 },
    { enemies: 9, hp: 55, speed: 1.3 },
    { enemies: 11, hp: 70, speed: 1.35 },
    { enemies: 13, hp: 85, speed: 1.4 },
    { enemies: 15, hp: 100, speed: 1.45 },
    { enemies: 18, hp: 120, speed: 1.5 },
    { enemies: 1, hp: 650, speed: 0.8, boss: true }
];

const gameState = {
    gold: STARTING_GOLD,

    wave: 1,

    selectedBuilding: null,

    buildings: [],

    enemies: [],

    gameRunning: true,

    phase: "prepare",

    enemiesToSpawn: 0,

    enemiesSpawned: 0,

    lastEnemySpawn: 0,

    spawnInterval: 900,

    coreHp: 1000,

    coreMaxHp: 1000,

    nextWaveReady: true
};

const board = document.getElementById("game-board");
const goldDisplay = document.getElementById("gold");
const waveDisplay = document.getElementById("wave");
const statusDisplay = document.getElementById("status");

let startWaveButton = null;

injectExtraStyles();
createBoard();
createControls();
setupBuildButtons();
updateUI();
render();
showPrepareState();

let lastTime = performance.now();

requestAnimationFrame(gameLoop);


/* =========================================================
   INITIALIZATION
========================================================= */

function injectExtraStyles() {
    const style = document.createElement("style");

    style.textContent = `
        #game-board {
            position: relative;
            overflow: hidden;
        }

        .core-full {
            grid-column: 1 / 11;
            grid-row: 13 / 14;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                to bottom,
                #fbbf24,
                #d97706
            );
            border: 3px solid #f59e0b;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: clamp(14px, 4vw, 24px);
            color: white;
            text-shadow: 0 2px 3px rgba(0,0,0,.5);
            z-index: 10;
            pointer-events: none;
        }

        .core-hp {
            position: absolute;
            left: 10%;
            right: 10%;
            bottom: 6px;
            height: 7px;
            background: rgba(0,0,0,.35);
            border-radius: 5px;
            overflow: hidden;
        }

        .core-hp-inner {
            height: 100%;
            background: #22c55e;
            transition: width .15s;
        }

        .building-wrapper {
            width: 90%;
            height: 90%;
            position: relative;
        }

        .building {
            width: 100%;
            height: 100%;
        }

        .building-hp {
            position: absolute;
            left: 5%;
            right: 5%;
            bottom: 3px;
            height: 5px;
            background: rgba(0,0,0,.45);
            border-radius: 4px;
            overflow: hidden;
        }

        .building-hp-inner {
            height: 100%;
            background: #22c55e;
        }

        .enemy-container {
            width: 82%;
            height: 82%;
            position: relative;
            z-index: 20;
        }

        .enemy {
            width: 100%;
            height: 100%;
            position: relative;
            background: #ef4444;
        }

        .enemy.boss {
            width: 120%;
            height: 120%;
            margin-left: -10%;
            margin-top: -10%;
            background: #a855f7;
            border: 3px solid #f0abfc;
        }

        .enemy-hp {
            position: absolute;
            left: -20%;
            right: -20%;
            top: -8px;
            height: 4px;
            background: rgba(0,0,0,.7);
            border-radius: 4px;
            overflow: hidden;
        }

        .enemy-hp-inner {
            height: 100%;
            background: #22c55e;
        }

        .damage-number {
            position: absolute;
            color: #fff;
            font-weight: bold;
            font-size: 13px;
            text-shadow: 0 1px 3px #000;
            animation: damageFloat .55s ease-out forwards;
            pointer-events: none;
            z-index: 50;
        }

        @keyframes damageFloat {
            from {
                opacity: 1;
                transform: translateY(0);
            }

            to {
                opacity: 0;
                transform: translateY(-22px);
            }
        }

        .attack-flash {
            position: absolute;
            inset: 0;
            border: 3px solid #fff;
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
            animation: attackFlash .18s ease-out;
            z-index: 30;
        }

        @keyframes attackFlash {
            0% { opacity: .9; transform: scale(.5); }
            100% { opacity: 0; transform: scale(1.4); }
        }

        .wave-start {
            margin-top: 7px;
            padding: 9px 18px;
            border: none;
            border-radius: 8px;
            background: #f59e0b;
            color: white;
            font-weight: bold;
            cursor: pointer;
        }

        .wave-start:hover {
            background: #d97706;
        }

        .wave-start:disabled {
            opacity: .5;
            cursor: default;
        }

        .prepare-text {
            display: block;
            margin-bottom: 4px;
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   BOARD
========================================================= */

function createBoard() {
    board.innerHTML = "";

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {

            const cell = document.createElement("div");

            cell.classList.add("cell");

            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener("click", () => {
                handleCellClick(row, col);
            });

            board.appendChild(cell);
        }
    }
}

function getCell(row, col) {
    return document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
}


/* =========================================================
   UI
========================================================= */

function createControls() {

    startWaveButton = document.createElement("button");

    startWaveButton.className = "wave-start";

    startWaveButton.textContent = "开始第 1 波";

    startWaveButton.addEventListener("click", startWave);

    statusDisplay.innerHTML = "";

    const text = document.createElement("span");

    text.className = "prepare-text";

    statusDisplay.appendChild(text);

    statusDisplay.appendChild(startWaveButton);
}

function setStatus(message) {

    const text = statusDisplay.querySelector(".prepare-text");

    if (text) {
        text.textContent = message;
    }
}

function updateUI() {

    goldDisplay.textContent = Math.floor(gameState.gold);

    waveDisplay.textContent = gameState.wave;

    if (startWaveButton) {

        if (gameState.phase === "prepare" &&
            gameState.gameRunning) {

            startWaveButton.style.display = "inline-block";

            startWaveButton.disabled = false;

            startWaveButton.textContent =
                `开始第 ${gameState.wave} 波`;

        } else {

            startWaveButton.style.display = "none";
        }
    }
}


/* =========================================================
   BUILDING SELECTION
========================================================= */

function setupBuildButtons() {

    document
        .querySelectorAll(".build-menu button")
        .forEach(button => {

            button.addEventListener("click", () => {

                selectBuilding(
                    button.dataset.building
                );

            });

        });
}

function selectBuilding(type) {

    if (!gameState.gameRunning) {
        return;
    }

    gameState.selectedBuilding = type;

    document
        .querySelectorAll(".build-menu button")
        .forEach(button => {
            button.classList.remove("selected");
        });

    const button =
        document.querySelector(
            `[data-building="${type}"]`
        );

    if (button) {
        button.classList.add("selected");
    }

    setStatus(
        `${BUILDINGS[type].name}：点击地图放置`
    );
}


/* =========================================================
   BUILDING PLACEMENT
========================================================= */

function handleCellClick(row, col) {

    if (!gameState.gameRunning) {
        return;
    }

    /*
        Core occupies the entire bottom row.
        No building is allowed here.
    */

    if (row === CORE_ROW) {

        setStatus(
            "这里是 Core，不能建造。"
        );

        return;
    }

    if (!gameState.selectedBuilding) {

        setStatus(
            "请先选择一个建筑。"
        );

        return;
    }

    placeBuilding(
        gameState.selectedBuilding,
        row,
        col
    );
}

function isOccupied(row, col) {

    return gameState.buildings.some(
        building =>
            building.row === row &&
            building.col === col
    );
}

function placeBuilding(type, row, col) {

    const data = BUILDINGS[type];

    if (isOccupied(row, col)) {

        setStatus(
            "这里已经有建筑了。"
        );

        return;
    }

    if (gameState.gold < data.cost) {

        setStatus(
            "金币不足。"
        );

        return;
    }

    gameState.gold -= data.cost;

    const building = {

        id:
            Date.now() +
            Math.random(),

        type,

        row,

        col,

        hp: data.maxHp,

        maxHp: data.maxHp,

        lastAttack: 0
    };

    gameState.buildings.push(building);

    updateUI();

    render();

    setStatus(
        `${data.name} 已建造。`
    );
}


/* =========================================================
   RENDER
========================================================= */

function render() {

    document
        .querySelectorAll(".cell")
        .forEach(cell => {

            cell.innerHTML = "";

        });


    /*
        Buildings
    */

    gameState.buildings.forEach(building => {

        const cell =
            getCell(
                building.row,
                building.col
            );

        if (!cell) {
            return;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "building-wrapper";

        const element =
            document.createElement("div");

        element.className =
            `building ${building.type}`;

        element.textContent =
            BUILDINGS[building.type].symbol;

        wrapper.appendChild(element);


        /*
            Building HP bar
        */

        const hp =
            document.createElement("div");

        hp.className =
            "building-hp";

        const hpInner =
            document.createElement("div");

        hpInner.className =
            "building-hp-inner";

        hpInner.style.width =
            `${Math.max(
                0,
                building.hp /
                building.maxHp *
                100
            )}%`;

        hp.appendChild(hpInner);

        wrapper.appendChild(hp);

        cell.appendChild(wrapper);
    });


    /*
        Enemies
    */

    gameState.enemies.forEach(enemy => {

        const row =
            Math.floor(enemy.row);

        const col =
            Math.floor(enemy.col);

        const cell =
            getCell(row, col);

        if (!cell) {
            return;
        }

        const container =
            document.createElement("div");

        container.className =
            "enemy-container";

        const element =
            document.createElement("div");

        element.className =
            enemy.boss
                ? "enemy boss"
                : "enemy";

        const hp =
            document.createElement("div");

        hp.className =
            "enemy-hp";

        const hpInner =
            document.createElement("div");

        hpInner.className =
            "enemy-hp-inner";

        hpInner.style.width =
            `${Math.max(
                0,
                enemy.hp /
                enemy.maxHp *
                100
            )}%`;

        hp.appendChild(hpInner);

        element.appendChild(hp);

        container.appendChild(element);

        cell.appendChild(container);
    });


    /*
        Core is ONE 1×10 entity.
        It is rendered as one element across
        the entire bottom row.
    */

    const oldCore =
        board.querySelector(".core-full");

    if (oldCore) {
        oldCore.remove();
    }

    const core =
        document.createElement("div");

    core.className =
        "core-full";

    core.innerHTML = `
        CORE
        <div class="core-hp">
            <div class="core-hp-inner"
                 style="width:${Math.max(
                     0,
                     gameState.coreHp /
                     gameState.coreMaxHp *
                     100
                 )}%">
            </div>
        </div>
    `;

    board.appendChild(core);
}


/* =========================================================
   WAVE SYSTEM
========================================================= */

function showPrepareState() {

    gameState.phase = "prepare";

    gameState.nextWaveReady = true;

    setStatus(
        `准备阶段：先建造基地，然后开始第 ${gameState.wave} 波。`
    );

    updateUI();
}

function startWave() {

    if (!gameState.gameRunning) {
        return;
    }

    if (gameState.phase !== "prepare") {
        return;
    }

    const data =
        WAVE_DATA[
            gameState.wave - 1
        ];

    gameState.phase = "combat";

    gameState.enemiesToSpawn =
        data.enemies;

    gameState.enemiesSpawned = 0;

    gameState.lastEnemySpawn = 0;

    gameState.nextWaveReady = false;

    if (startWaveButton) {
        startWaveButton.style.display =
            "none";
    }

    setStatus(
        `第 ${gameState.wave} 波开始！`
    );

    updateUI();
}


/* =========================================================
   SPAWN ENEMIES
========================================================= */

function spawnEnemy() {

    const data =
        WAVE_DATA[
            gameState.wave - 1
        ];

    const col =
        Math.floor(
            Math.random() * COLS
        );

    const enemy = {

        id:
            Date.now() +
            Math.random(),

        row: 0,

        col,

        hp: data.hp,

        maxHp: data.hp,

        speed: data.speed,

        boss: Boolean(data.boss),

        targetBuildingId: null,

        path: [],

        pathIndex: 0,

        lastPathCalculation: 0,

        lastAttack: 0,

        slowUntil: 0
    };

    gameState.enemies.push(enemy);

    gameState.enemiesSpawned++;
}


/* =========================================================
   ENEMY AI
========================================================= */

/*
    IMPORTANT RULE:

    Enemy does NOT use raw distance.

    It searches for the nearest BUILDING
    that it can actually reach.

    Buildings block movement.

    If a building is behind a wall,
    the enemy cannot simply walk through the wall.
*/

function chooseEnemyTarget(enemy, now) {

    if (
        now -
        enemy.lastPathCalculation <
        250
    ) {
        return;
    }

    enemy.lastPathCalculation = now;

    let bestTarget = null;

    let bestPath = null;

    let bestDistance = Infinity;


    /*
        Check every building.
    */

    for (
        const building
        of gameState.buildings
    ) {

        if (building.hp <= 0) {
            continue;
        }

        const goals =
            getAdjacentCells(
                building.row,
                building.col
            );

        for (
            const goal
            of goals
        ) {

            const path =
                findPath(
                    enemy,
                    goal.row,
                    goal.col,
                    false
                );

            if (!path) {
                continue;
            }

            if (
                path.length <
                bestDistance
            ) {

                bestDistance =
                    path.length;

                bestTarget =
                    building;

                bestPath =
                    path;
            }
        }
    }


    /*
        If a reachable building exists,
        attack that building.
    */

    if (bestTarget) {

        enemy.targetBuildingId =
            bestTarget.id;

        enemy.path =
            bestPath || [];

        enemy.pathIndex = 0;

        return;
    }


    /*
        No reachable building.

        Try to reach the row immediately
        above Core.
    */

    const coreGoals = [];

    for (
        let col = 0;
        col < COLS;
        col++
    ) {

        coreGoals.push({
            row: CORE_ROW - 1,
            col
        });
    }

    let corePath = null;

    let coreDistance = Infinity;

    for (
        const goal
        of coreGoals
    ) {

        const path =
            findPath(
                enemy,
                goal.row,
                goal.col,
                false
            );

        if (
            path &&
            path.length <
            coreDistance
        ) {

            coreDistance =
                path.length;

            corePath =
                path;
        }
    }

    enemy.targetBuildingId =
        null;

    enemy.path =
        corePath || [];

    enemy.pathIndex = 0;
}


/* =========================================================
   PATHFINDING
========================================================= */

function findPath(
    enemy,
    targetRow,
    targetCol,
    allowTargetOccupied
) {

    const startRow =
        Math.floor(enemy.row);

    const startCol =
        Math.floor(enemy.col);


    if (
        startRow === targetRow &&
        startCol === targetCol
    ) {
        return [];
    }


    const queue = [
        {
            row: startRow,
            col: startCol
        }
    ];

    const visited =
        new Set();

    const parent =
        new Map();

    const key =
        (row, col) =>
            `${row},${col}`;

    visited.add(
        key(startRow, startCol)
    );


    while (queue.length > 0) {

        const current =
            queue.shift();


        const directions = [
            { row: -1, col: 0 },
            { row: 1, col: 0 },
            { row: 0, col: -1 },
            { row: 0, col: 1 }
        ];


        for (
            const direction
            of directions
        ) {

            const nextRow =
                current.row +
                direction.row;

            const nextCol =
                current.col +
                direction.col;


            if (
                nextRow < 0 ||
                nextRow >= CORE_ROW ||
                nextCol < 0 ||
                nextCol >= COLS
            ) {
                continue;
            }


            const nextKey =
                key(
                    nextRow,
                    nextCol
                );


            if (
                visited.has(nextKey)
            ) {
                continue;
            }


            /*
                Buildings are obstacles.

                Exception:
                allowTargetOccupied is useful
                if we ever need it later.
            */

            const occupied =
                isOccupied(
                    nextRow,
                    nextCol
                );


            if (
                occupied &&
                !(
                    allowTargetOccupied &&
                    nextRow === targetRow &&
                    nextCol === targetCol
                )
            ) {

                continue;
            }


            visited.add(nextKey);

            parent.set(
                nextKey,
                {
                    row: current.row,
                    col: current.col
                }
            );


            if (
                nextRow === targetRow &&
                nextCol === targetCol
            ) {

                return reconstructPath(
                    parent,
                    startRow,
                    startCol,
                    targetRow,
                    targetCol
                );
            }


            queue.push({
                row: nextRow,
                col: nextCol
            });
        }
    }


    return null;
}

function reconstructPath(
    parent,
    startRow,
    startCol,
    targetRow,
    targetCol
) {

    const path = [];

    let current = {
        row: targetRow,
        col: targetCol
    };


    while (
        current.row !== startRow ||
        current.col !== startCol
    ) {

        path.unshift({
            row: current.row,
            col: current.col
        });

        const previous =
            parent.get(
                `${current.row},${current.col}`
            );

        if (!previous) {
            return null;
        }

        current = previous;
    }


    return path;
}


/* =========================================================
   ADJACENT CELLS
========================================================= */

function getAdjacentCells(
    row,
    col
) {

    const result = [];

    const directions = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 }
    ];


    for (
        const direction
        of directions
    ) {

        const r =
            row +
            direction.row;

        const c =
            col +
            direction.col;


        if (
            r < 0 ||
            r >= CORE_ROW ||
            c < 0 ||
            c >= COLS
        ) {
            continue;
        }


        /*
            Enemy needs an empty cell
            next to the building.
        */

        if (
            !isOccupied(r, c)
        ) {

            result.push({
                row: r,
                col: c
            });
        }
    }


    return result;
}


/* =========================================================
   ENEMY MOVEMENT
========================================================= */

function updateEnemies(delta, now) {

    gameState.enemies.forEach(enemy => {

        if (enemy.hp <= 0) {
            return;
        }


        /*
            Recalculate target/path.
        */

        chooseEnemyTarget(
            enemy,
            now
        );


        /*
            Determine whether enemy
            has reached its target.
        */

        if (
            enemy.targetBuildingId
        ) {

            const target =
                gameState.buildings.find(
                    building =>
                        building.id ===
                        enemy.targetBuildingId
                );


            if (
                !target ||
                target.hp <= 0
            ) {

                enemy.targetBuildingId =
                    null;

                enemy.path = [];

                return;
            }


            /*
                If enemy is next to target,
                stop moving and attack it.
            */

            const distance =
                Math.abs(
                    Math.floor(enemy.row) -
                    target.row
                ) +
                Math.abs(
                    Math.floor(enemy.col) -
                    target.col
                );


            if (distance <= 1) {

                enemy.path = [];

                attackBuilding(
                    enemy,
                    target,
                    now
                );

                return;
            }
        }


        /*
            No building target:
            if enemy reaches row above Core,
            attack Core.
        */

        if (
            !enemy.targetBuildingId &&
            Math.floor(enemy.row) >=
            CORE_ROW - 1
        ) {

            attackCore(
                enemy,
                now
            );

            return;
        }


        moveEnemy(
            enemy,
            delta
        );
    });
}


function moveEnemy(
    enemy,
    delta
) {

    if (
        !enemy.path ||
        enemy.pathIndex >=
        enemy.path.length
    ) {
        return;
    }


    const next =
        enemy.path[
            enemy.pathIndex
        ];


    const dx =
        next.col -
        enemy.col;

    const dy =
        next.row -
        enemy.row;


    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (
        distance < 0.05
    ) {

        enemy.col =
            next.col;

        enemy.row =
            next.row;

        enemy.pathIndex++;

        return;
    }


    let speed =
        enemy.speed;


    if (
        enemy.slowUntil >
        performance.now()
    ) {
        speed *= 0.5;
    }


    const amount =
        speed *
        delta /
        1000;


    enemy.col +=
        dx /
        distance *
        amount;

    enemy.row +=
        dy /
        distance *
        amount;
}


/* =========================================================
   ENEMY ATTACKS BUILDINGS
========================================================= */

function attackBuilding(
    enemy,
    building,
    now
) {

    if (
        now -
        enemy.lastAttack <
        700
    ) {
        return;
    }

    enemy.lastAttack =
        now;

    building.hp -=
        enemy.boss
            ? 18
            : 8;


    showDamage(
        building.row,
        building.col,
        enemy.boss
            ? 18
            : 8
    );


    if (
        building.hp <= 0
    ) {

        building.hp = 0;

        /*
            Building destroyed.
        */

        setStatus(
            `${BUILDINGS[building.type].name} 被摧毁了！`
        );
    }
}


/* =========================================================
   CORE DAMAGE
========================================================= */

function attackCore(
    enemy,
    now
) {

    if (
        now -
        enemy.lastAttack <
        700
    ) {
        return;
    }

    enemy.lastAttack =
        now;

    const damage =
        enemy.boss
            ? 35
            : 10;

    gameState.coreHp -=
        damage;


    showCoreDamage(
        damage
    );


    if (
        gameState.coreHp <= 0
    ) {

        gameState.coreHp = 0;

        gameState.gameRunning =
            false;

        gameState.phase =
            "gameover";

        setStatus(
            "💀 CORE 被摧毁！游戏失败。"
        );

        if (startWaveButton) {
            startWaveButton.style.display =
                "none";
        }
    }
}


/* =========================================================
   BUILDING COMBAT
========================================================= */

function updateBuildings(now) {

    gameState.buildings.forEach(
        building => {

            if (
                building.hp <= 0
            ) {
                return;
            }


            const data =
                BUILDINGS[
                    building.type
                ];


            if (
                data.type !== "attack"
            ) {
                return;
            }


            if (
                now -
                building.lastAttack <
                data.attackCooldown
            ) {
                return;
            }


            const target =
                findNearestEnemy(
                    building
                );


            if (!target) {
                return;
            }


            /*
                MACHINE GUN / ICE TOWER
                actually deal damage.
            */

            target.hp -=
                data.damage;


            building.lastAttack =
                now;


            /*
                Ice slows enemy.
            */

            if (
                building.type === "ice"
            ) {

                target.slowUntil =
                    now + 1000;
            }


            showDamage(
                Math.floor(target.row),
                Math.floor(target.col),
                data.damage
            );


            showAttackFlash(
                building
            );


            if (
                target.hp <= 0
            ) {

                target.hp = 0;

                gameState.gold +=
                    target.boss
                        ? 40
                        : 8;
            }
        }
    );
}


/* =========================================================
   TURRET TARGETING
========================================================= */

function findNearestEnemy(
    building
) {

    let nearest = null;

    let nearestDistance =
        Infinity;


    gameState.enemies.forEach(
        enemy => {

            if (
                enemy.hp <= 0
            ) {
                return;
            }


            const distance =
                Math.sqrt(
                    (
                        enemy.row -
                        building.row
                    ) ** 2 +
                    (
                        enemy.col -
                        building.col
                    ) ** 2
                );


            if (
                distance <=
                BUILDINGS[
                    building.type
                ].range &&
                distance <
                nearestDistance
            ) {

                nearest =
                    enemy;

                nearestDistance =
                    distance;
            }
        }
    );


    return nearest;
}


/* =========================================================
   VISUAL DAMAGE
========================================================= */

function showDamage(
    row,
    col,
    amount
) {

    const cell =
        getCell(row, col);

    if (!cell) {
        return;
    }

    const number =
        document.createElement("div");

    number.className =
        "damage-number";

    number.textContent =
        `-${amount}`;

    number.style.left =
        `${30 + Math.random() * 30}%`;

    number.style.top =
        "15%";

    cell.appendChild(number);

    setTimeout(() => {

        number.remove();

    }, 600);
}

function showCoreDamage(
    amount
) {

    const core =
        board.querySelector(
            ".core-full"
        );

    if (!core) {
        return;
    }

    const number =
        document.createElement("div");

    number.className =
        "damage-number";

    number.textContent =
        `-${amount}`;

    number.style.left =
        "50%";

    number.style.top =
        "10%";

    core.appendChild(number);

    setTimeout(() => {

        number.remove();

    }, 600);
}

function showAttackFlash(
    building
) {

    const cell =
        getCell(
            building.row,
            building.col
        );

    if (!cell) {
        return;
    }

    const flash =
        document.createElement("div");

    flash.className =
        "attack-flash";

    cell.appendChild(flash);

    setTimeout(() => {

        flash.remove();

    }, 200);
}


/* =========================================================
   CLEANUP
========================================================= */

function cleanupEnemies() {

    const dead =
        gameState.enemies.filter(
            enemy =>
                enemy.hp <= 0
        );

    if (dead.length > 0) {

        gameState.enemies =
            gameState.enemies.filter(
                enemy =>
                    enemy.hp > 0
            );
    }


    gameState.buildings =
        gameState.buildings.filter(
            building =>
                building.hp > 0
        );
}


/* =========================================================
   WAVE COMPLETION
========================================================= */

function checkWaveComplete() {

    if (
        gameState.phase !==
        "combat"
    ) {
        return;
    }


    const allSpawned =
        gameState.enemiesSpawned >=
        gameState.enemiesToSpawn;


    const noEnemies =
        gameState.enemies.length === 0;


    if (
        allSpawned &&
        noEnemies
    ) {

        /*
            Wave cleared.
        */

        if (
            gameState.wave >=
            TOTAL_WAVES
        ) {

            gameState.gameRunning =
                false;

            gameState.phase =
                "victory";

            setStatus(
                "🏆 你成功守住了 Core！"
            );

            return;
        }


        gameState.wave++;

        gameState.phase =
            "prepare";

        gameState.nextWaveReady =
            true;


        /*
            10% interest.
        */

        const interest =
            Math.round(
                gameState.gold *
                0.10
            );

        if (
            interest > 0
        ) {

            gameState.gold +=
                interest;

            setStatus(
                `第 ${gameState.wave - 1} 波完成！利息 +${interest}。准备下一波。`
            );

        } else {

            setStatus(
                `第 ${gameState.wave - 1} 波完成！准备下一波。`
            );
        }


        updateUI();
    }
}


/* =========================================================
   MAIN LOOP
========================================================= */

function gameLoop(now) {

    if (
        !gameState.gameRunning
    ) {
        render();
        return;
    }


    const delta =
        Math.min(
            now - lastTime,
            100
        );

    lastTime =
        now;


    /*
        Spawn enemies ONLY during combat.
    */

    if (
        gameState.phase ===
        "combat"
    ) {

        if (
            gameState.enemiesSpawned <
            gameState.enemiesToSpawn
        ) {

            if (
                now -
                gameState.lastEnemySpawn >=
                gameState.spawnInterval
            ) {

                spawnEnemy();

                gameState.lastEnemySpawn =
                    now;
            }
        }
    }


    updateEnemies(
        delta,
        now
    );

    updateBuildings(
        now
    );

    cleanupEnemies();

    checkWaveComplete();

    updateUI();

    render();

    requestAnimationFrame(
        gameLoop
    );
}
