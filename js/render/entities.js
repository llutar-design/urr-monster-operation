// 친구, 몬스터, 보스, 게이트, 장애물, 총알 그리기. 게임 상태는 읽기만 한다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;
  const { project } = U.Camera;

  const SKINS = [
    ['#d2a6ff', '#9a63f0'],
    ['#ffb3da', '#f26fb0'],
    ['#ffc98b', '#f6994a'],
    ['#8ceee2', '#37c4bb'],
  ];

  function shadow(ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(40,70,120,.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSoldier(ctx, sol, v) {
    const z = U.lerp(sol.pz, sol.z, v.alpha);
    const x = U.lerp(sol.px, sol.x, v.alpha);
    const rel = z - v.camZ;
    if (rel < -190) return;
    const p = project(x, rel);
    const set = v.sprites.friends[sol.id % 4];
    const img = set[Math.floor(v.time * 9 + sol.id) % 2];
    const w = 20 * p.s;
    const h = w * U.Sprites.SOL_ASPECT;
    const bob = Math.abs(Math.sin(v.time * 11 + sol.id * 1.7)) * 2.2 * p.s;
    ctx.drawImage(img, p.x - w / 2, p.y - h * 0.94 - bob, w, h);
  }

  function blob(ctx, w, h, skin, flash) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.12);
    ctx.bezierCurveTo(-w * 0.56, -h * 0.78, -w * 0.28, -h, 0, -h);
    ctx.bezierCurveTo(w * 0.28, -h, w * 0.56, -h * 0.78, w * 0.5, -h * 0.12);
    ctx.quadraticCurveTo(w * 0.52, h * 0.02, w * 0.3, 0);
    ctx.quadraticCurveTo(w * 0.15, -h * 0.06, 0, 0);
    ctx.quadraticCurveTo(-w * 0.15, -h * 0.06, -w * 0.3, 0);
    ctx.quadraticCurveTo(-w * 0.52, h * 0.02, -w * 0.5, -h * 0.12);
    ctx.closePath();
    const g = ctx.createRadialGradient(-w * 0.18, -h * 0.72, w * 0.05, 0, -h * 0.45, w * 0.78);
    g.addColorStop(0, flash ? '#ffffff' : skin[0]);
    g.addColorStop(1, flash ? skin[0] : skin[1]);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.2, -h * 0.78, w * 0.13, h * 0.07, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function face(ctx, w, h, look, boss) {
    const ex = w * 0.2;
    const ey = -h * 0.54;
    const er = w * 0.125;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(dir * ex, ey, er, er * 1.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c3560';
      ctx.beginPath();
      ctx.arc(dir * ex + look * er * 0.25, ey + er * 0.2, er * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(dir * ex + look * er * 0.25 - er * 0.2, ey - er * 0.08, er * 0.24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,120,150,.5)';
      ctx.beginPath();
      ctx.ellipse(dir * w * 0.34, -h * 0.36, w * 0.08, h * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#3c3560';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, w * 0.03);
    ctx.beginPath();
    if (boss) {
      // 입을 삐죽 내민 표정
      ctx.moveTo(-w * 0.1, -h * 0.29);
      ctx.quadraticCurveTo(-w * 0.05, -h * 0.35, 0, -h * 0.29);
      ctx.quadraticCurveTo(w * 0.05, -h * 0.23, w * 0.1, -h * 0.29);
    } else {
      ctx.arc(0, -h * 0.36, w * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    ctx.stroke();
  }

  function hpBar(ctx, cx, y, w, ratio, s) {
    const h = Math.max(4, 6 * s);
    ctx.fillStyle = 'rgba(55,70,120,.55)';
    U.rr(ctx, cx - w / 2 - 2, y - 2, w + 4, h + 4, h);
    ctx.fill();
    ctx.fillStyle = '#7ef06c';
    U.rr(ctx, cx - w / 2, y, Math.max(h, w * ratio), h, h / 2);
    ctx.fill();
  }

  function drawMonster(ctx, m, v) {
    const z = U.lerp(m.pz, m.z, v.alpha);
    const rel = z - v.camZ;
    if (rel < -190) return;
    const p = project(m.x, rel);
    const t = v.time * 5 + m.id * 1.3;
    const w = m.r * 2.3 * p.s * (1 + Math.sin(t) * 0.05);
    const h = m.r * 2.2 * p.s * (1 - Math.sin(t) * 0.06);
    const hop = Math.max(0, Math.sin(t)) * 5 * p.s;

    shadow(ctx, p.x, p.y, w * 0.48, w * 0.15);
    ctx.save();
    ctx.translate(p.x, p.y - hop);
    blob(ctx, w, h, SKINS[m.id % SKINS.length], v.tick - m.lastHitTick < 5);
    face(ctx, w, h, (v.squadX - m.x) * 0.012, false);

    // 머리 위 새싹
    ctx.fillStyle = '#6fdc62';
    ctx.beginPath();
    ctx.ellipse(-w * 0.08, -h * 1.03, w * 0.1, h * 0.05, -0.6, 0, Math.PI * 2);
    ctx.ellipse(w * 0.08, -h * 1.03, w * 0.1, h * 0.05, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (m.hp < m.maxHp) hpBar(ctx, p.x, p.y - hop - h - 14 * p.s, w * 0.72, m.hp / m.maxHp, p.s);
  }

  function drawBoss(ctx, b, v) {
    if (!b.alive) return;
    const z = U.lerp(b.pz, b.z, v.alpha);
    const x = U.lerp(b.px, b.x, v.alpha);
    const rel = z - v.camZ;
    const p = project(x, rel);
    const t = v.time * 2.6;
    const w = b.r * 2.25 * p.s * (1 + Math.sin(t) * 0.035);
    const h = b.r * 2.15 * p.s * (1 - Math.sin(t) * 0.04);
    const flash = v.tick - b.lastHitTick < 3;

    shadow(ctx, p.x, p.y, w * 0.5, w * 0.14);
    ctx.save();
    ctx.translate(p.x, p.y);
    blob(ctx, w, h, flash ? ['#ead5ff', '#b98cff'] : ['#c79bff', '#7b47e6'], false);
    face(ctx, w, h, (v.squadX - x) * 0.006, true);

    // 왕관
    const cw = w * 0.32;
    const cy = -h * 0.97;
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = '#f09a22';
    ctx.lineWidth = Math.max(1.5, w * 0.012);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-cw, cy);
    ctx.lineTo(-cw * 1.12, cy - h * 0.2);
    ctx.lineTo(-cw * 0.5, cy - h * 0.09);
    ctx.lineTo(0, cy - h * 0.25);
    ctx.lineTo(cw * 0.5, cy - h * 0.09);
    ctx.lineTo(cw * 1.12, cy - h * 0.2);
    ctx.lineTo(cw, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function gateLabel(g) {
    return (g.op === '+' ? '+' : g.op === '-' ? '−' : '×') + g.v;
  }

  function drawGatePanel(ctx, gate, cx, rel) {
    const G = C.GATE;
    const base = project(cx, rel);
    const s = base.s;
    const hw = G.halfW * s;
    const h = G.height * s;
    const good = gate.op !== '-';
    const left = base.x - hw;
    const top = base.y - h;

    const g = ctx.createLinearGradient(0, top, 0, base.y);
    g.addColorStop(0, good ? 'rgba(92,184,255,.88)' : 'rgba(255,118,118,.88)');
    g.addColorStop(1, good ? 'rgba(36,124,245,.58)' : 'rgba(232,58,74,.58)');
    ctx.fillStyle = g;
    U.rr(ctx, left, top, hw * 2, h, 9 * s);
    ctx.fill();

    ctx.lineWidth = Math.max(1.5, 5 * s);
    ctx.strokeStyle = good ? '#ffffff' : '#fff0f0';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.3)';
    U.rr(ctx, left + 7 * s, top + 6 * s, hw * 2 - 14 * s, 13 * s, 6 * s);
    ctx.fill();

    const label = gateLabel(gate);
    const size = (label.length >= 3 ? 44 : 56) * s;
    if (size > 5) {
      U.outlined(ctx, label, base.x, top + h * 0.5, size, '#ffffff',
        good ? '#1254b8' : '#b81f35', Math.max(2, 9 * s));
    }
  }

  function drawGatePair(ctx, pair, v) {
    if (pair.resolved) return; // 지나간 게이트는 부대를 가리지 않게 바로 사라진다
    const rel = pair.z - v.camZ;
    const sx = C.GATE.sideX;
    drawGatePanel(ctx, pair.left, -sx, rel);
    drawGatePanel(ctx, pair.right, sx, rel);
  }

  function drawObstacle(ctx, o, v) {
    if (o.hit) return;
    const rel = o.z - v.camZ;
    if (rel < -160) return;
    const H = 44;
    const a = project(o.x, rel - o.hd);
    const b = project(o.x, rel + o.hd);
    const topNear = project(o.x, rel - o.hd, H);
    const topFar = project(o.x, rel + o.hd, H);

    shadow(ctx, a.x, a.y, o.hw * a.s * 1.04, 16 * a.s);

    // 윗면
    ctx.fillStyle = '#ffe877';
    ctx.beginPath();
    ctx.moveTo(topFar.x - o.hw * b.s, topFar.y);
    ctx.lineTo(topFar.x + o.hw * b.s, topFar.y);
    ctx.lineTo(topNear.x + o.hw * a.s, topNear.y);
    ctx.lineTo(topNear.x - o.hw * a.s, topNear.y);
    ctx.closePath();
    ctx.fill();

    // 장난감 블록 앞면
    const left = a.x - o.hw * a.s;
    const width = o.hw * 2 * a.s;
    const blocks = 4;
    const colors = ['#ffb13d', '#4db6ff', '#ffcf3d', '#63d873'];
    for (let i = 0; i < blocks; i++) {
      const bw = width / blocks;
      ctx.fillStyle = colors[(i + o.id) % colors.length];
      U.rr(ctx, left + i * bw + 1, topNear.y, bw - 2, a.y - topNear.y, 7 * a.s);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      U.rr(ctx, left + i * bw + 6 * a.s, topNear.y + 5 * a.s, bw - 12 * a.s, 8 * a.s, 4 * a.s);
      ctx.fill();
    }
    if (32 * a.s > 8) {
      U.outlined(ctx, '조심!', a.x, (a.y + topNear.y) / 2, 25 * a.s, '#fff', '#c96a12', Math.max(2, 5 * a.s));
    }
  }

  function drawBullets(ctx, bullets, v) {
    ctx.lineCap = 'round';
    for (const b of bullets) {
      const x = U.lerp(b.px, b.x, v.alpha);
      const z = U.lerp(b.pz, b.z, v.alpha);
      const rel = z - v.camZ;
      const head = project(x, rel, 20);
      const tail = project(x - (b.vx / C.WEAPON.bulletSpeed) * 20, rel - (b.vz / C.WEAPON.bulletSpeed) * 20, 20);
      ctx.strokeStyle = 'rgba(255,170,30,.75)';
      ctx.lineWidth = 8 * head.s;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      ctx.strokeStyle = '#fffbd0';
      ctx.lineWidth = 3.8 * head.s;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
    }
  }

  // 먼 것부터 차례로 그린다
  function drawScene(ctx, state, v) {
    const items = [];
    for (const p of state.gatePairs) items.push({ z: p.z, fn: () => drawGatePair(ctx, p, v) });
    for (const o of state.obstacles) items.push({ z: o.z, fn: () => drawObstacle(ctx, o, v) });
    for (const m of state.monsters) items.push({ z: m.z, fn: () => drawMonster(ctx, m, v) });
    if (state.boss.alive) items.push({ z: state.boss.z, fn: () => drawBoss(ctx, state.boss, v) });
    for (const sol of state.squad.soldiers) items.push({ z: sol.z, fn: () => drawSoldier(ctx, sol, v) });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.fn();
    drawBullets(ctx, state.bullets, v);
  }

  U.Entities = { drawScene };
})();
