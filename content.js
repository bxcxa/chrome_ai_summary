console.log('Content script loaded!');

let currentPopup = null;

// 创建或获取总结弹窗
function getOrCreateSummaryPopup() {
  if (currentPopup) {
    const contentDiv = currentPopup.querySelector('.summary-content');
    contentDiv.textContent = ''; // 清空内容
    return currentPopup;
  }

  const popup = document.createElement('div');
  popup.className = 'ai-summary-popup';
  popup.innerHTML = `
    <div class="summary-header">
      <h3>AI总结</h3>
      <button class="close-btn">×</button>
    </div>
    <div class="summary-content"></div>
    <div class="summary-status" style="display: none;"></div>
  `;
  
  document.body.appendChild(popup);
  currentPopup = popup;

  // 添加关闭按钮功能
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
    currentPopup = null;
  });

  return popup;
}

// 显示加载状态
function showStatus(message) {
  if (currentPopup) {
    const statusDiv = currentPopup.querySelector('.summary-status');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
  }
}

// 隐藏加载状态
function hideStatus() {
  if (currentPopup) {
    const statusDiv = currentPopup.querySelector('.summary-status');
    statusDiv.style.display = 'none';
  }
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  switch (request.action) {
    case "prepareSummary":
      // 准备新的总结
      getOrCreateSummaryPopup();
      showStatus('正在生成总结...');
      break;

    case "appendSummary":
      // 追加内容
      if (currentPopup) {
        const contentDiv = currentPopup.querySelector('.summary-content');
        contentDiv.textContent += request.content;
      }
      break;

    case "completeSummary":
      // 完成总结
      hideStatus();
      break;

    case "showError":
      // 显示错误
      getOrCreateSummaryPopup();
      const contentDiv = currentPopup.querySelector('.summary-content');
      contentDiv.textContent = `错误：${request.error}`;
      hideStatus();
      break;
  }

  sendResponse({success: true});
  return true;
});

// 立即执行一个测试弹窗来验证脚本是否正常加载
// createTestPopup(); // 取消注释这行来测试弹窗功能