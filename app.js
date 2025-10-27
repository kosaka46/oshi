// ---- Storage helpers ----
const KEY = "oshiDash.miniState.v2";
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
  img: null, // base64
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState;
  }
}
function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    alert("保存に失敗しました（容量オーバーかも）。画像サイズを小さくしてみてね。");
    console.error(e);
  }
}

let state = load();

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
// photo
const imgInput  = document.getElementById("imgInput");
const btnChangeImg = document.getElementById("btnChangeImg");
const oshiImg   = document.getElementById("oshiImg");

// ---- Init ----
document.body.dataset.theme = state.theme;
elToday.textContent = new Date().toLocaleDateString();

// 初期画像（プレースホルダー）
const placeholder =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
  <defs>
    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0%' stop-color='#ffd1e6'/><stop offset='100%' stop-color='#ffeef6'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        font-family='Arial' font-size='48' fill='#e74694'>推し写真を追加してね 📷</text>
</svg>`);

oshiImg.src = state.img || placeholder;

// ---- Theme dots ----
document.querySelectorAll(".dot").forEach(btn => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    document.body.dataset.theme = theme;
    state.theme = theme;
    save(state);
  });
});

// ---- Header ----
function renderHeader() {
  elMessage.textContent = state.message;
  elOshicon.textContent = state.oshiName?.charAt(0) || "◯";
}
renderHeader();

// ---- Progress Ring ----
function renderRing() {
  const r = 70, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, state.balance / state.goal));
  const dash = pct * c;
  elRingFg.setAttribute("stroke-dasharray", `${dash} ${c - dash}`);
  elBalance.textContent = `${state.balance.toLocaleString()}円`;
  elGoal.textContent = `/ ${state.goal.toLocaleString()}円`;
}
renderRing();

btnDeposit.addEventListener("click", () => {
  const yen = prompt("いくら貯金する？（円）", "500");
  if (!yen) return;
  const add = Math.max(0, Math.floor(Number(yen)) || 0);
  state.balance += add;
  save(state);
  renderRing();
});

btnEdit.addEventListener("click", () => {
  const name = prompt("推しの呼び名", state.oshiName);
  if (name !== null) state.oshiName = name || state.oshiName;
  const msg = prompt("メッセージ", state.message);
  if (msg !== null) state.message = msg || state.message;
  const g = prompt("目標金額（円）", String(state.goal));
  if (g !== null) state.goal = Math.max(1, Math.floor(Number(g) || state.goal));
  save(state);
  renderHeader();
  renderRing();
});

// ---- Tasks ----
function renderTasks() {
  elTaskList.innerHTML = "";
  state.tasks.forEach(t => {
    const li = document.createElement("li");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.done;
    cb.addEventListener("change", () => {
      t.done = !t.done;
      save(state);
      renderTasks();
    });

    const span = document.createElement("span");
    span.className = "task-title" + (t.done ? " task-done" : "");
    span.textContent = t.title;

    const del = document.createElement("button");
    del.className = "task-del";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      state.tasks = state.tasks.filter(x => x.id !== t.id);
      save(state);
      renderTasks();
    });

    li.append(cb, span, del);
    elTaskList.appendChild(li);
  });

  const done = state.tasks.filter(t => t.done).length;
  elTaskStat.textContent = `${done}/${state.tasks.length} 完了`;
}
renderTasks();

btnAddTask.addEventListener("click", () => {
  const title = prompt("新しいタスク内容は？", "推し配信をチェック");
  if (!title) return;
  state.tasks.unshift({ id: crypto.randomUUID(), title, done: false });
  save(state);
  renderTasks();
});

// ---- Photo upload (with resize) ----
btnChangeImg.addEventListener("click", () => imgInput.click());

imgInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await resizeImageToDataURL(file, 1200); // 長辺1200px
    oshiImg.src = dataUrl;
    state.img = dataUrl;
    save(state);
  } catch (err) {
    alert("画像の読み込みに失敗しました…別の画像で試してください。");
    console.error(err);
  } finally {
    imgInput.value = ""; // 同じファイルでも再選択できるように
  }
});

// 画像をリサイズしてDataURLにする
function resizeImageToDataURL(file, maxSize = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();
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
      // JPEGにして容量削減（品質0.85）
      const out = canvas.toDataURL("image/jpeg", 0.85);
      resolve(out);
    };
    img.onerror = reject;
    fr.readAsDataURL(file);
  });
}
