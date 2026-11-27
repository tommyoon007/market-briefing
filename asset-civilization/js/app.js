/* =========================================================================
   자산 문명 — app.js
   계산 · UI · 상태 저장 · 장면 렌더 루프
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- 오류 수집(검증용) ---------- */
  window.__errors = [];
  window.addEventListener("error", function (e) {
    window.__errors.push(String((e && e.message) || e));
  });
  window.addEventListener("unhandledrejection", function (e) {
    window.__errors.push("unhandledrejection: " + String((e && e.reason) || e));
  });
  const _err = console.error.bind(console);
  console.error = function () {
    window.__errors.push(Array.prototype.map.call(arguments, String).join(" "));
    _err.apply(null, arguments);
  };

  const CIV = window.CIV;
  const STATE_KEY = "assetciv.v1";

  /* ---------- 18단계 ---------- */
  const STAGES = [
    { n: 1, ko: "원시 벌판", en: "Campfire Plains", d: "모닥불 하나, 사냥꾼 몇 명. 자산의 씨앗이 놓인 자리." },
    { n: 2, ko: "움막·수렵 캠프", en: "Primitive Huts", d: "가죽 천막과 공동 화덕. 식량을 쌓기 시작한다." },
    { n: 3, ko: "초가집 마을", en: "Thatched Village", d: "짚으로 엮은 지붕, 밀밭, 첫 번째 마을." },
    { n: 4, ko: "목조 촌락·풍차", en: "Timber Hamlet", d: "풍차가 돌고 시장이 열린다. 잉여가 생긴다." },
    { n: 5, ko: "청동기 토성 요새", en: "Bronze Fortress", d: "목책과 망루. 자산을 지키는 힘이 붙는다." },
    { n: 6, ko: "고대 석조 신전", en: "Ancient Temple", d: "돌기둥과 오벨리스크. 시간을 견디는 구조." },
    { n: 7, ko: "로마식 수로·원형극장", en: "Classical Citadel", d: "수로가 물을 나르고 극장에 사람이 모인다." },
    { n: 8, ko: "중세 성채·성벽", en: "Medieval Castle", d: "성벽 위 깃발. 왕관이 보이기 시작한다." },
    { n: 9, ko: "르네상스 대성당·광장", en: "Renaissance Cathedral", d: "첨탑과 장미창, 그리고 사람들로 찬 광장." },
    { n: 10, ko: "대항해 범선 항구", en: "Age of Sail Harbor", d: "돛을 올린 배가 먼 곳의 수익을 실어온다." },
    { n: 11, ko: "산업혁명 증기 도시", en: "Industrial Steam City", d: "굴뚝 연기와 증기기관차. 자산이 기계로 돈다." },
    { n: 12, ko: "근대 저택·철도역", en: "Victorian Rail Manor", d: "역이 들어서고 저택에 불이 켜진다." },
    { n: 13, ko: "전기 마천루·네온", en: "Art Deco Metropolis", d: "밤에도 꺼지지 않는 도시. 네온이 번진다." },
    { n: 14, ko: "현대 글래스 타워", en: "Modern Skyline", d: "유리로 된 하늘. 자본이 풍경이 된다." },
    { n: 15, ko: "첨단 스마트 에코시티", en: "Cyber Eco-City", d: "드론과 수직 정원이 공존하는 도시." },
    { n: 16, ko: "궤도 엘리베이터", en: "Orbital Elevator", d: "지상에서 궤도까지. 자산이 중력을 벗어난다." },
    { n: 17, ko: "달·화성 테라포밍", en: "Lunar & Mars Colony", d: "다른 행성의 땅에 돔을 세운다." },
    { n: 18, ko: "성간 우주정거장", en: "Interstellar Starport", d: "항성 사이를 오가는 정거장. 문명의 완성." },
  ];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII"];

  const BENCH = {
    DJI: { name: "다우지수", icon: "🏭", sym: "DJI" },
    SPX: { name: "S&P 500", icon: "📈", sym: "SPX" },
    NDX: { name: "나스닥 100", icon: "🚀", sym: "NDX" },
    TGT: { name: "목표 연이율", icon: "🎯", sym: null },
  };

  /* ---------- 기본값 ---------- */
  const DEFAULTS = {
    deposits: [
      { date: "2021-01-01", amount: 100000000 },
      { date: "2023-06-01", amount: 180000000 },
    ],
    currentValue: 530000000,
    targetRate: 0.15,
    goalMode: "amount",
    goalAmount: 3000000000,
    goalMult: 10,
    benchmark: "SPX",
    ccy: "KRW",
    tmMode: "target",
    tmYears: 0,
    appReturn: 74.03,
  };

  let state = loadState();
  let DATA = null;
  let dataNote = "";

  /* ---------- 데이터 폴백(번들 실패 대비) ---------- */
  const FALLBACK = {
    last_trading_day: "2026-11-27",
    series: {
      DJI: { dates: ["2021-01-01", "2023-06-01", "2026-11-27"], close: [30606.48, 33061.57, 50774.94] },
      SPX: { dates: ["2021-01-01", "2023-06-01", "2026-11-27"], close: [3756.07, 4221.02, 7297.49] },
      NDX: { dates: ["2021-01-01", "2023-06-01", "2026-11-27"], close: [12888.28, 14441.51, 26726.39] },
      USDKRW: { dates: ["2021-01-01", "2023-06-01", "2026-11-27"], close: [1084.65, 1312.85, 1333.58] },
    },
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const s = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), s, {
        deposits: Array.isArray(s.deposits) && s.deposits.length ? s.deposits : DEFAULTS.deposits,
      });
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }
  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- 숫자·통화 포맷 ---------- */
  function nf(n) {
    const r = Math.round(n);
    return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function wonText(v) {
    if (!isFinite(v)) return "—";
    const neg = v < 0;
    v = Math.abs(v);
    const eok = Math.floor(v / 1e8);
    const man = Math.round((v % 1e8) / 1e4);
    let s;
    if (eok > 0 && man > 0) s = eok + "억 " + nf(man) + "만원";
    else if (eok > 0) s = eok + "억원";
    else s = nf(Math.round(v / 1e4)) + "만원";
    return (neg ? "-" : "") + s;
  }
  function usdText(v) {
    if (!isFinite(v)) return "—";
    return "$" + nf(Math.round(v));
  }
  function money(vKrW) {
    return state.ccy === "USD" ? usdText(vKrW / derived.fxNow) : wonText(vKrW);
  }
  function pct(v, digits) {
    if (!isFinite(v)) return "—";
    const d = digits === undefined ? 1 : digits;
    return (v >= 0 ? "+" : "") + (v * 100).toFixed(d) + "%";
  }

  /* ---------- 가격 조회 ---------- */
  function seriesOf(sym) {
    const s = DATA.series[sym];
    return s ? s : FALLBACK.series[sym];
  }
  function priceAt(sym, dateStr) {
    const s = seriesOf(sym);
    const dates = s.dates, close = s.close;
    if (!dates.length) return NaN;
    if (dateStr <= dates[0]) return close[0];
    if (dateStr >= dates[dates.length - 1]) return close[close.length - 1];
    let lo = 0, hi = dates.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (dates[mid] <= dateStr) lo = mid + 1;
      else hi = mid - 1;
    }
    // 선형 보간 (휴장일 보정)
    const i0 = Math.max(0, hi), i1 = Math.min(dates.length - 1, hi + 1);
    if (i0 === i1) return close[i0];
    const d0 = Date.parse(dates[i0]), d1 = Date.parse(dates[i1]);
    const t = (Date.parse(dateStr) - d0) / (d1 - d0 || 1);
    return close[i0] + (close[i1] - close[i0]) * Math.max(0, Math.min(1, t));
  }
  const lastPrice = (sym) => { const s = seriesOf(sym); return s.close[s.close.length - 1]; };

  function yearsBetween(a, b) {
    return (Date.parse(b) - Date.parse(a)) / (365.2425 * 864e5);
  }

  /* ---------- 계산 ---------- */
  function goalOf(deposits, st) {
    if (st.goalMode === "mult") {
      const p = deposits.reduce((s, d) => s + d.amount, 0);
      return Math.max(p * Math.max(1, st.goalMult), p + 1);
    }
    return Math.max(st.goalAmount, 1e7);
  }
  function thresholdsFor(deposits, st) {
    const base = deposits.length ? Math.min.apply(null, deposits.map((d) => d.amount)) : 1e8;
    const goal = goalOf(deposits, st);
    const arr = [];
    for (let i = 0; i < 18; i++) arr.push(base * Math.pow(goal / base, i / 17));
    return arr;
  }
  function stageOf(v, th) {
    let s = 1;
    for (let i = 0; i < th.length; i++) if (v >= th[i] * 0.999) s = i + 1;
    return s;
  }
  function xirr(flows) {
    // flows: [{t: Date, v: number}] (부호 혼합)
    let lo = -0.9999, hi = 10;
    const npv = (r) => flows.reduce((s, f) => s + f.v / Math.pow(1 + r, yearsBetween(flows[0].when, f.when)), 0);
    let fLo = npv(lo), fHi = npv(hi);
    if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return NaN;
    for (let i = 0; i < 120; i++) {
      const mid = (lo + hi) / 2;
      const fm = npv(mid);
      if (Math.abs(fm) < 1e-6) return mid;
      if (fLo * fm <= 0) { hi = mid; fHi = fm; } else { lo = mid; fLo = fm; }
    }
    return (lo + hi) / 2;
  }

  let derived = {};

  function compute() {
    const today = DATA.last_trading_day;
    const fxNow = lastPrice("USDKRW");
    const principal = state.deposits.reduce((s, d) => s + d.amount, 0);
    const th = thresholdsFor(state.deposits, state);

    const myFlow = state.deposits.map((d) => ({ when: d.date, v: -d.amount }))
      .concat([{ when: today, v: state.currentValue }]);
    const myXirr = xirr(myFlow);

    const bench = {};
    for (const key of ["DJI", "SPX", "NDX"]) {
      let krw = 0, usd = 0;
      for (const d of state.deposits) {
        const f0 = priceAt("USDKRW", d.date);
        const p0 = priceAt(key, d.date);
        const sh = (d.amount / f0) / p0;
        krw += sh * lastPrice(key) * fxNow;
        usd += sh * lastPrice(key);
      }
      const flow = state.deposits.map((dd) => ({ when: dd.date, v: -dd.amount }))
        .concat([{ when: today, v: krw }]);
      bench[key] = {
        krw, usd,
        ret: principal > 0 ? krw / principal - 1 : 0,
        xirr: xirr(flow),
        price0: priceAt(key, state.deposits[0].date),
        price0Date: state.deposits[0].date,
        priceNow: lastPrice(key),
      };
    }
    let tgt = 0;
    for (const d of state.deposits) tgt += d.amount * Math.pow(1 + state.targetRate, yearsBetween(d.date, today));
    bench.TGT = {
      krw: tgt, usd: tgt / fxNow,
      ret: principal > 0 ? tgt / principal - 1 : 0,
      xirr: state.targetRate,
      priceNow: 0, price0: 0,
    };

    derived = {
      today, fxNow, principal, th,
      myStage: stageOf(state.currentValue, th),
      myXirr,
      myRet: principal > 0 ? state.currentValue / principal - 1 : 0,
      bench,
      goal: goalOf(state.deposits, state),
      usdNow: state.currentValue / fxNow,
      lastDay: today,
      fyStart: state.deposits[0] ? priceAt("USDKRW", state.deposits[0].date) : fxNow,
    };
    return derived;
  }

  /* ---------- 장면 ---------- */
  let sceneMine = null, sceneRival = null;

  function stageName(n) { return STAGES[Math.max(0, Math.min(17, n - 1))]; }

  function setSceneStage(scene, st) {
    if (!scene) return;
    if (scene.stage !== st) {
      CIV.hex.setStage(scene, st);
      scene.flash = performance.now();
    }
  }

  /* ---------- 렌더링 ---------- */
  const $ = (id) => document.getElementById(id);

  function renderHero(d) {
    const st = stageName(d.myStage);
    $("myRoman").textContent = ROMAN[d.myStage - 1];
    $("myStageName").textContent = st.ko;
    $("myAmount").textContent = money(state.currentValue);
    const rEl = $("myReturn");
    rEl.textContent = pct(d.myRet);
    rEl.className = "chip " + (d.myRet >= 0 ? "up" : "down");
    $("myPrincipal").textContent = wonText(d.principal);
    $("myCagr").textContent = isFinite(d.myXirr) ? "연 " + (d.myXirr * 100).toFixed(1) + "%" : "연 —";
    $("myFx").textContent = usdText(d.usdNow);

    const lo = d.th[d.myStage - 1];
    const hi = d.myStage < 18 ? d.th[d.myStage] : null;
    let p = hi ? (state.currentValue - lo) / (hi - lo) : 1;
    p = Math.max(0.02, Math.min(1, p));
    $("stageBar").style.width = (p * 100).toFixed(1) + "%";
    $("stageCap").textContent = hi
      ? "다음 단계 " + ROMAN[d.myStage] + " → " + stageName(d.myStage + 1).ko + "까지 " + wonText(Math.max(0, hi - state.currentValue))
      : "최종 단계 " + stageName(18).ko + " · 문명 완성";

    $("factDate").textContent = d.today.replace(/-/g, ".");
    $("factFx").textContent = d.fxNow.toFixed(2);
    $("factGoal").textContent = wonText(d.goal).replace("원", "");
    $("factPct").textContent = ((state.currentValue / d.goal) * 100).toFixed(1) + "%";
  }

  function renderArena(d) {
    const b = BENCH[state.benchmark];
    const years = state.tmYears;
    const myRate = state.tmMode === "target" ? state.targetRate : (isFinite(d.myXirr) ? d.myXirr : state.targetRate);
    const myFuture = state.currentValue * Math.pow(1 + myRate, years);
    const bRate = state.benchmark === "TGT" ? state.targetRate : (isFinite(d.bench[state.benchmark].xirr) ? d.bench[state.benchmark].xirr : 0);
    const bFuture = d.bench[state.benchmark].krw * Math.pow(1 + bRate, years);

    const myStage = stageOf(myFuture, d.th);
    const rvStage = stageOf(bFuture, d.th);

    setSceneStage(sceneMine, myStage);
    setSceneStage(sceneRival, rvStage);

    const mineName = stageName(myStage).ko;
    const rivalName = stageName(rvStage).ko;

    $("capMineName").textContent = mineName;
    $("capMineStage").textContent = myStage + "단계 · " + ROMAN[myStage - 1];
    $("capMineAmt").textContent = money(myFuture);
    $("capRivalName").textContent = rivalName;
    $("capRivalStage").textContent = rvStage + "단계 · " + ROMAN[rvStage - 1];
    $("capRivalAmt").textContent = money(bFuture);
    $("rivalWho").textContent = b.icon + " " + b.name + (years > 0 ? " (미래)" : "");

    const diff = myFuture - bFuture;
    const rel = bFuture > 0 ? diff / bFuture : 0;
    const myBadge = $("myBadge"), rvBadge = $("rivalBadge");
    if (Math.abs(rel) < 0.004) {
      myBadge.textContent = "TIE"; myBadge.className = "badge tie";
      rvBadge.textContent = "TIE"; rvBadge.className = "badge tie";
    } else if (diff > 0) {
      myBadge.textContent = "WINNER"; myBadge.className = "badge win";
      rvBadge.textContent = "CHASING"; rvBadge.className = "badge lose";
    } else {
      myBadge.textContent = "CHASING"; myBadge.className = "badge lose";
      rvBadge.textContent = "WINNER"; rvBadge.className = "badge win";
    }
    const gapStage = myStage - rvStage;
    $("vsGap").textContent = (diff >= 0 ? "+" : "−") + Math.abs(diff / 1e8).toFixed(2) + "억" + (gapStage ? " · " + (gapStage > 0 ? gapStage : gapStage) + "단계" : "");

    $("tmYear").textContent = years === 0 ? "지금" : Math.round(years * 2) / 2 + "년 뒤";
    $("tmMine").textContent = money(myFuture);
    $("tmMineStage").textContent = myStage + "단계";
    $("tmRival").textContent = money(bFuture);
    $("tmRivalStage").textContent = rvStage + "단계";
    $("tmRivalLabel").textContent = b.name + (years > 0 ? " (미래)" : "");
    $("tmNote").textContent = years === 0
      ? "연도 슬라이더를 움직이면 " + (state.tmMode === "target" ? "목표 연이율 " + (state.targetRate * 100).toFixed(1) + "%" : "실현 수익률 " + (myRate * 100).toFixed(1) + "%") + " 기준으로 문명이 자랍니다."
      : "내 문명 연 " + (myRate * 100).toFixed(1) + "% · " + b.name + " 연 " + (bRate * 100).toFixed(1) + "% 가정 · 2026년 → " + (2026 + Math.round(years)) + "년";
  }

  function renderStrip(d) {
    const host = $("strip");
    const rows = [
      { key: "ME", name: "내 자산", icon: "👑", krw: state.currentValue, ret: d.myRet, stage: d.myStage, note: "지금" },
      { key: "DJI", name: "다우지수", icon: "🏭", krw: d.bench.DJI.krw, ret: d.bench.DJI.ret, note: "구성 30종목" },
      { key: "SPX", name: "S&P 500", icon: "📈", krw: d.bench.SPX.krw, ret: d.bench.SPX.ret, note: "미국 대형주" },
      { key: "NDX", name: "나스닥 100", icon: "🚀", krw: d.bench.NDX.krw, ret: d.bench.NDX.ret, note: "기술주 중심" },
      { key: "TGT", name: "목표 연이율", icon: "🎯", krw: d.bench.TGT.krw, ret: d.bench.TGT.ret, note: (state.targetRate * 100).toFixed(0) + "% 복리" },
    ];
    const best = Math.max.apply(null, rows.map((r) => r.krw));
    host.innerHTML = rows.map((r) => {
      const stage = stageOf(r.krw, d.th);
      const on = (r.key === "ME") || (r.key === state.benchmark);
      return '<div class="strip-card ' + (r.key === "ME" ? "now" : "") + (on ? " on" : "") + '" data-b="' + r.key + '">' +
        '<div class="nm"><span>' + r.icon + " " + r.name + '</span><em>' + r.note + '</em></div>' +
        '<div class="val">' + money(r.krw) + '</div>' +
        '<div class="row"><span class="' + (r.ret >= 0 ? "pos" : "neg") + '">' + pct(r.ret) + '</span>' +
        '<span class="stg">' + stage + '단계 ' + stageName(stage).ko + '</span>' +
        (r.krw >= best ? '<span class="lead">👑 LEAD</span>' : '') +
        '</div></div>';
    }).join("");
    Array.prototype.forEach.call(host.querySelectorAll(".strip-card"), (el) => {
      el.addEventListener("click", () => {
        const b = el.getAttribute("data-b");
        if (b && b !== "ME") { setBenchmark(b); }
      });
    });
  }

  function setBenchmark(key) {
    state.benchmark = key;
    saveState();
    Array.prototype.forEach.call($("benchTabs").children, (b) => {
      b.classList.toggle("on", b.getAttribute("data-b") === key);
    });
    renderAll();
  }

  function renderAll() {
    const d = compute();
    renderHero(d);
    renderArena(d);
    renderStrip(d);
    window.__app = { state: d.state || state, derived: d };
  }

  /* ---------- 애니메이션 루프 ---------- */
  let running = true;
  let last = performance.now();
  function loop(now) {
    if (!running) return;
    if (!sceneMine || !sceneRival) return;
    const dt = now - last;
    if (dt > 6) {
      CIV.hex.render(sceneMine, now);
      CIV.hex.render(sceneRival, now);
      last = now;
    }
    requestAnimationFrame(loop);
  }

  /* ---------- 설정 ---------- */
  let draft = null;

  function parseNum(s) {
    if (typeof s === "number") return s;
    const v = String(s || "").replace(/[^0-9.\-]/g, "");
    return v ? Number(v) : 0;
  }
  function renderDepositRows() {
    const host = $("depositRows");
    host.innerHTML = draft.deposits.map((d, i) =>
      '<div class="dep-row" data-i="' + i + '">' +
      '<input type="date" class="dep-date" value="' + d.date + '" />' +
      '<input type="text" inputmode="numeric" class="dep-amt" value="' + nf(d.amount) + '" />' +
      '<button type="button" class="dep-del" title="삭제">✕</button>' +
      '</div>').join("");
    Array.prototype.forEach.call(host.querySelectorAll(".dep-del"), (btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest(".dep-row").getAttribute("data-i"));
        draft.deposits.splice(i, 1);
        if (!draft.deposits.length) draft.deposits.push({ date: "2021-01-01", amount: 100000000 });
        renderDepositRows();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".dep-date"), (inp) => {
      inp.addEventListener("change", () => { syncDraft(); });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".dep-amt"), (inp) => {
      inp.addEventListener("input", () => {
        const v = inp.value.replace(/[^0-9]/g, "");
        inp.value = v ? nf(Number(v)) : "";
        syncDraft(true);
      });
    });
    syncDraft();
  }
  function syncDraft(silent) {
    const rows = $("depositRows").querySelectorAll(".dep-row");
    draft.deposits = Array.prototype.map.call(rows, (row) => ({
      date: row.querySelector(".dep-date").value || "2021-01-01",
      amount: parseNum(row.querySelector(".dep-amt").value),
    }));
    const sum = draft.deposits.reduce((s, d) => s + d.amount, 0);
    $("depositSum").textContent = "합계 " + wonText(sum);
    if (!silent) { /* noop */ }
  }

  function openSettings() {
    draft = JSON.parse(JSON.stringify(state));
    $("inValue").value = nf(draft.currentValue);
    $("inRate").value = (draft.targetRate * 100).toFixed(1);
    $("inGoalMode").value = draft.goalMode;
    $("inGoalAmount").value = nf(draft.goalAmount);
    $("inGoalMult").value = draft.goalMult;
    $("wrapGoalAmount").hidden = draft.goalMode !== "amount";
    $("wrapGoalMult").hidden = draft.goalMode !== "mult";
    $("csvMsg").textContent = "";
    renderDepositRows();
    $("dlgSettings").showModal();
  }

  function applySettings() {
    syncDraft();
    state.deposits = draft.deposits.filter((d) => d.amount > 0);
    if (!state.deposits.length) state.deposits = JSON.parse(JSON.stringify(DEFAULTS.deposits));
    state.currentValue = parseNum($("inValue").value) || DEFAULTS.currentValue;
    const rate = Number($("inRate").value);
    state.targetRate = isFinite(rate) ? Math.max(0, Math.min(2, rate / 100)) : DEFAULTS.targetRate;
    state.goalMode = $("inGoalMode").value;
    state.goalAmount = parseNum($("inGoalAmount").value) || DEFAULTS.goalAmount;
    state.goalMult = Number($("inGoalMult").value) || DEFAULTS.goalMult;
    saveState();
    compute();
    renderAll();
    renderCodex();
  }

  function parseCsv(text) {
    const out = [];
    const lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      var dateM = line.match(/(20\d{2})[.\-\/년\s]?\s*(\d{1,2})[.\-\/월\s]?\s*(\d{1,2})/);
      var nums = line.replace(/,/g, "").match(/-?\d{5,}/g);
      if (!dateM || !nums) continue;
      var amount = 0;
      nums.forEach(function (n) { var v = Number(n); if (v > amount) amount = v; });
      if (!amount) continue;
      var iso = dateM[1] + "-" + String(dateM[2]).padStart(2, "0") + "-" + String(dateM[3]).padStart(2, "0");
      out.push({ date: iso, amount: amount });
    }
    return out;
  }

  /* ---------- 도감 ---------- */
  let codexBuilt = false;
  function buildCodex() {
    if (codexBuilt) return;
    const grid = $("codexGrid");
    const d = derived;
    const html = STAGES.map((s, i) => {
      const lo = d.th[i];
      const hi = i < 17 ? d.th[i + 1] : null;
      return '<article class="cx" data-stage="' + s.n + '">' +
        '<canvas data-stage="' + s.n + '"></canvas>' +
        '<div class="meta"><div class="n">STAGE ' + s.n + ' · ' + ROMAN[i] + '</div>' +
        '<div class="t">' + s.ko + '</div>' +
        '<div class="m">' + wonText(lo) + (hi ? " ~ " + wonText(hi) : " ~") + '</div>' +
        '<div class="m" style="color:#7f92ab">' + s.en + '</div></div></article>';
    }).join("");
    grid.innerHTML = html;
    codexBuilt = true;
  }

  function renderCodex() {
    buildCodex();
    const grid = $("codexGrid");
    const d = derived;
    $("codexBase").textContent = "원금 " + wonText(d.th[0]);
    $("codexGoal").textContent = "목표 " + wonText(d.goal);
    $("codexNow").textContent = d.myStage + "단계 " + stageName(d.myStage).ko;
    Array.prototype.forEach.call(grid.querySelectorAll(".cx"), (el) => {
      el.classList.toggle("now", Number(el.getAttribute("data-stage")) === d.myStage);
    });
    // 썸네일을 한 프레임에 하나씩 그려 UI 멈춤 방지
    const canvases = Array.prototype.slice.call(grid.querySelectorAll("canvas"));
    let idx = 0;
    const nowT = 1200;
    function step() {
      if (idx >= canvases.length) return;
      const cv = canvases[idx++];
      const st = Number(cv.getAttribute("data-stage"));
      try {
        const sc = CIV.hex.createScene(cv, st);
        sc.t0 = performance.now() - 2600;
        cv.style.width = "100%";
        CIV.hex.render(sc, performance.now());
        sc.world = null; // 메모리 해제(정지 이미지)
      } catch (e) {
        console.error("codex preview failed", e);
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 초기화 ---------- */
  function bindUI() {
    Array.prototype.forEach.call($("benchTabs").children, (b) => {
      b.addEventListener("click", () => setBenchmark(b.getAttribute("data-b")));
    });
    $("ccyKRW").addEventListener("click", () => { state.ccy = "KRW"; saveState(); syncCcy(); renderAll(); });
    $("ccyUSD").addEventListener("click", () => { state.ccy = "USD"; saveState(); syncCcy(); renderAll(); });

    $("tmSlider").addEventListener("input", (e) => {
      state.tmYears = Number(e.target.value);
      saveState();
      renderArena(compute());
    });
    Array.prototype.forEach.call($("tmMode").children, (b) => {
      b.addEventListener("click", () => {
        state.tmMode = b.getAttribute("data-m");
        saveState();
        Array.prototype.forEach.call($("tmMode").children, (x) => x.classList.toggle("on", x === b));
        renderArena(compute());
      });
    });

    $("btnSettings").addEventListener("click", openSettings);
    $("btnAddDeposit").addEventListener("click", () => {
      const lastD = draft.deposits[draft.deposits.length - 1];
      draft.deposits.push({ date: lastD ? lastD.date : "2021-01-01", amount: 0 });
      renderDepositRows();
    });
    $("inGoalMode").addEventListener("change", (e) => {
      $("wrapGoalAmount").hidden = e.target.value !== "amount";
      $("wrapGoalMult").hidden = e.target.value !== "mult";
    });
    $("btnCsv").addEventListener("click", () => {
      const rows = parseCsv($("csvBox").value);
      if (!rows.length) { $("csvMsg").textContent = "읽을 수 있는 줄이 없습니다. 「2021-01-04,100000000」 형식으로 넣어 주세요."; return; }
      draft.deposits = rows;
      renderDepositRows();
      $("csvMsg").textContent = rows.length + "건을 읽었습니다. 저장을 누르면 반영됩니다.";
    });
    $("btnReset").addEventListener("click", () => {
      draft = JSON.parse(JSON.stringify(DEFAULTS));
      $("inValue").value = nf(draft.currentValue);
      $("inRate").value = (draft.targetRate * 100).toFixed(1);
      $("inGoalMode").value = draft.goalMode;
      $("inGoalAmount").value = nf(draft.goalAmount);
      $("inGoalMult").value = draft.goalMult;
      $("wrapGoalAmount").hidden = false;
      $("wrapGoalMult").hidden = true;
      renderDepositRows();
    });
    $("btnSave").addEventListener("click", (e) => {
      e.preventDefault();
      applySettings();
      $("dlgSettings").close();
    });

    $("btnCodex").addEventListener("click", () => {
      renderCodex();
      $("dlgCodex").showModal();
    });
    $("btnCodexClose").addEventListener("click", () => $("dlgCodex").close());

    window.addEventListener("resize", () => { /* 캔버스는 render에서 자동 조정 */ });
  }

  function syncCcy() {
    $("ccyKRW").classList.toggle("on", state.ccy === "KRW");
    $("ccyUSD").classList.toggle("on", state.ccy === "USD");
  }

  function start() {
    DATA = FALLBACK;
    $("footDate").textContent = DATA.last_trading_day;
    compute();
    // 캔버스 장면
    sceneMine = CIV.hex.createScene($("cvMine"), stageName(derived.myStage).n);
    sceneRival = CIV.hex.createScene($("cvRival"), 9);
    bindUI();
    syncCcy();
    Array.prototype.forEach.call($("benchTabs").children, (b) => {
      b.classList.toggle("on", b.getAttribute("data-b") === state.benchmark);
    });
    $("tmSlider").value = state.tmYears;
    Array.prototype.forEach.call($("tmMode").children, (b) => {
      b.classList.toggle("on", b.getAttribute("data-m") === state.tmMode);
    });
    renderAll();
    requestAnimationFrame(loop);

    // 단일 파일 번들에 데이터가 심겨 있으면 그대로 사용
    if (window.__MARKET_DATA && window.__MARKET_DATA.series) {
      DATA = window.__MARKET_DATA;
      $("footDate").textContent = DATA.last_trading_day;
      dataNote = "내장 데이터";
      renderAll();
      return;
    }

    // 실제 데이터 로드 (실패 시 폴백 유지)
    fetch("data/market_history.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((json) => {
        if (!json || !json.series || !json.series.SPX) throw new Error("bad payload");
        DATA = json;
        $("footDate").textContent = json.last_trading_day;
        dataNote = json.generated ? "번들 갱신 " + json.generated : "";
        renderAll();
        console.info("[자산문명] market data loaded:", json.last_trading_day);
      })
      .catch((e) => {
        console.warn("[자산문명] 번들 데이터 로드 실패, 내장 스냅샷 사용:", e && e.message);
        dataNote = "내장 스냅샷";
        renderAll();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
