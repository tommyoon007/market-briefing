/* =========================================================================
   자산 문명 — scenes.js
   18단계 문명 장면 구성 (건물 배치·동물·탈것·소품)
   ========================================================================= */
(function () {
  const CIV = window.CIV;
  const ART = CIV.ART;
  const R = CIV.R, SQ = CIV.SQ;

  /* 나무·바위는 hexcore의 그리기를 ART로 노출 */
  ART.tree = function (ctx, x, y, s, t, pal, p) {
    CIV.hex.drawTree(ctx, x, y, s, pal, t, (p && p.phase) || 0, (p && p.kind2) || "broad");
  };
  ART.rock = function (ctx, x, y, s, t, pal, p) {
    CIV.hex.drawRock(ctx, x, y, s, pal);
  };

  /* 움직이는 동물 래퍼 */
  function wander(art, amp, speed, yAmp) {
    return function (ctx, x, y, s, t, pal, p) {
      const ph = t / (speed * 1000) + ((p && p.phase) || 0) * 6.28;
      const dx = Math.sin(ph) * amp;
      const dy = yAmp ? Math.sin(ph * 0.7) * yAmp : 0;
      const dir = Math.cos(ph) >= 0 ? 1 : -1;
      const q = Object.assign({}, p, { dir, phase: ph });
      art(ctx, x + dx, y + dy, s, t, pal, q);
    };
  }

  function tpos(world, c, r) {
    const t = world.byKey[c + "," + r];
    return t ? { x: t.cx, y: t.cy, t } : { x: 330, y: 300, t: null };
  }

  const BUILD = {};   // 단계별 배치
  const ANIM = {};    // 단계별 동물/탈것
  const AIR = {};     // 하늘/원경

  function B(stage, arr) { BUILD[stage] = arr; }
  function A(stage, arr) { ANIM[stage] = arr; }

  const S = (k, c, r, s, extra) => Object.assign({ k, c, r, s: s || 1 }, extra || {});

  /* ---------- 1. 원시 벌판 ---------- */
  B(1, [
    S("campfire", 3, 3, 1.15),
    S("tent", 2, 3, 1.0, { tint: "#a9885c" }),
    S("tent", 5, 4, 0.95, { tint: "#9c8058" }),
    S("tent", 5, 2, 0.9, { tint: "#b09168" }),
    S("ruin", 2, 5, 0.9),
  ]);
  A(1, [
    { k: "deer", c: 6, r: 3, s: 1.0, amp: 14, speed: 7 },
    { k: "deer", c: 1, r: 2, s: 0.9, amp: 10, speed: 9 },
    { k: "wolf", c: 4, r: 4, s: 1.0, amp: 12, speed: 5.5 },
    { k: "wolf", c: 2, r: 4, s: 0.9, amp: 9, speed: 6.5 },
  ]);

  /* ---------- 2. 움막·수렵 캠프 ---------- */
  B(2, [
    S("longhouse", 4, 3, 1.0),
    S("tent", 2, 2, 0.95, { tint: "#b09368" }),
    S("tent", 2, 4, 0.9, { tint: "#a0865e" }),
    S("tent", 5, 2, 0.85, { tint: "#b89a6e" }),
    S("campfire", 3, 4, 0.9),
    S("campfire", 5, 4, 0.7),
  ]);
  A(2, [
    { k: "deer", c: 6, r: 3, s: 0.95, amp: 13, speed: 8 },
    { k: "wolf", c: 1, r: 4, s: 0.85, amp: 8, speed: 6 },
    { k: "sheep", c: 1, r: 3, s: 1, amp: 6, speed: 11 },
  ]);

  /* ---------- 3. 초가집 마을 ---------- */
  B(3, [
    S("cottage", 3, 2, 1.0),
    S("cottage", 2, 3, 0.95, { tint: "#d8c296" }),
    S("cottage", 4, 3, 0.9, { tint: "#e2cfaa" }),
    S("cottage", 5, 2, 0.85, { tint: "#d5bd90" }),
    S("windmill", 5, 4, 0.9),
    S("campfire", 3, 4, 0.55),
  ]);
  A(3, [
    { k: "sheep", c: 1, r: 4, s: 1, amp: 8, speed: 12 },
    { k: "sheep", c: 2, r: 5, s: 0.95, amp: 6, speed: 15 },
    { k: "cow", c: 1, r: 2, s: 0.95, amp: 8, speed: 13 },
    { k: "birds", c: 3, r: 1, s: 1, n: 6, spread: 30, phase: 0.2 },
  ]);

  /* ---------- 4. 목조 촌락·풍차 ---------- */
  B(4, [
    S("windmill", 2, 2, 1.05, { phase: 0.4 }),
    S("cottage", 3, 3, 1.0, { tint: "#e0cba0" }),
    S("cottage", 4, 2, 0.95, { tint: "#cfb489" }),
    S("cottage", 5, 4, 0.9, { tint: "#e5d2ab" }),
    S("market", 2, 4, 1.0),
    S("longhouse", 6, 3, 0.85),
  ]);
  A(4, [
    { k: "horse", c: 5, r: 3, s: 1, amp: 14, speed: 6 },
    { k: "cow", c: 1, r: 4, s: 0.9, amp: 7, speed: 14 },
    { k: "sheep", c: 2, r: 5, s: 0.95, amp: 6, speed: 16 },
    { k: "birds", c: 4, r: 1, s: 1, n: 7, spread: 34, phase: 0.6 },
  ]);

  /* ---------- 5. 청동기 토성 요새 ---------- */
  B(5, [
    S("fort", 4, 2, 1.05),
    S("cottage", 2, 3, 0.95, { tint: "#d2b689" }),
    S("cottage", 5, 4, 0.9, { tint: "#cbb083" }),
    S("market", 2, 4, 0.95),
    S("obelisk", 6, 3, 0.9),
    S("windmill", 1, 4, 0.8),
  ]);
  A(5, [
    { k: "horse", c: 3, r: 4, s: 1, amp: 16, speed: 5.5 },
    { k: "horse", c: 1, r: 2, s: 0.9, amp: 10, speed: 7 },
    { k: "sheep", c: 2, r: 5, s: 0.9, amp: 5, speed: 15 },
    { k: "birds", c: 5, r: 1, s: 1, n: 5, spread: 28, phase: 1.2 },
  ]);

  /* ---------- 6. 고대 석조 신전 ---------- */
  B(6, [
    S("temple", 4, 2, 1.1),
    S("obelisk", 2, 3, 1.0),
    S("obelisk", 6, 3, 0.9),
    S("market", 2, 4, 0.95),
    S("cottage", 5, 4, 0.9, { tint: "#e3d3b0" }),
    S("ruin", 6, 4, 1.0),
  ]);
  A(6, [
    { k: "sheep", c: 1, r: 3, s: 0.95, amp: 7, speed: 13 },
    { k: "horse", c: 3, r: 4, s: 1, amp: 14, speed: 6.5 },
    { k: "birds", c: 3, r: 1, s: 1, n: 8, spread: 36, phase: 0.3 },
  ]);

  /* ---------- 7. 로마식 수로·원형극장 ---------- */
  B(7, [
    S("aqueduct", 3, 3, 1.0, { span: 4.2 }),
    S("colosseum", 4, 1, 1.0),
    S("townhouse", 2, 4, 1.0, { v: 0 }),
    S("townhouse", 3, 4, 0.95, { v: 1 }),
    S("obelisk", 5, 4, 0.95),
    S("market", 6, 4, 0.9),
  ]);
  A(7, [
    { k: "horse", c: 1, r: 2, s: 1, amp: 12, speed: 5 },
    { k: "sheep", c: 6, r: 3, s: 0.9, amp: 6, speed: 14 },
    { k: "birds", c: 4, r: 0, s: 1, n: 7, spread: 32, phase: 0.9 },
  ]);

  /* ---------- 8. 중세 성채 ---------- */
  B(8, [
    S("castle", 4, 2, 1.05),
    S("townhouse", 2, 3, 0.95, { v: 2 }),
    S("townhouse", 2, 4, 0.9, { v: 3 }),
    S("townhouse", 5, 4, 0.95, { v: 0 }),
    S("market", 6, 3, 0.9),
    S("windmill", 1, 4, 0.85),
  ]);
  A(8, [
    { k: "horse", c: 2, r: 5, s: 1, amp: 14, speed: 5.5 },
    { k: "horse", c: 6, r: 4, s: 0.9, amp: 8, speed: 7.5 },
    { k: "sheep", c: 1, r: 2, s: 0.9, amp: 5, speed: 16 },
    { k: "birds", c: 3, r: 0, s: 1, n: 6, spread: 30, phase: 1.6 },
  ]);

  /* ---------- 9. 르네상스 대성당 ---------- */
  B(9, [
    S("cathedral", 4, 2, 1.05),
    S("townhouse", 2, 3, 1.0, { v: 1 }),
    S("townhouse", 3, 3, 0.95, { v: 0 }),
    S("townhouse", 2, 4, 0.9, { v: 2 }),
    S("townhouse", 5, 3, 0.95, { v: 3 }),
    S("townhouse", 5, 4, 0.9, { v: 0 }),
    S("market", 6, 3, 0.9),
  ]);
  A(9, [
    { k: "horse", c: 1, r: 2, s: 0.95, amp: 10, speed: 7 },
    { k: "birds", c: 4, r: 0, s: 1, n: 9, spread: 40, phase: 0.5 },
    { k: "birds", c: 2, r: 1, s: 0.8, n: 4, spread: 22, phase: 2.1 },
  ]);

  /* ---------- 10. 대항해 항구 ---------- */
  B(10, [
    S("cathedral", 3, 2, 0.95),
    S("lighthouse", 6, 2, 1.0),
    S("crane", 6, 3, 1.0),
    S("warehouse", 5, 4, 0.95),
    S("townhouse", 2, 3, 0.95, { v: 0 }),
    S("townhouse", 3, 4, 0.95, { v: 2 }),
    S("market", 5, 3, 0.9),
  ]);
  A(10, [
    { k: "ship", c: 7, r: 3, s: 1.0, phase: 0.2 },
    { k: "ship", c: 7, r: 4, s: 0.8, phase: 1.4 },
    { k: "ship", c: 0, r: 1, s: 0.75, phase: 2.2 },
    { k: "gulls", c: 6, r: 2, s: 1, n: 5 },
  ]);

  /* ---------- 11. 산업혁명 증기 도시 ---------- */
  B(11, [
    S("factory", 3, 2, 1.05),
    S("factory", 5, 3, 0.95),
    S("warehouse", 2, 4, 0.95),
    S("warehouse", 6, 4, 0.9),
    S("townhouse", 2, 3, 0.9, { v: 1 }),
    S("townhouse", 5, 2, 0.85, { v: 2 }),
    S("bridge", 4, 5, 1.0),
  ]);
  A(11, [
    { k: "train", c: 0, r: 4, s: 1.0, delay: 0 },
    { k: "horse", c: 1, r: 2, s: 0.85, amp: 6, speed: 9 },
  ]);

  /* ---------- 12. 근대 저택·철도역 ---------- */
  B(12, [
    S("manor", 2, 3, 1.05),
    S("station", 5, 3, 1.0),
    S("townhouse", 2, 4, 0.9, { v: 3 }),
    S("warehouse", 6, 4, 0.85),
    S("factory", 5, 2, 0.7),
    S("bridge", 4, 5, 1.0),
    S("obelisk", 3, 4, 0.8),
  ]);
  A(12, [
    { k: "train", c: 0, r: 4, s: 1.05, delay: 3.5 },
    { k: "horse", c: 6, r: 3, s: 0.85, amp: 6, speed: 10 },
  ]);

  /* ---------- 13. 전기 마천루 ---------- */
  B(13, [
    S("decoTower", 3, 2, 1.15, { v: 0 }),
    S("decoTower", 5, 2, 1.0, { v: 1 }),
    S("decoTower", 2, 4, 0.9, { v: 0 }),
    S("decoTower", 6, 3, 0.95, { v: 1 }),
    S("townhouse", 2, 3, 0.85, { v: 2 }),
    S("townhouse", 5, 4, 0.85, { v: 3 }),
    S("bridge", 4, 5, 1.0),
  ]);
  A(13, [
    { k: "car", c: 0, r: 3, s: 1.0, delay: 0.1 },
    { k: "car", c: 0, r: 4, s: 0.9, delay: 0.55 },
    { k: "zeppelin", c: 3, r: 0, s: 0.9 },
    { k: "plane", c: 2, r: 0, s: 0.9, delay: 0.3 },
  ]);

  /* ---------- 14. 현대 글래스 타워 ---------- */
  B(14, [
    S("glassTower", 3, 2, 1.0, { h: 86 }),
    S("glassTower", 5, 2, 1.0, { h: 68 }),
    S("glassTower", 2, 4, 0.9, { h: 56 }),
    S("glassTower", 6, 3, 0.95, { h: 74 }),
    S("townhouse", 2, 3, 0.8, { v: 0 }),
    S("townhouse", 5, 4, 0.8, { v: 1 }),
    S("bridge", 4, 5, 1.0),
  ]);
  A(14, [
    { k: "car", c: 0, r: 3, s: 1.0, delay: 0.2 },
    { k: "car", c: 0, r: 4, s: 0.9, delay: 0.7 },
    { k: "plane", c: 0, r: 0, s: 1.0, delay: 0.1 },
    { k: "birds", c: 3, r: 1, s: 0.7, n: 4, spread: 18, phase: 1.1 },
  ]);

  /* ---------- 15. 스마트 에코시티 ---------- */
  B(15, [
    S("ecoTower", 3, 2, 1.0, { h: 72 }),
    S("ecoTower", 5, 2, 0.95, { h: 58 }),
    S("ecoTower", 2, 4, 0.9, { h: 50 }),
    S("glassTower", 6, 3, 0.8, { h: 46 }),
    S("townhouse", 5, 4, 0.75, { v: 2 }),
    S("bridge", 4, 5, 1.0),
  ]);
  A(15, [
    { k: "drone", c: 4, r: 3, s: 1.0, phase: 0.3 },
    { k: "drone", c: 2, r: 2, s: 0.9, phase: 1.7 },
    { k: "car", c: 0, r: 4, s: 0.95, delay: 0.4 },
    { k: "plane", c: 0, r: 0, s: 0.85, delay: 0.65 },
  ]);

  /* ---------- 16. 궤도 엘리베이터 ---------- */
  B(16, [
    S("orbitalElevator", 4, 3, 1.0),
    S("dome", 2, 3, 1.0),
    S("ecoTower", 5, 2, 0.8, { h: 50 }),
    S("glassTower", 6, 4, 0.8, { h: 44 }),
    S("dome", 2, 4, 0.85),
    S("bridge", 4, 5, 1.0),
  ]);
  A(16, [
    { k: "spaceship", c: 0, r: 1, s: 1.0, delay: 0.2 },
    { k: "drone", c: 6, r: 3, s: 0.9, phase: 0.8 },
    { k: "satellite", c: 3, r: 0, s: 0.9, phase: 0.5 },
  ]);

  /* ---------- 17. 달·화성 테라포밍 ---------- */
  B(17, [
    S("lunarDome", 4, 3, 1.15),
    S("lunarDome", 2, 3, 1.0),
    S("rocketPad", 5, 2, 1.0),
    S("dome", 6, 4, 0.85),
    S("lunarDome", 2, 5, 0.8),
  ]);
  A(17, [
    { k: "rover", c: 3, r: 4, s: 1.0, phase: 0.1 },
    { k: "rover", c: 6, r: 3, s: 0.85, phase: 0.6 },
    { k: "walker", c: 5, r: 4, s: 1.0, phase: 0.3 },
    { k: "satellite", c: 2, r: 0, s: 1.0, phase: 0.2 },
  ]);

  /* ---------- 18. 성간 스타포트 ---------- */
  B(18, [
    S("starport", 4, 2, 1.2),
    S("lunarDome", 2, 4, 1.0),
    S("dome", 5, 4, 0.95),
    S("orbitalElevator", 6, 3, 0.8),
    S("rocketPad", 2, 2, 0.85),
  ]);
  A(18, [
    { k: "spaceship", c: 0, r: 2, s: 1.1, delay: 0.1 },
    { k: "spaceship", c: 0, r: 4, s: 0.9, delay: 0.6 },
    { k: "satellite", c: 5, r: 1, s: 1.0, phase: 0.4 },
    { k: "satellite", c: 2, r: 1, s: 0.8, phase: 1.3 },
    { k: "walker", c: 6, r: 5, s: 0.9, phase: 0.7 },
  ]);

  /* ---------- 조립 ---------- */
  function buildProps(stage, world) {
    const out = [];
    const rnd = CIV.util.mulberry(500 + stage * 31);

    // 숲 타일의 나무들
    for (const t of world.tiles) {
      if (t.ch === "f") {
        const n = 3 + Math.floor(rnd() * 2);
        for (let i = 0; i < n; i++) {
          const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * 0.62;
          out.push({
            kind: "tree",
            x: t.cx + Math.cos(a) * rr, y: t.cy + Math.sin(a) * rr * SQ + 6,
            s: 0.82 + rnd() * 0.36, phase: rnd() * 6.28,
            kind2: rnd() > 0.72 ? "pine" : "broad",
          });
        }
      }
      if ((t.ch === "h" || t.ch === "m") && rnd() > 0.45) {
        out.push({ kind: "rock", x: t.cx + (rnd() - 0.5) * 26, y: t.cy + (rnd() - 0.5) * 12 + 6, s: 0.8 + rnd() * 0.5 });
      }
      if (t.ch === "g" && rnd() > 0.72) {
        out.push({
          kind: "tree", x: t.cx + (rnd() - 0.5) * 42, y: t.cy + (rnd() - 0.5) * 16 + 8,
          s: 0.6 + rnd() * 0.3, phase: rnd() * 6.28, kind2: "broad",
        });
      }
    }

    // 건물
    for (const b of (BUILD[stage] || [])) {
      const p = tpos(world, b.c, b.r);
      out.push(Object.assign({}, b, { kind: b.k, x: p.x, y: p.y + 4, s: b.s || 1 }));
    }

    // 동물·탈것
    for (const a of (ANIM[stage] || [])) {
      const p = tpos(world, a.c, a.r);
      const item = Object.assign({}, a, { kind: a.k, x: p.x, y: p.y + 8, s: a.s || 1 });
      if (a.amp) item.draw = wander(ART[a.k], a.amp, a.speed, 0);
      out.push(item);
    }

    out.sort((u, v) => u.y - v.y);
    return out;
  }

  CIV.buildProps = buildProps;
  CIV.stageInfo = { BUILD, ANIM };
})();
