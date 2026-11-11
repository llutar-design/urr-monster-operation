// 친구 수비대와 길가 소품을 미리 그려 둔 스프라이트.
(function () {
  const U = (window.URR = window.URR || {});

  const SCALE = 3;
  const SOL_W = 48;
  const SOL_H = 62;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w * SCALE;
    c.height = h * SCALE;
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    return { c, ctx };
  }

  function ball(ctx, x, y, r, light, dark) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const FRIENDS = [
    { body: ['#6cc4ff', '#2b86ee'], head: ['#ffe2bf', '#e9b184'], ears: 'bear', pack: '#ffd84a' },
    { body: ['#ffe36e', '#f4b622'], head: ['#ffffff', '#dbe3f1'], ears: 'bunny', pack: '#49c5ff' },
    { body: ['#8ef07f', '#3fbe54'], head: ['#fff0a1', '#f6c63d'], ears: 'chick', pack: '#ff9d5c' },
    { body: ['#7fe0ff', '#27a7d8'], head: ['#d7dcf3', '#9fa8d6'], ears: 'cat', pack: '#a8ec6e' },
  ];

  function drawEars(ctx, f) {
    if (f.ears === 'bear') {
      ball(ctx, 12, 9, 6, f.head[0], f.head[1]);
      ball(ctx, 36, 9, 6, f.head[0], f.head[1]);
    } else if (f.ears === 'bunny') {
      ctx.fillStyle = f.head[1];
      for (const [x, tilt] of [[16, -0.16], [32, 0.16]]) {
        ctx.save();
        ctx.translate(x, 12);
        ctx.rotate(tilt);
        U.rr(ctx, -4.5, -13, 9, 21, 4.5);
        ctx.fill();
        ctx.restore();
      }
    } else if (f.ears === 'chick') {
      ctx.fillStyle = '#f49b2f';
      ctx.beginPath();
      ctx.ellipse(21, 5, 2.6, 6, -0.4, 0, Math.PI * 2);
      ctx.ellipse(27, 5, 2.6, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = f.head[1];
      ctx.beginPath();
      ctx.moveTo(9, 15);
      ctx.lineTo(11, 2);
      ctx.lineTo(21, 8);
      ctx.moveTo(39, 15);
      ctx.lineTo(37, 2);
      ctx.lineTo(27, 8);
      ctx.fill();
    }
  }

  function makeFriend(f, frame) {
    const { c, ctx } = canvas(SOL_W, SOL_H);

    ctx.fillStyle = 'rgba(40,70,120,.26)';
    ctx.beginPath();
    ctx.ellipse(24, 57, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4b5a86';
    const up = frame ? 3 : 0;
    ctx.beginPath();
    ctx.ellipse(16, 53 - up, 6, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(32, 53 - (3 - up), 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createLinearGradient(0, 28, 0, 54);
    g.addColorStop(0, f.body[0]);
    g.addColorStop(1, f.body[1]);
    ctx.fillStyle = g;
    U.rr(ctx, 10, 29, 28, 24, 12);
    ctx.fill();

    ball(ctx, 9, 39, 5, f.head[0], f.head[1]);

    ctx.fillStyle = f.pack;
    U.rr(ctx, 16, 32, 16, 15, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    U.star(ctx, 24, 39.5, 5, 2.3, 5, -Math.PI / 2);
    ctx.fill();

    // 장난감 뽀글이 총
    ctx.fillStyle = '#ff8f3f';
    U.rr(ctx, 36, 19, 8, 22, 3.5);
    ctx.fill();
    ctx.fillStyle = '#fff3a8';
    U.rr(ctx, 37, 16, 6, 6, 2.5);
    ctx.fill();
    ball(ctx, 39, 39, 5, f.head[0], f.head[1]);

    drawEars(ctx, f);
    ball(ctx, 24, 20, 16, f.head[0], f.head[1]);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(18, 13, 5, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  function makeTree() {
    const { c, ctx } = canvas(80, 110);
    ctx.fillStyle = 'rgba(30,110,60,.22)';
    ctx.beginPath();
    ctx.ellipse(40, 102, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c98a4e';
    U.rr(ctx, 33, 66, 14, 36, 6);
    ctx.fill();
    ball(ctx, 40, 44, 32, '#a4f27d', '#3bbb58');
    ball(ctx, 22, 58, 18, '#9bee77', '#3fbe5b');
    ball(ctx, 58, 58, 18, '#9bee77', '#3fbe5b');
    return c;
  }

  function makeBush() {
    const { c, ctx } = canvas(80, 54);
    ctx.fillStyle = 'rgba(30,110,60,.2)';
    ctx.beginPath();
    ctx.ellipse(40, 48, 34, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ball(ctx, 24, 32, 17, '#baf58a', '#4cc863');
    ball(ctx, 56, 32, 17, '#baf58a', '#4cc863');
    ball(ctx, 40, 25, 21, '#c9f99a', '#55cf69');
    return c;
  }

  function makeFlower() {
    const { c, ctx } = canvas(40, 56);
    ctx.fillStyle = '#4cc863';
    U.rr(ctx, 18, 26, 4, 28, 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ball(ctx, 20 + Math.cos(a) * 10, 20 + Math.sin(a) * 10, 7, '#fff9c9', '#ffd23d');
    }
    ball(ctx, 20, 20, 7, '#ffb25a', '#ff8a3a');
    return c;
  }

  let cache = null;

  U.Sprites = {
    SOL_ASPECT: SOL_H / SOL_W,
    get() {
      if (!cache) {
        cache = {
          friends: FRIENDS.map((f) => [makeFriend(f, 0), makeFriend(f, 1)]),
          tree: { img: makeTree(), w: 80, h: 110 },
          bush: { img: makeBush(), w: 80, h: 54 },
          flower: { img: makeFlower(), w: 40, h: 56 },
        };
      }
      return cache;
    },
  };
})();
