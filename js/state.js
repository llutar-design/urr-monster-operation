// 한 판의 모든 게임 상태를 새 객체로 만든다. 재시작은 이 함수를 다시 부르는 것이 전부다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;

  // 결과 재현이 가능하도록 상태 안에 시드를 둔 난수 (mulberry32)
  U.random = function (s) {
    s.seed = (s.seed + 0x6d2b79f5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  U.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  U.createState = function (stageId, seed) {
    const id = U.Stages[stageId] ? stageId : 'stage1';
    const stage = U.Stages[id];
    const bossHp = stage.boss.hp || C.BOSS.hp;

    const s = {
      stageId: id,
      stageName: stage.name,
      seed: seed === undefined ? 20260 : seed,
      tick: 0,
      time: 0,
      result: null, // null | 'win' | 'lose'
      resultTime: 0,
      nextId: 1,
      events: [], // 렌더러가 연출로 소비하는 일회성 이벤트
      stats: { killed: 0, touched: 0, escaped: 0, bossHits: 0, gatesApplied: 0 },

      squad: { x: 0, z: 0, px: 0, pz: 0, targetX: 0, soldiers: [] },
      bullets: [],

      monsters: stage.monsters.map((m, i) => ({
        id: i,
        kind: 'monster',
        x: m.x,
        z: m.z,
        pz: m.z,
        r: C.MONSTER.r,
        hp: C.MONSTER.hp,
        maxHp: C.MONSTER.hp,
        lastHitTick: -999,
        awake: false,
      })),

      obstacles: stage.obstacles.map((o, i) => ({
        id: i,
        x: o.x,
        z: o.z,
        hw: o.hw,
        hd: C.OBSTACLE.hd,
        hit: false,
      })),

      gatePairs: stage.gates.map((g, i) => ({
        id: i,
        z: g.z,
        left: { op: g.left.op, v: g.left.v },
        right: { op: g.right.op, v: g.right.v },
        resolved: false,
        chosen: null,
      })),

      boss: {
        kind: 'boss',
        x: stage.boss.x,
        z: stage.boss.z,
        px: stage.boss.x,
        pz: stage.boss.z,
        r: C.BOSS.r,
        hp: bossHp,
        maxHp: bossHp,
        alive: true,
        lastHitTick: -999,
        touching: false,
        eatTimer: 0,
        announced: false,
      },
      stopZ: stage.boss.z - C.BOSS.stopDist,
    };

    U.Squad.addSoldiers(s, stage.start, true);
    return s;
  };
})();
