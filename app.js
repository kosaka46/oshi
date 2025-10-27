// ---- Persistent state ----
const KEY = "oshiDash.miniState.v1";
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
  localStorage.setItem(KEY, JSON.stringify(s));
}

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

// ---- State ----
let state = load();
renderAll();

// ---- UI Events ----
document.body.dataset.theme = state.theme;
document.querySelectorAll(".dot").forEach(btn => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    document.body.dataset.theme = theme;
    state.theme = theme;
    save(state);
  });
});

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
  if (g !== null) {
    const newGoal = Math.max(1, Math.floor(Number(g) || state.goal));
    state.goal = newGoal;
  }
  save(state);
  renderHeader();
  renderRing();
});

btnAddTask.addEventListener("click", () => {
  const title = prompt("新しいタスク内容は？", "推し配信をチェック");
  if (!title) return;
  state.tasks.unshift({ id: crypto.randomUUID(), title, done: false });
  save(state);
  renderTasks();
});

// ---- Renders ----
function renderAll() {
  elToday.textContent = new Date().toLocaleDateString();
  renderHeader();
  renderRing();
  renderTasks();
}

function renderHeader() {
  elMessage.textContent = state.message;
  elOshicon.textContent = state.oshiName?.charAt(0) || "◯";
}

function renderRing() {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, state.balance / state.goal));
  const dash = pct * c;
  elRingFg.setAttribute("stroke-dasharray", `${dash} ${c - dash}`);
  elBalance.textContent = `${state.balance.toLocaleString()}円`;
  elGoal.textContent = `/ ${state.goal.toLocaleString()}円`;
}

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
