(() => {
"use strict";

const COLS=10, ROWS=13, BUILD_ROWS=12, TOTAL_WAVES=8, STARTING_GOLD=500, CORE_MAX_HP=1000;

// footprint 的每一项是 [行偏移, 列偏移]。
// 机枪：2×2；冰塔：1×2；经济大楼：L型 3×3。
const BUILDINGS={
  wall:{name:"墙",icon:"🧱",cost:20,hp:500,kind:"wall",footprint:[[0,0]],size:"1×1"},
  turret:{name:"机枪塔",icon:"🔫",cost:60,hp:220,attack:35,attackSpeed:.55,range:3.2,kind:"attack",footprint:[[0,0],[0,1],[1,0],[1,1]],size:"2×2"},
  ice:{name:"冰塔",icon:"❄️",cost:80,hp:260,attack:22,attackSpeed:1,range:3,slow:.45,kind:"attack",footprint:[[0,0],[1,0]],size:"1×2"},
  economy:{name:"经济大楼",icon:"🏦",cost:150,hp:280,kind:"economy",income:150,size:"L型",footprint:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1]]}
};

const WAVES=[
 {enemies:15,elites:0,hp:30},{enemies:20,elites:0,hp:35},{enemies:25,elites:1,hp:40},
 {enemies:30,elites:1,hp:45},{enemies:35,elites:2,hp:50},{enemies:40,elites:2,hp:60},
 {enemies:50,elites:3,hp:70},{enemies:35,elites:0,hp:80,boss:true}
];

const BUFFS=[
["🔥 火力提升","所有攻击建筑伤害 +15%","damage",.15],["⚡ 极速射击","攻击速度 +12%","attackSpeed",.12],
["🧱 加固工程","建筑最大生命 +25%","buildingHp",.25],["🏰 核心强化","核心最大生命 +15%并恢复","coreHp",.15],
["💰 淘金热","敌人金币 +15%","goldDrop",.15],["📈 利滚利","利息 +5%","interest",.05],
["🏦 高效经营","经济建筑收入 +25%","economyIncome",.25],["🔧 快速施工","建筑价格 -10%","buildCost",.10],
["🔨 熟练工","升级价格 -10%","upgradeCost",.10],["🛠️ 紧急维修","每波结束修复10%","repair",.10],
["💥 重型弹药","伤害 +25%，攻速 -10%","heavyAmmo",.25],["🧊 强力寒霜","冰塔减速 +30%","iceSlow",.30],
["💣 爆炸弹头","20%概率额外范围伤害","explosion",.20],["⚡ 连锁电流","15%概率攻击第二目标","chain",.15],
["🎯 精准打击","伤害 +10%，范围 +0.5","precision",.10],["🪙 战斗奖金","每波 +50G","waveGold",50],
["💎 精英猎手","对精英伤害 +35%","eliteDamage",.35],["☠️ 巨物杀手","对Boss伤害 +40%","bossDamage",.40],
["🧱 厚重墙体","墙受伤 -25%","wallReduction",.25]
];

const state={
 phase:"prepare",wave:1,gold:STARTING_GOLD,coreHp:CORE_MAX_HP,selectedBuilding:null,selectedBuildingId:null,
 buildings:[],enemies:[],nextBuildingId:1,nextEnemyId:1,spawnTimer:0,lastTime:performance.now(),
 spawned:0,spawnedElites:0,waveKills:0,waveTotal:0,interestRate:.10,
 buffs:{damage:1,attackSpeed:1,buildingHp:1,coreHp:1,goldDrop:1,economyIncome:1,buildCost:0,upgradeCost:0,
 repair:0,heavyAmmo:false,iceSlow:1,explosion:0,chain:0,range:0,waveGold:0,eliteDamage:0,bossDamage:0,wallReduction:0},
 stats:{kills:0,damageDealt:0}
};

