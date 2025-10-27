// ========================
// 推し活ダッシュボード v3.0
// - 旧キーから移行（v1/v2 -> v3）
// - 写真アップロード（リサイズ保存）
// - 円形ゲージ（dashoffset方式）
// - ローカル保存の堅牢化
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

  function deepMerge(base, patch) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k of Object.keys(patch || {})) {
      if (patch[k] && typeof patch[k] === "object" && !Array.isArray(patch[k])) {
        out[k] = deepMerge(base[k] || {}, patch[k]);
      } else {
        out[k] = patch[k];
      }
    }
    return out;
  }

  function loadRaw(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function migrateIfNeeded() {
    // 1) v3 があればそれを使う
    const v3 = loadRaw(KEY);
    if (v3) return deepMerge(defaultState, v3);

    // 2) 古いキーがあればマージして v3 に保存
    for (const k of OLD_KEYS) {
      const old = loadRaw(k);
      if (old) {
        const merged = deepMerge(defaultState, old);
        save(merged);
        return merged;
      }
    }
    // 3) 何もなければデフォ
    save(defaultState);
    return defaultState;
  }

  function save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました（容量オーバーかも）。写真サイズを小さくしてね。");
    }
  }

  let state = migrateIfNeeded();

  // ---- Elements ----
  const elToday   = document.getElementById("today");
  const elMessage = document.getElementById("message");
  const elOshicon = document.getElementById("oshicon");
  const elTaskList= document.getElementById("taskList");
  const elTaskStat= document.getElementById("taskStat");
  const elRingFg  = document.getElementById("ringFg");
  const elBalance = document.getElementById("balanceText");
  const elGoal    = document.getElementById("goalText");
  const btnDeposit= document.getElementById("btnDeposit");
  const btnEdit   = document.getElementById("btnEdit");
  const btnAddTask= document.getElementById("btnAddTask");

  const imgInput     = document.getElementById("imgInput");
  const btnChangeImg = document.getElementById("btnChangeImg");
  const oshiImg      = document.getElementById("oshiImg");
  const photoArea    = document.getElementById("photoArea");

  // ---- Init ----
  document.body.dataset.theme = state.theme || "pink";
  elToday.textContent = new Date().toLocaleDateString();

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

  oshiImg.src = state.img || placeholder;

  // ---- Renderers ----
  function renderHeader() {
    elMessage.textContent = state.message || defaultState.message;
    elOshicon.textContent = (state.oshiName || defaultState.oshiName).charAt(0);
  }

  function renderRing() {
    const r = 70, c = 2 * Math.PI * r;
    const goal = Math.max(1, Number(state.goal) || 1);
    const pct  = Math.max(0, Math.min(1, Number(state.balance) / goal));

    elRingFg.style.strokeDasharray  = String(c);
    elRingFg.style.strokeDashoffset = String(c * (1 - pct));

    elBalance.textContent = `${Number(state.balance).toLocaleString()}円`;
    elGoal.textContent    = `/ ${goal.toLocaleString()}円`;
  }

  function renderTasks() {
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
  }

  // 初回描画
  renderHeader();
  renderRing();
  renderTasks();

  // ---- Theme ----
  document.querySelectorAll(".dot").forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      document.body.dataset.theme = theme;
      state.theme = theme;
      save(state);
    });
  });

  // ---- Savings ----
  btnDeposit.addEventListener("click", () => {
    const val = prompt("いくら貯金する？（円）", "500");
    if (val === null) return;
    const add = Math.max(0, Math.floor(Number(val)) || 0);
    state.balance = Math.max(0, Number(state.balance) + add);
    save(state);
    renderRing();
  });

  btnEdit.addEventListener("click", () => {
    const name = prompt("推しの呼び名", state.oshiName ?? "");
    if (name !== null && name.trim() !== "") state.oshiName = name.trim();

    const msg = prompt("メッセージ", state.message ?? "");
    if (msg !== null && msg.trim() !== "") state.message = msg.trim();

    const g = prompt("目標金額（円）", String(state.goal ?? 10000));
    if (g !== null) {
      const newGoal = Math.max(1, Math.floor(Number(g) || state.goal || 10000));
      state.goal = newGoal;
    }
    save(state);
    renderHeader();
    renderRing();
  });

  // ---- Tasks ----
  function uuid() {
    return (crypto?.randomUUID?.() ?? ("id-" + Date.now() + "-" + Math.random().toString(16).slice(2)));
  }

  btnAddTask.addEventListener("click", () => {
    const title = prompt("新しいタスク内容は？", "推し配信をチェック");
    if (!title) return;
    if (!Array.isArray(state.tasks)) state.tasks = [];
    state.tasks.unshift({ id: uuid(), title: title.trim(), done: false });
    save(state);
    renderTasks();
  });

  // ---- Photo (label/area click OK) ----
  function openPicker(){ imgInput.click(); }
  btnChangeImg.addEventListener("click", openPicker);
  photoArea.addEventListener("click", openPicker);

  imgInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file, 1200, 0.85);
      oshiImg.src = dataUrl;
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
});
