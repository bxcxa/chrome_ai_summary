console.log('Content script loaded!');

let currentPopup = null;

// 首先添加 marked 库的加载检查和初始化
let markedInitialized = false;

async function initializeMarked() {
  if (markedInitialized) return;
  
  try {
    // 检查 marked 是否已经存在
    if (typeof marked === 'undefined') {
      // 如果不存在，动态加载 marked
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('marked.min.js');
      script.onload = () => {
        markedInitialized = true;
      };
      document.head.appendChild(script);
      
      // 等待脚本加载完成
      await new Promise(resolve => script.onload = resolve);
    } else {
      markedInitialized = true;
    }
  } catch (error) {
    console.error('Failed to initialize marked:', error);
  }
}

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
      <button class="close-btn">×</button>
    </div>
    <div class="summary-content markdown-body"></div>
    <div class="summary-status" style="display: none;"></div>
  `;
  
  document.body.appendChild(popup);
  currentPopup = popup;

  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
    currentPopup = null;
  });

  return popup;
}

// 处理 Markdown 内容
let markdownContent = '';

// 修改 appendAndRenderContent 函数
async function appendAndRenderContent(content) {
  if (!currentPopup) return;
  
  // 确保 marked 已初始化
  await initializeMarked();
  
  const contentDiv = currentPopup.querySelector('.summary-content');
  markdownContent += content;
  
  try {
    if (typeof marked !== 'undefined') {
      contentDiv.innerHTML = marked.parse(markdownContent, {
        breaks: true,
        gfm: true
      });
    } else {
      // 降级处理：如果 marked 不可用，直接显示文本
      contentDiv.textContent = markdownContent;
    }
  } catch (e) {
    console.error('Markdown parsing failed:', e);
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

// 修改消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  switch (request.action) {
    case "prepareSummary":
      initializeMarked().then(() => {
        getOrCreateSummaryPopup();
        showStatus('正在生成总结...');
        markdownContent = '';
      });
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