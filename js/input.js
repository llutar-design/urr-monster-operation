// 터치, 마우스, 키보드 입력을 틱마다 읽을 수 있는 명령으로 바꾼다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;

  // 화면(CSS 픽셀) 좌표를 게임 논리 좌표로 변환한다. 호출 때마다 최신 rect를 받는다.
  function toLogical(clientX, clientY, rect) {
    return {
      x: ((clientX - rect.left) * C.VIEW_W) / rect.width,
      y: ((clientY - rect.top) * C.VIEW_H) / rect.height,
    };
  }

  const LEFT = new Set(['ArrowLeft', 'a', 'A']);
  const RIGHT = new Set(['ArrowRight', 'd', 'D']);

  let canvas = null;
  let pointerId = null;
  let lastX = 0;
  let dragDx = 0;
  let leftDown = false;
  let rightDown = false;

  function reset() {
    pointerId = null;
    dragDx = 0;
    leftDown = false;
    rightDown = false;
  }

  function onDown(e) {
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    lastX = toLogical(e.clientX, e.clientY, canvas.getBoundingClientRect()).x;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 합성 이벤트에서는 캡처가 실패할 수 있다 */
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (e.pointerId !== pointerId) return;
    const x = toLogical(e.clientX, e.clientY, canvas.getBoundingClientRect()).x;
    // 부대가 서 있는 깊이의 원근 배율로 나눠 손가락과 캐릭터가 1:1로 움직이게 한다
    dragDx += (x - lastX) / U.Camera.SQUAD_SCALE;
    lastX = x;
    e.preventDefault();
  }

  function onUp(e) {
    if (e.pointerId === pointerId) pointerId = null;
  }

  function onKey(e, down) {
    let handled = true;
    if (LEFT.has(e.key)) leftDown = down;
    else if (RIGHT.has(e.key)) rightDown = down;
    else handled = false;
    if (handled) e.preventDefault();
  }

  function attach(el) {
    canvas = el;
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    window.addEventListener('blur', reset);
  }

  // 누적 드래그는 한 번 읽으면 비워서 같은 이동이 두 번 적용되지 않게 한다
  function sample() {
    const cmd = { dragDx, axis: (rightDown ? 1 : 0) - (leftDown ? 1 : 0) };
    dragDx = 0;
    return cmd;
  }

  U.Input = { attach, reset, sample, toLogical };
})();