const board=document.getElementById("game-board"),goldEl=document.getElementById("gold"),waveEl=document.getElementById("wave"),
coreHpEl=document.getElementById("core-hp"),enemyCountEl=document.getElementById("enemy-count"),phaseLabel=document.getElementById("phase-label"),
statusEl=document.getElementById("status"),selectionPanel=document.getElementById("selection-panel"),startButton=document.getElementById("start-wave"),
upgradeButton=document.getElementById("upgrade"),demolishButton=document.getElementById("demolish"),restartButton=document.getElementById("restart"),
buffModal=document.getElementById("buff-modal"),buffOptions=document.getElementById("buff-options");
const cells=[];

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=(r,c)=>({x:c+.5,y:r+.5});
const status=t=>statusEl.textContent=t;
const cfg=()=>WAVES[clamp(state.wave-1,0,TOTAL_WAVES-1)];
const getBuilding=id=>state.buildings.find(b=>b.id===id)||null;
const selected=()=>getBuilding(state.selectedBuildingId);
const cost=t=>Math.max(1,Math.round(BUILDINGS[t].cost*(1-state.buffs.buildCost)));
const upgradeCost=b=>Math.max(10,Math.round((50+b.level*45)*(1-state.buffs.upgradeCost)));
const maxHp=b=>Math.round(BUILDINGS[b.type].hp*state.buffs.buildingHp*(1+(b.level-1)*.25));
const damage=b=>{let x=(BUILDINGS[b.type].attack||0)*state.buffs.damage*(1+(b.level-1)*.25);if(state.buffs.heavyAmmo)x*=1.25;return x};
const atkSpeed=b=>{let x=BUILDINGS[b.type].attackSpeed||0;if(!x)return 0;let m=state.buffs.attackSpeed;if(state.buffs.heavyAmmo)m*=.9;return x/m};
const range=b=>(BUILDINGS[b.type].range||0)+state.buffs.range;
const enemyGold=e=>e.boss?Math.round(250*state.buffs.goldDrop):e.elite?Math.round((30+Math.floor(Math.random()*21))*state.buffs.goldDrop):Math.round((10+Math.floor(Math.random()*6))*state.buffs.goldDrop);

function footprintCells(building,row=building.row,col=building.col){
  return BUILDINGS[building.type].footprint.map(([dr,dc])=>[row+dr,col+dc]);
}
function canPlace(type,row,col,exceptId=null){
  const temp={type,row,col};
  for(const [r,c] of footprintCells(temp)){
    if(r<0||r>=BUILD_ROWS||c<0||c>=COLS)return false;
    const other=state.buildings.find(b=>b.id!==exceptId&&footprintCells(b).some(([br,bc])=>br===r&&bc===c));
    if(other)return false;
  }
  return true;
}
function buildingAt(row,col){
  return state.buildings.find(b=>footprintCells(b).some(([r,c])=>r===row&&c===col))||null;
}

function createBoard(){
  board.innerHTML="";cells.length=0;
  for(let r=0;r<BUILD_ROWS;r++)for(let c=0;c<COLS;c++){
    const el=document.createElement("div");el.className="cell";el.dataset.row=r;el.dataset.col=c;
    el.addEventListener("click",()=>handleCell(r,c));board.appendChild(el);cells.push(el);
  }
  const core=document.createElement("div");core.className="core-full";core.textContent="🏰 CORE";board.appendChild(core);
}
const cell=(r,c)=>cells[r*COLS+c];

function setupBuildButtons(){
  document.querySelectorAll("[data-building]").forEach(btn=>btn.addEventListener("click",()=>{
    if(state.phase!=="prepare"){status("战斗进行中，不能建造。");return}
    state.selectedBuilding=btn.dataset.building;
    document.querySelectorAll("[data-building]").forEach(x=>x.classList.toggle("selected",x===btn));
    status(`已选择 ${BUILDINGS[state.selectedBuilding].name}（${BUILDINGS[state.selectedBuilding].size}），点击地图左上角格子放置。`);
  }));
}

function handleCell(r,c){
  const b=buildingAt(r,c);
  if(b){selectBuilding(b.id);return}
  if(state.phase!=="prepare"){status("战斗进行中，不能建造。");return}
  if(!state.selectedBuilding){status("请先选择一个建筑。");return}
  place(r,c,state.selectedBuilding);
}

function place(r,c,type){
  if(!canPlace(type,r,c)){status("这个位置放不下完整建筑。");return}
  const price=cost(type);
  if(state.gold<price){status(`Gold 不够，需要 ${price}G。`);return}
  const d=BUILDINGS[type];
  const b={id:state.nextBuildingId++,type,row:r,col:c,level:1,hp:Math.round(d.hp*state.buffs.buildingHp),cooldown:0};
  state.gold-=price;state.buildings.push(b);state.selectedBuildingId=b.id;state.selectedBuilding=null;
  document.querySelectorAll("[data-building]").forEach(x=>x.classList.remove("selected"));
  status(`${d.name} 建造完成，占地 ${d.size}，花费 ${price}G。`);
  updateUI();render();
}

