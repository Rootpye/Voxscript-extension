chrome.action.onClicked.addListener((tab) => { // 또는 chrome.pageAction.onClicked.addListener((tab) => {
    chrome.windows.create({
      url: "popup.html",
      type: "popup",
      width: 600, // 새 창의 너비
      height: 400, // 새 창의 높이
    });
  });