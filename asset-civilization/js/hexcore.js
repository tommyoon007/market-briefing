/* =========================================================================
   자산 문명 — hexcore.js
   2.5D 아이소메트릭 헥사곤 디오라마 엔진 (지형·하늘·날씨·동식물 기반)
   ========================================================================= */
(function () {
  const CIV = (window.CIV = window.CIV || {});

  /* ---------- 투영 상수 ---------- */
  const VW = 660, VH = 412;          // 가상(디자인) 화면
  const R = 44;                      // 헥스 반지름
  const SQ = 0.56;                   // 세로 압축(원근)
  const STEPX = R * 1.5;
  const STEPY = Math.sqrt(3) * R * SQ;
  const OX = 99, OY = 132;           // 섬 중심 (위쪽에 하늘·지평선 확보)

  const MW = 8, MH = 6;
  // 같은 섬이 문명으로 자라난다. '.'바다 'g'들 'f'숲 'h'언덕 'm'산 'r'강 'd'모래 'w'들판
  const MAP = [
    "..hhh...",
    ".fhmhg..",
    ".gfgrgg.",
    "wwggrgg.",
    ".wggrg..",
    "..dgr...",
  ];

  /* ---------- 팔레트 (18단계) ---------- */
  const PAL = [
    { // 1 원시
      sky: ["#2d4664", "#8199a4"], sun: "#ffd9a0", sunGlow: "rgba(255,220,150,.35)",
      grass: "#6c8d47", grass2: "#7fa050", grassD: "#4d6a33", dirt: "#7d7048",
      rock: "#8a8f88", rockD: "#5e635d", water: "#2d6278", water2: "#4e93a6",
      tree: "#37602f", tree2: "#4a7738", trunk: "#584327", sand: "#c4b389",
      fog: "rgba(140,165,180,.30)", accent: "#e8b45f", night: 0.12,
    },
    { // 2 움막
      sky: ["#33506b", "#8fa3a8"], sun: "#ffe0a6", sunGlow: "rgba(255,225,160,.35)",
      grass: "#6a8f42", grass2: "#7ea24d", grassD: "#4a6830", dirt: "#7f6f47",
      rock: "#8b9087", rockD: "#5f645c", water: "#2f6579", water2: "#5197a8",
      tree: "#3a6330", tree2: "#4f7c39", trunk: "#5b4527", sand: "#c8b78c",
      fog: "rgba(145,168,180,.28)", accent: "#e6ae55", night: 0.10,
    },
    { // 3 초가 마을
      sky: ["#4a6d80", "#c8c3a2"], sun: "#ffe6b0", sunGlow: "rgba(255,230,170,.40)",
      grass: "#7a9643", grass2: "#95ac52", grassD: "#57742f", dirt: "#967f4f",
      rock: "#928e80", rockD: "#645f52", water: "#2f6b7f", water2: "#5ba3b0",
      tree: "#3f6b2f", tree2: "#568a39", trunk: "#63492a", sand: "#d0bd92",
      fog: "rgba(200,190,155,.22)", accent: "#e8b451", night: 0.04,
    },
    { // 4 목조 촌락
      sky: ["#4d7ea0", "#cfe0e0"], sun: "#fff0c0", sunGlow: "rgba(255,240,190,.40)",
      grass: "#7fa248", grass2: "#9ab757", grassD: "#5b7a33", dirt: "#a08a58",
      rock: "#94907f", rockD: "#666151", water: "#2f7086", water2: "#63adbb",
      tree: "#41702f", tree2: "#5a8f3a", trunk: "#664b2b", sand: "#d6c096",
      fog: "rgba(210,225,220,.18)", accent: "#f0be58", night: 0.0,
    },
    { // 5 청동기 요새
      sky: ["#56789a", "#d9d0b0"], sun: "#fff0c4", sunGlow: "rgba(255,235,180,.38)",
      grass: "#8a9c4c", grass2: "#a3b157", grassD: "#647234", dirt: "#a68d5a",
      rock: "#9a9179", rockD: "#6b6350", water: "#357086", water2: "#67aab8",
      tree: "#48712f", tree2: "#618d3a", trunk: "#6b5230", sand: "#d9c398",
      fog: "rgba(215,205,175,.16)", accent: "#b98a3c", night: 0.0,
    },
    { // 6 고대 신전
      sky: ["#5a86a8", "#e6dcb8"], sun: "#fff4cc", sunGlow: "rgba(255,240,190,.42)",
      grass: "#93a34f", grass2: "#adba5d", grassD: "#6a773a", dirt: "#b09863",
      rock: "#b6ad90", rockD: "#7d7459", water: "#357589", water2: "#6cb0bc",
      tree: "#4d7431", tree2: "#6a9040", trunk: "#715838", sand: "#dfca9e",
      fog: "rgba(230,220,185,.16)", accent: "#c99a45", night: 0.0,
    },
    { // 7 로마
      sky: ["#5f8cae", "#ece0bc"], sun: "#fff6d2", sunGlow: "rgba(255,245,200,.44)",
      grass: "#9aa452", grass2: "#b4bb60", grassD: "#707a3c", dirt: "#bda66e",
      rock: "#c8bc9c", rockD: "#8c8062", water: "#36798c", water2: "#72b4c0",
      tree: "#547a34", tree2: "#729b44", trunk: "#7a5f3c", sand: "#e5cf a2".replace(" ", ""),
      fog: "rgba(235,225,190,.15)", accent: "#d3a34b", night: 0.0,
    },
    { // 8 중세 성채
      sky: ["#557188", "#bdccd2"], sun: "#f2ecc8", sunGlow: "rgba(240,235,200,.30)",
      grass: "#83974a", grass2: "#9caf57", grassD: "#5e7036", dirt: "#a08d5f",
      rock: "#a9a494", rockD: "#75705f", water: "#376e80", water2: "#699fae",
      tree: "#3f6a30", tree2: "#557f3b", trunk: "#685136", sand: "#cfbf96",
      fog: "rgba(185,205,215,.24)", accent: "#b9c0c8", night: 0.02,
    },
    { // 9 르네상스
      sky: ["#6b94b4", "#f0e2c0"], sun: "#fff8d8", sunGlow: "rgba(255,250,210,.46)",
      grass: "#97a851", grass2: "#b2be5f", grassD: "#6d7c39", dirt: "#c0a971",
      rock: "#cfc3a2", rockD: "#91856a", water: "#397d90", water2: "#7bbac4",
      tree: "#527b33", tree2: "#6f9a42", trunk: "#7f6440", sand: "#e8d3a6",
      fog: "rgba(245,235,200,.14)", accent: "#e0b055", night: 0.0,
    },
    { // 10 항구
      sky: ["#5c93bd", "#dceaf0"], sun: "#fffbe0", sunGlow: "rgba(255,250,215,.45)",
      grass: "#91a84e", grass2: "#adc05c", grassD: "#69803a", dirt: "#c2ab74",
      rock: "#c6bda0", rockD: "#8b8168", water: "#2c7a94", water2: "#6fc3d0",
      tree: "#4e7c33", tree2: "#6b9b41", trunk: "#7c623e", sand: "#ecd8a8",
      fog: "rgba(225,240,245,.16)", accent: "#dab257", night: 0.0,
    },
    { // 11 산업혁명
      sky: ["#6b7a80", "#c8bd9e"], sun: "#f6e2b0", sunGlow: "rgba(250,220,160,.30)",
      grass: "#7c8646", grass2: "#949c50", grassD: "#5a6233", dirt: "#8d7a52",
      rock: "#8f8b7d", rockD: "#6a6659", water: "#37636f", water2: "#5f94a0",
      tree: "#4a6431", tree2: "#5f7a3a", trunk: "#5f4c31", sand: "#b9a985",
      fog: "rgba(170,160,140,.38)", accent: "#b98b45", night: 0.0,
    },
    { // 12 근대
      sky: ["#6d90a8", "#e2d4b4"], sun: "#ffeec0", sunGlow: "rgba(255,230,175,.35)",
      grass: "#87974b", grass2: "#a0b057", grassD: "#616e37", dirt: "#a08e62",
      rock: "#a29b88", rockD: "#766f5d", water: "#386e80", water2: "#68a3b0",
      tree: "#4a6f32", tree2: "#5f8840", trunk: "#6b5135", sand: "#cbb894",
      fog: "rgba(190,180,155,.26)", accent: "#c99f52", night: 0.0,
    },
    { // 13 전기 마천루
      sky: ["#2f3b5e", "#8d6a86"], sun: "#ffd0a0", sunGlow: "rgba(255,180,120,.30)",
      grass: "#5d7448", grass2: "#718a53", grassD: "#42512f", dirt: "#77705a",
      rock: "#8b8880", rockD: "#5f5d57", water: "#284f66", water2: "#4f8aa4",
      tree: "#3c5730", tree2: "#4d6d3a", trunk: "#54432e", sand: "#a89a80",
      fog: "rgba(120,110,140,.32)", accent: "#ffb347", night: 0.55,
    },
    { // 14 현대
      sky: ["#4d86b8", "#cfe5ee"], sun: "#fffbe4", sunGlow: "rgba(255,250,220,.45)",
      grass: "#86a24e", grass2: "#9fb95b", grassD: "#607839", dirt: "#b0a077",
      rock: "#a8a8a2", rockD: "#7c7c78", water: "#2e7d99", water2: "#63bfd2",
      tree: "#497b34", tree2: "#5f9742", trunk: "#6f5637", sand: "#ded0ad",
      fog: "rgba(215,235,245,.18)", accent: "#59b6d8", night: 0.0,
    },
    { // 15 스마트 에코
      sky: ["#4f93b4", "#d6f0e6"], sun: "#fdfbe8", sunGlow: "rgba(250,255,225,.48)",
      grass: "#79a850", grass2: "#93c05e", grassD: "#567b3a", dirt: "#a9a884",
      rock: "#a6b0aa", rockD: "#79837d", water: "#2a86a2", water2: "#5ecfd8",
      tree: "#3f8040", tree2: "#56a050", trunk: "#6b5b3c", sand: "#ddd6b2",
      fog: "rgba(205,245,235,.20)", accent: "#4fd8b0", night: 0.0,
    },
    { // 16 궤도 엘리베이터
      sky: ["#15304f", "#5f8fae"], sun: "#e8f4ff", sunGlow: "rgba(200,230,255,.35)",
      grass: "#6a9152", grass2: "#7fa860", grassD: "#48663a", dirt: "#8e8f78",
      rock: "#9dabb0", rockD: "#6f7d82", water: "#20506e", water2: "#4e93b4",
      tree: "#3d6b42", tree2: "#518a52", trunk: "#5c5140", sand: "#c2c8b8",
      fog: "rgba(150,190,220,.30)", accent: "#7fd4ff", night: 0.35,
    },
    { // 17 달·화성
      sky: ["#080d1a", "#1f2a44"], sun: "#ffffff", sunGlow: "rgba(160,190,255,.22)",
      grass: "#5a5f68", grass2: "#6d727c", grassD: "#3e434b", dirt: "#6a6258",
      rock: "#7c8188", rockD: "#525860", water: "#0b1020", water2: "#1b2a45",
      tree: "#3c5a4a", tree2: "#4c6f5a", trunk: "#4a4a4a", sand: "#8a8078",
      fog: "rgba(80,110,160,.25)", accent: "#8fb8ff", night: 0.95,
    },
    { // 18 성간 스타포트
      sky: ["#03040c", "#120c2c"], sun: "#ffffff", sunGlow: "rgba(150,120,255,.28)",
      grass: "#3b4256", grass2: "#4b536a", grassD: "#272c3a", dirt: "#4a4a5c",
      rock: "#5a6176", rockD: "#3a4052", water: "#070a18", water2: "#131a34",
      tree: "#2f4a52", tree2: "#3d5f66", trunk: "#3a3a46", sand: "#5a5f70",
      fog: "rgba(90,80,180,.28)", accent: "#a98bff", night: 1.0,
    },
  ];

  CIV.PAL = PAL;
  CIV.VW = VW; CIV.VH = VH; CIV.R = R; CIV.SQ = SQ;

  /* ---------- 유틸 ---------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shade(hex, amt) {
    // amt: -1..1
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  CIV.util = { mulberry, shade, rgba };

  /* ---------- 좌표 ---------- */
  function tileCX(c) { return OX + c * STEPX; }
  function tileCY(c, r) { return OY + r * STEPY + (c % 2 ? STEPY * 0.5 : 0); }

  CIV.grid = { MW, MH, STEPX, STEPY, tileCX, tileCY };

  function hexVerts(cx, cy, rad) {
    const rad_r = rad === undefined ? R : rad;
    const out = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 180) * (60 * k);
      out.push([cx + rad_r * Math.cos(a), cy + rad_r * SQ * Math.sin(a)]);
    }
    return out;
  }

  /* ---------- 월드 구성 ---------- */
  function buildWorld(stage) {
    const rnd = mulberry(7 + stage * 131);
    const tiles = [];
    const byKey = {};
    for (let r = 0; r < MH; r++) {
      for (let c = 0; c < MW; c++) {
        const ch = MAP[r][c];
        const t = {
          c, r, cx: tileCX(c), cy: tileCY(c, r), ch,
          land: ch !== '.',
          isWater: ch === '.',
          elev: 0, key: c + "," + r, seed: rnd(),
        };
        t.elev = t.land ? 12 + rnd() * 5 + (ch === 'h' ? 8 : ch === 'm' ? 16 : 0) : 6;
        tiles.push(t);
        byKey[t.key] = t;
      }
    }
    // 이웃
    for (const t of tiles) {
      const odd = t.c % 2 === 1;
      const deltas = odd
        ? [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]]
        : [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
      t.nb = deltas.map(([dc, dr]) => byKey[(t.c + dc) + "," + (t.r + dr)]).filter(Boolean);
      t.coast = t.land && t.nb.some((n) => n.isWater);
    }
    tiles.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    return { stage, tiles, byKey, rnd };
  }

  CIV.isLunar = (stage) => stage >= 17;
  CIV.isSpace = (stage) => stage >= 18;

  /* ---------- 지형 정적 렌더 ---------- */
  function drawTileFace(ctx, t, pal, stage) {
    const h = CIV.isLunar(stage) ? t.elev * 0.8 : t.elev;
    const v = hexVerts(t.cx, t.cy);
    const vb = hexVerts(t.cx, t.cy + h);
    let top, sideL, sideR, sideF, top2;

    if (t.isWater) {
      const deep = CIV.isSpace(stage) ? pal.water : pal.water;
      top = deep; sideF = shade(deep, -0.35); sideL = shade(deep, -0.25); sideR = shade(deep, -0.45);
      top2 = pal.water2;
    } else {
      switch (t.ch) {
        case 'h': top = pal.grassD; top2 = shade(pal.grass, 0.12); break;
        case 'm': top = pal.rock; top2 = shade(pal.rock, 0.25); break;
        case 'f': top = shade(pal.grassD, 0.02); top2 = pal.grassD; break;
        case 'd': top = pal.sand; top2 = shade(pal.sand, 0.12); break;
        case 'w': top = shade(pal.grass2, 0.06); top2 = pal.grass2; break;
        case 'r': top = pal.water; top2 = pal.water2; break;
        default: top = pal.grass; top2 = pal.grass2;
      }
      if (CIV.isLunar(stage)) {
        top = t.ch === 'h' ? shade(pal.rock, -0.05) : (t.ch === 'm' ? shade(pal.rock, 0.08) : pal.grass);
        top2 = shade(top, 0.16);
      }
      sideF = shade(top, -0.42); sideL = shade(top, -0.30); sideR = shade(top, -0.55);
    }

    // 바닥 그림자(디오라마 두께)
    ctx.beginPath();
    ctx.moveTo(vb[0][0], vb[0][1]);
    for (let i = 1; i < 6; i++) ctx.lineTo(vb[i][0], vb[i][1]);
    ctx.closePath();
    ctx.fillStyle = sideF;
    ctx.fill();

    // 하단 3개 면
    const faces = [[0, 1, sideR], [1, 2, sideF], [2, 3, sideL]];
    for (const [a, b, col] of faces) {
      ctx.beginPath();
      ctx.moveTo(v[a][0], v[a][1]);
      ctx.lineTo(v[b][0], v[b][1]);
      ctx.lineTo(vb[b][0], vb[b][1]);
      ctx.lineTo(vb[a][0], vb[a][1]);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    }

    // 상면
    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    for (let i = 1; i < 6; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();

    if (t.isWater || t.ch === 'r') {
      ctx.fillStyle = top;
      ctx.fill();
    } else if (!CIV.isLunar(stage)) {
      const g = ctx.createLinearGradient(t.cx, t.cy - R * SQ, t.cx, t.cy + R * SQ);
      g.addColorStop(0, top2);
      g.addColorStop(1, top);
      ctx.fillStyle = g;
      ctx.fill();
    } else {
      ctx.fillStyle = top;
      ctx.fill();
    }

    // 가장자리 음영
    ctx.strokeStyle = "rgba(20,28,24,.16)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 해안 거품
    if (t.land && t.coast && !CIV.isLunar(stage)) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(v[1][0], v[1][1]);
      ctx.lineTo(v[2][0], v[2][1]);
      ctx.lineTo(v[3][0], v[3][1]);
      ctx.strokeStyle = "rgba(240,250,255,.30)";
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGrassTexture(ctx, t, pal, rnd) {
    if (!t.land || t.ch === 'd' || t.ch === 'm') return;
    ctx.save();
    // 풀결 느낌의 점묘
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * 0.78;
      const x = t.cx + Math.cos(a) * rr;
      const y = t.cy + Math.sin(a) * rr * SQ;
      ctx.strokeStyle = i % 2 ? rgba(pal.grassD, 0.35) : rgba(pal.grass2, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 2, y - 2.5 - rnd() * 2.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function buildTerrain(stage) {
    const world = buildWorld(stage);
    const pal = PAL[stage - 1];
    const scale = 2;
    const cv = document.createElement("canvas");
    cv.width = VW * scale;
    cv.height = VH * scale;
    const ctx = cv.getContext("2d");
    ctx.scale(scale, scale);
    const rnd = mulberry(99 + stage);
    for (const t of world.tiles) drawTileFace(ctx, t, pal, stage);
    for (const t of world.tiles) drawGrassTexture(ctx, t, pal, rnd);
    world.terrain = cv;
    world.waterTiles = world.tiles.filter((t) => t.isWater || t.ch === 'r');
    return world;
  }

  /* ---------- 하늘 ---------- */
  function drawSky(ctx, pal, time, stage) {
    const horizon = OY + STEPY * 2.2;
    const g = ctx.createLinearGradient(0, 0, 0, horizon + 40);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(0.72, pal.sky[1]);
    g.addColorStop(1, rgba(pal.sky[1], 0.9));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    // 별 / 우주
    if (pal.night > 0.4) {
      const rnd = mulberry(311);
      for (let i = 0; i < 90; i++) {
        const x = rnd() * VW, y = rnd() * (OY - 20);
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(time / 900 + i));
        ctx.fillStyle = "rgba(220,235,255," + (0.25 + 0.6 * tw * pal.night).toFixed(3) + ")";
        const s = rnd() * 1.6 + 0.4;
        ctx.fillRect(x, y, s, s);
      }
      // 유성 (17단계 이상)
      if (stage >= 16) {
        const cyc = (time % 7000) / 7000;
        if (cyc < 0.22) {
          const p = cyc / 0.22;
          const x = VW * (0.75 - p * 0.55), y = 20 + p * 90;
          const lg = ctx.createLinearGradient(x, y, x + 60, y - 42);
          lg.addColorStop(0, "rgba(255,255,255,.9)");
          lg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = lg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 60, y - 42);
          ctx.stroke();
        }
      }
    }

    // 태양/달
    const sunX = VW * 0.79, sunY = OY - 62;
    const sg = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 78);
    sg.addColorStop(0, pal.sunGlow);
    sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 78, 0, 7);
    ctx.fill();
    ctx.fillStyle = pal.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, pal.night > 0.6 ? 11 : 13, 0, 7);
    ctx.fill();
    if (pal.night > 0.7) {
      // 행성
      const pg = ctx.createRadialGradient(VW * 0.16, 52, 3, VW * 0.16, 52, 26);
      pg.addColorStop(0, "rgba(120,180,255,.85)");
      pg.addColorStop(0.6, "rgba(60,110,200,.55)");
      pg.addColorStop(1, "rgba(30,60,140,0)");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(VW * 0.16, 52, 26, 0, 7);
      ctx.fill();
    }
  }

  function drawClouds(ctx, pal, time, stage, density) {
    if (stage >= 17) return;
    const layers = [
      { y: OY - 78, s: 0.9, sp: 0.0042, a: 0.5, n: 3 },
      { y: OY - 36, s: 1.25, sp: 0.0026, a: 0.4, n: 2 },
    ];
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      for (let i = 0; i < L.n; i++) {
        const seed = li * 17 + i * 7;
        const w = (86 + (seed * 37) % 70) * L.s;
        const speed = 9 + (li * 4);
        const x = ((time * 0.001 * speed + seed * 190) % (VW + 260)) - 130;
        const y = L.y + Math.sin(i * 2.1) * 12 - li * 6;
        const a = L.a * (0.7 + 0.3 * pal.night);
        ctx.save();
        ctx.globalAlpha = a;
        const cg = ctx.createLinearGradient(x, y - w * 0.2, x, y + w * 0.28);
        cg.addColorStop(0, "rgba(255,255,255,.95)");
        cg.addColorStop(0.6, "rgba(238,245,250,.8)");
        cg.addColorStop(1, "rgba(205,222,235,.15)");
        ctx.fillStyle = cg;
        for (const [dx, dy, r] of [[0, 0, 0.30], [w * 0.26, -w * 0.07, 0.24], [-w * 0.24, -w * 0.04, 0.22], [w * 0.08, w * 0.05, 0.26]]) {
          ctx.beginPath();
          ctx.ellipse(x + dx, y + dy, w * r, w * r * 0.62, 0, 0, 7);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  /* ---------- 자연물 ---------- */
  function drawTree(ctx, x, y, s, pal, time, phase, kind) {
    const sway = Math.sin(time / 950 + phase) * 1.6 * s;
    ctx.save();
    ctx.translate(x, y);
    // 그림자
    ctx.fillStyle = "rgba(20,30,20,.20)";
    ctx.beginPath();
    ctx.ellipse(0, 1, 9 * s, 3.4 * s, 0, 0, 7);
    ctx.fill();
    if (kind === "pine") {
      ctx.fillStyle = pal.trunk;
      ctx.fillRect(-1.3 * s, -10 * s, 2.6 * s, 10 * s);
      for (let i = 0; i < 3; i++) {
        const w = (9 - i * 2.2) * s, h = (8 - i) * s, yy = -9 * s - i * 5.4 * s;
        ctx.beginPath();
        ctx.moveTo(-w + sway * (i + 1) * 0.25, yy);
        ctx.lineTo(w + sway * (i + 1) * 0.25, yy);
        ctx.lineTo(sway * (i + 1) * 0.4, yy - h);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, yy, 0, yy - h);
        g.addColorStop(0, pal.tree);
        g.addColorStop(1, pal.tree2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    } else {
      ctx.fillStyle = pal.trunk;
      ctx.fillRect(-1.6 * s, -11 * s, 3.2 * s, 11 * s);
      const blobs = [[0, -19, 8.4], [-5.4, -14.5, 5.8], [5.2, -15, 6.0], [0.8, -12.5, 5.4]];
      for (let i = 0; i < blobs.length; i++) {
        const [bx, by, br] = blobs[i];
        const g = ctx.createRadialGradient(bx - br * 0.35 + sway * 0.5, by - br * 0.4, br * 0.2, bx + sway * 0.5, by, br);
        g.addColorStop(0, pal.tree2);
        g.addColorStop(1, pal.tree);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx + sway * (0.4 + i * 0.12), by, br * s * 0.86, 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawRock(ctx, x, y, s, pal) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(20,25,20,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 1, 6 * s, 2.2 * s, 0, 0, 7);
    ctx.fill();
    const g = ctx.createLinearGradient(-5 * s, -6 * s, 5 * s, 2 * s);
    g.addColorStop(0, shade(pal.rock, 0.18));
    g.addColorStop(1, pal.rockD);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-5 * s, 0);
    ctx.lineTo(-3 * s, -5 * s);
    ctx.lineTo(1.5 * s, -6 * s);
    ctx.lineTo(5 * s, -1.6 * s);
    ctx.lineTo(3 * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWaves(ctx, t, pal, time, stage) {
    if (CIV.isSpace(stage)) {
      // 별이 비치는 우주 바다
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        const p = ((time / 4200 + i * 0.33 + t.seed) % 1);
        ctx.fillStyle = "rgba(160,200,255," + (0.25 * (1 - p)).toFixed(2) + ")";
        ctx.beginPath();
        ctx.ellipse(t.cx + (p - 0.5) * 30, t.cy + (p - 0.5) * 8, 10, 2.2, 0, 0, 7);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.beginPath();
    const v = hexVerts(t.cx, t.cy, R * 0.94);
    ctx.moveTo(v[0][0], v[0][1]);
    for (let i = 1; i < 6; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 3; i++) {
      const ph = (time / 1400 + t.seed * 6 + i * 1.7);
      const yy = t.cy - R * SQ * 0.45 + i * 7.5 + Math.sin(ph) * 1.4;
      const xx = t.cx + Math.sin(ph * 0.7) * 3;
      ctx.strokeStyle = "rgba(233,250,255," + (0.15 + 0.13 * Math.sin(ph * 1.3)) + ")";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xx - 13, yy);
      ctx.quadraticCurveTo(xx, yy - 2.4, xx + 13, yy);
      ctx.stroke();
    }
    // 반짝임
    const sp = (time / 700 + t.seed * 9) % (Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255," + (0.18 + 0.22 * Math.max(0, Math.sin(sp))).toFixed(2) + ")";
    ctx.beginPath();
    ctx.ellipse(t.cx + 10, t.cy - 2, 2.6, 1, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 장면 ---------- */
  function createScene(canvas, stage) {
    const scene = { canvas, stage, t0: performance.now(), quality: 1 };
    setStage(scene, stage);
    return scene;
  }

  function setStage(scene, stage) {
    scene.stage = Math.max(1, Math.min(18, stage));
    scene.world = buildTerrain(scene.stage);
    scene.props = CIV.buildProps ? CIV.buildProps(scene.stage, scene.world) : [];
    scene.pal = PAL[scene.stage - 1];
  }

  function render(scene, now) {
    const cv = scene.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    const wantW = Math.round(rect.width * dpr), wantH = Math.round(rect.height * dpr);
    if (cv.width !== wantW || cv.height !== wantH) { cv.width = wantW; cv.height = wantH; }
    const ctx = cv.getContext("2d");
    const k = Math.min(rect.width / VW, rect.height / VH);
    const offX = (rect.width - VW * k) / 2, offY = (rect.height - VH * k) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(k, k);

    const t = now - scene.t0;
    const pal = scene.pal, stage = scene.stage;

    drawSky(ctx, pal, t, stage);
    drawSea(ctx, pal, stage, t);
    drawClouds(ctx, pal, t, stage);
    // 원경 산맥
    drawFarHills(ctx, pal, stage, t);

    // 지형
    ctx.drawImage(scene.world.terrain, 0, 0, VW, VH);

    // 물결
    for (const wt of scene.world.waterTiles) drawWaves(ctx, wt, pal, t, stage);

    // 오브젝트(깊이 순)
    const list = scene.props;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const fn = p.draw || (CIV.ART && CIV.ART[p.kind]);
      if (fn) fn(ctx, p.x, p.y, p.s || 1, t, pal, p, scene.world, stage);
    }

    drawAtmosphere(ctx, pal, stage, t);
    ctx.restore();
  }

  function drawSea(ctx, pal, stage, t) {
    if (CIV.isSpace(stage)) return;
    const hy = OY - STEPY * 0.68;
    const g = ctx.createLinearGradient(0, hy, 0, VH);
    g.addColorStop(0, rgba(pal.water2, 0.9));
    g.addColorStop(0.18, pal.water);
    g.addColorStop(1, shade(pal.water, -0.3));
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, VW, VH - hy);
    // 수평선
    ctx.strokeStyle = "rgba(240,250,255,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(VW, hy); ctx.stroke();
    // 잔물결
    for (let i = 0; i < 16; i++) {
      const y = hy + 7 + i * 9;
      const off = Math.sin(t / 2600 + i * 0.7) * 14;
      ctx.strokeStyle = "rgba(235,250,255," + (0.05 + 0.06 * (1 - i / 16)).toFixed(3) + ")";
      ctx.beginPath();
      for (let x = -20; x <= VW + 20; x += 34) {
        const yy = y + Math.sin((x + off) / 46 + t / 1500 + i) * 1.4;
        if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  function drawFarHills(ctx, pal, stage, t) {
    if (stage >= 17) {
      // 달 지평선
      const g = ctx.createLinearGradient(0, OY - 30, 0, OY + 40);
      g.addColorStop(0, "rgba(120,130,150,.35)");
      g.addColorStop(1, "rgba(60,66,80,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, OY + 40);
      for (let x = 0; x <= VW; x += 40) {
        ctx.lineTo(x, OY + 6 + Math.sin(x / 90) * 12);
      }
      ctx.lineTo(VW, OY + 40);
      ctx.closePath();
      ctx.fill();
      return;
    }
    // 2겹 능선
    for (let layer = 0; layer < 2; layer++) {
      const baseY = OY - STEPY * 0.68 - 3 + layer * 9;
      const amp = layer === 0 ? 15 : 9;
      ctx.beginPath();
      ctx.moveTo(-20, baseY + 40);
      for (let x = -20; x <= VW + 20; x += 24) {
        const y = baseY + Math.sin((x + layer * 90) / 120) * amp + Math.sin((x + layer * 40) / 61) * amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(VW + 20, baseY + 40);
      ctx.closePath();
      ctx.fillStyle = layer === 0 ? rgba(pal.sky[1], 0.55) : rgba(pal.grassD, 0.35);
      ctx.fill();
    }
  }

  function drawAtmosphere(ctx, pal, stage, t) {
    // 지평선 안개
    ctx.fillStyle = pal.fog;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, OY - 26, VW, 56);
    ctx.globalAlpha = 1;

    // 비네트
    const vg = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.22, VW / 2, VH * 0.55, VH * 1.02);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(6,10,18,.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);

    if (stage >= 13 && pal.night > 0.4) {
      // 밤 도시 빛 번짐
      const bg = ctx.createRadialGradient(VW * 0.5, OY + 150, 20, VW * 0.5, OY + 150, 220);
      bg.addColorStop(0, rgba(pal.accent, 0.10 + 0.05 * Math.sin(t / 2400)));
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  CIV.hex = {
    createScene, setStage, render, hexVerts, buildWorld, buildTerrain,
    drawSky, drawClouds, drawTree, drawRock, shade, rgba, mulberry, VW, VH,
    tileCX, tileCY, STEPX, STEPY,
  };
})();
