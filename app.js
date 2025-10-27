// ========================
// 推し活ダッシュボード v3.1 安定版
// - 写真アップロード（リサイズ保存）
// - 円形ゲージ（dashoffset方式）
// - ローカル保存（旧v1/v2移行）
// - 例外ガード強化
// ========================

document.addEventListener("DOMContentLoaded", () => {
  // ---- Storage (with migration) ----
  const KEY = "oshiDash.state.v3";
  const OLD_KEYS = ["oshiDash.miniState.v2", "oshiDash.miniState.v1"];

  const defaultState = {
    oshiName: "◯◯",
    message: "◯◯ちゃんが見てるよ👀",
    theme: "pink",
    balance: 3500,
    goal: 10000,
    tasks: [
      { id: "t1", title: "チケット抽選に応募する", done: true },
      { id: "t2", title: "SNSで推しツイートする", done: false },
      { id: "t3", title: "ダンス練習 30 分", done: false },
    ],
    img: null,
  };

  const safeParse = (raw, fb) => { try { return raw ? JSON.parse(raw) : fb; } catch { return fb; } };
  const loadRaw = (k) => safeParse(localStorage.getItem(k), null);

  const deepMerge = (a, b) => {
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const k in (b || {})) {
      const v = b[k];
      out[k] = (v && typeof v === "object" && !Array.isArray(v)) ? deepMerge(a?.[k] || {}, v) : v;
    }
    return out;
  };

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { console.error(e); alert("保存に失敗（容量超過かも）。写真サイズを小さくしてね。"); }
  }

  function migrate() {
    const v3 = loadRaw(KEY);
    if (v3) return deepMerge(defaultState, v3);
    for (const k of OLD_KEYS) {
      const old = loadRaw(k);
      if (old) { const m = deepMerge(defaultState, old); save(m); return m; }
    }
    save(defaultState);
    return defaultState;
  }

  let state = migrate();

  // ---- Elements ----
  const $ = (id) => document.getElementById(id);
  const elToday   = $("today");
  const elMessage = $("message");
  const elOshicon = $("oshicon");
  const elTaskList= $("taskList");
  const elTaskStat= $("taskStat");
  const elRingFg  = $("ringFg");
  const elBalance = $("balanceText");
  const elGoal    = $("goalText");
  const btnDeposit= $("btnDeposit");
  const btnEdit   = $("btnEdit");
  const btnAddTask= $("btnAddTask");

  const imgInput     = $("imgInput");
  const btnChangeImg = $("btnChangeImg");
  const oshiImg      = $("oshiImg");
  const photoArea    = $("photoArea");

  // ---- Init ----
  try { document.body.dataset.theme = state.theme || "pink"; } catch {}
  try { if (elToday) elToday.textContent = new Date().toLocaleDateString(); } catch {}

  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0%' stop-color='#ffd1e6'/><stop offset='100%' stop-color='#ffeef6'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        font-family='Arial' font-size='48' fill='#e74694'>推し写真を追加してね 📷</text>
    </svg>`);
  try { if (oshiImg) oshiImg.src = state.img || placeholder; } catch {}

  // ---- Renderers ----
  function renderHeader() {
    try {
      if (elMessage) elMessage.textContent = state.message || defaultState.message;
      if (elOshicon) elOshicon.textContent = (state.oshiName || defaultState.oshiName).charAt(0);
    } catch (e) { console.error(e); }
  }

  function renderRing() {
    try {
      if (!elRingFg || !elBalance || !elGoal) return;
      const r = 70, c = 2 * Math.PI * r;
      const goal = Math.max(1, Number(state.goal) || 1);
      const pct  = Math.max(0, Math.min(1, Number(state.balance) / goal));
      elRingFg.style.strokeDasharray  = String(c);
      elRingFg.style.strokeDashoffset = String(c * (1 - pct));
      elBalance.textContent = `${Number(state.balance).toLocaleString()}円`;
      elGoal.textContent    = `/ ${goal.toLocaleString()}円`;
    } catch (e) { console.error(e); }
  }

  function renderTasks() {
    try {
      if (!elTaskList || !elTaskStat) return;
      elTaskList.innerHTML = "";
      const tasks = Array.isArray(state.tasks) ? state.tasks : [];
      tasks.forEach(t => {
        const li = document.createElement("li");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!t.done;
        cb.addEventListener("change", () => {
          t.done = !t.done;
          save(state);
          renderTasks();
        });

        const span = document.createElement("span");
        span.className = "task-title" + (t.done ? " task-done" : "");
        span.textContent = t.title || "";

        const del = document.createElement("button");
        del.className = "task-del";
        del.textContent = "削除";
        del.addEventListener("click", () => {
          state.tasks = tasks.filter(x => x !== t);
          save(state);
          renderTasks();
        });

        li.append(cb, span, del);
        elTaskList.appendChild(li);
      });
      const done = tasks.filter(t => t.done).length;
      elTaskStat.textContent = `${done}/${tasks.length} 完了`;
    } catch (e) { console.error(e); }
  }

  // 初回描画（エラーが出ても他は続行）
  renderHeader(); renderRing(); renderTasks();

  // ---- Theme ----
  document.querySelectorAll(".dot")?.forEach(btn => {
    btn?.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      document.body.dataset.theme = theme;
      state.theme = theme;
      save(state);
    });
  });

  // ---- Savings ----
  btnDeposit?.addEventListener("click", () => {
    const val = prompt("いくら貯金する？（円）", "500");
    if (val === null) return;
    const add = Math.max(0, Math.floor(Number(val)) || 0);
    state.balance = Math.max(0, Number(state.balance) + add);
    save(state);
    renderRing();
  });

  btnEdit?.addEventListener("click", () => {
    const name = prompt("推しの呼び名", state.oshiName ?? "");
    if (name !== null && name.trim() !== "") state.oshiName = name.trim();

    const msg = prompt("メッセージ", state.message ?? "");
    if (msg !== null && msg.trim() !== "") state.message = msg.trim();

    const g = prompt("目標金額（円）", String(state.goal ?? 10000));
    if (g !== null) state.goal = Math.max(1, Math.floor(Number(g) || state.goal || 10000));

    save(state);
    renderHeader();
    renderRing();
  });

  // ---- Tasks ----
  const uuid = () => (crypto?.randomUUID?.() ?? ("id-" + Date.now() + "-" + Math.random().toString(16).slice(2)));

  btnAddTask?.addEventListener("click", () => {
    const title = prompt("新しいタスク内容は？", "推し配信をチェック");
    if (!title) return;
    if (!Array.isArray(state.tasks)) state.tasks = [];
    state.tasks.unshift({ id: uuid(), title: title.trim(), done: false });
    save(state);
    renderTasks();
  });

  // ---- Photo ----
  function openPicker(){ imgInput?.click(); }
  btnChangeImg?.addEventListener("click", openPicker);
  photoArea?.addEventListener("click", openPicker);

  imgInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file, 1200, 0.85);
      if (oshiImg) oshiImg.src = dataUrl;
      state.img = dataUrl;
      save(state);
    } catch (err) {
      console.error(err);
      alert("画像の読み込みに失敗しました。別の画像で試してね。");
    } finally {
      imgInput.value = "";
    }
  });

  function resizeImageToDataURL(file, maxSize = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const fr  = new FileReader();
      fr.onload = () => { img.src = fr.result; };
      fr.onerror = reject;
      img.onload = () => {
        const { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ---- 最後の保険：未捕捉エラーを出しても動作継続 ----
  window.addEventListener("error", (e) => {
    console.error("Runtime error:", e?.message, e?.error);
    // ここで止まらず他の機能が動くようにする
  });
});