function selectBuilding(id){if(getBuilding(id)){state.selectedBuildingId=id;updateSelection();render()}}
function upgrade(){
  const b=selected();if(!b){status("请先点击建筑。");return}
  const price=upgradeCost(b);if(state.gold<price){status(`升级需要 ${price}G。`);return}
  const old=maxHp(b);state.gold-=price;b.level++;b.hp=Math.min(maxHp(b),b.hp+maxHp(b)-old);
  status(`${BUILDINGS[b.type].name} 升到 Lv.${b.level}。`);updateUI();render();
}
function demolish(){
  const b=selected();if(!b){status("请先选择建筑。");return}
  if(state.phase!=="prepare"){status("只能在准备阶段拆除。");return}
  const refund=Math.floor(cost(b.type)*.4);state.gold+=refund;
  state.buildings=state.buildings.filter(x=>x.id!==b.id);state.selectedBuildingId=null;
  status(`拆除完成，返还 ${refund}G。`);updateUI();render();
}
upgradeButton.addEventListener("click",upgrade);demolishButton.addEventListener("click",demolish);

function startWave(){
  if(state.phase!=="prepare")return;
  const w=cfg();state.phase="wave";state.spawnTimer=0;state.spawned=0;state.spawnedElites=0;state.waveKills=0;
  state.waveTotal=w.enemies+w.elites+(w.boss?1:0);status(`第 ${state.wave} 波开始！`);updateUI();
}
startButton.addEventListener("click",startWave);

function spawn(){
  const w=cfg();if(state.spawned>=state.waveTotal)return;
  let type="normal";
  if(w.boss&&state.spawned===state.waveTotal-1)type="boss";
  else if(state.spawnedElites<w.elites&&Math.random()<(w.elites-state.spawnedElites)/Math.max(1,state.waveTotal-state.spawned))type="elite";
  let hp=w.hp*(1+(state.wave-1)*.1),speed=1.15,dmg=12;
  if(type==="elite"){hp*=3.2;speed*=.82;dmg*=1.8;state.spawnedElites++}
  if(type==="boss"){hp*=22;speed*=.58;dmg*=5}
  const col=Math.floor(Math.random()*COLS);
  state.enemies.push({id:state.nextEnemyId++,x:col+.5,y:-.45,hp,maxHp:hp,speed,damage:dmg,elite:type==="elite",boss:type==="boss",targetId:null,attackCooldown:0,slowTimer:0});
  state.spawned++;
}

function neighbors(r,c){return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>a>=0&&a<BUILD_ROWS&&b>=0&&b<COLS)}
function pathDistance(sr,sc,tr,tc,targetId){
  const q=[[sr,sc,0]],seen=new Set([`${sr},${sc}`]);
  while(q.length){
    const [r,c,d]=q.shift();
    if(r===tr&&c===tc)return d;
    for(const [nr,nc] of neighbors(r,c)){
      const key=`${nr},${nc}`;if(seen.has(key))continue;
      const block=buildingAt(nr,nc);
      if(block&&block.id!==targetId)continue;
      seen.add(key);q.push([nr,nc,d+1]);
    }
  }
  return Infinity;
}
function chooseTarget(e){
  const r=clamp(Math.floor(e.y),0,BUILD_ROWS-1),c=clamp(Math.floor(e.x),0,COLS-1);
  let best=null,bestD=Infinity;
  for(const b of state.buildings){
    let d=Infinity;
    for(const [tr,tc] of footprintCells(b)){
      d=Math.min(d,pathDistance(r,c,tr,tc,b.id));
    }
    if(d<bestD){bestD=d;best=b}
  }
  e.targetId=best?best.id:null;
}

