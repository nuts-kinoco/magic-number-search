document.addEventListener('DOMContentLoaded', () => {
  // タブ切り替え処理
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  loadFavorites();

  // イベントリスナーの登録
  document.getElementById('downloadFavBtn').addEventListener('click', downloadFavoritesCsv);
  document.getElementById('clearFavBtn').addEventListener('click', clearFavorites);
  document.getElementById('downloadHistBtn').addEventListener('click', downloadHistoryCsv);
  document.getElementById('clearHistBtn').addEventListener('click', clearHistory);
});

function loadFavorites() {
  chrome.storage.local.get({ favorites: [] }, (result) => {
    const tbody = document.querySelector('#favTable tbody');
    tbody.innerHTML = '';
    const favorites = result.favorites || [];

    if (favorites.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">お気に入りは登録されていません。</td></tr>';
      return;
    }

    favorites.forEach((fav, index) => {
      const tr = document.createElement('tr');
      
      const tdDate = document.createElement('td');
      tdDate.textContent = new Date(fav.addedAt).toLocaleString();
      
      const tdText = document.createElement('td');
      tdText.textContent = fav.text;
      tdText.style.fontWeight = 'bold';
      tdText.style.color = '#0366d6';
      
      const tdTitle = document.createElement('td');
      tdTitle.textContent = fav.pageTitle;
      
      const tdAction = document.createElement('td');
      tdAction.className = 'action-cell';
      const delBtn = document.createElement('button');
      delBtn.textContent = '削除';
      delBtn.className = 'btn-danger';
      delBtn.style.padding = '4px 8px';
      delBtn.addEventListener('click', () => {
        removeFavorite(index);
      });
      tdAction.appendChild(delBtn);
      
      tr.appendChild(tdDate);
      tr.appendChild(tdText);
      tr.appendChild(tdTitle);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  });
}

function removeFavorite(index) {
  chrome.storage.local.get({ favorites: [] }, (result) => {
    let favorites = result.favorites || [];
    favorites.splice(index, 1);
    chrome.storage.local.set({ favorites: favorites }, () => {
      loadFavorites();
      chrome.runtime.sendMessage({ action: "updateMenu" }).catch(() => {});
    });
  });
}

function clearFavorites() {
  if (confirm('すべてのお気に入りを削除しますか？')) {
    chrome.storage.local.set({ favorites: [] }, () => {
      loadFavorites();
      chrome.runtime.sendMessage({ action: "updateMenu" }).catch(() => {});
    });
  }
}

function clearHistory() {
  if (confirm('すべての検索履歴を削除しますか？')) {
    chrome.storage.local.set({ searchHistories: [] }, () => {
      document.getElementById('histStatus').textContent = '検索履歴を削除しました。';
    });
  }
}

function downloadFavoritesCsv() {
  chrome.storage.local.get({ favorites: [] }, (result) => {
    const favorites = result.favorites || [];
    if (favorites.length === 0) {
      alert('出力するデータがありません。');
      return;
    }

    let csvContent = '登録日時,魔法の数字,ページタイトル,URL\n';
    favorites.forEach(item => {
      const row = [
        item.addedAt,
        `"${(item.text || '').replace(/"/g, '""')}"`,
        `"${(item.pageTitle || '').replace(/"/g, '""')}"`,
        `"${(item.pageUrl || '').replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });
    triggerDownload(csvContent, 'magic_number_favorites');
  });
}

function downloadHistoryCsv() {
  chrome.storage.local.get({ searchHistories: [] }, (result) => {
    const histories = result.searchHistories || [];
    if (histories.length === 0) {
      document.getElementById('histStatus').textContent = '保存されている検索履歴がありません。';
      return;
    }

    let csvContent = '検索日時,選択文字列,閲覧ページタイトル,閲覧ページURL,検索URL\n';
    histories.forEach(item => {
      const row = [
        item.timestamp,
        `"${(item.selectedText || '').replace(/"/g, '""')}"`,
        `"${(item.pageTitle || '').replace(/"/g, '""')}"`,
        `"${(item.pageUrl || '').replace(/"/g, '""')}"`,
        `"${(item.searchUrl || '').replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });
    triggerDownload(csvContent, 'magic_number_history');
    document.getElementById('histStatus').textContent = `${histories.length}件の履歴をダウンロードしました。`;
  });
}

function triggerDownload(csvContent, prefix) {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
  a.download = `${prefix}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
