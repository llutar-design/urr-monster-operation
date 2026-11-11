// 2.5D 원근 투영과 공용 그리기 도구.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;

  const HORIZON = 250;
  const CAM_H = 236;
  const FOCAL = 520;
  const CAM_BACK = 236;

  // rel: 카메라 기준 앞쪽 거리, h: 지면에서의 높이
  function project(x, rel, h) {
    const s = FOCAL / Math.max(rel + CAM_BACK, 24);
    return { x: C.VIEW_W / 2 + x * s, y: HORIZON + (CAM_H - (h || 0)) * s, s };
  }

  U.Camera = { HORIZON, project, SQUAD_SCALE: FOCAL / CAM_BACK };

  U.FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';

  U.lerp = (a, b, t) => a + (b - a) * t;

  U.rr = function (ctx, x, y, w, h, r) {
    const q = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + q, y);
    ctx.arcTo(x + w, y, x + w, y + h, q);
    ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q);
    ctx.arcTo(x, y, x + w, y, q);
    ctx.closePath();
  };

  U.outlined = function (ctx, text, x, y, size, fill, stroke, lw) {
    ctx.font = `900 ${size}px ${U.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  };

  U.star = function (ctx, x, y, outer, inner, points, rot) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = rot + (i * Math.PI) / points;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  };
})();