function updateEnemies(dt){
  for(const e of state.enemies){
    if(e.hp<=0)continue;
    e.attackCooldown=Math.max(0,e.attackCooldown-dt);e.slowTimer=Math.max(0,e.slowTimer-dt);
    if(!e.targetId||!getBuilding(e.targetId))chooseTarget(e);
    const b=e.targetId?getBuilding(e.targetId):null;
    if(b){
      let targetCell=footprintCells(b).sort((a,z)=>Math.hypot((z[1]+.5)-e.x,(z[0]+.5)-e.y))[0];
      const p=center(targetCell[0],targetCell[1]),dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);
      if(d<=.72){
        if(e.attackCooldown<=0){
          let x=e.damage;if(b.type==="wall")x*=1-state.buffs.wallReduction;
          b.hp-=x;e.attackCooldown=.85;
          if(b.hp<=0){
            state.buildings=state.buildings.filter(x=>x.id!==b.id);
            if(state.selectedBuildingId===b.id)state.selectedBuildingId=null;
            e.targetId=null;status(`${BUILDINGS[b.type].name} 被摧毁了！`);
          }
        }
      }else{
        const s=e.speed*(e.slowTimer>0?.55:1);e.x+=dx/d*s*dt;e.y+=dy/d*s*dt;
      }
    }else{
      e.y+=e.speed*.75*dt;
      if(e.y>=BUILD_ROWS-.05&&e.attackCooldown<=0){state.coreHp-=e.damage;e.attackCooldown=1}
    }
  }
  state.enemies=state.enemies.filter(e=>{
    if(e.hp>0)return true;
    state.gold+=enemyGold(e);state.waveKills++;state.stats.kills++;return false;
  });
}

function updateBuildings(dt){
  for(const b of state.buildings){
    const d=BUILDINGS[b.type];if(d.kind!=="attack")continue;
    b.cooldown=Math.max(0,b.cooldown-dt);if(b.cooldown>0)continue;
    const fp=footprintCells(b),origin={x:fp.reduce((s,v)=>s+v[1]+.5,0)/fp.length,y:fp.reduce((s,v)=>s+v[0]+.5,0)/fp.length};
    const list=state.enemies.filter(e=>e.hp>0).map(e=>({e,d:dist(origin,e)})).filter(x=>x.d<=range(b)+.75).sort((a,z)=>a.d-z.d);
    if(!list.length)continue;
    const primary=list[0].e;let x=damage(b);if(primary.elite)x*=1+state.buffs.eliteDamage;if(primary.boss)x*=1+state.buffs.bossDamage;
    primary.hp-=x;state.stats.damageDealt+=x;if(b.type==="ice")primary.slowTimer=1.5*state.buffs.iceSlow;
    if(state.buffs.explosion&&Math.random()<state.buffs.explosion)list.slice(1,4).forEach(v=>{if(v.d<=1.15)v.e.hp-=x*.35});
    if(state.buffs.chain&&Math.random()<state.buffs.chain){const second=list.find(v=>v.e.id!==primary.id);if(second)second.e.hp-=x*.35}
    b.cooldown=atkSpeed(b);
  }
}

function updateWave(dt){
  if(state.spawned<state.waveTotal){state.spawnTimer-=dt;if(state.spawnTimer<=0){spawn();state.spawnTimer=Math.max(.18,.65-state.wave*.035)}}
  updateBuildings(dt);updateEnemies(dt);
  if(state.coreHp<=0){lose();return}
  if(state.spawned>=state.waveTotal&&!state.enemies.length)finishWave();
}

function finishWave(){
  state.phase="buff";
  const econ=state.buildings.filter(b=>b.type==="economy").length;
  const income=Math.round(econ*150*state.buffs.economyIncome),interest=Math.round(state.gold*state.interestRate),bonus=state.buffs.waveGold;
  state.gold+=income+interest+bonus;
  if(state.buffs.repair)for(const b of state.buildings)b.hp=Math.min(maxHp(b),b.hp+maxHp(b)*state.buffs.repair);
  if(state.wave>=TOTAL_WAVES){win();return}
  status(`第 ${state.wave} 波完成！收入 +${income}，利息 +${interest}${bonus?`，奖金 +${bonus}`:""}`);showBuffs();
}

