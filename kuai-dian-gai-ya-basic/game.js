const ROWS=13,COLS=10,STARTING_GOLD=300;
const BUILDINGS={
wall:{name:"Wall",cost:30,symbol:"🧱",type:"defense"},
turret:{name:"Machine Gun",cost:60,symbol:"🔫",type:"attack",damage:10,range:4,attackCooldown:700},
ice:{name:"Ice Tower",cost:80,symbol:"❄️",type:"attack",damage:5,range:4,attackCooldown:1200}
};
const gameState={gold:STARTING_GOLD,wave:1,selectedBuilding:null,buildings:[],enemies:[],gameRunning:true,lastEnemySpawn:0};
const board=document.getElementById("game-board");
const goldDisplay=document.getElementById("gold");
const waveDisplay=document.getElementById("wave");
const statusDisplay=document.getElementById("status");

function createBoard(){
 board.innerHTML="";
 for(let row=0;row<ROWS;row++){
  for(let col=0;col<COLS;col++){
   const cell=document.createElement("div");
   cell.classList.add("cell");cell.dataset.row=row;cell.dataset.col=col;
   cell.addEventListener("click",()=>handleCellClick(row,col));
   board.appendChild(cell);
  }
 }
 const coreCell=getCell(ROWS-1,Math.floor(COLS/2));
 coreCell.innerHTML='<div class="core">CORE</div>';
}
function getCell(row,col){return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`)}
document.querySelectorAll(".build-menu button").forEach(button=>{
 button.addEventListener("click",()=>selectBuilding(button.dataset.building));
});
function selectBuilding(type){
 gameState.selectedBuilding=type;
 document.querySelectorAll(".build-menu button").forEach(b=>b.classList.remove("selected"));
 document.querySelector(`[data-building="${type}"]`).classList.add("selected");
 statusDisplay.textContent=`Selected: ${BUILDINGS[type].name}. Click the map to build.`;
}
function handleCellClick(row,col){
 if(!gameState.gameRunning)return;
 if(!gameState.selectedBuilding){statusDisplay.textContent="Select a building first.";return}
 placeBuilding(gameState.selectedBuilding,row,col);
}
function isOccupied(row,col){
 if(row===ROWS-1&&col===Math.floor(COLS/2))return true;
 return gameState.buildings.some(b=>b.row===row&&b.col===col);
}
function placeBuilding(type,row,col){
 const data=BUILDINGS[type];
 if(isOccupied(row,col)){statusDisplay.textContent="This cell is occupied.";return}
 if(gameState.gold<data.cost){statusDisplay.textContent="Not enough gold.";return}
 gameState.gold-=data.cost;
 gameState.buildings.push({id:Date.now()+Math.random(),type,row,col,hp:type==="wall"?200:100,maxHp:type==="wall"?200:100,lastAttack:0});
 updateUI();render();statusDisplay.textContent=`${data.name} built.`;
}
function render(){
 document.querySelectorAll(".cell").forEach(cell=>{
  const row=Number(cell.dataset.row),col=Number(cell.dataset.col);
  if(row===ROWS-1&&col===Math.floor(COLS/2))return;
  cell.innerHTML="";
 });
 gameState.buildings.forEach(b=>{
  const cell=getCell(b.row,b.col);if(!cell)return;
  const el=document.createElement("div");el.classList.add("building",b.type);el.textContent=BUILDINGS[b.type].symbol;cell.appendChild(el);
 });
 gameState.enemies.forEach(e=>{
  const cell=getCell(Math.floor(e.row),e.col);if(!cell)return;
  const el=document.createElement("div");el.classList.add("enemy");cell.appendChild(el);
 });
}
function spawnEnemy(){
 gameState.enemies.push({id:Date.now()+Math.random(),row:0,col:Math.floor(Math.random()*COLS),hp:50,maxHp:50,speed:.02});
}
function updateEnemies(){
 gameState.enemies.forEach(e=>{e.row+=e.speed;if(e.row>=ROWS-1){e.row=ROWS-1;e.speed=0;damageCore(e)}});
}
let coreHP=1000;
function damageCore(enemy){
 coreHP-=1;enemy.hp=0;
 if(coreHP<=0){gameState.gameRunning=false;statusDisplay.textContent="💀 CORE DESTROYED"}
}
function findNearestEnemy(building){
 let nearest=null,nearestDistance=Infinity;
 gameState.enemies.forEach(e=>{
  if(e.hp<=0)return;
  const distance=Math.sqrt((e.row-building.row)**2+(e.col-building.col)**2);
  if(distance<nearestDistance&&distance<=BUILDINGS[building.type].range){nearest=e;nearestDistance=distance}
 });
 return nearest;
}
function updateBuildings(now){
 gameState.buildings.forEach(b=>{
  const data=BUILDINGS[b.type];if(data.type!=="attack")return;
  if(now-b.lastAttack<data.attackCooldown)return;
  const target=findNearestEnemy(b);if(!target)return;
  target.hp-=data.damage;b.lastAttack=now;
  if(target.hp<=0)gameState.gold+=8;
 });
}
function cleanupEnemies(){gameState.enemies=gameState.enemies.filter(e=>e.hp>0)}
function updateUI(){goldDisplay.textContent=Math.floor(gameState.gold);waveDisplay.textContent=gameState.wave}
let lastTime=performance.now();
function gameLoop(now){
 if(!gameState.gameRunning)return;
 lastTime=now;
 if(now-gameState.lastEnemySpawn>1500){spawnEnemy();gameState.lastEnemySpawn=now}
 updateEnemies();updateBuildings(now);cleanupEnemies();updateUI();render();
 requestAnimationFrame(gameLoop);
}
createBoard();updateUI();requestAnimationFrame(gameLoop);
