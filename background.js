// 初期化・メニュー作成関数
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    // 親メニュー
    chrome.contextMenus.create({
      id: "magicNumberParent",
      title: "◆ 魔法の数字",
      contexts: ["selection", "page"]
    });

    // 検索メニュー
    chrome.contextMenus.create({
      id: "searchMagicNumber",
      parentId: "magicNumberParent",
      title: "検索する: 「%s」",
      contexts: ["selection"]
    });

    // お気に入り追加・削除
    chrome.contextMenus.create({
      id: "toggleFavorite",
      parentId: "magicNumberParent",
      title: "★ お気に入りに追加/削除: 「%s」",
      contexts: ["selection"]
    });

    // お気に入りから検索（サブメニュー）
    chrome.storage.local.get({ favorites: [] }, (result) => {
      const favorites = result.favorites || [];
      if (favorites.length > 0) {
        chrome.contextMenus.create({
          id: "separator1",
          parentId: "magicNumberParent",
          type: "separator",
          contexts: ["all"]
        });

        // 最新5件を表示
        const recentFavorites = favorites.slice(-5).reverse();
        recentFavorites.forEach((fav) => {
          chrome.contextMenus.create({
            id: `favSearch_${fav.text}`,
            parentId: "magicNumberParent",
            title: `・ ${fav.text} を検索`,
            contexts: ["all"]
          });
        });
      }

      chrome.contextMenus.create({
        id: "separator2",
        parentId: "magicNumberParent",
        type: "separator",
        contexts: ["all"]
      });

      chrome.contextMenus.create({
        id: "openOptions",
        parentId: "magicNumberParent",
        title: "■ お気に入り・履歴の管理",
        contexts: ["all"]
      });
    });
  });
}

// インストール時にメニュー作成
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// メニュークリック時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText ? info.selectionText.trim() : "";

  if (info.menuItemId === "searchMagicNumber" && selectedText) {
    // 選択されたテキストを空白、改行、カンマ等で分割
    const tokens = selectedText.split(/[\s,/\n\r]+/).filter(t => t.trim() !== "");
    if (tokens.length > 0) {
      tokens.forEach(token => executeSearch(token, tab));
    } else {
      executeSearch(selectedText, tab);
    }
  } 
  else if (info.menuItemId === "toggleFavorite" && selectedText) {
    toggleFavorite(selectedText, tab);
  }
  else if (info.menuItemId === "openOptions") {
    chrome.runtime.openOptionsPage();
  }
  else if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("favSearch_")) {
    const favText = info.menuItemId.replace("favSearch_", "");
    executeSearch(favText, tab);
  }
});

// オプション画面からのメニュー更新リクエストを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateMenu") {
    createContextMenu();
  }
});

function executeSearch(text, tab) {
  const searchQuery = `FC2-PPV-${text} 動画`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  chrome.tabs.create({ url: searchUrl });
  saveSearchHistory(text, searchUrl, tab);
}

function toggleFavorite(text, tab) {
  chrome.storage.local.get({ favorites: [] }, (result) => {
    let favorites = result.favorites || [];
    const index = favorites.findIndex(f => f.text === text);
    
    if (index !== -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push({
        text: text,
        addedAt: new Date().toISOString(),
        pageUrl: tab?.url || "",
        pageTitle: tab?.title || ""
      });
    }
    chrome.storage.local.set({ favorites: favorites }, () => {
      createContextMenu();
    });
  });
}

function saveSearchHistory(selectedText, searchUrl, tab) {
  const historyItem = {
    timestamp: new Date().toISOString(),
    selectedText: selectedText,
    searchUrl: searchUrl,
    pageUrl: tab?.url || "Unknown URL",
    pageTitle: tab?.title || "Unknown Title"
  };

  chrome.storage.local.get({ searchHistories: [] }, (result) => {
    const histories = result.searchHistories;
    histories.push(historyItem);
    if (histories.length > 100) histories.shift();
    chrome.storage.local.set({ searchHistories: histories });
  });
}
