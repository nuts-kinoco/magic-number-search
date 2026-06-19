// 初期化・メニュー作成関数
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get({ searchEngines: [], favorites: [] }, (result) => {
      let engines = result.searchEngines || [];
      if (engines.length === 0) {
        // 初期状態の検索エンジン設定（Google）
        engines = [
          { id: "google_search", name: "Google", url: "https://www.google.com/search?q=FC2-PPV-{query}+動画" }
        ];
        chrome.storage.local.set({ searchEngines: engines });
      }

      // 親メニュー
      chrome.contextMenus.create({
        id: "magicNumberParent",
        title: "◆ 魔法の数字",
        contexts: ["selection", "page"]
      });

      // 登録されている検索エンジンを並列表示
      engines.forEach((engine) => {
        chrome.contextMenus.create({
          id: `searchMagic_${engine.id}`,
          parentId: "magicNumberParent",
          title: `${engine.name}で検索: 「%s」`,
          contexts: ["selection"]
        });
      });

      // 検索エンジンとお気に入りの間の区切り線（選択時のみ表示）
      chrome.contextMenus.create({
        id: "separator_search",
        parentId: "magicNumberParent",
        type: "separator",
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

  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("searchMagic_") && selectedText) {
    const engineId = info.menuItemId.replace("searchMagic_", "");
    chrome.storage.local.get({ searchEngines: [] }, (result) => {
      const engines = result.searchEngines || [];
      const engine = engines.find(e => e.id === engineId) || { name: "Google", url: "https://www.google.com/search?q=FC2-PPV-{query}+動画" };
      
      const tokens = selectedText.split(/[\s,/\n\r]+/).filter(t => t.trim() !== "");
      if (tokens.length > 0) {
        tokens.forEach(token => {
          const searchUrl = engine.url.replace("{query}", encodeURIComponent(token));
          chrome.tabs.create({ url: searchUrl });
          saveSearchHistory(token, searchUrl, tab);
        });
      } else {
        const searchUrl = engine.url.replace("{query}", encodeURIComponent(selectedText));
        chrome.tabs.create({ url: searchUrl });
        saveSearchHistory(selectedText, searchUrl, tab);
      }
    });
  } 
  else if (info.menuItemId === "toggleFavorite" && selectedText) {
    toggleFavorite(selectedText, tab);
  }
  else if (info.menuItemId === "openOptions") {
    chrome.runtime.openOptionsPage();
  }
  else if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("favSearch_")) {
    const favText = info.menuItemId.replace("favSearch_", "");
    chrome.storage.local.get({ searchEngines: [] }, (result) => {
      const engines = result.searchEngines || [];
      const engine = engines[0] || { url: "https://www.google.com/search?q=FC2-PPV-{query}+動画" };
      const searchUrl = engine.url.replace("{query}", encodeURIComponent(favText));
      chrome.tabs.create({ url: searchUrl });
      saveSearchHistory(favText, searchUrl, tab);
    });
  }
});

// オプション画面からのメニュー更新リクエストを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateMenu") {
    createContextMenu();
  }
});

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