function showBuffs(){
  buffOptions.innerHTML="";
  [...BUFFS].sort(()=>Math.random()-.5).slice(0,3).forEach(buff=>{
    const btn=document.createElement("button");btn.className="buff-button";btn.type="button";
    btn.innerHTML=`<strong>${buff[0]}</strong><small>${buff[1]}</small>`;
    btn.addEventListener("click",()=>{
      applyBuff(buff);buffModal.classList.add("hidden");state.wave++;state.phase="prepare";state.selectedBuilding=null;state.selectedBuildingId=null;
      document.querySelectorAll("[data-building]").forEach(x=>x.classList.remove("selected"));
      status(`已获得「${buff[0]}」。准备第 ${state.wave} 波。`);updateUI();render();
    });
    buffOptions.appendChild(btn);
  });
  buffModal.classList.remove("hidden");
}
function applyBuff(b){
  const k=b[2],v=b[3];
  if(k==="damage")state.buffs.damage*=1+v;else if(k==="attackSpeed")state.buffs.attackSpeed*=1+v;else if(k==="buildingHp")state.buffs.buildingHp*=1+v;
  else if(k==="coreHp"){state.buffs.coreHp*=1+v;state.coreHp=Math.min(CORE_MAX_HP*state.buffs.coreHp,state.coreHp+CORE_MAX_HP*v)}
  else if(k==="goldDrop")state.buffs.goldDrop*=1+v;else if(k==="interest")state.interestRate+=v;else if(k==="economyIncome")state.buffs.economyIncome*=1+v;
  else if(k==="buildCost")state.buffs.buildCost=clamp(state.buffs.buildCost+v,0,.6);else if(k==="upgradeCost")state.buffs.upgradeCost=clamp(state.buffs.upgradeCost+v,0,.6);
  else if(k==="repair")state.buffs.repair+=v;else if(k==="heavyAmmo")state.buffs.heavyAmmo=true;else if(k==="iceSlow")state.buffs.iceSlow*=1+v;
  else if(k==="explosion")state.buffs.explosion+=v;else if(k==="chain")state.buffs.chain+=v;else if(k==="precision"){state.buffs.damage*=1+v;state.buffs.range+=.5}
  else if(k==="waveGold")state.buffs.waveGold+=v;else if(k==="eliteDamage")state.buffs.eliteDamage+=v;else if(k==="bossDamage")state.buffs.bossDamage+=v;else if(k==="wallReduction")state.buffs.wallReduction=clamp(state.buffs.wallReduction+v,0,.75);
  for(const x of state.buildings)x.hp=Math.min(maxHp(x),x.hp*1.05);
}
function win(){state.phase="win";buffModal.classList.add("hidden");status(`🎉 通关！击杀 ${state.stats.kills} 个敌人。`);updateUI()}
function lose(){state.phase="lose";buffModal.classList.add("hidden");status("💥 核心被摧毁，本局失败。");updateUI()}

function updateSelection(){
  const b=selected();
  if(!b){selectionPanel.textContent="点击建筑查看详情。";upgradeButton.disabled=true;demolishButton.disabled=true;return}
  const d=BUILDINGS[b.type],up=upgradeCost(b);
  let s=`<strong>${d.icon} ${d.name} Lv.${b.level}</strong>　占地 ${d.size}<br>HP ${Math.floor(b.hp)}/${maxHp(b)}`;
  if(d.kind==="attack")s+=`　伤害 ${Math.floor(damage(b))}　攻速 ${atkSpeed(b).toFixed(2)}s　范围 ${range(b).toFixed(1)}`;
  if(d.kind==="economy")s+=`　每波收入 ${Math.floor(150*state.buffs.economyIncome)}G`;
  s+=`<br>升级 ${up}G　|　拆除返还约 ${Math.floor(cost(b.type)*.4)}G`;
  selectionPanel.innerHTML=s;upgradeButton.disabled=false;demolishButton.disabled=state.phase!=="prepare";
}

