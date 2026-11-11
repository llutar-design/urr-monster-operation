// 앱 흐름과 고정 시간 스텝 루프. 로직은 STEP 단위로만 진행하고 그리기는 프레임마다 한다.
(function () {
  const U = (window.URR = window.URR || {});
  const C = U.Config;

  const stageId = new URLSearchParams(window.location.search).get('stage') || 'stage1';

  const App = { state: null, screen: 'title', steps: 0 };
  U.App = App;

  let accumulator = 0;
  let last = 0;

  // 시작 화면 뒤에 보이는 정지 장면. 진행하지 않고 그리기만 한다.
  function titleScene() {
    const s = U.createState('stage1');
    s.gatePairs = [];
    s.boss.alive = false;
    s.monsters = s.monsters.slice(0, 2);
    s.monsters[0].x = -62;
    s.monsters[0].z = 75;
    s.monsters[1].x = 62;
    s.monsters[1].z = 75;
    return s;
  }

  function freshRun() {
    App.state = U.createState(stageId);
    accumulator = 0;
    U.Input.reset();
    U.Renderer.reset();
  }

  function start() {
    freshRun();
    App.screen = 'play';
    U.UI.showPlay();
  }

  function home() {
    App.state = titleScene();
    accumulator = 0;
    U.Input.reset();
    U.Renderer.reset();
    App.screen = 'title';
    U.UI.showTitle();
  }

  function advance(dt) {
    const s = App.state;
    accumulator += dt;
    while (accumulator >= C.STEP) {
      U.Game.step(s, U.Input.sample(), C.STEP);
      App.steps++;
      accumulator -= C.STEP;
    }
    U.FX.consume(s.events.splice(0));

    if (s.result && s.resultTime >= C.RESULT_DELAY) {
      App.screen = 'result';
      U.UI.showResult(s);
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, C.MAX_FRAME);
    last = now;
    // 결과 화면에서도 색종이는 움직여야 하므로 그리기는 멈추지 않는다
    if (App.screen === 'play') advance(dt);
    U.Renderer.render(App.state, App.screen === 'play' ? accumulator / C.STEP : 1, dt, App.screen !== 'title');
    requestAnimationFrame(frame);
  }

  const canvas = document.getElementById('game');
  U.Renderer.init(canvas);
  U.Input.attach(canvas);
  U.UI.bind({ start, home });
  App.state = titleScene();
  U.UI.showTitle();

  requestAnimationFrame((now) => {
    last = now;
    frame(now);
  });
})();
