// 친구 수비대: 대형, 이동, 인원 증감.
// 병력 수는 별도 변수 없이 항상 soldiers.length 하나로만 읽어 표시와 실제 인원이 어긋나지 않게 한다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;
  const S = C.SQUAD;
  const GOLDEN = 2.399963;

  const spacingFor = (n) => Math.min(S.spacing, S.maxRadius / Math.sqrt(Math.max(n, 1)));

  function slot(i, n) {
    if (i === 0) return { x: 0, z: 0 };
    const r = spacingFor(n) * Math.sqrt(i);
    return { x: Math.cos(i * GOLDEN) * r, z: Math.sin(i * GOLDEN) * r * 0.9 };
  }

  const radius = (n) => (n <= 1 ? 0 : spacingFor(n) * Math.sqrt(n - 1));
  const limitX = (n) => Math.max(0, C.ROAD_HALF - radius(n) - S.soldierR);

  function reflow(s) {
    const list = s.squad.soldiers;
    list.forEach((sol, i) => {
      const p = slot(i, list.length);
      sol.tx = p.x;
      sol.tz = p.z;
    });
  }

  function clampSoldierX(x) {
    const lim = C.ROAD_HALF - S.soldierR;
    return U.clamp(x, -lim, lim);
  }

  function addSoldiers(s, count, inPlace) {
    const q = s.squad;
    const add = Math.min(count, S.max - q.soldiers.length);
    const outer = radius(q.soldiers.length + add);
    for (let i = 0; i < add; i++) {
      // 게이트로 합류한 친구는 대형 바깥에서 달려와 모인다
      const a = U.random(s) * Math.PI * 2;
      const r = outer + 40 + U.random(s) * 60;
      const p = inPlace ? slot(q.soldiers.length, count) : { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.8 };
      const x = clampSoldierX(q.x + p.x);
      const z = q.z + p.z;
      q.soldiers.push({
        id: s.nextId++,
        ox: p.x,
        oz: p.z,
        tx: p.x,
        tz: p.z,
        x,
        z,
        px: x,
        pz: z,
        rally: 5 + U.random(s) * 4,
        cooldown: U.random(s) * C.WEAPON.interval,
      });
    }
    reflow(s);
    return add;
  }

  // (x, z)에 가장 가까운 친구부터 제거한다. filter가 있으면 그 조건을 만족하는 친구만 대상으로 한다.
  function removeNearest(s, count, x, z, filter) {
    const list = s.squad.soldiers;
    const pool = (filter ? list.filter(filter) : list.slice()).sort(
      (a, b) => (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2)
    );
    const gone = new Set(pool.slice(0, count));
    if (!gone.size) return 0;
    gone.forEach((sol) => s.events.push({ type: 'lost', x: sol.x, z: sol.z }));
    s.squad.soldiers = list.filter((sol) => !gone.has(sol));
    reflow(s);
    return gone.size;
  }

  function setCount(s, target) {
    const n = s.squad.soldiers.length;
    const goal = U.clamp(Math.round(target), 0, S.max);
    if (goal > n) addSoldiers(s, goal - n, false);
    else if (goal < n) {
      // 감소는 대형 바깥쪽 친구부터 뺀다
      const q = s.squad;
      const far = q.soldiers.reduce((best, c) => (Math.abs(c.ox) > Math.abs(best.ox) ? c : best), q.soldiers[0]);
      removeNearest(s, n - goal, far.x, far.z);
    }
  }

  function update(s, cmd, dt) {
    const q = s.squad;
    const lim = limitX(q.soldiers.length);
    q.px = q.x;
    q.pz = q.z;
    q.targetX = U.clamp(q.targetX + (cmd.dragDx || 0) + (cmd.axis || 0) * S.keySpeed * dt, -lim, lim);

    const dx = q.targetX - q.x;
    const maxMove = S.moveSpeed * dt;
    q.x += Math.abs(dx) <= maxMove ? dx : Math.sign(dx) * maxMove;
    q.z = Math.min(q.z + S.speed * dt, s.stopZ);

    for (const sol of q.soldiers) {
      sol.px = sol.x;
      sol.pz = sol.z;
      const k = 1 - Math.exp(-sol.rally * dt);
      sol.ox += (sol.tx - sol.ox) * k;
      sol.oz += (sol.tz - sol.oz) * k;
      sol.x = clampSoldierX(q.x + sol.ox);
      sol.z = q.z + sol.oz;
    }
  }

  U.Squad = { addSoldiers, removeNearest, setCount, update, radius, limitX, slot };
})();