function render(){
  // 只清除建筑和敌人层；底层格子保持不变。
  board.querySelectorAll(".building,.enemy,.attack-range").forEach(x=>x.remove());

  for(const b of state.buildings){
    const el=document.createElement("div");
    const d=BUILDINGS[b.type];
    el.className=`building ${b.type}${b.id===state.selectedBuildingId?" selected":""}`;
    el.textContent=d.icon;
    el.title=`${d.name} Lv.${b.level} · ${d.size}`;
    el.style.gridColumn=`${b.col+1} / span ${Math.max(...d.footprint.map(x=>x[1]))+1}`;
    el.style.gridRow=`${b.row+1} / span ${Math.max(...d.footprint.map(x=>x[0]))+1}`;
    el.addEventListener("click",e=>{e.stopPropagation();selectBuilding(b.id)});
    const bar=document.createElement("div"),fill=document.createElement("div");
    bar.className="hp-bar";fill.className="hp-fill";fill.style.width=`${clamp(b.hp/maxHp(b)*100,0,100)}%`;bar.appendChild(fill);el.appendChild(bar);
    board.appendChild(el);

    // 只有选中攻击建筑时显示真实攻击范围；不显示敌人移动路径。
    if(b.id===state.selectedBuildingId&&d.kind==="attack"){
      const fp=footprintCells(b);
      const minR=Math.min(...fp.map(x=>x[0])),maxR=Math.max(...fp.map(x=>x[0]));
      const minC=Math.min(...fp.map(x=>x[1])),maxC=Math.max(...fp.map(x=>x[1]));
      const cellW=board.clientWidth/COLS,cellH=board.clientHeight/ROWS;
      const cx=(minC+maxC+1)/2*cellW,cy=(minR+maxR+1)/2*cellH;
      const radius=range(b)*Math.min(cellW,cellH);
      const circle=document.createElement("div");circle.className="attack-range";
      circle.style.width=`${radius*2}px`;circle.style.height=`${radius*2}px`;
      circle.style.left=`${cx-radius}px`;circle.style.top=`${cy-radius}px`;
      board.appendChild(circle);
    }
  }

  for(const e of state.enemies){
    if(e.y>12.5)continue;
    const el=document.createElement("div");
    el.className=`enemy${e.elite?" elite":""}${e.boss?" boss":""}`;
    el.textContent=e.boss?"👹":e.elite?"⭐":"●";
    const w=e.boss?9.2:e.elite?7.2:6.2;
    el.style.width=`${w}%`;el.style.height=`${w}%`;
    el.style.left=`${e.x/COLS*100-w/2}%`;el.style.top=`${e.y/ROWS*100-w/2}%`;
    board.appendChild(el);
  }
  updateSelection();
}

function updateUI(){
  goldEl.textContent=Math.max(0,Math.floor(state.gold));waveEl.textContent=state.wave;
  coreHpEl.textContent=`${Math.max(0,Math.floor(state.coreHp))}/${Math.floor(CORE_MAX_HP*state.buffs.coreHp)}`;
  enemyCountEl.textContent=state.enemies.length;
  phaseLabel.textContent=state.phase==="prepare"?"准备阶段":state.phase==="wave"?"战斗中":state.phase==="buff"?"选择强化":state.phase==="win"?"通关":"失败";
  startButton.disabled=state.phase!=="prepare";startButton.textContent=state.phase==="prepare"?`开始第 ${state.wave} 波`:"战斗中...";
  updateSelection();
}

function reset(){
  state.phase="prepare";state.wave=1;state.gold=STARTING_GOLD;state.coreHp=CORE_MAX_HP;state.selectedBuilding=null;state.selectedBuildingId=null;
  state.buildings=[];state.enemies=[];state.nextBuildingId=1;state.nextEnemyId=1;state.spawnTimer=0;state.spawned=0;state.spawnedElites=0;state.waveKills=0;state.waveTotal=0;state.interestRate=.10;state.stats={kills:0,damageDealt:0};
  Object.assign(state.buffs,{damage:1,attackSpeed:1,buildingHp:1,coreHp:1,goldDrop:1,economyIncome:1,buildCost:0,upgradeCost:0,repair:0,heavyAmmo:false,iceSlow:1,explosion:0,chain:0,range:0,waveGold:0,eliteDamage:0,bossDamage:0,wallReduction:0});
  document.querySelectorAll("[data-building]").forEach(x=>x.classList.remove("selected"));buffModal.classList.add("hidden");
  status("准备开始。选择建筑后，点击地图的左上角格子放置。");updateUI();render();
}
restartButton.addEventListener("click",reset);

function loop(now){
  const dt=Math.min(.05,(now-state.lastTime)/1000);state.lastTime=now;
  if(state.phase==="wave")updateWave(dt);
  updateUI();render();requestAnimationFrame(loop);
}
createBoard();setupBuildButtons();reset();requestAnimationFrame(loop);
})();