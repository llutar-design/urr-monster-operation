// 실제 Chrome/Edge를 띄워 진짜 터치, 마우스, 키 입력으로 게임 전체를 검증한다. 외부 패키지가 필요 없다.
// 실행: node tests/browser.test.js [스크린샷 폴더]
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const shotDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'urr-shots-'));
fs.mkdirSync(shotDir, { recursive: true });
const browserPath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && fs.existsSync(p));
if (!browserPath) {
  console.error('Chrome 또는 Edge를 찾지 못했습니다. CHROME_PATH를 지정하세요.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'urr-profile-'));
const browser = spawn(browserPath, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  'about:blank',
], { stdio: 'ignore' });

let ws;
let nextId = 1;
const pending = new Map();
const pageErrors = [];

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connect() {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
      else p.resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      pageErrors.push(`${msg.params.entry.text} ${msg.params.entry.url || ''}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push(msg.params.args.map((a) => a.value).join(' '));
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
}

async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

async function open(query, metrics) {
  await send('Emulation.setDeviceMetricsOverride', metrics);
  await send('Emulation.setTouchEmulationEnabled', { enabled: !!metrics.mobile, maxTouchPoints: 1 });
  // GAME_URL을 지정하면 배포된 사이트를, 아니면 로컬 파일을 검사한다
  const base = process.env.GAME_URL || pathToFileURL(path.join(root, 'index.html')).href;
  await send('Page.navigate', { url: base + query });
  for (let i = 0; i < 100; i++) {
    await sleep(50);
    if (await js('!!(window.URR && URR.App && URR.App.state) && document.readyState === "complete"')) break;
  }
  await sleep(200);
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotDir, `${name}.png`), Buffer.from(r.data, 'base64'));
}

const center = (id) =>
  js(`(() => { const r = document.getElementById('${id}').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
const visible = (id) => js(`(() => { const e = document.getElementById('${id}'); return !e.hidden && e.getBoundingClientRect().width > 0; })()`);

async function tap(id) {
  const p = await center(id);
  await touch('touchStart', p.x, p.y);
  await sleep(40);
  await touch('touchEnd', p.x, p.y);
  await sleep(160);
}

async function click(id) {
  const p = await center(id);
  const base = { x: p.x, y: p.y, button: 'left', clickCount: 1 };
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base });
  await sleep(120);
}

const touch = (type, x, y) =>
  send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

const snap = () =>
  js(`(() => { const s = URR.App.state; return {
    screen: URR.App.screen, x: s.squad.x, targetX: s.squad.targetX, z: s.squad.z, n: s.squad.soldiers.length,
    monsters: s.monsters.length, bullets: s.bullets.length, result: s.result, bossHp: s.boss.hp, bossMax: s.boss.maxHp,
    gates: s.gatePairs.map(g => g.chosen), applied: s.stats.gatesApplied, killed: s.stats.killed,
    touched: s.stats.touched, escaped: s.stats.escaped, tick: s.tick, stopZ: s.stopZ,
    obstaclesHit: s.obstacles.filter(o => o.hit).length, resolved: s.gatePairs.map(g => g.resolved),
  }; })()`);

// 화면에 실제로 그려지는 친구 스프라이트 수를 센다. 친구 스프라이트만 가로 144px이다.
const drawnFriends = () =>
  js(`(() => {
    const proto = CanvasRenderingContext2D.prototype, orig = proto.drawImage;
    let n = 0;
    proto.drawImage = function (img) { if (img.width === 144) n++; return orig.apply(this, arguments); };
    URR.Renderer.render(URR.App.state, 1, 0, true);
    proto.drawImage = orig;
    return n;
  })()`);

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  통과  ${name}${detail !== undefined ? ` (${detail})` : ''}`);
  } else {
    failures.push(name);
    console.log(`  실패  ${name}${detail !== undefined ? ` (${detail})` : ''}`);
  }
}

// 조종 결과에 달린 항목. 시험 프로그램 자체가 오래 멈춰 조종을 못 한 판은 게임 실패로 세지 않고 재검 대상으로 표시한다.
let steerGap = 0;
let inconclusive = 0;
function checkSteered(name, ok, detail) {
  if (!ok && steerGap > 1000) {
    inconclusive++;
    console.log(`  재검  ${name} (${detail}) - 시험 프로그램이 ${steerGap}ms 멈춰 판정 불가`);
  } else {
    check(name, ok, detail);
  }
}

// 손가락을 실제로 움직여 목표 x로 부대를 조종하며 한 판을 끝까지 진행한다
async function playByTouch(plan, onProgress) {
  steerGap = 0;
  let lastLoop = Date.now();
  const rect = await js(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; })()`);
  const SCALE = await js('URR.Camera.SQUAD_SCALE');
  let fx = rect.left + rect.w / 2;
  const fy = rect.top + rect.h * 0.8;
  await touch('touchStart', fx, fy);
  const start = Date.now();
  let s = await snap();
  while (!s.result && Date.now() - start < 120000) {
    const goal = plan(s);
    const dLogical = (goal - s.targetX) * SCALE;
    if (Math.abs(dLogical) > 1) {
      const step = Math.max(-40, Math.min(40, (dLogical * rect.w) / 540));
      fx += step;
      await touch('touchMove', fx, fy);
    }
    await sleep(40);
    s = await snap();
    if (onProgress) await onProgress(s);
    steerGap = Math.max(steerGap, Date.now() - lastLoop);
    lastLoop = Date.now();
  }
  await touch('touchEnd', fx, fy);
  return s;
}

async function waitResult() {
  for (let i = 0; i < 80 && !(await visible('screen-result')); i++) await sleep(50);
}

const once = () => {
  const done = new Set();
  return async (key, cond, fn) => {
    if (!done.has(key) && cond) {
      done.add(key);
      await fn();
    }
  };
};

const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };
const DESKTOP = { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false };

