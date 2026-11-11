// 프레임마다 게임 상태를 읽어 Canvas에 그린다. 상태를 변경하지 않는다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;

  let canvas;
  let ctx;
  let clock = 0;

  function resize() {
    const wrap = canvas.parentElement;
    // 창 전체가 아니라 body의 실제 영역에 맞춘다. 휴대폰 앱의 안전 여백이 있어도 화면이 잘리지 않는다.
    const host = document.body;
    const availW = host.clientWidth || window.innerWidth;
    const availH = host.clientHeight || window.innerHeight;
    const cssW = Math.min(availW, (availH * C.VIEW_W) / C.VIEW_H);
    const cssH = (cssW * C.VIEW_H) / C.VIEW_W;
    wrap.style.width = `${cssW}px`;
    wrap.style.height = `${cssH}px`;
    wrap.style.setProperty('--u', String(cssW / C.VIEW_W));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d', { alpha: false });
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
  }

  function reset() {
    U.FX.reset();
    U.HUD.reset();
  }

  function render(state, alpha, frameDt, showHud) {
    clock += frameDt;
    U.FX.update(frameDt);

    const v = {
      alpha,
      time: clock,
      tick: state.tick,
      camZ: U.lerp(state.squad.pz, state.squad.z, alpha),
      squadX: state.squad.x,
      sprites: U.Sprites.get(),
    };

    const unit = canvas.width / C.VIEW_W;
    const shake = U.FX.shakeOffset();
    ctx.setTransform(unit, 0, 0, unit, shake.x * unit, shake.y * unit);
    U.World.draw(ctx, v.camZ, v.time);
    U.Entities.drawScene(ctx, state, v);
    U.FX.drawWorld(ctx, v);

    ctx.setTransform(unit, 0, 0, unit, 0, 0);
    if (showHud) U.HUD.draw(ctx, state, v, frameDt);
    U.FX.drawScreen(ctx);
  }

  U.Renderer = { init, reset, render };
})();
