// 시작, 게임 방법, 결과 화면과 버튼 연결.
(function () {
  const U = (window.URR = window.URR || {});
  const $ = (id) => document.getElementById(id);

  function showOnly(id) {
    for (const name of ['screen-title', 'screen-howto', 'screen-result']) {
      $(name).hidden = name !== id;
    }
  }

  function bind(actions) {
    $('btn-start').addEventListener('click', actions.start);
    $('btn-restart').addEventListener('click', actions.start);
    $('btn-hud-restart').addEventListener('click', actions.start);
    $('btn-home').addEventListener('click', actions.home);
    $('btn-howto').addEventListener('click', () => showOnly('screen-howto'));
    $('btn-howto-close').addEventListener('click', () => showOnly('screen-title'));
  }

  function showTitle() {
    showOnly('screen-title');
    $('btn-hud-restart').hidden = true;
  }

  function showPlay() {
    showOnly(null);
    $('btn-hud-restart').hidden = false;
  }

  function showResult(state) {
    const win = state.result === 'win';
    const count = state.squad.soldiers.length;
    const card = document.querySelector('.card.result');
    card.classList.toggle('win', win);
    card.classList.toggle('lose', !win);
    $('result-title').textContent = win ? '대작전 성공!' : '다시 도전!';
    $('result-detail').textContent = win
      ? `친구 ${count}명이 거대 몬스터를 물리쳤어요!`
      : '게이트를 잘 골라 친구를 더 모아 보세요!';
    $('btn-restart').textContent = win ? '다시 시작' : '재시작';
    $('btn-hud-restart').hidden = true;
    showOnly('screen-result');
  }

  U.UI = { bind, showTitle, showPlay, showResult };
})();
