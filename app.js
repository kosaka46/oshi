document.addEventListener("DOMContentLoaded", () => {
  // 既存の state/load/save/render… はそのままでOK（下は写真関連だけ）

  const imgInput     = document.getElementById("imgInput");
  const btnChangeImg = document.getElementById("btnChangeImg");
  const oshiImg      = document.getElementById("oshiImg");
  const photoArea    = document.getElementById("photoArea");

  // 初期画像（プレースホルダー）
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

  // 既存 state がある前提：なければ最低限のものを用意
  const KEY = "oshiDash.miniState.v2";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(s){ try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){ console.error(e); alert("保存に失敗（容量超過かも）"); } }
  let state = load();
  if (!state.img) state.img = null;
  oshiImg.src = state.img || placeholder;

  // label 経由 or エリア全体のクリックで input を開く（どっちも対応）
  function openPicker() {
    if (!imgInput) return;
    // 一部ブラウザはプログラム起動を制限→label を使っているので基本OK
    imgInput.click();
  }
  if (btnChangeImg) btnChangeImg.addEventListener("click", openPicker);
  if (photoArea)    photoArea.addEventListener("click", openPicker);

  // リサイズして保存（容量対策）
  imgInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file, 1200, 0.85);
      oshiImg.src = dataUrl;
      state.img = dataUrl;
      save(state);
    } catch (err) {
      console.error(err);
      alert("画像の読み込みに失敗しました。別の画像で試してください。");
    } finally {
      imgInput.value = ""; // 同じファイル再選択を許可
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
