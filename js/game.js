// 고정 스텝 1회 분량의 게임 진행. DOM과 Canvas를 전혀 건드리지 않는다.
(function () {
  const U = (window.URR = window.URR || {});

  function finish(s, result) {
    s.result = result;
    s.resultTime = 0;
    s.bullets = [];
    s.events.push({ type: result });
  }

  function step(s, cmd, dt) {
    if (s.result) {
      s.resultTime += dt;
      return;
    }

    s.tick++;
    s.time += dt;

    U.Squad.update(s, cmd, dt);
    U.Gates.updateGates(s);
    U.Gates.updateObstacles(s);
    U.Combat.updateMonsters(s, dt);
    U.Combat.updateBoss(s, dt);
    U.Combat.updateShooting(s, dt);
    U.Combat.updateBullets(s, dt);

    if (!s.boss.alive) finish(s, 'win');
    else if (s.squad.soldiers.length === 0) finish(s, 'lose');
  }

  // 전진 85%, 보스 체력 15%로 합산한 진행률(0~1)
  function progress(s) {
    const road = Math.min(1, s.squad.z / s.stopZ);
    const boss = 1 - s.boss.hp / s.boss.maxHp;
    return road * 0.85 + boss * 0.15;
  }

  U.Game = { step, progress };
})();
