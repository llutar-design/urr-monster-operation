// 자동 사격, 총알 이동과 충돌, 몬스터와 보스의 행동.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;
  const W = C.WEAPON;
  const SR = C.SQUAD.soldierR;

  // 선분 a→b가 원과 처음 만나는 지점의 비율(0~1). 만나지 않으면 -1.
  // 총알이 한 틱에 멀리 이동해도 적을 건너뛰지 않게 하는 연속 충돌 판정이다.
  function sweepCircle(ax, az, bx, bz, cx, cz, r) {
    const dx = bx - ax;
    const dz = bz - az;
    const fx = ax - cx;
    const fz = az - cz;
    const c = fx * fx + fz * fz - r * r;
    if (c <= 0) return 0;
    const a = dx * dx + dz * dz;
    if (a === 0) return -1;
    const b = 2 * (fx * dx + fz * dz);
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
  }

  function targets(s) {
    return s.boss.alive ? s.monsters.concat(s.boss) : s.monsters;
  }

  function nearestTarget(sol, list) {
    let best = null;
    let bestD = Infinity;
    for (const e of list) {
      if (e.z + e.r < sol.z) continue; // 전방의 적만
      const d = Math.hypot(e.x - sol.x, e.z - sol.z) - e.r;
      if (d <= W.range && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function updateShooting(s, dt) {
    const list = targets(s);
    for (const sol of s.squad.soldiers) {
      sol.cooldown -= dt;
      if (sol.cooldown > 0) continue;
      const t = nearestTarget(sol, list);
      if (!t || s.bullets.length >= W.maxBullets) {
        sol.cooldown = 0;
        continue;
      }
      sol.cooldown = W.interval;
      const angle = Math.atan2(t.x - sol.x, t.z - sol.z) + (U.random(s) - 0.5) * W.spread * 2;
      s.bullets.push({
        x: sol.x,
        z: sol.z + SR,
        px: sol.x,
        pz: sol.z + SR,
        vx: Math.sin(angle) * W.bulletSpeed,
        vz: Math.cos(angle) * W.bulletSpeed,
        life: W.bulletLife,
      });
    }
  }

  function popMonster(s, m, reason) {
    s.events.push({ type: 'pop', x: m.x, z: m.z, r: m.r, reason });
  }

  function damage(s, e) {
    e.hp -= W.damage;
    e.lastHitTick = s.tick;
    if (e.kind === 'boss') {
      s.stats.bossHits++;
      if (e.hp <= 0) {
        e.hp = 0;
        e.alive = false;
        s.events.push({ type: 'bossPop', x: e.x, z: e.z });
      }
    } else if (e.hp <= 0) {
      e.hp = 0;
      s.stats.killed++;
      popMonster(s, e, 'shot');
      s.monsters.splice(s.monsters.indexOf(e), 1);
    }
  }

  function updateBullets(s, dt) {
    const kept = [];
    for (const b of s.bullets) {
      b.px = b.x;
      b.pz = b.z;
      const nx = b.x + b.vx * dt;
      const nz = b.z + b.vz * dt;
      b.life -= dt;

      let hit = null;
      let hitT = 2;
      for (const e of targets(s)) {
        const t = sweepCircle(b.x, b.z, nx, nz, e.x, e.z, e.r + W.bulletR);
        if (t >= 0 && t < hitT) {
          hitT = t;
          hit = e;
        }
      }

      if (hit) {
        const hx = b.x + (nx - b.x) * hitT;
        const hz = b.z + (nz - b.z) * hitT;
        damage(s, hit);
        s.events.push({ type: 'hit', x: hx, z: hz });
        continue;
      }

      b.x = nx;
      b.z = nz;
      if (b.life > 0 && Math.abs(b.x) < C.ROAD_HALF + 60) kept.push(b);
    }
    s.bullets = kept;
  }

  function updateMonsters(s, dt) {
    const q = s.squad;
    for (let i = s.monsters.length - 1; i >= 0; i--) {
      const m = s.monsters[i];
      m.pz = m.z;
      if (!m.awake && m.z - q.z < C.MONSTER.wakeDist) m.awake = true;
      if (m.awake) m.z -= C.MONSTER.walk * dt;

      const touch = q.soldiers.some((sol) => Math.hypot(sol.x - m.x, sol.z - m.z) < m.r + SR);
      if (touch) {
        U.Squad.removeNearest(s, C.MONSTER.touch, m.x, m.z);
        s.stats.touched++;
        popMonster(s, m, 'touch');
        s.monsters.splice(i, 1);
      } else if (m.z < q.z - C.MONSTER.behind) {
        s.stats.escaped++;
        s.monsters.splice(i, 1);
      }
    }
  }

  function updateBoss(s, dt) {
    const b = s.boss;
    const q = s.squad;
    b.px = b.x;
    b.pz = b.z;
    if (!b.alive) return;

    if (!b.announced && q.z >= s.stopZ - 260) {
      b.announced = true;
      s.events.push({ type: 'bossWarn' });
    }
    if (q.z < s.stopZ) return; // 부대가 전투 위치에 도착하면 보스가 다가온다

    const maxShift = C.BOSS.follow * dt;
    b.x += U.clamp(q.x - b.x, -maxShift, maxShift);

    const front = q.soldiers.reduce((z, sol) => Math.max(z, sol.z), q.z) + SR;
    const contactZ = front + b.r * 0.72;
    b.touching = b.z <= contactZ;
    if (!b.touching) {
      b.z = Math.max(b.z - C.BOSS.walk * dt, contactZ);
      return;
    }

    // 보스가 닿으면 친구들이 일정 간격으로 튕겨 나간다
    b.eatTimer += dt;
    while (b.eatTimer >= C.BOSS.eatEvery && q.soldiers.length) {
      b.eatTimer -= C.BOSS.eatEvery;
      U.Squad.removeNearest(s, 1, b.x, b.z);
      s.events.push({ type: 'bossBump' });
    }
  }

  U.Combat = { sweepCircle, nearestTarget, updateShooting, updateBullets, updateMonsters, updateBoss };
})();
