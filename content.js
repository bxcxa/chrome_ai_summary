console.log('Content script loaded!');

let currentPopup = null;

// 创建或获取总结弹窗
function getOrCreateSummaryPopup() {
  if (currentPopup) {
    const contentDiv = currentPopup.querySelector('.summary-content');
    contentDiv.textContent = '';
    return currentPopup;
  }

  const popup = document.createElement('div');
  popup.className = 'ai-summary-popup';
  popup.innerHTML = `
    <div class="summary-header">
      <h3>AI总结</h3>
      <div class="summary-controls">
        <select class="word-limit">
          <option value="">不限字数</option>
          <option value="100">100字以内</option>
          <option value="200">200字以内</option>
          <option value="500">500字以内</option>
        </select>
        <button class="close-btn">×</button>
      </div>
    </div>
    <div class="summary-content markdown-body"></div>
    <div class="summary-status" style="display: none;"></div>
  `;
  
  document.body.appendChild(popup);
  currentPopup = popup;

  // 添加关闭按钮功能
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
    currentPopup = null;
  });

  // 添加字数限制变更监听
  popup.querySelector('.word-limit').addEventListener('change', (e) => {
    const limit = e.target.value;
    chrome.runtime.sendMessage({
      action: "updateWordLimit",
      limit: limit
    });
  });

  return popup;
}

// 处理 Markdown 内容
let markdownContent = '';

function appendAndRenderContent(content) {
  if (!currentPopup) return;
  
  const contentDiv = currentPopup.querySelector('.summary-content');
  markdownContent += content;
  
  // 使用 marked 渲染 Markdown
  try {
    contentDiv.innerHTML = marked.parse(markdownContent, {
      breaks: true,
      gfm: true
    });
  } catch (e) {
    contentDiv.textContent = markdownContent;
  }

  // 滚动到底部
  contentDiv.scrollTop = contentDiv.scrollHeight;
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
      getOrCreateSummaryPopup();
      showStatus('正在生成总结...');
      markdownContent = ''; // 重置 Markdown 内容
      break;

    case "appendSummary":
      appendAndRenderContent(request.content);
      break;

    case "completeSummary":
      hideStatus();
      break;

    case "showError":
      getOrCreateSummaryPopup();
      const contentDiv = currentPopup.querySelector('.summary-content');
      contentDiv.innerHTML = `<div class="error-message">错误：${request.error}</div>`;
      hideStatus();
      break;
  }

  sendResponse({success: true});
  return true;
});

// 立即执行一个测试弹窗来验证脚本是否正常加载
// createTestPopup(); // 取消注释这行来测试弹窗功能