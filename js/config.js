// 게임 수치와 스테이지 데이터. 밸런스 조정은 이 파일에서만 한다.
(function () {
  const U = (window.URR = window.URR || {});

  U.Config = {
    VIEW_W: 540,
    VIEW_H: 960,
    STEP: 1 / 60, // 고정 시간 스텝(초)
    MAX_FRAME: 0.25, // 탭 복귀 등 긴 프레임의 상한
    RESULT_DELAY: 1.1, // 승패 판정 뒤 결과 화면까지의 연출 시간

    ROAD_HALF: 100,

    SQUAD: {
      speed: 115,
      moveSpeed: 900, // 목표 위치를 따라가는 최대 속도
      keySpeed: 300, // 방향키 이동 속도
      max: 120,
      spacing: 10,
      maxRadius: 80,
      soldierR: 8,
    },

    WEAPON: {
      interval: 0.42,
      damage: 1,
      bulletSpeed: 760,
      bulletLife: 1.0,
      bulletR: 4,
      range: 620,
      spread: 0.025,
      maxBullets: 400,
    },

    MONSTER: { r: 21, hp: 20, wakeDist: 620, walk: 26, touch: 2, behind: 140 },
    BOSS: { r: 100, hp: 620, stopDist: 540, walk: 26, follow: 45, eatEvery: 0.3 },
    OBSTACLE: { hd: 16, damage: 3 },
    GATE: { sideX: 49, halfW: 47, height: 112 },
  };

  const m = (x, z) => ({ x, z });

  U.Stages = {
    stage1: {
      name: '첫 번째 출동',
      start: 3,
      gates: [
        { z: 420, left: { op: '+', v: 10 }, right: { op: 'x', v: 2 } },
        { z: 2750, left: { op: '+', v: 5 }, right: { op: 'x', v: 2 } },
      ],
      monsters: [
        m(-45, 900), m(35, 1020), m(0, 1140), m(-60, 1260), m(55, 1380),
        m(40, 1800), m(-35, 1920), m(0, 2040), m(60, 2160), m(-55, 2280),
      ],
      obstacles: [
        { x: -48, z: 1560, hw: 52 },
        { x: 48, z: 2480, hw: 52 },
      ],
      boss: { x: 0, z: 3700 },
    },

    // 빨간 -5 게이트 확인용. 1스테이지 구성에는 -5가 없어서 별도로 둔다. (index.html?stage=redgate)
    redgate: {
      name: '감소 게이트 확인',
      start: 8,
      gates: [{ z: 300, left: { op: '-', v: 5 }, right: { op: '+', v: 5 } }],
      monsters: [m(-30, 760), m(30, 860)],
      obstacles: [],
      boss: { x: 0, z: 1500, hp: 120 },
    },
  };
})();
