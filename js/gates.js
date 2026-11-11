// 숫자 게이트와 장애물.
(function () {
  const U = (window.URR = window.URR || {});
  const SR = U.Config.SQUAD.soldierR;

  function applyOp(n, gate) {
    if (gate.op === '+') return n + gate.v;
    if (gate.op === '-') return n - gate.v;
    if (gate.op === 'x') return n * gate.v;
    return n;
  }

  // resolved 플래그로 한 쌍당 정확히 한 번만 적용된다
  function resolvePair(s, pair) {
    const q = s.squad;
    const side = q.x < 0 ? 'left' : 'right';
    const gate = pair[side];
    const before = q.soldiers.length;

    pair.resolved = true;
    pair.chosen = side;
    U.Squad.setCount(s, applyOp(before, gate));
    s.stats.gatesApplied++;

    s.events.push({
      type: 'gate',
      side,
      op: gate.op,
      v: gate.v,
      before,
      after: q.soldiers.length,
      x: q.x,
      z: pair.z,
    });
  }

  function updateGates(s) {
    for (const pair of s.gatePairs) {
      if (!pair.resolved && s.squad.z >= pair.z) resolvePair(s, pair);
    }
  }

  function updateObstacles(s) {
    const list = s.squad.soldiers;
    for (const o of s.obstacles) {
      if (o.hit) continue;
      const inLane = (sol) => Math.abs(sol.x - o.x) < o.hw + SR;
      const touched = list.some(
        (sol) => inLane(sol) && sol.z + SR >= o.z - o.hd && sol.z - SR <= o.z + o.hd
      );
      if (!touched) continue;
      o.hit = true;
      const lost = U.Squad.removeNearest(s, U.Config.OBSTACLE.damage, o.x, o.z, inLane);
      s.events.push({ type: 'bonk', x: o.x, z: o.z, lost });
      return; // 제거로 목록이 바뀌었으므로 다음 틱에 이어서 검사한다
    }
  }

  U.Gates = { applyOp, updateGates, updateObstacles };
})();
