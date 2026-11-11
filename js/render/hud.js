// 진행률, 병력 숫자, 보스 체력 표시.
(function () {
  const U = (window.URR = window.URR || {});
  const { project } = U.Camera;

  let shownCount = 0;
  let popT = 1;

  function reset() {
    shownCount = 0;
    popT = 1;
  }

  function bar(ctx, x, y, w, h, ratio, fill) {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    U.rr(ctx, x - 4, y - 4, w + 8, h + 8, (h + 8) / 2);
    ctx.fill();
    ctx.fillStyle = '#cfe3f7';
    U.rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = fill;
      U.rr(ctx, x, y, Math.max(h, w * Math.min(1, ratio)), h, h / 2);
      ctx.fill();
    }
  }

  function drawCountBubble(ctx, state, v, count) {
    if (!count) return;
    const r = U.Squad.radius(count);
    const p = project(U.lerp(state.squad.px, state.squad.x, v.alpha), Math.min(r, 90));
    const scale = 1 + (1 - Math.min(1, popT)) * 0.5;
    const size = 46 * scale;
    const text = String(count);
    ctx.font = `900 ${size}px ${U.FONT}`;
    const w = Math.max(70 * scale, ctx.measureText(text).width + 36);
    const h = 60 * scale;
    const x = U.clamp(p.x, w / 2 + 8, 532 - w / 2);
    const y = Math.max(p.y - 26 * p.s - 34, 150); // 대형 맨 앞 친구의 머리 바로 위

    ctx.fillStyle = 'rgba(30,70,140,.22)';
    U.rr(ctx, x - w / 2 + 2, y - h / 2 + 5, w, h, 24);
    ctx.fill();
    ctx.fillStyle = '#2a8cff';
    U.rr(ctx, x - w / 2, y - h / 2, w, h, 24);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
    U.outlined(ctx, text, x, y + 1, size, '#fff', '#1254b8', 6);
  }

  function draw(ctx, state, v, frameDt) {
    const count = state.squad.soldiers.length;
    if (count !== shownCount) {
      shownCount = count;
      popT = 0;
    }
    popT += frameDt * 5;

    drawCountBubble(ctx, state, v, count);

    // 진행률
    const x = 72;
    const w = 340;
    const y = 30;
    const ratio = U.Game.progress(state);
    bar(ctx, x, y, w, 20, ratio, '#ffc928');
    U.outlined(ctx, `${Math.floor(ratio * 100)}%`, 41, y + 10, 24, '#ffffff', '#1f6fd6', 6);

    // 도착점의 보스 표시
    ctx.fillStyle = '#9a63f0';
    ctx.beginPath();
    ctx.arc(x + w + 2, y + 10, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w - 4, y + 8, 4.5, 0, Math.PI * 2);
    ctx.arc(x + w + 8, y + 8, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 현재 병력
    ctx.fillStyle = 'rgba(255,255,255,.94)';
    U.rr(ctx, 18, 68, 158, 46, 23);
    ctx.fill();
    ctx.font = `900 21px ${U.FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f6fd6';
    ctx.fillText('친구', 36, 92);
    ctx.font = `900 32px ${U.FONT}`;
    ctx.fillStyle = '#ff8a1f';
    ctx.textAlign = 'right';
    ctx.fillText(`${count}명`, 160, 92);

    // 보스 체력
    const b = state.boss;
    if (b.announced) {
      const bx = 196;
      const bw = 322;
      U.outlined(ctx, '거대 몬스터', bx + 62, 83, 19, '#fff', '#6b35d4', 5);
      bar(ctx, bx, 98, bw, 14, b.hp / b.maxHp, '#b071ff');
      U.outlined(ctx, `${Math.ceil(b.hp)}`, bx + 168, 83, 20, '#fff', '#6b35d4', 5);
    }
  }

  U.HUD = { reset, draw };
})();
