// 게임 로직 자동 테스트. 실행: node tests/logic.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, Math, Set, console };
vm.createContext(sandbox);
for (const f of [
  'config', 'state', 'squad', 'gates', 'combat', 'game', 'render/camera', 'input',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, `js/${f}.js`), 'utf8'), sandbox, { filename: f });
}
const U = sandbox.window.URR;
const C = U.Config;
const DT = C.STEP;
const NONE = { dragDx: 0, axis: 0 };

const count = (s) => s.squad.soldiers.length;
const stepN = (s, n, cmd = NONE) => {
  for (let i = 0; i < n && !s.result; i++) U.Game.step(s, cmd, DT);
};
const noEnemies = (s) => {
  s.monsters = [];
  s.obstacles = [];
};
const moveTo = (s, x) => {
  s.squad.targetX = x;
  s.squad.x = x;
};

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  통과  ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  실패  ${name}\n        ${e.message}`);
  }
}

console.log('\n[기본 구성]');
test('1스테이지 구성이 사양과 일치한다', () => {
  const s = U.createState('stage1');
  assert.equal(count(s), 3);
  assert.equal(s.monsters.length, 10);
  assert.equal(s.obstacles.length, 2);
  assert.equal(s.gatePairs.length, 2);
  const [a, b] = s.gatePairs;
  assert.deepEqual([a.left.op, a.left.v, a.right.op, a.right.v], ['+', 10, 'x', 2]);
  assert.deepEqual([b.left.op, b.left.v, b.right.op, b.right.v], ['+', 5, 'x', 2]);
  assert.ok(s.boss.alive);
  assert.ok(a.z < s.obstacles[0].z && s.obstacles[1].z < b.z && b.z < s.boss.z);
});

console.log('\n[이동]');
test('키보드 입력으로 좌우 이동한다', () => {
  const s = U.createState('stage1');
  stepN(s, 20, { dragDx: 0, axis: 1 });
  assert.ok(s.squad.x > 50, `오른쪽 x=${s.squad.x}`);
  stepN(s, 40, { dragDx: 0, axis: -1 });
  assert.ok(s.squad.x < 0, `왼쪽 x=${s.squad.x}`);
});
test('드래그 이동량이 정확히 반영된다', () => {
  const s = U.createState('stage1');
  U.Game.step(s, { dragDx: 30, axis: 0 }, DT);
  stepN(s, 10);
  assert.ok(Math.abs(s.squad.x - 30) < 1e-6, `x=${s.squad.x}`);
});
test('어떤 인원과 입력에서도 모든 친구가 도로 안에 있다', () => {
  for (const n of [1, 3, 13, 26, 60, 120]) {
    const s = U.createState('stage1');
    noEnemies(s);
    s.gatePairs = [];
    U.Squad.setCount(s, n);
    const lim = C.ROAD_HALF - C.SQUAD.soldierR + 1e-9;
    for (const dir of [1, -1]) {
      for (let i = 0; i < 90; i++) {
        U.Game.step(s, { dragDx: dir * 200, axis: dir }, DT);
        for (const sol of s.squad.soldiers) assert.ok(Math.abs(sol.x) <= lim, `n=${n} x=${sol.x}`);
      }
    }
  }
});
test('도로 스크롤: 시간이 지나면 전진한다', () => {
  const s = U.createState('stage1');
  stepN(s, 60);
  assert.ok(Math.abs(s.squad.z - C.SQUAD.speed) < 0.01, `z=${s.squad.z}`);
});

console.log('\n[자동 사격과 충돌]');
test('전방 적에게 총알이 발사되어 실제로 이동한다', () => {
  const s = U.createState('stage1');
  s.gatePairs = [];
  s.monsters[0].z = 200;
  let moved = false;
  for (let i = 0; i < 60 && !moved; i++) {
    U.Game.step(s, NONE, DT);
    moved = s.bullets.some((b) => b.pz !== b.z && b.z > b.pz);
  }
  assert.ok(moved);
});
test('사거리 안에 적이 없으면 발사하지 않는다', () => {
  const s = U.createState('stage1');
  noEnemies(s);
  stepN(s, 30);
  assert.equal(s.bullets.length, 0);
});
test('총알이 적에 맞으면 HP가 줄어든다', () => {
  const s = U.createState('stage1');
  s.gatePairs = [];
  const m = s.monsters[0];
  m.x = 0;
  m.z = 150;
  s.monsters = [m];
  const hp = m.hp;
  let i = 0;
  while (m.hp === hp && i++ < 120) U.Game.step(s, NONE, DT);
  assert.ok(m.hp < hp, 'HP 감소 없음');
});
test('프레임당 이동이 적 크기보다 커도 총알이 통과하지 않는다', () => {
  const t = U.Combat.sweepCircle(0, 0, 0, 500, 0, 250, 10);
  assert.ok(t > 0.4 && t < 0.5, `t=${t}`);
  assert.equal(U.Combat.sweepCircle(50, 0, 50, 500, 0, 250, 10), -1);

  const s = U.createState('stage1');
  s.squad.soldiers = [];
  s.squad.z = 0;
  const m = s.monsters[0];
  m.x = 0;
  m.z = 200;
  s.monsters = [m];
  s.bullets.push({ x: 0, z: 0, px: 0, pz: 0, vx: 0, vz: 30000, life: 1 });
  const hp = m.hp;
  U.Combat.updateBullets(s, DT);
  assert.equal(m.hp, hp - 1);
  assert.equal(s.bullets.length, 0);
});
test('후방의 적은 공격하지 않는다', () => {
  const sol = { x: 0, z: 500 };
  assert.equal(U.Combat.nearestTarget(sol, [{ x: 0, z: 100, r: 20 }]), null);
});
test('몬스터 HP가 0이 되면 제거되고 팡 이벤트가 발생한다', () => {
  const s = U.createState('stage1');
  s.gatePairs = [];
  const m = s.monsters[0];
  m.x = 0;
  m.z = 300;
  m.hp = 1;
  s.monsters = [m];
  let i = 0;
  while (s.monsters.length && i++ < 200) U.Game.step(s, NONE, DT);
  assert.equal(s.monsters.length, 0);
  assert.equal(s.stats.killed, 1);
  assert.ok(s.events.some((e) => e.type === 'pop'));
});

console.log('\n[숫자 게이트]');
function gateCase(op, v, startN, expected, x) {
  const s = U.createState('stage1');
  noEnemies(s);
  U.Squad.setCount(s, startN);
  s.gatePairs = [{ id: 0, z: 30, left: { op, v }, right: { op: '+', v: 99 }, resolved: false, chosen: null }];
  if (x !== undefined) moveTo(s, x);
  else moveTo(s, -20);
  stepN(s, 60);
  assert.equal(count(s), expected);
  return s;
}
test('+5 게이트', () => gateCase('+', 5, 3, 8));
test('+10 게이트', () => gateCase('+', 10, 3, 13));
test('×2 게이트', () => gateCase('x', 2, 7, 14));
test('-5 게이트', () => gateCase('-', 5, 8, 3));
test('통과한 쪽 게이트만 적용된다', () => {
  gateCase('+', 10, 3, 13, -40);
  gateCase('+', 10, 3, 102, 40);
});
test('-5 게이트로 0명이 되면 패배한다', () => {
  const s = U.createState('stage1');
  noEnemies(s);
  s.gatePairs = [{ id: 0, z: 30, left: { op: '-', v: 5 }, right: { op: '+', v: 5 }, resolved: false, chosen: null }];
  moveTo(s, -20);
  stepN(s, 60);
  assert.equal(count(s), 0);
  assert.equal(s.result, 'lose');
});
test('게이트 근처에서 좌우로 흔들어도 한 번만 적용된다', () => {
  const s = U.createState('stage1');
  noEnemies(s);
  s.squad.z = s.gatePairs[0].z - 20;
  s.squad.pz = s.squad.z;
  for (let i = 0; i < 300; i++) {
    U.Game.step(s, { dragDx: i % 2 ? 150 : -150, axis: 0 }, DT);
  }
  assert.ok(s.gatePairs[0].resolved);
  assert.equal(s.stats.gatesApplied, 1);
  assert.ok([13, 6].includes(count(s)), `count=${count(s)}`);
});
test('증가한 친구는 대형 바깥에서 모여든다', () => {
  const s = gateCase('+', 10, 3, 13);
  stepN(s, 120);
  for (const sol of s.squad.soldiers) {
    assert.ok(Math.hypot(sol.ox - sol.tx, sol.oz - sol.tz) < 2.5, '대형 합류 실패');
  }
  const f = U.createState('stage1');
  noEnemies(f);
  U.Squad.setCount(f, 13);
  const late = f.squad.soldiers.slice(3);
  const away = late.filter((p) => Math.hypot(p.ox - p.tx, p.oz - p.tz) > 15);
  assert.equal(away.length, late.length);
});
test('최대 인원 상한에서도 실제 인원과 숫자가 같다', () => {
  const s = U.createState('stage1');
  U.Squad.setCount(s, 999);
  assert.equal(count(s), C.SQUAD.max);
});

console.log('\n[보스와 종료]');
function atBoss(n) {
  const s = U.createState('stage1');
  noEnemies(s);
  s.gatePairs = [];
  U.Squad.setCount(s, n);
  s.squad.z = s.stopZ;
  s.squad.pz = s.stopZ;
  return s;
}
test('보스 체력이 총알로 감소한다', () => {
  const s = atBoss(10);
  const hp = s.boss.hp;
  stepN(s, 120);
  assert.ok(s.boss.hp < hp, `hp=${s.boss.hp}`);
  assert.ok(s.stats.bossHits > 0);
});
test('보스를 쓰러뜨리면 승리로 끝난다', () => {
  const s = atBoss(40);
  stepN(s, 60 * 60);
  assert.equal(s.result, 'win');
  assert.equal(s.boss.hp, 0);
});
test('몬스터가 남아 있어도 보스를 쓰러뜨리면 승리한다', () => {
  const s = atBoss(40);
  s.monsters = [{ id: 0, kind: 'monster', x: 90, z: s.stopZ + 900, pz: 0, r: 21, hp: 99, maxHp: 99, lastHitTick: 0, awake: false }];
  stepN(s, 60 * 60);
  assert.equal(s.result, 'win');
});
test('병력이 0명이 되면 패배로 끝나고 진행이 멈춘다', () => {
  const s = atBoss(2);
  stepN(s, 60 * 90);
  assert.equal(s.result, 'lose');
  assert.equal(count(s), 0);
  const tick = s.tick;
  U.Game.step(s, NONE, DT);
  assert.equal(s.tick, tick);
});
test('보스를 피해 도로 끝으로 가도 전투가 끝난다(멈춤 없음)', () => {
  const s = atBoss(1);
  s.boss.hp = 99999;
  s.boss.maxHp = 99999;
  moveTo(s, 90);
  stepN(s, 60 * 120, { dragDx: 5, axis: 1 });
  assert.equal(s.result, 'lose');
});

console.log('\n[재시작]');
test('재시작한 상태에 이전 객체가 남지 않는다', () => {
  const a = U.createState('stage1');
  stepN(a, 60 * 12, { dragDx: 0, axis: -1 });
  assert.ok(a.bullets.length > 0 || a.stats.killed > 0 || a.gatePairs[0].resolved);
  const b = U.createState('stage1');
  assert.equal(count(b), 3);
  assert.equal(b.bullets.length, 0);
  assert.equal(b.events.length, 0);
  assert.equal(b.monsters.length, 10);
  assert.equal(b.squad.z, 0);
  assert.equal(b.tick, 0);
  assert.ok(b.gatePairs.every((g) => !g.resolved));
  assert.ok(b.obstacles.every((o) => !o.hit));
  assert.equal(b.boss.hp, b.boss.maxHp);
  assert.notStrictEqual(a.monsters, b.monsters);
  assert.notStrictEqual(a.gatePairs[0], b.gatePairs[0]);
  assert.notStrictEqual(a.squad.soldiers[0], b.squad.soldiers[0]);
});

console.log('\n[터치 좌표]');
test('축소되고 여백이 있는 캔버스에서도 좌표가 정확하다', () => {
  const rect = { left: 100, top: 20, width: 270, height: 480 };
  const p = U.Input.toLogical(235, 260, rect);
  assert.ok(Math.abs(p.x - 270) < 1e-9);
  assert.ok(Math.abs(p.y - 480) < 1e-9);
  const q = U.Input.toLogical(100, 20, rect);
  assert.ok(q.x === 0 && q.y === 0);
});

console.log('\n[처음부터 끝까지 플레이]');
// 전략: 게이트 방향과 장애물 회피 여부를 조합해 실제 입력으로 끝까지 진행한다
function play(g1, g2, dodge, seed) {
  const s = U.createState('stage1', seed);
  let maxN = 0;
  for (let i = 0; i < 60 * 180 && !s.result; i++) {
    const before = count(s);
    const z = s.squad.z;
    let goal = 0;
    if (z < s.gatePairs[0].z + 5) goal = g1;
    else if (dodge && z > 1300 && z < 1640) goal = 56;
    else if (dodge && z > 2200 && z < 2560) goal = -56;
    else if (z < s.gatePairs[1].z + 5) goal = g2;
    else goal = 0;
    const dx = U.clamp(goal - s.squad.x, -12, 12);
    U.Game.step(s, { dragDx: dx, axis: 0 }, DT);
    maxN = Math.max(maxN, before, count(s));
    s.events.length = 0;
  }
  return { s, maxN };
}
const LEFT = -50;
const RIGHT = 50;
const plans = [
  ['왼쪽(+10) → 오른쪽(×2), 장애물 회피', LEFT, RIGHT, true],
  ['왼쪽(+10) → 왼쪽(+5), 장애물 회피', LEFT, LEFT, true],
  ['오른쪽(×2) → 오른쪽(×2), 장애물 회피', RIGHT, RIGHT, true],
  ['오른쪽(×2) → 왼쪽(+5), 장애물 회피', RIGHT, LEFT, true],
  ['왼쪽(+10) → 오른쪽(×2), 회피 안 함', LEFT, RIGHT, false],
  ['오른쪽(×2) → 왼쪽(+5), 회피 안 함', RIGHT, LEFT, false],
];
for (const [name, g1, g2, dodge] of plans) {
  const { s, maxN } = play(g1, g2, dodge);
  console.log(
    `  [실측] ${name}: ${s.result}, 시간 ${s.time.toFixed(1)}초, 최대 ${maxN}명, 남은 ${count(s)}명, ` +
      `보스HP ${s.boss.hp}/${s.boss.maxHp}, 처치 ${s.stats.killed}, 충돌 ${s.stats.touched}, 통과 ${s.stats.escaped}`
  );
}
test('최선의 선택으로 끝까지 플레이하면 승리한다', () => {
  const { s, maxN } = play(LEFT, RIGHT, true);
  assert.equal(s.result, 'win');
  assert.ok(maxN >= 20, `maxN=${maxN}`);
  assert.equal(s.stats.killed + s.stats.touched + s.stats.escaped, 10);
  assert.ok(s.gatePairs.every((g) => g.resolved));
});
test('같은 입력과 시드는 같은 결과를 낸다', () => {
  const a = play(LEFT, RIGHT, true).s;
  const b = play(LEFT, RIGHT, true).s;
  assert.equal(a.tick, b.tick);
  assert.equal(count(a), count(b));
  assert.equal(a.boss.hp, b.boss.hp);
});

console.log(`\n결과: 통과 ${passed}, 실패 ${failures.length}`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
