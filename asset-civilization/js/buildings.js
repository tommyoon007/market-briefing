/* =========================================================================
   자산 문명 — buildings.js
   건물·동물·탈것 프로시저럴 아트 라이브러리
   ART[kind](ctx, x, y, s, t, pal, p, world, stage)
   ========================================================================= */
(function () {
  const CIV = window.CIV;
  const ART = (CIV.ART = {});
  const shade = CIV.util.shade;
  const rgba = CIV.util.rgba;

  /* ---------------- 기본 도형 ---------------- */
  function poly(ctx, pts, fill) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function grad(ctx, x0, y0, x1, y1, c0, c1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }
  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }

  // 2.5D 블록: 앞면 + 윗면 + 오른쪽면
  function block(ctx, x, y, w, h, depth, col, opts) {
    opts = opts || {};
    const dx = w * 0.30 * (opts.depthK || 1), dy = h * 0 + w * 0.16 * (opts.depthK || 1);
    const d = depth === undefined ? 1 : depth;
    // 오른쪽 면
    poly(ctx, [[x + w / 2, y], [x + w / 2 + dx, y - dy], [x + w / 2 + dx, y - dy - h], [x + w / 2, y - h]], shade(col, -0.26 * d));
    // 윗면
    poly(ctx, [[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 + dx, y - h - dy], [x - w / 2 + dx, y - h - dy]], shade(col, 0.20 * d));
    // 앞면
    ctx.fillStyle = grad(ctx, x, y - h, x, y, shade(col, 0.08 * d), shade(col, -0.10 * d));
    ctx.fillRect(x - w / 2, y - h, w, h);
    return { dx, dy };
  }

  function windowsFront(ctx, x, y, w, h, rows, cols, t, pal, warm) {
    const ww = Math.max(1.4, (w / cols) * 0.42), wh = Math.max(1.6, (h / rows) * 0.36);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x - w / 2 + (w / cols) * (c + 0.5) - ww / 2;
        const cy = y - h + (h / rows) * (r + 0.55) - wh / 2;
        const lit = 0.45 + 0.55 * Math.abs(Math.sin(t / 2400 + r * 1.7 + c * 2.3));
        ctx.fillStyle = warm
          ? "rgba(255,214,130," + (0.45 + 0.4 * lit).toFixed(2) + ")"
          : "rgba(150,190,215,.55)";
        ctx.fillRect(cx, cy, ww, wh);
      }
    }
  }

  function smoke(ctx, x, y, t, seed, s, tone, alpha) {
    for (let i = 0; i < 6; i++) {
      const ph = ((t / 3000) + i * 0.17 + seed * 0.31) % 1;
      const yy = y - ph * 46 * s;
      const xx = x + Math.sin(ph * 4.4 + i + seed) * 7 * s + ph * 12 * s;
      const r = (2.2 + ph * 8.5) * s;
      const a = (1 - ph) * 0.42 * (alpha === undefined ? 1 : alpha);
      ctx.fillStyle = "rgba(" + (tone || "210,212,206") + "," + a.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(xx, yy, r, 0, 7); ctx.fill();
    }
  }

  function flag(ctx, x, y, s, t, color, phase) {
    ctx.save();
    ctx.strokeStyle = "#6a5a44"; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 20 * s); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 20 * s);
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const yy = y - 20 * s + Math.sin(t / 260 + u * 4 + (phase || 0)) * 2.4 * s * u;
      ctx.lineTo(x + u * 15 * s, yy + u * 1.5 * s);
    }
    for (let i = 6; i >= 0; i--) {
      const u = i / 6;
      const yy = y - 20 * s + Math.sin(t / 260 + u * 4 + (phase || 0)) * 2.4 * s * u + 8 * s;
      ctx.lineTo(x + u * 15 * s, yy);
    }
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  /* ---------------- 1. 모닥불 ---------------- */
  ART.campfire = function (ctx, x, y, s, t, pal, p) {
    const f = 0.8 + 0.2 * Math.sin(t / 90) * Math.sin(t / 47 + 1);
    glow(ctx, x, y - 6 * s, 46 * s * f, "#ff9a3c", 0.30);
    // 돌
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ellipse(ctx, x + Math.cos(a) * 10 * s, y + Math.sin(a) * 4.2 * s, 3.1 * s, 2 * s, i % 2 ? "#6f6a62" : "#87837a");
    }
    // 장작
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.28);
    ctx.fillStyle = "#4b3524"; ctx.fillRect(-8 * s, -1.6 * s, 16 * s, 3.2 * s);
    ctx.rotate(-0.62);
    ctx.fillStyle = "#3d2b1d"; ctx.fillRect(-7 * s, -1.5 * s, 14 * s, 3 * s);
    ctx.restore();
    // 불꽃
    const flames = [[0, 15, "#ff8a2c", 1], [-3.4, 11, "#ffb547", 0.85], [3.2, 10, "#ffc86a", 0.8], [0, 20, "#ffe9a8", 0.55]];
    for (const [ox, hh, col, k] of flames) {
      const flick = 1 + 0.16 * Math.sin(t / 110 + ox * 3) + 0.1 * Math.sin(t / 61 + ox);
      ctx.beginPath();
      ctx.moveTo(x + ox * s, y - 1 * s);
      ctx.bezierCurveTo(x + (ox - 4.6 * k) * s, y - hh * 0.45 * s * flick, x + (ox - 2.4 * k) * s, y - hh * 0.8 * s * flick, x + ox * s, y - hh * s * flick);
      ctx.bezierCurveTo(x + (ox + 2.6 * k) * s, y - hh * 0.78 * s * flick, x + (ox + 4.6 * k) * s, y - hh * 0.42 * s * flick, x + ox * s, y - 1 * s);
      ctx.fillStyle = col; ctx.globalAlpha = 0.92; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 불티
    for (let i = 0; i < 5; i++) {
      const ph = ((t / 1300) + i * 0.22) % 1;
      ctx.fillStyle = "rgba(255,196,110," + (0.7 * (1 - ph)).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(x + Math.sin(ph * 8 + i) * 7 * s, y - 6 * s - ph * 30 * s, 1.3 * s, 0, 7);
      ctx.fill();
    }
  };

  /* ---------------- 움막 / 천막 ---------------- */
  ART.tent = function (ctx, x, y, s, t, pal, p) {
    const col = (p && p.tint) || "#b09368";
    ellipse(ctx, x, y + 1, 15 * s, 5 * s, "rgba(20,26,18,.20)");
    poly(ctx, [[x - 12 * s, y], [x, y - 21 * s], [x + 12 * s, y]], shade(col, -0.05));
    poly(ctx, [[x - 12 * s, y], [x, y - 21 * s], [x - 2 * s, y]], shade(col, 0.10));
    // 문
    poly(ctx, [[x - 2.6 * s, y], [x, y - 10 * s], [x + 2.6 * s, y]], "#4a3524");
    // 장대
    ctx.strokeStyle = "#6b5334"; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 21 * s); ctx.lineTo(x + 2 * s, y - 25 * s); ctx.stroke();
  };

  ART.longhouse = function (ctx, x, y, s, t, pal, p) {
    const wall = "#c8ab7c";
    ellipse(ctx, x, y + 2, 26 * s, 8 * s, "rgba(20,26,18,.18)");
    block(ctx, x, y, 30 * s, 11 * s, 1.2, wall);
    // 지붕(초가)
    const rh = 13 * s;
    poly(ctx, [[x - 18 * s, y], [x - 9 * s, y - 11 * s - rh], [x + 12 * s, y - 11 * s - rh], [x + 21 * s, y]], "#8d7343");
    poly(ctx, [[x - 18 * s, y], [x - 9 * s, y - 11 * s - rh], [x + 12 * s, y - 11 * s - rh], [x + 21 * s, y]], grad(ctx, x, y, x, y - 24 * s, "#a98b52", "#7a6238"));
    // 짚 결
    ctx.strokeStyle = "rgba(80,62,32,.35)"; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 3.4 * s, y - 1.5 * s);
      ctx.lineTo(x + i * 3.6 * s + 3 * s, y - 9 * s);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,40,24,.75)";
    ctx.fillRect(x - 23 * s, y - 10 * s, 30 * s, 10 * s);
    ctx.fillStyle = "rgba(30,20,12,.8)";
    ctx.fillRect(x + 1.2 * s, y - 7.5 * s, 4 * s, 7.5 * s);
  };

  /* ---------------- 초가집 ---------------- */
  ART.cottage = function (ctx, x, y, s, t, pal, p) {
    const wall = (p && p.tint) || "#dcc79a";
    ellipse(ctx, x, y + 2, 17 * s, 5.5 * s, "rgba(20,26,18,.20)");
    block(ctx, x, y, 20 * s, 13 * s, 1.1, wall);
    // 창문 불빛
    ctx.fillStyle = "rgba(255,198,110,.85)";
    ctx.fillRect(x - 6 * s, y - 9.5 * s, 4.6 * s, 4 * s);
    ctx.fillStyle = "rgba(60,40,24,.85)";
    ctx.fillRect(x + 2.4 * s, y - 9 * s, 4 * s, 9 * s);
    // 초가 지붕
    const rh = 12 * s;
    const pts = [[x - 15 * s, y - 13 * s + 2 * s], [x - 7 * s, y - 13 * s - rh], [x + 9 * s, y - 13 * s - rh], [x + 16 * s, y - 13 * s + 2 * s]];
    poly(ctx, pts, grad(ctx, x, y - 13 * s, x, y - 13 * s - rh, "#b3945a", "#7d6338"));
    ctx.strokeStyle = "rgba(70,52,26,.30)"; ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 3 * s, y - 11.4 * s);
      ctx.lineTo(x + i * 3.2 * s + 2 * s, y - 12 * s - rh * 0.9);
      ctx.stroke();
    }
    // 굴뚝
    ctx.fillStyle = "#9a8b74";
    ctx.fillRect(x + 8.5 * s, y - 24 * s, 3.4 * s, 7 * s);
    smoke(ctx, x + 10 * s, y - 25 * s, t, (p && p.seed) || 0.3, s * 0.85);
  };

  /* ---------------- 풍차 ---------------- */
  ART.windmill = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 13 * s, 4.5 * s, "rgba(20,26,18,.20)");
    // 몸통
    poly(ctx, [[x - 8 * s, y], [x + 8 * s, y], [x + 5.4 * s, y - 26 * s], [x - 5.4 * s, y - 26 * s]], "#d6c8ac");
    poly(ctx, [[x + 1 * s, y], [x + 8 * s, y], [x + 5.4 * s, y - 26 * s], [x + 1 * s, y - 26 * s]], "#b7a98c");
    // 지붕
    poly(ctx, [[x - 7 * s, y - 26 * s], [x + 7 * s, y - 26 * s], [x, y - 32 * s]], "#7c6440");
    // 날개
    const rot = t / 620 + (p && p.phase ? p.phase : 0);
    ctx.save();
    ctx.translate(x, y - 26 * s);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(rot + i * Math.PI / 2);
      ctx.fillStyle = "#efe6d2";
      ctx.fillRect(0, -1.6 * s, 17 * s, 3.2 * s);
      ctx.strokeStyle = "rgba(120,100,70,.7)"; ctx.lineWidth = 0.9 * s;
      ctx.strokeRect(0, -1.6 * s, 17 * s, 3.2 * s);
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = "#5d4a30";
    ctx.beginPath(); ctx.arc(x, y - 26 * s, 2.2 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(60,40,24,.8)";
    ctx.fillRect(x - 1.5 * s, y - 7 * s, 3.2 * s, 7 * s);
  };

  /* ---------------- 청동기 토성 요새 ---------------- */
  ART.fort = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 25 * s, 8 * s, "rgba(20,26,18,.22)");
    // 석축 기단
    block(ctx, x, y, 40 * s, 7 * s, 1.3, "#9a9481");
    // 목책
    for (let i = -6; i <= 6; i++) {
      const px = x + i * 3.1 * s;
      ctx.fillStyle = i % 2 ? "#8a6c44" : "#7a5f3b";
      ctx.fillRect(px - 1.4 * s, y - 20 * s, 2.8 * s, 13 * s);
      poly(ctx, [[px - 1.4 * s, y - 20 * s], [px, y - 23 * s], [px + 1.4 * s, y - 20 * s]], "#6d5334");
    }
    // 탑
    block(ctx, x + 12 * s, y - 4 * s, 13 * s, 20 * s, 1.15, "#8d7450");
    poly(ctx, [[x + 5.5 * s, y - 24 * s - 3 * s], [x + 18.5 * s, y - 24 * s - 3 * s], [x + 12 * s, y - 33 * s]], "#94794f");
    // 깃발
    flag(ctx, x - 20 * s, y - 14 * s, s * 0.9, t, "#c0442f", 1);
    flag(ctx, x + 18 * s, y - 30 * s, s * 0.8, t, "#d8a13f", 2);
    // 횃불
    glow(ctx, x - 8 * s, y - 24 * s, 10 * s, "#ffb347", 0.5);
    ellipse(ctx, x - 8 * s, y - 24 * s, 1.8 * s, 3 * s, "#ffcf78");
  };

  /* ---------------- 고대 석조 신전 ---------------- */
  ART.temple = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 3, 27 * s, 8 * s, "rgba(20,26,18,.20)");
    // 계단
    block(ctx, x, y, 42 * s, 4 * s, 1.1, "#d8d1bb");
    block(ctx, x, y - 4 * s, 38 * s, 3.5 * s, 1.0, "#e3ddc9");
    // 기둥
    const tops = [];
    for (let i = 0; i < 6; i++) {
      const px = x - 15 * s + i * 6 * s;
      const cw = 2.3 * s;
      ctx.fillStyle = grad(ctx, px - cw, 0, px + cw, 0, "#f1ead6", "#c9c1a9");
      ctx.fillRect(px - cw, y - 22 * s, cw * 2, 15 * s);
      ctx.fillStyle = "#b8b096";
      ctx.fillRect(px - cw * 1.3, y - 23 * s, cw * 2.6, 1.6 * s);
      tops.push(px);
    }
    // 엔타블라처 + 박공
    ctx.fillStyle = "#e7e0cc";
    ctx.fillRect(x - 18 * s, y - 26 * s, 36 * s, 4 * s);
    poly(ctx, [[x - 19 * s, y - 26 * s], [x + 19 * s, y - 26 * s], [x, y - 34 * s]], grad(ctx, x, y - 26 * s, x, y - 34 * s, "#f2ecd8", "#cfc8b0"));
    ctx.strokeStyle = "rgba(150,140,110,.5)"; ctx.lineWidth = 0.8 * s;
    ctx.beginPath(); ctx.moveTo(x - 13 * s, y - 28 * s); ctx.lineTo(x, y - 33 * s); ctx.lineTo(x + 13 * s, y - 28 * s); ctx.stroke();
    // 신전 불
    glow(ctx, x + 3 * s, y - 6 * s, 14 * s, "#ffbb55", 0.35);
  };

  /* ---------------- 로마식 수로 ---------------- */
  ART.aqueduct = function (ctx, x, y, s, t, pal, p) {
    const span = (p && p.span ? p.span : 3) * 26 * s;
    const h = 30 * s;
    // 그림자
    ellipse(ctx, x, y + 1, span * 0.6, 5 * s, "rgba(20,26,18,.16)");
    // 상부 수로
    block(ctx, x, y - h, span, 4.5 * s, 1.0, "#c9c2a8");
    // 아치 기둥
    const n = Math.max(2, Math.round(span / (18 * s)));
    const pw = span / n;
    for (let i = 0; i < n; i++) {
      const ax = x - span / 2 + pw * i;
      ctx.fillStyle = "#c0b89f";
      ctx.fillRect(ax + 1 * s, y - h + 4.5 * s, 5.2 * s, h - 4.5 * s);
      ctx.beginPath();
      ctx.moveTo(ax + 1 * s, y - h + 5 * s);
      ctx.lineTo(ax + pw - 1 * s, y - h + 5 * s);
      ctx.lineTo(ax + pw - 1 * s, y - h + 12 * s);
      ctx.quadraticCurveTo(ax + pw / 2, y - h - 2 * s, ax + 1 * s, y - h + 12 * s);
      ctx.closePath();
      ctx.fillStyle = pal.sky[1];
      ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
      // 빛
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.fillRect(ax + 1 * s, y - h + 4.5 * s, 1.4 * s, h - 4.5 * s);
    }
    // 흐르는 물
    for (let i = 0; i < 5; i++) {
      const ph = ((t / 1800) + i * 0.21) % 1;
      const wx = x - span / 2 + ph * span;
      ctx.fillStyle = "rgba(150,225,240,.55)";
      ctx.fillRect(wx, y - h - 1.2 * s, 5 * s, 2 * s);
    }
  };

  /* ---------------- 원형극장 ---------------- */
  ART.colosseum = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 30 * s, 11 * s, "rgba(20,26,18,.20)");
    const rx = 26 * s, ry = 9 * s, h = 20 * s;
    // 외벽
    ctx.beginPath();
    ctx.ellipse(x, y - h, rx, ry, 0, 0, Math.PI);
    ctx.fillStyle = "#d3c9ad";
    ctx.fill();
    ctx.fillRect(x - rx, y - h, rx * 2, h);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI);
    ctx.fillStyle = "#b9ae92"; ctx.fill();
    // 아치 2단
    for (let tier = 0; tier < 2; tier++) {
      const yy = y - h + tier * 9 * s + 4 * s;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.12 + (i / 6) * Math.PI * 0.76;
        const px = x - Math.cos(a) * rx * 0.82;
        const py = yy + Math.sin(a) * ry * 0.55;
        ctx.fillStyle = "rgba(70,62,48,.55)";
        ctx.beginPath();
        ctx.ellipse(px, py, 2.2 * s, 2.8 * s, 0, 0, 7);
        ctx.fill();
      }
    }
    // 관중
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = x + Math.cos(a) * rx * 0.45, py = y - h + 2 * s + Math.sin(a) * ry * 0.4;
      ctx.fillStyle = ["#e8d9b0", "#c46a4a", "#6a86b0"][i % 3];
      ctx.beginPath(); ctx.arc(px, py, 1.2 * s, 0, 7); ctx.fill();
    }
  };

  /* ---------------- 중세 성채 ---------------- */
  ART.castle = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 3, 32 * s, 10 * s, "rgba(20,26,18,.24)");
    const stone = "#a9a696";
    // 성벽
    block(ctx, x, y, 62 * s, 16 * s, 1.25, shade(stone, -0.06));
    // 총안
    for (let i = -8; i <= 8; i++) {
      ctx.fillStyle = "#8f8c7d";
      ctx.fillRect(x + i * 3.4 * s, y - 19.5 * s, 2 * s, 3.5 * s);
    }
    // 성문
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y); ctx.lineTo(x - 4 * s, y - 7 * s);
    ctx.quadraticCurveTo(x, y - 13 * s, x + 4 * s, y - 7 * s);
    ctx.lineTo(x + 4 * s, y); ctx.closePath();
    ctx.fillStyle = "#4c3a26"; ctx.fill();
    // 중앙 성탑
    block(ctx, x, y - 4 * s, 22 * s, 30 * s, 1.3, shade(stone, 0.05));
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = "#9b9889";
      ctx.fillRect(x + i * 3.1 * s - 1 * s, y - 37 * s, 2.2 * s, 3.4 * s);
    }
    windowsFront(ctx, x, y - 8 * s, 16 * s, 20 * s, 2, 3, t, pal, true);
    // 원형 탑 2개
    for (const [tx, th] of [[-27, 26], [27, 24]]) {
      const px = x + tx * s;
      ctx.fillStyle = grad(ctx, px - 6 * s, 0, px + 6 * s, 0, "#b6b3a3", "#8d8a7c");
      ctx.fillRect(px - 6 * s, y - th * s, 12 * s, th * s);
      ctx.beginPath();
      ctx.ellipse(px, y - th * s, 6 * s, 2.4 * s, 0, 0, 7);
      ctx.fillStyle = "#c3c0b0"; ctx.fill();
      poly(ctx, [[px - 7.4 * s, y - th * s], [px + 7.4 * s, y - th * s], [px, y - th * s - 13 * s]], "#7b3f3a");
      poly(ctx, [[px - 7.4 * s, y - th * s], [px, y - th * s], [px, y - th * s - 13 * s]], "#93504a");
      flag(ctx, px, y - th * s - 13 * s, s * 0.85, t, "#c7432f", tx > 0 ? 1 : 3);
      ctx.fillStyle = "rgba(50,40,30,.6)";
      ctx.fillRect(px - 1.4 * s, y - th * s + 4 * s, 2.8 * s, 5 * s);
    }
    // 성문 횃불
    glow(ctx, x - 6 * s, y - 8 * s, 9 * s, "#ffb64d", 0.4 + 0.1 * Math.sin(t / 180));
  };

  /* ---------------- 르네상스 대성당 ---------------- */
  ART.cathedral = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 3, 30 * s, 9 * s, "rgba(20,26,18,.20)");
    const wall = "#e3d8bd";
    // 신랑(본당)
    block(ctx, x - 4 * s, y, 40 * s, 22 * s, 1.1, wall);
    // 지붕
    poly(ctx, [[x - 24 * s, y - 22 * s], [x - 16 * s, y - 32 * s], [x + 4 * s, y - 32 * s], [x + 16 * s, y - 22 * s]], "#b06a4a");
    poly(ctx, [[x - 24 * s, y - 22 * s], [x - 16 * s, y - 32 * s], [x + 4 * s, y - 32 * s], [x + 16 * s, y - 22 * s]], grad(ctx, x, y - 22 * s, x, y - 32 * s, "#c67a55", "#96543a"));
    // 장미창
    const cx = x - 10 * s, cy = y - 14 * s;
    ctx.beginPath(); ctx.arc(cx, cy, 5.4 * s, 0, 7);
    ctx.fillStyle = "rgba(120,180,220,.9)"; ctx.fill();
    ctx.strokeStyle = "#cbbd9c"; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(i / 8 * Math.PI * 2) * 5.2 * s, cy + Math.sin(i / 8 * Math.PI * 2) * 5.2 * s);
      ctx.strokeStyle = "rgba(203,189,156,.9)"; ctx.stroke();
    }
    // 아치 창
    for (let i = 0; i < 3; i++) {
      const px = x + 2 * s + i * 7 * s;
      ctx.beginPath();
      ctx.moveTo(px - 2 * s, y - 6 * s);
      ctx.lineTo(px - 2 * s, y - 12 * s);
      ctx.quadraticCurveTo(px, y - 16 * s, px + 2 * s, y - 12 * s);
      ctx.lineTo(px + 2 * s, y - 6 * s);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,214,140,.55)"; ctx.fill();
    }
    // 첨탑
    const sx = x + 18 * s;
    block(ctx, sx, y, 12 * s, 40 * s, 1.15, shade(wall, 0.04));
    poly(ctx, [[sx - 6.6 * s, y - 40 * s], [sx + 6.6 * s, y - 40 * s], [sx, y - 62 * s]], grad(ctx, sx, y - 40 * s, sx, y - 62 * s, "#d8c9a6", "#9c8c72"));
    // 십자
    ctx.strokeStyle = "#5a5040"; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(sx, y - 62 * s); ctx.lineTo(sx, y - 68 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 2.4 * s, y - 65.4 * s); ctx.lineTo(sx + 2.4 * s, y - 65.4 * s); ctx.stroke();
    // 버트레스
    for (let i = 0; i < 3; i++) {
      const bx = x - 24 * s + i * 13 * s;
      poly(ctx, [[bx, y], [bx + 3 * s, y], [bx + 4.4 * s, y - 14 * s], [bx + 1.4 * s, y - 14 * s]], shade(wall, -0.12));
    }
    // 종소리(물결)
    const w = (t / 2600) % 1;
    ctx.strokeStyle = "rgba(255,240,200," + (0.25 * (1 - w)).toFixed(2) + ")";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(sx, y - 30 * s, 6 + w * 18, -0.6, 0.6); ctx.stroke();
  };

  /* ---------------- 르네상스 광장 건물 ---------------- */
  ART.townhouse = function (ctx, x, y, s, t, pal, p) {
    const cols = ["#e0cba6", "#cfae8c", "#ddbaa0", "#c9b692"];
    const c = cols[(p && p.v) || 0];
    ellipse(ctx, x, y + 2, 15 * s, 5 * s, "rgba(20,26,18,.18)");
    block(ctx, x, y, 17 * s, 20 * s, 1.15, c);
    windowsFront(ctx, x, y - 2 * s, 13 * s, 16 * s, 3, 2, t, pal, true);
    poly(ctx, [[x - 9 * s, y - 20 * s], [x - 4 * s, y - 26 * s], [x + 6 * s, y - 26 * s], [x + 10 * s, y - 20 * s]], "#a35f42");
    // 차양
    ctx.fillStyle = "rgba(180,60,50,.8)";
    ctx.fillRect(x - 4 * s, y - 6.5 * s, 8 * s, 2 * s);
  };

  /* ---------------- 등대 ---------------- */
  ART.lighthouse = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 11 * s, 4 * s, "rgba(20,26,18,.20)");
    poly(ctx, [[x - 7 * s, y], [x + 7 * s, y], [x + 4 * s, y - 26 * s], [x - 4 * s, y - 26 * s]], "#efe9db");
    for (let i = 0; i < 3; i++) {
      const yy = y - 4 * s - i * 7.5 * s;
      poly(ctx, [[x - 6.6 * s + i * 0.7 * s, yy], [x + 6.6 * s - i * 0.7 * s, yy], [x + 4.6 * s - i * 0.5 * s, yy - 6.4 * s], [x - 4.6 * s + i * 0.5 * s, yy - 6.4 * s]], "#c2493a");
    }
    ctx.fillStyle = "#4c4a44";
    ctx.fillRect(x - 5 * s, y - 31 * s, 10 * s, 5 * s);
    const beam = 0.75 + 0.25 * Math.sin(t / 700);
    glow(ctx, x, y - 32 * s, 16 * s * beam, "#fff0b0", 0.55);
  };

  /* ---------------- 범선 ---------------- */
  ART.ship = function (ctx, x, y, s, t, pal, p) {
    const bob = Math.sin(t / 1100 + ((p && p.phase) || 0)) * 1.2 * s;
    ctx.save();
    ctx.translate(0, bob);
    // 선체
    poly(ctx, [[x - 16 * s, y], [x + 16 * s, y], [x + 12 * s, y - 7 * s], [x - 12 * s, y - 7 * s]], grad(ctx, x, y - 7 * s, x, y, "#8a6a42", "#5d4527"));
    poly(ctx, [[x - 16 * s, y], [x - 11 * s, y + 3 * s], [x + 11 * s, y + 3 * s], [x + 16 * s, y]], "#4a3520");
    // 돛대와 돛
    for (const [mx, hh, sw] of [[-6, 30, 10], [2, 34, 12], [10, 26, 8]]) {
      ctx.strokeStyle = "#6b4f2e"; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(x + mx * s, y - 6 * s); ctx.lineTo(x + mx * s, y - hh * s); ctx.stroke();
      const sway = Math.sin(t / 900 + mx) * 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(x + mx * s, y - hh * s + 2 * s);
      ctx.quadraticCurveTo(x + (mx - sw) * s + sway, y - hh * 0.55 * s, x + mx * s, y - 8 * s);
      ctx.quadraticCurveTo(x + (mx + sw * 0.5) * s, y - hh * 0.55 * s, x + mx * s, y - hh * s + 2 * s);
      ctx.closePath();
      ctx.fillStyle = "rgba(248,244,232,.93)"; ctx.fill();
      ctx.strokeStyle = "rgba(190,180,160,.8)"; ctx.lineWidth = 0.7 * s; ctx.stroke();
    }
    flag(ctx, x + 10 * s, y - 26 * s, s * 0.7, t, "#c94a3a", 1);
    ctx.restore();
    // 항적
    for (let i = 0; i < 3; i++) {
      const ph = ((t / 1500) + i * 0.3) % 1;
      ctx.strokeStyle = "rgba(255,255,255," + (0.25 * (1 - ph)).toFixed(2) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y + 3 * s, 14 * s + ph * 14 * s, 2.4 * s + ph * 2 * s, 0, 0, 7);
      ctx.stroke();
    }
  };

  /* ---------------- 항구 크레인 ---------------- */
  ART.crane = function (ctx, x, y, s, t, pal, p) {
    const sw = Math.sin(t / 1800) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sw);
    ctx.strokeStyle = "#6b5a44"; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(-8 * s, 0); ctx.lineTo(0, -30 * s); ctx.lineTo(8 * s, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -30 * s); ctx.lineTo(20 * s, -26 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -30 * s); ctx.lineTo(20 * s, -26 * s); ctx.stroke();
    ctx.strokeStyle = "rgba(60,50,40,.8)"; ctx.lineWidth = 0.9 * s;
    ctx.beginPath(); ctx.moveTo(20 * s, -26 * s); ctx.lineTo(20 * s, -6 * s); ctx.stroke();
    ctx.fillStyle = "#8a6b42";
    ctx.fillRect(18 * s, -6 * s, 4 * s, 4 * s);
    ctx.restore();
  };

  /* ---------------- 산업혁명 공장 ---------------- */
  ART.factory = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 26 * s, 8 * s, "rgba(20,26,18,.22)");
    block(ctx, x, y, 38 * s, 16 * s, 1.2, "#9c7b5f");
    // 톱니 지붕
    for (let i = 0; i < 4; i++) {
      const px = x - 17 * s + i * 9 * s;
      poly(ctx, [[px, y - 16 * s], [px + 7 * s, y - 16 * s], [px + 7 * s, y - 22 * s]], "rgba(90,80,72,.9)");
      ctx.fillStyle = "rgba(180,200,215,.5)";
      ctx.fillRect(px + 5.2 * s, y - 21 * s, 1.6 * s, 4 * s);
    }
    windowsFront(ctx, x, y - 2 * s, 32 * s, 10 * s, 2, 5, t, pal, true);
    // 굴뚝
    for (const [cx, hh, sd] of [[-13, 40, 0.2], [6, 46, 0.7]]) {
      ctx.fillStyle = grad(ctx, x + cx * s - 3 * s, 0, x + cx * s + 3 * s, 0, "#8d6f57", "#6b5241");
      ctx.fillRect(x + cx * s - 3 * s, y - 16 * s - hh * s, 6 * s, hh * s);
      ctx.fillStyle = "#5c4638";
      ctx.fillRect(x + cx * s - 3.6 * s, y - 16 * s - hh * s - 2 * s, 7.2 * s, 2.4 * s);
      smoke(ctx, x + cx * s, y - 18 * s - hh * s, t, sd, s * 1.15, "120,118,112", 1);
    }
  };

  /* ---------------- 창고 ---------------- */
  ART.warehouse = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 18 * s, 5 * s, "rgba(20,26,18,.18)");
    block(ctx, x, y, 24 * s, 12 * s, 1.1, "#b8a183");
    poly(ctx, [[x - 13 * s, y - 12 * s], [x - 6 * s, y - 18 * s], [x + 10 * s, y - 18 * s], [x + 13 * s, y - 12 * s]], "#7d6b57");
    ctx.fillStyle = "rgba(70,55,40,.7)";
    ctx.fillRect(x - 8 * s, y - 9 * s, 8 * s, 9 * s);
  };

  /* ---------------- 근대 철도역 ---------------- */
  ART.station = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 24 * s, 7 * s, "rgba(20,26,18,.18)");
    block(ctx, x, y, 34 * s, 13 * s, 1.1, "#c3ac8e");
    // 아치 지붕
    ctx.beginPath();
    ctx.ellipse(x, y - 13 * s, 19 * s, 12 * s, 0, Math.PI, 0);
    ctx.fillStyle = grad(ctx, x, y - 25 * s, x, y - 13 * s, "#8e9aa4", "#5f6b76");
    ctx.fill();
    for (let i = -3; i <= 3; i++) {
      ctx.strokeStyle = "rgba(220,230,235,.35)"; ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(x + i * 5.4 * s, y - 13 * s);
      ctx.lineTo(x + i * 5.4 * s, y - 13 * s - Math.sqrt(Math.max(0, 1 - (i * 5.4 / 19) ** 2)) * 12 * s);
      ctx.stroke();
    }
    // 시계
    ctx.beginPath(); ctx.arc(x, y - 18 * s, 3 * s, 0, 7);
    ctx.fillStyle = "#f0e4c8"; ctx.fill();
    ctx.strokeStyle = "#4a4238"; ctx.lineWidth = 0.8 * s;
    ctx.beginPath(); ctx.moveTo(x, y - 18 * s);
    ctx.lineTo(x + Math.sin(t / 3000) * 1.8 * s, y - 18 * s - Math.cos(t / 3000) * 1.8 * s);
    ctx.stroke();
  };

  /* ---------------- 근대 저택 ---------------- */
  ART.manor = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 25 * s, 8 * s, "rgba(20,26,18,.20)");
    block(ctx, x, y, 32 * s, 20 * s, 1.2, "#d8c8ac");
    // 박공 지붕
    poly(ctx, [[x - 18 * s, y - 20 * s], [x - 8 * s, y - 30 * s], [x + 8 * s, y - 30 * s], [x + 18 * s, y - 20 * s]], "#6f5a55");
    poly(ctx, [[x - 18 * s, y - 20 * s], [x - 8 * s, y - 30 * s], [x + 8 * s, y - 30 * s], [x + 18 * s, y - 20 * s]], grad(ctx, x, y - 20 * s, x, y - 30 * s, "#8a7370", "#5b4744"));
    // 돌출 창
    block(ctx, x - 6 * s, y, 9 * s, 22 * s, 1.1, "#e2d3b8");
    poly(ctx, [[x - 11 * s, y - 22 * s], [x - 6 * s, y - 28 * s], [x - 1 * s, y - 22 * s]], "#6f5a55");
    windowsFront(ctx, x + 6 * s, y - 4 * s, 12 * s, 14 * s, 2, 2, t, pal, true);
    windowsFront(ctx, x - 6 * s, y - 6 * s, 6 * s, 14 * s, 3, 1, t, pal, true);
    // 문
    ctx.fillStyle = "#5a3f2e";
    ctx.fillRect(x + 1 * s, y - 9 * s, 5 * s, 9 * s);
    // 굴뚝 2
    ctx.fillStyle = "#8d6a5c";
    ctx.fillRect(x - 12 * s, y - 33 * s, 3.6 * s, 8 * s);
    smoke(ctx, x - 10 * s, y - 34 * s, t, 0.5, s * 0.7);
    // 가스등
    for (const gx of [-18, 18]) {
      ctx.strokeStyle = "#4a4a44"; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.moveTo(x + gx * s, y); ctx.lineTo(x + gx * s, y - 12 * s); ctx.stroke();
      glow(ctx, x + gx * s, y - 13 * s, 9 * s, "#ffd28a", 0.5);
      ctx.fillStyle = "#fff0c0";
      ctx.beginPath(); ctx.arc(x + gx * s, y - 13 * s, 1.8 * s, 0, 7); ctx.fill();
    }
  };

  /* ---------------- 아르데코 마천루 ---------------- */
  ART.decoTower = function (ctx, x, y, s, t, pal, p) {
    const hue = (p && p.v) || 0;
    const body = hue ? "#4a4356" : "#3e4a5e";
    ellipse(ctx, x, y + 2, 16 * s, 5 * s, "rgba(10,14,24,.35)");
    block(ctx, x, y, 26 * s, 18 * s, 1.2, body);
    block(ctx, x, y - 18 * s, 18 * s, 22 * s, 1.15, shade(body, 0.06));
    block(ctx, x, y - 40 * s, 11 * s, 20 * s, 1.1, shade(body, 0.12));
    poly(ctx, [[x - 3 * s, y - 60 * s], [x + 3 * s, y - 60 * s], [x, y - 74 * s]], shade(body, 0.2));
    // 네온 라인
    const pulse = 0.55 + 0.45 * Math.sin(t / 900 + hue);
    ctx.strokeStyle = rgba(pal.accent, 0.55 + 0.35 * pulse);
    ctx.lineWidth = 1.2 * s;
    for (const [yy, w] of [[-18, 9], [-40, 5.5], [-60, 3]]) {
      ctx.beginPath();
      ctx.moveTo(x - w * s, y + yy * s);
      ctx.lineTo(x + w * s, y + yy * s);
      ctx.stroke();
    }
    windowsFront(ctx, x, y - 4 * s, 22 * s, 12 * s, 2, 4, t, pal, true);
    windowsFront(ctx, x, y - 24 * s, 15 * s, 14 * s, 3, 3, t, pal, true);
    windowsFront(ctx, x, y - 46 * s, 8 * s, 12 * s, 3, 2, t, pal, true);
    glow(ctx, x, y - 30 * s, 34 * s, pal.accent, 0.14 * pulse);
  };

  /* ---------------- 현대 유리 타워 ---------------- */
  ART.glassTower = function (ctx, x, y, s, t, pal, p) {
    const hh = (p && p.h) || 72;
    ellipse(ctx, x, y + 2, 15 * s, 5 * s, "rgba(10,20,30,.30)");
    const w = 20 * s;
    // 몸통 (유리)
    ctx.fillStyle = grad(ctx, x - w / 2, 0, x + w / 2, 0, "#8fb6cf", "#4c748f");
    ctx.fillRect(x - w / 2, y - hh * s, w, hh * s);
    // 반사광
    ctx.fillStyle = "rgba(230,248,255,.35)";
    poly(ctx, [[x - w / 2 + 2 * s, y], [x - w / 2 + 6 * s, y], [x + 2 * s, y - hh * s], [x - 2 * s, y - hh * s]]);
    // 창 그리드
    const rows = Math.round(hh / 5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        const lit = Math.abs(Math.sin(t / 2000 + r * 1.3 + c * 2.1));
        ctx.fillStyle = "rgba(180,225,245," + (0.10 + 0.22 * lit).toFixed(2) + ")";
        ctx.fillRect(x - w / 2 + 1.6 * s + c * (w / 4), y - hh * s + r * (hh / rows) * s + 1.2 * s, (w / 4) - 2 * s, (hh / rows) * s - 1.6 * s);
      }
    }
    // 꼭대기
    ctx.fillStyle = "#c8d8e2";
    ctx.fillRect(x - w / 2 - 1 * s, y - hh * s - 3 * s, w + 2 * s, 3 * s);
    // 안테나 등
    const blink = Math.sin(t / 700) > 0;
    if (blink) { glow(ctx, x, y - hh * s - 6 * s, 8 * s, "#ff5a4a", 0.7); }
  };

  /* ---------------- 스마트 에코 타워 ---------------- */
  ART.ecoTower = function (ctx, x, y, s, t, pal, p) {
    const hh = (p && p.h) || 64;
    ellipse(ctx, x, y + 2, 16 * s, 5 * s, "rgba(10,30,20,.28)");
    // 원통형 타워
    ctx.fillStyle = grad(ctx, x - 11 * s, 0, x + 11 * s, 0, "#e8f0e4", "#a9c0ae");
    ctx.fillRect(x - 10 * s, y - hh * s, 20 * s, hh * s);
    ctx.beginPath(); ctx.ellipse(x, y - hh * s, 10 * s, 3.4 * s, 0, 0, 7);
    ctx.fillStyle = "#dbe8da"; ctx.fill();
    // 수직 정원
    for (let i = 0; i < 5; i++) {
      const yy = y - 8 * s - i * 11 * s;
      ctx.fillStyle = i % 2 ? "rgba(80,160,90,.85)" : "rgba(105,190,110,.8)";
      for (let k = -3; k <= 3; k++) {
        const r = 1.6 * s + Math.abs(Math.sin(t / 1600 + i + k)) * 0.7 * s;
        ctx.beginPath();
        ctx.arc(x + k * 2.6 * s, yy + Math.sin(k + i) * 1.2 * s, r, 0, 7);
        ctx.fill();
      }
    }
    // 풍력 터빈
    const rot = t / 420;
    ctx.save();
    ctx.translate(x, y - hh * s - 8 * s);
    ctx.strokeStyle = "#9aa8a2"; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(0, 8 * s); ctx.lineTo(0, 0); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(rot + i * Math.PI * 2 / 3);
      ctx.fillStyle = "#f2f6f4";
      ctx.fillRect(-0.7 * s, -10 * s, 1.4 * s, 10 * s);
      ctx.restore();
    }
    ctx.restore();
    // 태양광 지붕
    ctx.fillStyle = "rgba(40,70,110,.85)";
    ctx.fillRect(x - 7 * s, y - hh * s - 2 * s, 14 * s, 2.4 * s);
    windowsFront(ctx, x, y - 4 * s, 12 * s, 10 * s, 2, 2, t, pal, false);
  };

  /* ---------------- 궤도 엘리베이터 ---------------- */
  ART.orbitalElevator = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 16 * s, 5 * s, "rgba(10,20,40,.35)");
    // 기단
    block(ctx, x, y, 30 * s, 8 * s, 1.2, "#5a6a80");
    const H = 300 * s;
    // 기둥
    const g = ctx.createLinearGradient(x - 3 * s, 0, x + 3 * s, 0);
    g.addColorStop(0, "#dfe8f2"); g.addColorStop(0.5, "#9db4cc"); g.addColorStop(1, "#5d7288");
    ctx.fillStyle = g;
    ctx.fillRect(x - 2.4 * s, y - 8 * s - H, 4.8 * s, H);
    // 상승 캡슐
    for (let i = 0; i < 3; i++) {
      const ph = ((t / 5200) + i * 0.33) % 1;
      const cy = y - 8 * s - ph * H;
      glow(ctx, x, cy, 10 * s, "#7fd4ff", 0.6);
      ctx.fillStyle = "#dff4ff";
      ctx.fillRect(x - 4 * s, cy - 3 * s, 8 * s, 6 * s);
    }
    // 고리
    for (let i = 0; i < 4; i++) {
      const yy = y - 40 * s - i * 66 * s;
      ctx.strokeStyle = "rgba(150,220,255,.35)"; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.ellipse(x, yy, 16 * s, 4 * s, 0, 0, 7); ctx.stroke();
    }
    // 기단 조명
    glow(ctx, x, y - 10 * s, 30 * s, "#7fd4ff", 0.25);
    ctx.fillStyle = "#8fe0ff";
    ctx.fillRect(x - 13 * s, y - 10 * s, 26 * s, 1.6 * s);
  };

  /* ---------------- 성층권 돔 ---------------- */
  ART.dome = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 20 * s, 6 * s, "rgba(10,20,40,.30)");
    block(ctx, x, y, 30 * s, 6 * s, 1.2, "#66748a");
    const r = 14 * s;
    ctx.beginPath();
    ctx.ellipse(x, y - 6 * s, r, r * 0.72, 0, Math.PI, 0);
    ctx.closePath();
    const g = ctx.createRadialGradient(x - r * 0.3, y - 6 * s - r * 0.5, 2, x, y - 6 * s, r);
    g.addColorStop(0, "rgba(210,245,255,.85)");
    g.addColorStop(1, "rgba(90,150,200,.55)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,.6)"; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y - 6 * s, r * Math.abs(i) * 0.25 + 1, r * 0.72, 0, Math.PI, 0);
      ctx.stroke();
    }
    // 내부 불빛
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i + 0.5) / 5 * Math.PI;
      ctx.fillStyle = "rgba(180,255,220,.7)";
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.55, y - 6 * s + Math.sin(a) * r * 0.35, 1.4 * s, 0, 7); ctx.fill();
    }
  };

  /* ---------------- 로켓 발사대 ---------------- */
  ART.rocketPad = function (ctx, x, y, s, t, pal, p) {
    const cycle = (t % 9000) / 9000;
    const launching = cycle < 0.42;
    const lift = launching ? Math.pow(cycle / 0.42, 2) * 74 : 0;
    ellipse(ctx, x, y + 2, 16 * s, 5 * s, "rgba(10,16,30,.4)");
    block(ctx, x, y, 22 * s, 5 * s, 1.2, "#5b6473");
    // 발사대 타워
    ctx.strokeStyle = "#7b8494"; ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(x + 8 * s, y - 5 * s); ctx.lineTo(x + 8 * s, y - 42 * s);
    ctx.moveTo(x + 4 * s, y - 5 * s); ctx.lineTo(x + 4 * s, y - 42 * s);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 4 * s, y - 12 * s - i * 8 * s);
      ctx.lineTo(x + 8 * s, y - 16 * s - i * 8 * s);
      ctx.stroke();
    }
    // 로켓
    const rx = x - 2 * s, ry = y - 6 * s - lift * s;
    ctx.fillStyle = "#eef1f4";
    ctx.fillRect(rx - 3 * s, ry - 26 * s, 6 * s, 26 * s);
    poly(ctx, [[rx - 3 * s, ry - 26 * s], [rx + 3 * s, ry - 26 * s], [rx, ry - 34 * s]], "#d84b3a");
    poly(ctx, [[rx - 3 * s, ry - 6 * s], [rx - 6.4 * s, ry], [rx - 3 * s, ry]], "#c2c8d0");
    poly(ctx, [[rx + 3 * s, ry - 6 * s], [rx + 6.4 * s, ry], [rx + 3 * s, ry]], "#aab2bc");
    ctx.fillStyle = "#8d99a8";
    ctx.fillRect(rx - 3 * s, ry - 18 * s, 6 * s, 1.6 * s);
    if (launching) {
      const fl = 10 + Math.random() * 8;
      glow(ctx, rx, ry + 2 * s, 22 * s, "#ffb347", 0.75);
      poly(ctx, [[rx - 2.2 * s, ry], [rx + 2.2 * s, ry], [rx + 1.2 * s, ry + fl * s], [rx - 1.2 * s, ry + fl * s]], "#ffd27a");
      poly(ctx, [[rx - 1.2 * s, ry], [rx + 1.2 * s, ry], [rx, ry + fl * 0.7 * s]], "#fff3c4");
      smoke(ctx, rx, ry + 4 * s, t * 1.6, 0.4, s * 1.5, "200,205,215", 1.4);
    } else {
      glow(ctx, rx, ry, 12 * s, "#7fd4ff", 0.25);
    }
  };

  /* ---------------- 달 기지 돔 ---------------- */
  ART.lunarDome = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 2, 22 * s, 6 * s, "rgba(0,0,0,.45)");
    // 기단
    block(ctx, x, y, 34 * s, 4 * s, 1.2, "#8d939c");
    for (const [dx, r] of [[-9, 9], [8, 11]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y - 4 * s, r * s, r * 0.68 * s, 0, Math.PI, 0);
      ctx.closePath();
      const g = ctx.createRadialGradient(x + dx * s - 3 * s, y - 4 * s - r * 0.6 * s, 1, x + dx * s, y - 4 * s, r * s);
      g.addColorStop(0, "rgba(230,240,255,.95)");
      g.addColorStop(1, "rgba(150,165,190,.7)");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(200,220,255,.5)"; ctx.lineWidth = 0.9; ctx.stroke();
      // 창
      for (let i = 0; i < 3; i++) {
        const a = Math.PI + (i + 1) / 4 * Math.PI;
        ctx.fillStyle = "rgba(255,220,150," + (0.5 + 0.3 * Math.abs(Math.sin(t / 1200 + i))).toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(x + dx * s + Math.cos(a) * r * 0.55 * s, y - 4 * s + Math.sin(a) * r * 0.4 * s, 1.3 * s, 0, 7);
        ctx.fill();
      }
    }
    // 연결 통로
    ctx.fillStyle = "#9aa0aa";
    ctx.fillRect(x - 5 * s, y - 8 * s, 12 * s, 4 * s);
    // 안테나
    ctx.strokeStyle = "#c8d0dc"; ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 12 * s); ctx.lineTo(x + 8 * s, y - 24 * s); ctx.stroke();
    const blink = Math.sin(t / 600) > 0;
    if (blink) glow(ctx, x + 8 * s, y - 24 * s, 6 * s, "#ff6a5a", 0.8);
  };

  /* ---------------- 성간 스타포트 ---------------- */
  ART.starport = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 3, 34 * s, 9 * s, "rgba(0,0,0,.5)");
    // 착륙 플랫폼 (링)
    ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 30 * s, 10 * s, 0, 0, 7);
    ctx.fillStyle = "#2b3450"; ctx.fill();
    ctx.strokeStyle = rgba(pal.accent, 0.75); ctx.lineWidth = 1.6 * s; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 20 * s, 6.6 * s, 0, 0, 7);
    ctx.strokeStyle = "rgba(150,200,255,.45)"; ctx.stroke();
    // 중앙 타워
    block(ctx, x, y - 8 * s, 10 * s, 26 * s, 1.1, "#3f4a68");
    glow(ctx, x, y - 34 * s, 16 * s, pal.accent, 0.5 + 0.2 * Math.sin(t / 800));
    // 정박 우주선
    for (let i = 0; i < 2; i++) {
      const ang = t / 2600 + i * Math.PI;
      const px = x + Math.cos(ang) * 22 * s, py = y - 12 * s + Math.sin(ang) * 7 * s;
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = "#cfd8ea";
      poly(ctx, [[-6 * s, 0], [6 * s, 0], [0, -4 * s]]);
      ctx.fillStyle = "#8fa3c4";
      poly(ctx, [[-6 * s, 0], [6 * s, 0], [0, 2.4 * s]]);
      glow(ctx, 0, 1 * s, 6 * s, "#7fd4ff", 0.6);
      ctx.restore();
    }
  };

  /* ---------------- 들판 ---------------- */
  ART.field = function (ctx, x, y, s, t, pal, p) {
    ctx.save();
    for (let i = -4; i <= 4; i++) {
      const yy = y - 6 * s + i * 2.2 * s;
      const sway = Math.sin(t / 1400 + i) * 1.2 * s;
      ctx.strokeStyle = i % 2 ? "rgba(214,178,80,.9)" : "rgba(190,152,62,.85)";
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(x - 16 * s + Math.abs(i) * 2 * s, yy);
      ctx.quadraticCurveTo(x + sway, yy - 1.4 * s, x + 16 * s - Math.abs(i) * 2 * s, yy);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------------- 시장 천막 ---------------- */
  ART.market = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 1, 12 * s, 4 * s, "rgba(20,26,18,.18)");
    ctx.fillStyle = "#8a6a45";
    ctx.fillRect(x - 9 * s, y - 10 * s, 18 * s, 10 * s);
    for (let i = 0; i < 5; i++) {
      poly(ctx, [[x - 11 * s + i * 4.4 * s, y - 10 * s], [x - 11 * s + (i + 1) * 4.4 * s, y - 10 * s], [x - 9 * s + (i + 1) * 4.4 * s, y - 15 * s], [x - 9 * s + i * 4.4 * s, y - 15 * s]], i % 2 ? "#e8ded0" : "#c25b48");
    }
    // 상품
    ctx.fillStyle = "#d8a13f";
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 5 * s + i * 4.5 * s, y - 3.4 * s, 1.3 * s, 0, 7); ctx.fill(); }
  };

  /* ---------------- 오벨리스크 ---------------- */
  ART.obelisk = function (ctx, x, y, s, t, pal, p) {
    ellipse(ctx, x, y + 1, 9 * s, 3 * s, "rgba(20,26,18,.2)");
    block(ctx, x, y, 12 * s, 4 * s, 1.1, "#c9c2a8");
    poly(ctx, [[x - 2.6 * s, y - 4 * s], [x + 2.6 * s, y - 4 * s], [x + 1.6 * s, y - 30 * s], [x - 1.6 * s, y - 30 * s]], "#ded7bd");
    poly(ctx, [[x + 0.4 * s, y - 4 * s], [x + 2.6 * s, y - 4 * s], [x + 1.6 * s, y - 30 * s]], "#b8b096");
    poly(ctx, [[x - 1.6 * s, y - 30 * s], [x + 1.6 * s, y - 30 * s], [x, y - 35 * s]], "#f0e9cf");
  };

  /* =========================================================
     동물 · 탈것
     ========================================================= */
  function quadruped(ctx, x, y, s, t, phase, colors, opts) {
    opts = opts || {};
    const walking = opts.walk !== false;
    const dir = opts.dir || 1;
    const sp = opts.speed || 1;
    const leg = walking ? Math.sin(t / 160 * sp + phase) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // 그림자
    ctx.fillStyle = "rgba(20,30,20,.18)";
    ellipse(ctx, 0, 0.5, 7 * s, 2.2 * s);
    const [bodyC, darkC] = colors;
    // 다리
    ctx.strokeStyle = darkC; ctx.lineWidth = 1.3 * s;
    for (const [lx, ph] of [[-4.2, 0], [-3.2, 1.6], [3.4, 3.1], [4.4, 1.2]]) {
      const a = Math.sin(leg + ph) * 0.5;
      ctx.beginPath();
      ctx.moveTo(lx * s, -5.4 * s);
      ctx.lineTo(lx * s + Math.sin(a) * 2.6 * s, -0.4 * s);
      ctx.stroke();
    }
    // 몸통
    ctx.fillStyle = bodyC;
    ctx.beginPath(); ctx.ellipse(0, -6.4 * s, 6 * s, 3.4 * s, 0, 0, 7); ctx.fill();
    // 목/머리
    ctx.beginPath();
    ctx.moveTo(4 * s, -7.6 * s);
    ctx.lineTo(8.4 * s, -11.4 * s);
    ctx.lineTo(10.2 * s, -10.2 * s);
    ctx.lineTo(6 * s, -5.4 * s);
    ctx.closePath();
    ctx.fillStyle = bodyC; ctx.fill();
    ellipse(ctx, 9.6 * s, -11.6 * s, 2.3 * s, 1.7 * s, bodyC);
    ctx.fillStyle = darkC;
    ellipse(ctx, 11 * s, -11.4 * s, 0.9 * s, 0.7 * s);
    if (opts.antler) {
      ctx.strokeStyle = "#6b5334"; ctx.lineWidth = 0.9 * s;
      for (const dx of [-1.2, 1.4]) {
        ctx.beginPath();
        ctx.moveTo(9 * s + dx * s, -13 * s);
        ctx.lineTo(9.6 * s + dx * 1.6 * s, -17 * s);
        ctx.moveTo(9.4 * s + dx * 1.2 * s, -15 * s);
        ctx.lineTo(11 * s + dx * 1.6 * s, -15.6 * s);
        ctx.stroke();
      }
    }
    if (opts.tail) {
      ctx.strokeStyle = bodyC; ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-6 * s, -6.8 * s);
      ctx.lineTo(-8.4 * s, -8.4 * s - Math.sin(t / 260 + phase) * 1.2 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  ART.deer = function (ctx, x, y, s, t, pal, p) {
    quadruped(ctx, x, y, s * 0.95, t, (p && p.phase) || 0, ["#a97c4e", "#7a5530"], { antler: true, tail: true, dir: (p && p.dir) || 1, speed: 0.8 });
  };
  ART.wolf = function (ctx, x, y, s, t, pal, p) {
    quadruped(ctx, x, y, s * 0.8, t, (p && p.phase) || 0, ["#6f6a63", "#4a463f"], { tail: true, dir: (p && p.dir) || 1, speed: 1.5 });
  };
  ART.horse = function (ctx, x, y, s, t, pal, p) {
    quadruped(ctx, x, y, s * 1.05, t, (p && p.phase) || 0, ["#7a5636", "#4e3520"], { tail: true, dir: (p && p.dir) || 1, speed: 1.2 });
  };
  ART.cow = function (ctx, x, y, s, t, pal, p) {
    quadruped(ctx, x, y, s * 0.95, t, (p && p.phase) || 0, ["#e6dfd2", "#4a4038"], { dir: (p && p.dir) || 1, speed: 0.6 });
  };
  ART.sheep = function (ctx, x, y, s, t, pal, p) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(20,30,20,.16)";
    ellipse(ctx, 0, 0.5, 5 * s, 1.8 * s);
    ctx.fillStyle = "#efeae0";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(-2.6 * s + i * 1.8 * s, -4.4 * s - (i % 2) * 0.8 * s, 2.4 * s, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#3c3a34";
    ellipse(ctx, 4.4 * s, -5.2 * s, 1.6 * s, 1.3 * s);
    ctx.restore();
  };

  ART.birds = function (ctx, x, y, s, t, pal, p) {
    const n = (p && p.n) || 5;
    const spread = (p && p.spread) || 26;
    for (let i = 0; i < n; i++) {
      const ph = t / 2400 + i * 0.9 + ((p && p.phase) || 0);
      const bx = x + Math.cos(ph * 0.7) * spread * s + (i - n / 2) * 4 * s;
      const by = y - 30 * s + Math.sin(ph * 0.9) * 8 * s + (i % 2) * 5 * s;
      const flap = Math.sin(t / 160 + i * 1.2);
      ctx.strokeStyle = "rgba(48,52,58,.85)";
      ctx.lineWidth = 1.3 * s;
      ctx.beginPath();
      ctx.moveTo(bx - 3.4 * s, by + flap * 1.6 * s);
      ctx.quadraticCurveTo(bx, by - 2.2 * s, bx + 3.4 * s, by + flap * 1.6 * s);
      ctx.stroke();
    }
  };

  ART.gulls = function (ctx, x, y, s, t, pal, p) {
    const n = (p && p.n) || 4;
    for (let i = 0; i < n; i++) {
      const ph = t / 1900 + i * 1.3;
      const bx = x + Math.sin(ph) * 30 * s;
      const by = y - 34 * s + Math.cos(ph * 0.8) * 10 * s;
      const flap = Math.sin(t / 130 + i);
      ctx.strokeStyle = "rgba(250,250,248,.9)";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(bx - 4 * s, by);
      ctx.quadraticCurveTo(bx - 1.6 * s, by - 2.6 * s - flap * 1.4 * s, bx, by);
      ctx.quadraticCurveTo(bx + 1.6 * s, by - 2.6 * s - flap * 1.4 * s, bx + 4 * s, by);
      ctx.stroke();
    }
  };

  ART.train = function (ctx, x, y, s, t, pal, p) {
    // 화면을 가로질러 달리는 증기기관차
    const period = 15000;
    const ph = ((t + ((p && p.delay) || 0) * 1000) % period) / period;
    const startX = -70 * s, endX = 700 * s;
    const px = startX + ph * (endX - startX);
    const py = y + Math.sin(ph * 6) * 0.6 * s;
    const dir = 1;
    ctx.save();
    ctx.translate(px, py);
    // 연기
    for (let i = 0; i < 5; i++) {
      const sp = ((t / 900) + i * 0.2) % 1;
      ctx.fillStyle = "rgba(220,218,210," + (0.5 * (1 - sp)).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(-20 * s - sp * 12 * s, -14 * s - sp * 20 * s, (2 + sp * 6) * s, 0, 7);
      ctx.fill();
    }
    // 차체
    ctx.fillStyle = "#3f4a4e";
    ctx.fillRect(-26 * s, -10 * s, 34 * s, 8 * s);
    ctx.fillStyle = "#20262a";
    ctx.fillRect(-8 * s, -22 * s, 14 * s, 13 * s);
    ctx.fillStyle = "#6b6f70";
    ctx.fillRect(-8 * s, -24 * s, 3 * s, 4 * s);
    // 보일러
    ctx.fillStyle = "#5a4a44";
    ctx.fillRect(-26 * s, -13 * s, 12 * s, 3 * s);
    // 바퀴
    for (const wx of [-22, -14, 2]) {
      ctx.beginPath();
      ctx.arc(wx * s, -1 * s, 3 * s, 0, 7);
      ctx.fillStyle = "#22282c"; ctx.fill();
      ctx.strokeStyle = "#8a8f90"; ctx.lineWidth = 0.8 * s;
      const a = t / 120;
      ctx.beginPath();
      ctx.moveTo(wx * s + Math.cos(a) * 2 * s, -1 * s + Math.sin(a) * 2 * s);
      ctx.lineTo(wx * s - Math.cos(a) * 2 * s, -1 * s - Math.sin(a) * 2 * s);
      ctx.stroke();
    }
    // 열차 칸
    ctx.fillStyle = "#6b5a44";
    ctx.fillRect(10 * s, -12 * s, 22 * s, 9 * s);
    ctx.fillStyle = "rgba(255,214,140,.7)";
    for (let i = 0; i < 4; i++) ctx.fillRect(12 * s + i * 5 * s, -10 * s, 3 * s, 3 * s);
    ctx.restore();
    // 레일
    ctx.strokeStyle = "rgba(70,66,60,.55)"; ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-40 * s, y + 1.5 * s);
    ctx.lineTo(700 * s, y + 1.5 * s);
    ctx.stroke();
  };

  ART.car = function (ctx, x, y, s, t, pal, p) {
    const period = 9000;
    const ph = ((t + ((p && p.delay) || 0) * 1000) % period) / period;
    const px = -50 * s + ph * 760 * s;
    const py = y;
    const col = (p && p.tint) || ["#c34a3a", "#3a6ec3", "#d8c05a", "#e8e6e0"][Math.floor(((p && p.delay) || 0) * 3) % 4];
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = "rgba(20,26,30,.22)";
    ellipse(ctx, 0, 0.6, 9 * s, 2 * s);
    ctx.fillStyle = col;
    poly(ctx, [[-8 * s, -2.4 * s], [8 * s, -2.4 * s], [6.6 * s, -6.4 * s], [-6.4 * s, -6.4 * s]]);
    ctx.fillStyle = "rgba(180,220,240,.75)";
    poly(ctx, [[-4.6 * s, -4 * s], [4.6 * s, -4 * s], [4 * s, -6 * s], [-4 * s, -6 * s]]);
    for (const wx of [-5, 5]) {
      ctx.beginPath(); ctx.arc(wx * s, -1.4 * s, 1.7 * s, 0, 7);
      ctx.fillStyle = "#22262a"; ctx.fill();
    }
    // 헤드라이트
    ctx.fillStyle = "rgba(255,240,190,.9)";
    ctx.fillRect(7.4 * s, -4.4 * s, 1.4 * s, 1.2 * s);
    ctx.restore();
  };

  ART.plane = function (ctx, x, y, s, t, pal, p) {
    const period = 22000;
    const ph = ((t + ((p && p.delay) || 0) * 3000) % period) / period;
    const px = -80 * s + ph * 820 * s;
    const py = y - Math.sin(ph * Math.PI) * 14 * s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.06);
    // 항적
    const tg = ctx.createLinearGradient(-40 * s, 0, 0, 0);
    tg.addColorStop(0, "rgba(255,255,255,0)");
    tg.addColorStop(1, "rgba(255,255,255,.35)");
    ctx.fillStyle = tg;
    ctx.fillRect(-40 * s, -0.8 * s, 40 * s, 1.6 * s);
    // 동체
    ctx.fillStyle = "#eef2f5";
    poly(ctx, [[-9 * s, 0], [9 * s, -1 * s], [10 * s, 0.8 * s], [-8 * s, 2 * s]]);
    // 날개
    ctx.fillStyle = "#cfd8de";
    poly(ctx, [[-1 * s, 0], [4 * s, -6 * s], [7 * s, -5.6 * s], [3 * s, 0.4 * s]]);
    poly(ctx, [[-1 * s, 1 * s], [3 * s, 5 * s], [6 * s, 4.6 * s], [3 * s, 1.6 * s]]);
    // 꼬리
    ctx.fillStyle = "#d84b3a";
    poly(ctx, [[-9 * s, 0], [-13 * s, -3 * s], [-12 * s, -2.4 * s], [-8 * s, 1 * s]]);
    ctx.restore();
  };

  ART.zeppelin = function (ctx, x, y, s, t, pal, p) {
    const px = x + Math.sin(t / 5000) * 24 * s;
    ctx.save();
    ctx.translate(px, y);
    ctx.fillStyle = "rgba(230,235,240,.9)";
    ctx.beginPath(); ctx.ellipse(0, 0, 24 * s, 7 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(190,200,210,.9)";
    ctx.beginPath(); ctx.ellipse(0, 2 * s, 24 * s, 5 * s, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#5a6470";
    ctx.fillRect(-6 * s, 6 * s, 12 * s, 3 * s);
    ctx.fillStyle = "#3a424a";
    poly(ctx, [[-24 * s, 0], [-31 * s, -5 * s], [-30 * s, 5 * s]]);
    // 프로펠러
    const a = t / 90;
    ctx.strokeStyle = "rgba(120,130,140,.7)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-24 * s - Math.cos(a) * 3 * s, Math.sin(a) * 3 * s);
    ctx.lineTo(-24 * s + Math.cos(a) * 3 * s, -Math.sin(a) * 3 * s);
    ctx.stroke();
    ctx.restore();
  };

  ART.drone = function (ctx, x, y, s, t, pal, p) {
    const ph = t / 1400 + ((p && p.phase) || 0);
    const bx = x + Math.sin(ph) * 18 * s;
    const by = y - 34 * s + Math.cos(ph * 1.3) * 8 * s;
    ctx.save();
    ctx.translate(bx, by);
    ctx.strokeStyle = "#586a78"; ctx.lineWidth = 1.2 * s;
    for (const [dx, dy] of [[-5, -2], [5, -2], [-5, 2], [5, 2]]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * s, dy * s); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(dx * s, dy * s, 3.4 * s, 0.9 * s, 0, 0, 7);
      ctx.strokeStyle = "rgba(120,140,155,.6)"; ctx.stroke();
      ctx.strokeStyle = "#586a78";
    }
    ctx.fillStyle = "#3d4a56";
    ctx.beginPath(); ctx.ellipse(0, 0, 3 * s, 1.8 * s, 0, 0, 7); ctx.fill();
    if (Math.sin(t / 400) > 0) glow(ctx, 0, 1.4 * s, 5 * s, "#6ad8ff", 0.7);
    ctx.restore();
  };

  ART.rover = function (ctx, x, y, s, t, pal, p) {
    const ph = (t / 6000 + ((p && p.phase) || 0)) % 1;
    const bx = x + Math.sin(ph * Math.PI * 2) * 16 * s;
    const dir = Math.cos(ph * Math.PI * 2) > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(bx, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ellipse(ctx, 0, 0.5, 8 * s, 2 * s);
    // 바퀴
    ctx.fillStyle = "#3d4450";
    for (const wx of [-5, 0, 5]) {
      ctx.beginPath(); ctx.arc(wx * s, -1.6 * s, 2.2 * s, 0, 7); ctx.fill();
    }
    // 차체
    ctx.fillStyle = "#d8dde6";
    ctx.fillRect(-7 * s, -7 * s, 14 * s, 5 * s);
    // 태양판
    ctx.fillStyle = "#2a4a80";
    ctx.fillRect(-10 * s, -9 * s, 20 * s, 2.4 * s);
    // 안테나
    ctx.strokeStyle = "#aab4c4"; ctx.lineWidth = 0.9 * s;
    ctx.beginPath(); ctx.moveTo(5 * s, -7 * s); ctx.lineTo(7 * s, -13 * s); ctx.stroke();
    glow(ctx, 7 * s, -13 * s, 4 * s, "#8fb8ff", 0.8);
    ctx.restore();
  };

  ART.satellite = function (ctx, x, y, s, t, pal, p) {
    const ph = t / 6000 + ((p && p.phase) || 0);
    const bx = x + Math.cos(ph) * 40 * s;
    const by = y - 40 * s + Math.sin(ph) * 12 * s;
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = "#c8d2e0";
    ctx.fillRect(-4 * s, -2 * s, 8 * s, 4 * s);
    ctx.fillStyle = "#3a5a9a";
    ctx.fillRect(-12 * s, -1.4 * s, 8 * s, 2.8 * s);
    ctx.fillRect(4 * s, -1.4 * s, 8 * s, 2.8 * s);
    glow(ctx, 0, 0, 5 * s, "#8fb8ff", 0.6);
    ctx.restore();
  };

  ART.spaceship = function (ctx, x, y, s, t, pal, p) {
    const period = 9000;
    const ph = ((t + ((p && p.delay) || 0) * 2000) % period) / period;
    const px = -60 * s + ph * 780 * s;
    const py = y - 60 * s - Math.sin(ph * Math.PI) * 20 * s;
    ctx.save();
    ctx.translate(px, py);
    if (ph > 0.5) ctx.scale(-1, 1);
    glow(ctx, -10 * s, 0, 16 * s, pal.accent, 0.5);
    ctx.fillStyle = "#dfe6f2";
    poly(ctx, [[-10 * s, 0], [8 * s, -3.4 * s], [12 * s, 0], [8 * s, 3.4 * s]]);
    ctx.fillStyle = "#8fa3c4";
    poly(ctx, [[-2 * s, -2.4 * s], [2 * s, -8 * s], [5 * s, -2.6 * s]]);
    ctx.fillStyle = "rgba(160,220,255,.8)";
    ctx.beginPath(); ctx.ellipse(2 * s, 0, 2.4 * s, 1.6 * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  };

  ART.walker = function (ctx, x, y, s, t, pal, p) {
    const ph = t / 5000 + ((p && p.phase) || 0);
    const bx = x + Math.sin(ph) * 14 * s;
    const leg = Math.sin(t / 240);
    ctx.save();
    ctx.translate(bx, y);
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ellipse(ctx, 0, 0.4, 4 * s, 1.4 * s);
    ctx.strokeStyle = "#cdd6e4"; ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(-1.4 * s, -8 * s); ctx.lineTo(-1.4 * s + leg * 1.6 * s, 0);
    ctx.moveTo(1.4 * s, -8 * s); ctx.lineTo(1.4 * s - leg * 1.6 * s, 0);
    ctx.stroke();
    ctx.fillStyle = "#e6ecf6";
    ctx.beginPath(); ctx.arc(0, -10 * s, 2.2 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(150,215,255,.9)";
    ctx.beginPath(); ctx.arc(0.6 * s, -10.3 * s, 0.9 * s, 0, 7); ctx.fill();
    ctx.restore();
  };

  /* ---------------- 텐트/캠프 소품 ---------------- */
  ART.fireSmoke = function (ctx, x, y, s, t, pal, p) {
    smoke(ctx, x, y, t, (p && p.seed) || 0.2, s, "200,204,200", 0.8);
  };
  ART.flagpole = function (ctx, x, y, s, t, pal, p) {
    flag(ctx, x, y, s, t, (p && p.color) || "#c0442f", (p && p.phase) || 0);
  };
  ART.wheat = function (ctx, x, y, s, t, pal, p) {
    for (let i = -5; i <= 5; i++) {
      const sway = Math.sin(t / 1200 + i * 0.7) * 2 * s;
      ctx.strokeStyle = "rgba(206,170,70,.9)"; ctx.lineWidth = 1.3 * s;
      ctx.beginPath();
      ctx.moveTo(x + i * 2.8 * s, y);
      ctx.lineTo(x + i * 2.8 * s + sway, y - 7 * s - (i % 2) * 2 * s);
      ctx.stroke();
    }
  };
  ART.bridge = function (ctx, x, y, s, t, pal, p) {
    ctx.save();
    ctx.fillStyle = "rgba(120,96,68,.95)";
    ctx.fillRect(x - 20 * s, y - 5 * s, 40 * s, 5 * s);
    ctx.fillStyle = "rgba(90,70,48,.95)";
    ctx.fillRect(x - 20 * s, y - 1 * s, 40 * s, 2 * s);
    ctx.strokeStyle = "rgba(140,115,80,.9)"; ctx.lineWidth = 1 * s;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * 8 * s, y - 5 * s); ctx.lineTo(x + i * 8 * s, y); ctx.stroke();
    }
    ctx.restore();
  };
  ART.ruin = function (ctx, x, y, s, t, pal, p) {
    ctx.save();
    ctx.fillStyle = "#b8b09a";
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y);
    ctx.lineTo(x - 8 * s, y - 10 * s);
    ctx.lineTo(x - 5 * s, y - 12 * s);
    ctx.lineTo(x - 2 * s, y - 9 * s);
    ctx.lineTo(x - 2 * s, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#a39b86";
    ctx.fillRect(x + 1 * s, y - 6 * s, 3 * s, 6 * s);
    ctx.restore();
  };
})();
