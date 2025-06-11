// Chrome/Firefox両対応: browser/chrome名前空間の互換
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// ...ポップアップのロジック...

// ポップアップから現在のページを除外リストに追加

document.getElementById('addCurrentToExclude').onclick = async () => {
  // アクティブタブのURL取得
  const [tab] = await browser.tabs.query({active: true, currentWindow: true});
  if (!tab || !tab.url) return;
  const url = tab.url;
  const storage = await browser.storage.local.get('excludeUrls');
  const urls = storage.excludeUrls || [];
  if (!urls.includes(url)) {
    urls.push(url);
    await browser.storage.local.set({ excludeUrls: urls });
    alert('除外リストに追加しました');
  } else {
    alert('すでに除外リストに含まれています');
  }
};
