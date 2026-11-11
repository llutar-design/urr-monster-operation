// 하늘, 언덕, 잔디, 스크롤되는 도로와 길가 소품.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;
  const { project, HORIZON } = U.Camera;
  const W = C.VIEW_W;
  const H = C.VIEW_H;
  const R = C.ROAD_HALF;
  const SEG = 60;

  const even = (i) => ((i % 2) + 2) % 2 === 0;

  // 타원끼리 선으로 이어지지 않도록 새 하위 경로로 시작한다
  function puff(ctx, x, y, rx, ry) {
    ctx.moveTo(x + rx, y);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }

  function drawSky(ctx, time, camZ) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, '#59c1ff');
    g.addColorStop(1, '#d4f3ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON + 2);

    ctx.fillStyle = 'rgba(255,240,150,.55)';
    ctx.beginPath();
    ctx.arc(442, 150, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe873';
    ctx.beginPath();
    ctx.arc(442, 150, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 190 + time * (9 + i * 3)) % 760) - 110;
      const y = 126 + (i % 3) * 30;
      ctx.beginPath();
      puff(ctx, x, y, 44, 18);
      puff(ctx, x - 28, y + 5, 26, 13);
      puff(ctx, x + 30, y + 5, 28, 14);
      puff(ctx, x + 2, y - 12, 25, 17);
      ctx.fill();
    }

    const drift = (camZ * 0.02) % 40;
    ctx.fillStyle = '#9fe687';
    ctx.beginPath();
    puff(ctx, 70 - drift, HORIZON + 22, 190, 74);
    puff(ctx, 470 + drift, HORIZON + 26, 210, 84);
    ctx.fill();
    ctx.fillStyle = '#7fd96e';
    ctx.beginPath();
    ctx.ellipse(272, HORIZON + 38, 240, 66, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function quad(ctx, a, b, xa0, xa1, xb0, xb1) {
    ctx.beginPath();
    ctx.moveTo(a.x + xa0 * a.s, a.y);
    ctx.lineTo(a.x + xa1 * a.s, a.y);
    ctx.lineTo(b.x + xb1 * b.s, b.y + 1);
    ctx.lineTo(b.x + xb0 * b.s, b.y + 1);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(ctx, camZ) {
    const SEGS = 50;
    const first = Math.floor((camZ - 170) / SEG);
    const far = project(0, (first + SEGS + 1) * SEG - camZ);
    ctx.fillStyle = '#7fd96e';
    ctx.fillRect(0, far.y - 1, W, H);

    ctx.fillStyle = '#ffe79c';
    ctx.beginPath();
    ctx.moveTo(far.x - R * far.s, far.y + 1);
    ctx.lineTo(far.x + R * far.s, far.y + 1);
    ctx.lineTo(far.x, HORIZON + 8);
    ctx.fill();

    for (let i = first + SEGS; i >= first; i--) {
      const rel0 = Math.max(i * SEG - camZ, -200);
      const rel1 = (i + 1) * SEG - camZ;
      if (rel1 <= rel0) continue;
      const near = project(0, rel0);
      const farP = project(0, rel1);

      ctx.fillStyle = even(i) ? '#8fe277' : '#7ed96b';
      ctx.fillRect(0, farP.y, W, near.y - farP.y + 1);

      ctx.fillStyle = even(i) ? '#fff0b5' : '#ffe79c';
      quad(ctx, farP, near, -R, R, -R, R);

      ctx.fillStyle = even(i) ? '#ffffff' : '#35a6ff';
      quad(ctx, farP, near, -R - 11, -R, -R - 11, -R);
      quad(ctx, farP, near, R, R + 11, R, R + 11);

      if (even(i)) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        quad(ctx, farP, near, -2.6, 2.6, -2.6, 2.6);
      }
    }
  }

  function hash(i) {
    const n = Math.abs(i * 7919 + 131) % 1009;
    return n / 1009;
  }

  function drawScenery(ctx, camZ) {
    const sprites = U.Sprites.get();
    const SP = 130;
    const first = Math.floor((camZ - 170) / SP);
    for (let i = first + 20; i >= first; i--) {
      const z = i * SP;
      const rel = z - camZ;
      if (rel < -170) continue;
      const k = hash(i);
      const side = even(i) ? -1 : 1;
      const x = side * (150 + k * 90);
      const item = k < 0.42 ? sprites.tree : k < 0.72 ? sprites.bush : sprites.flower;
      const scale = item === sprites.tree ? 1.05 : 0.7;
      const p = project(x, rel);
      const w = item.w * scale * p.s;
      const h = item.h * scale * p.s;
      ctx.drawImage(item.img, p.x - w / 2, p.y - h, w, h);
    }
  }

  U.World = {
    draw(ctx, camZ, time) {
      drawSky(ctx, time, camZ);
      drawGround(ctx, camZ);
      drawScenery(ctx, camZ);
    },
  };
})();
