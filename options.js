// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// オプションページのロジック

document.addEventListener('DOMContentLoaded', async () => {
  const fontUrlInput = document.getElementById('fontUrl');
  const saveFontUrlBtn = document.getElementById('saveFontUrl');
  const excludeUrlInput = document.getElementById('excludeUrl');
  const addExcludeUrlBtn = document.getElementById('addExcludeUrl');
  const excludeList = document.getElementById('excludeList');

  // ストレージから値を取得して表示
  const storage = await browser.storage.local.get(["fontUrl", "excludeUrls"]);
  fontUrlInput.value = storage.fontUrl || '';
  const excludeUrls = storage.excludeUrls || [];
  renderExcludeList(excludeUrls);

  // WebフォントURL保存
  saveFontUrlBtn.onclick = async () => {
    await browser.storage.local.set({ fontUrl: fontUrlInput.value });
    alert('WebフォントURLを保存しました');
  };

  // 除外URL追加
  addExcludeUrlBtn.onclick = async () => {
    const url = excludeUrlInput.value.trim();
    if (!url) return;
    const storage = await browser.storage.local.get("excludeUrls");
    const urls = storage.excludeUrls || [];
    if (!urls.includes(url)) {
      urls.push(url);
      await browser.storage.local.set({ excludeUrls: urls });
      renderExcludeList(urls);
      excludeUrlInput.value = '';
    }
  };

  // 除外URLリスト表示・削除
  function renderExcludeList(urls) {
    excludeList.innerHTML = '';
    urls.forEach((url, idx) => {
      const li = document.createElement('li');
      li.textContent = url + ' ';
      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.onclick = async () => {
        urls.splice(idx, 1);
        await browser.storage.local.set({ excludeUrls: urls });
        renderExcludeList(urls);
      };
      li.appendChild(delBtn);
      excludeList.appendChild(li);
    });
  }
});