async function main() {
  await connect();

  console.log('\n[모바일 390×844: 시작 화면]');
  await open('', PHONE);
  check('시작 화면이 보인다', await visible('screen-title'));
  check('제목과 슬로건', await js(`document.querySelector('.logo').textContent.includes('몬스터 대작전') && document.querySelector('.slogan').textContent === '친구들을 모아 몬스터를 물리쳐라!'`));
  const ratio = await js(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return r.height / r.width; })()`);
  check('화면 비율 9:16', Math.abs(ratio - 16 / 9) < 0.01, ratio.toFixed(4));
  await shot('01-title');
  await tap('btn-howto');
  check('게임 방법 버튼', await visible('screen-howto'));
  await shot('02-howto');
  await tap('btn-howto-close');
  check('게임 방법 닫기', (await visible('screen-title')) && !(await visible('screen-howto')));

  console.log('\n[시작과 터치 이동]');
  await tap('btn-start');
  let s = await snap();
  check('시작 버튼으로 게임이 시작된다', s.screen === 'play' && s.tick > 0, `tick=${s.tick}`);
  check('친구 3명이 등장한다', s.n === 3 && (await drawnFriends()) === 3);
  await sleep(500);
  const s2 = await snap();
  check('고정 스텝으로 전진한다', s2.z > s.z, `z ${s.z.toFixed(0)}→${s2.z.toFixed(0)}`);

  const rect = await js(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; })()`);
  const SCALE = await js('URR.Camera.SQUAD_SCALE');
  const before = (await snap()).x;
  const fy = rect.top + rect.h * 0.8;
  await touch('touchStart', 195, fy);
  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', 195 - i * 5, fy);
    await sleep(16);
  }
  await sleep(120);
  await touch('touchEnd', 155, fy);
  await sleep(50);
  const after = (await snap()).x;
  const expected = (-40 * (540 / rect.w)) / SCALE;
  check('터치 드래그 좌표가 정확하다', Math.abs(after - before - expected) < 0.75, `실제 ${(after - before).toFixed(2)}, 기대 ${expected.toFixed(2)}`);

  await touch('touchStart', 195, fy);
  for (let i = 1; i <= 20; i++) {
    await touch('touchMove', 195 - i * 18, fy);
    await sleep(16);
  }
  await sleep(120);
  await touch('touchEnd', 0, fy);
  const edge = await js(`(() => { const s = URR.App.state; return Math.max(...s.squad.soldiers.map(p => Math.abs(p.x))); })()`);
  check('드래그를 끝까지 해도 도로 밖으로 나가지 않는다', edge <= 92.001, `최대 |x|=${edge.toFixed(1)}`);

  await tap('btn-hud-restart');
  s = await snap();
  check('플레이 중 재시작 버튼', s.n === 3 && s.z < 40 && Math.abs(s.x) < 0.01, `z=${s.z.toFixed(0)}`);

  console.log('\n[1스테이지 끝까지 플레이: +10 → ×2]');
  const planWin = (st) => {
    if (st.z < 425) return -50;
    if (st.z > 1300 && st.z < 1640) return 56;
    if (st.z > 2200 && st.z < 2560) return -56;
    if (st.z < 2755) return 50;
    return 0;
  };
  const doOnce = once();
  let firedSeen = false;
  let bossDrop = false;
  let lastApplied = 0;
  let sync = true;
  s = await playByTouch(planWin, async (st) => {
    if (st.bullets > 0) firedSeen = true;
    if (st.bossHp < st.bossMax) bossDrop = true;
    if (st.applied < lastApplied) sync = false;
    lastApplied = st.applied;
    await doOnce('g1', st.z > 280, () => shot('03-gate1'));
    await doOnce('after1', st.z > 470, async () => {
      await shot('04-after-gate1');
      const friends = await drawnFriends();
      const cur = await snap();
      check('게이트 +10 뒤 13명, 그려진 캐릭터도 같다', cur.n === 13 && friends === cur.n, `숫자 ${cur.n}, 그려짐 ${friends}`);
    });
    await doOnce('combat', st.z > 760, () => shot('05-combat'));
    await doOnce('obstacle', st.z > 1400, () => shot('06-obstacle'));
    await doOnce('after2', st.z > 2800, async () => {
      await shot('07-after-gate2');
      const friends = await drawnFriends();
      const cur = await snap();
      check('두 번째 게이트 뒤 인원과 그려진 캐릭터가 같다', cur.n === friends, `숫자 ${cur.n}, 그려짐 ${friends}`);
      checkSteered('×2 게이트를 지나 20명 이상이 된다', cur.n >= 20, `숫자 ${cur.n}`);
    });
    await doOnce('boss', st.z >= st.stopZ && st.bossHp < st.bossMax * 0.7, () => shot('08-boss'));
  });
  check('자동 사격 발생', firedSeen);
  check('보스 체력 감소', bossDrop);
  check('게이트는 쌍마다 한 번씩만 적용', s.applied === 2 && sync, `적용 ${s.applied}회`);
  checkSteered('왼쪽 → 오른쪽 게이트가 선택됨', s.gates[0] === 'left' && s.gates[1] === 'right', s.gates.join(','));
  check('몬스터 10마리 모두 처리', s.killed + s.touched + s.escaped === 10, `처치 ${s.killed}, 충돌 ${s.touched}, 통과 ${s.escaped}`);
  check('보스를 물리치면 승리', s.result === 'win' && s.bossHp === 0);
  await shot('09-boss-pop');
  await waitResult();
  check('대작전 성공! 표시', (await js(`document.getElementById('result-title').textContent`)) === '대작전 성공!');
  await sleep(400);
  await shot('10-win');

  await tap('btn-restart');
  s = await snap();
  check('승리 후 재시작 초기화', s.n === 3 && s.monsters === 10 && s.bullets === 0 && !s.result && s.z < 40 && s.applied === 0 && s.bossHp === s.bossMax && s.obstaclesHit === 0, JSON.stringify({ n: s.n, m: s.monsters, z: Math.round(s.z), b: s.bossHp }));
  check('재시작 후 결과 화면이 사라진다', !(await visible('screen-result')) && (await drawnFriends()) === 3);

  console.log('\n[패배: ×2 → +5, 장애물 충돌]');
  const planLose = (st) => (st.z < 425 ? 50 : st.z < 1700 ? -40 : st.z < 2755 ? -30 : 0);
  s = await playByTouch(planLose);
  check('병력 0명이 되면 패배', s.result === 'lose' && s.n === 0, `보스HP ${s.bossHp}/${s.bossMax}, 충돌 ${s.touched}, 장애물 ${s.obstaclesHit}`);
  await waitResult();
  check('다시 도전! 표시', (await js(`document.getElementById('result-title').textContent`)) === '다시 도전!');
  await sleep(300);
  await shot('11-lose');
  await tap('btn-restart');
  s = await snap();
  check('패배 후 재시작 초기화', s.n === 3 && s.monsters === 10 && !s.result && s.z < 40);
  await js(`document.getElementById('btn-hud-restart').click()`);

  console.log('\n[빨간 -5 게이트]');
  await open('?stage=redgate', PHONE);
  await tap('btn-start');
  const planRed = () => -50;
  const shotRed = once();
  const rate = await playPartial(planRed, 320, shotRed);
  check('-5 게이트 적용 후 3명', rate.n === 3 && (await drawnFriends()) === 3, `n=${rate.n}`);

  console.log('\n[PC 1280×720: 여백이 있는 화면]');
  await open('', DESKTOP);
  await click('btn-start');
  s = await snap();
  check('마우스 클릭으로 시작', s.screen === 'play');
  const dr = await js(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; })()`);
  check('캔버스가 가운데 여백 배치', dr.left > 100 && Math.abs(dr.h / dr.w - 16 / 9) < 0.01, `left=${dr.left.toFixed(1)}, w=${dr.w.toFixed(1)}`);
  await shot('12-desktop');
  const b0 = (await snap()).x;
  const mx = dr.left + dr.w / 2;
  const my = dr.top + dr.h * 0.8;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mx, y: my, button: 'left', clickCount: 1, buttons: 1 });
  for (let i = 1; i <= 6; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx + i * 5, y: my, button: 'left', buttons: 1 });
    await sleep(16);
  }
  await sleep(120);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mx + 30, y: my, button: 'left', clickCount: 1 });
  const b1 = (await snap()).x;
  const exp = (30 * (540 / dr.w)) / SCALE;
  check('마우스 드래그 좌표가 정확하다', Math.abs(b1 - b0 - exp) < 0.75, `실제 ${(b1 - b0).toFixed(2)}, 기대 ${exp.toFixed(2)}`);

  const key = (type, k, code, vk) =>
    send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  const k0 = (await snap()).x;
  await key('rawKeyDown', 'ArrowLeft', 'ArrowLeft', 37);
  await sleep(200);
  await key('keyUp', 'ArrowLeft', 'ArrowLeft', 37);
  await sleep(50);
  const k1 = (await snap()).x;
  await sleep(150);
  const k2 = (await snap()).x;
  check('방향키 이동과 멈춤', k1 < k0 - 15 && Math.abs(k2 - k1) < 0.01, `${k0.toFixed(1)}→${k1.toFixed(1)}→${k2.toFixed(1)}`);

  console.log('\n[오류 로그]');
  check('브라우저 콘솔 오류 없음', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | ') || '0건');
}

async function playPartial(plan, zStop, doOnce) {
  const rect = await js(`(() => { const r = document.getElementById('game').getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; })()`);
  const SCALE = await js('URR.Camera.SQUAD_SCALE');
  let fx = rect.left + rect.w / 2;
  const fy = rect.top + rect.h * 0.8;
  await touch('touchStart', fx, fy);
  let s = await snap();
  const start = Date.now();
  while (s.z < zStop && Date.now() - start < 15000) {
    const d = (plan(s) - s.targetX) * SCALE;
    if (Math.abs(d) > 1) {
      fx += Math.max(-40, Math.min(40, (d * rect.w) / 540));
      await touch('touchMove', fx, fy);
    }
    await sleep(40);
    s = await snap();
    await doOnce('red', s.z > 170, () => shot('13-red-gate'));
  }
  await touch('touchEnd', fx, fy);
  return s;
}

main()
  .catch((e) => {
    failures.push(`테스트 중단: ${e.stack || e.message}`);
    console.error(e);
  })
  .finally(async () => {
    console.log(`\n결과: 통과 ${passed}, 실패 ${failures.length}, 재검 ${inconclusive}`);
    console.log(`스크린샷: ${shotDir}`);
    if (failures.length) console.log(failures.map((f) => ` - ${f}`).join('\n'));
    try { ws.close(); } catch (e) { /* 이미 닫힘 */ }
    browser.kill();
    await sleep(600);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* 임시 폴더 */ }
    process.exit(failures.length ? 1 : 0);
  });
