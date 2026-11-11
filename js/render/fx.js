// 팡팡 효과. 게임 이벤트를 읽어 화면 전용 입자를 만들며 게임 결과에는 영향을 주지 않는다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;
  const { project } = U.Camera;
  const MAX_PARTICLES = 420;
  const COLORS = ['#ffd84a', '#5cc4ff', '#7ef06c', '#ff9fd2', '#ffffff'];

  let parts = [];
  let bursts = [];
  let floats = [];
  let confetti = [];
  let banner = null;
  let shake = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function reset() {
    parts = [];
    bursts = [];
    floats = [];
    confetti = [];
    banner = null;
    shake = 0;
  }

  function spray(x, z, h, count, speed, size, colors) {
    for (let i = 0; i < count && parts.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(speed * 0.35, speed);
      parts.push({
        x, z, h,
        vx: Math.cos(a) * v,
        vz: Math.sin(a) * v,
        vh: rand(speed * 0.4, speed * 1.1),
        size: rand(size * 0.55, size),
        rot: Math.random() * 6,
        spin: rand(-9, 9),
        life: rand(0.42, 0.78),
        color: pick(colors),
        star: Math.random() < 0.55,
      });
    }
  }

  function burst(x, z, r, text) {
    bursts.push({ x, z, r, text, t: 0, dur: 0.46, rot: Math.random() * 3 });
  }

  function floatText(x, z, text, color, stroke, size) {
    floats.push({ x, z, text, color, stroke, size, t: 0, dur: 1.15 });
  }

  function makeConfetti() {
    for (let i = 0; i < 130; i++) {
      confetti.push({
        x: rand(0, C.VIEW_W),
        y: rand(-760, -20),
        vy: rand(150, 330),
        drift: rand(0, 6),
        w: rand(9, 17),
        h: rand(6, 11),
        rot: rand(0, 6),
        spin: rand(-6, 6),
        color: pick(COLORS),
      });
    }
  }

  function consume(events) {
    for (const e of events) {
      if (e.type === 'hit') {
        spray(e.x, e.z, 22, 1, 70, 5, ['#fff2a6', '#ffffff']);
      } else if (e.type === 'pop') {
        spray(e.x, e.z, 25, 20, 190, 11, COLORS);
        burst(e.x, e.z, e.r, '팡!');
      } else if (e.type === 'lost') {
        spray(e.x, e.z, 14, 5, 110, 7, ['#ffffff', '#bfe6ff', '#ffe98a']);
      } else if (e.type === 'gate') {
        const delta = e.after - e.before;
        const label = (delta >= 0 ? `친구 +${delta}` : `친구 −${-delta}`) + '명!';
        floatText(e.x, e.z + 20, label, delta >= 0 ? '#fff37a' : '#ffffff', delta >= 0 ? '#1254b8' : '#b81f35', 40);
        spray(e.x, e.z, 60, 34, 240, 11, delta >= 0 ? ['#5cc4ff', '#ffffff', '#ffd84a'] : ['#ff8d8d', '#ffffff']);
        burst(e.x, e.z + 70, 16, delta >= 0 ? '우르르!' : '앗!'); // 부대 앞쪽에 작게 띄워 시야를 가리지 않는다
      } else if (e.type === 'bonk') {
        spray(e.x, e.z, 30, 16, 180, 11, ['#ffb13d', '#ffcf3d', '#63d873', '#4db6ff']);
        burst(e.x, e.z, 30, '쿵!');
        if (e.lost) floatText(e.x, e.z + 40, `−${e.lost}명`, '#ffffff', '#b81f35', 34);
        shake = Math.max(shake, 7);
      } else if (e.type === 'bossWarn') {
        banner = { text: '거대 몬스터 등장!', t: 0, dur: 2 };
        shake = Math.max(shake, 5);
      } else if (e.type === 'bossBump') {
        shake = Math.max(shake, 4);
      } else if (e.type === 'bossPop') {
        for (let i = 0; i < 6; i++) spray(e.x + rand(-80, 80), e.z, rand(20, 170), 26, 310, 16, COLORS);
        burst(e.x, e.z, 120, '팡팡!');
        shake = 16;
      } else if (e.type === 'win') {
        makeConfetti();
      }
    }
  }

  function update(dt) {
    for (const p of parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vh -= 560 * dt;
      p.h = Math.max(0, p.h + p.vh * dt);
      p.rot += p.spin * dt;
    }
    parts = parts.filter((p) => p.life > 0);
    for (const b of bursts) b.t += dt;
    bursts = bursts.filter((b) => b.t < b.dur);
    for (const f of floats) f.t += dt;
    floats = floats.filter((f) => f.t < f.dur);
    for (const c of confetti) {
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      if (c.y > C.VIEW_H + 20) c.y = -20;
    }
    if (banner) {
      banner.t += dt;
      if (banner.t > banner.dur) banner = null;
    }
    shake = Math.max(0, shake - 34 * dt);
  }

  function shakeOffset() {
    return { x: rand(-shake, shake), y: rand(-shake, shake) };
  }

  function drawWorld(ctx, v) {
    for (const p of parts) {
      const rel = p.z - v.camZ;
      if (rel < -190) continue;
      const q = project(p.x, rel, p.h);
      ctx.globalAlpha = Math.min(1, p.life / 0.3);
      ctx.fillStyle = p.color;
      if (p.star) {
        U.star(ctx, q.x, q.y, p.size * q.s, p.size * q.s * 0.45, 5, p.rot);
      } else {
        ctx.beginPath();
        ctx.arc(q.x, q.y, p.size * q.s * 0.65, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const b of bursts) {
      const rel = b.z - v.camZ;
      if (rel < -190) continue;
      const k = b.t / b.dur;
      const q = project(b.x, rel, b.r * 1.1);
      const grow = 1 - (1 - Math.min(1, k * 2.4)) ** 3;
      const r = (b.r * 1.5 + 22) * q.s * grow;
      ctx.globalAlpha = k < 0.65 ? 1 : (1 - k) / 0.35;
      ctx.fillStyle = '#fff3a0';
      ctx.strokeStyle = '#ff9d2e';
      ctx.lineWidth = Math.max(2, 4 * q.s);
      ctx.lineJoin = 'round';
      U.star(ctx, q.x, q.y, r, r * 0.68, 11, b.rot);
      ctx.fill();
      ctx.stroke();
      U.outlined(ctx, b.text, q.x, q.y, Math.max(13, r * 0.52), '#ff5e8a', '#ffffff', Math.max(3, r * 0.1));
      ctx.globalAlpha = 1;
    }

    for (const f of floats) {
      const k = f.t / f.dur;
      const q = project(f.x, Math.max(f.z - v.camZ, 40), 70 + k * 60);
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      const pop = Math.min(1, k * 7);
      U.outlined(ctx, f.text, q.x, q.y, f.size * (0.6 + pop * 0.4), f.color, f.stroke, 8);
      ctx.globalAlpha = 1;
    }
  }

  function drawScreen(ctx) {
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x + Math.sin(c.y * 0.02 + c.drift) * 18, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }

    if (banner) {
      const k = banner.t / banner.dur;
      const slide = Math.min(1, k * 7);
      ctx.globalAlpha = k > 0.82 ? (1 - k) / 0.18 : 1;
      const y = 256;
      ctx.fillStyle = 'rgba(124,74,232,.92)';
      U.rr(ctx, 270 - 225 * slide, y - 44, 450 * slide, 88, 30);
      ctx.fill();
      if (slide > 0.9) U.outlined(ctx, banner.text, 270, y, 42, '#fff37a', '#4a24a8', 8);
      ctx.globalAlpha = 1;
    }
  }

  U.FX = { reset, consume, update, shakeOffset, drawWorld, drawScreen };
})();
