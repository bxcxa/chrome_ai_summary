console.log('Content script loaded!');

let currentPopup = null;
let markdownContent = '';
let markedLoaded = false;

// 加载 marked 库
async function loadMarked() {
  if (markedLoaded) return;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('marked.min.js');
    script.onload = () => {
      markedLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load marked.js'));
    };
    document.head.appendChild(script);
  });
}

// 修改弹窗创建函数
async function getOrCreateSummaryPopup() {
  // 确保 marked 已加载
  try {
    await loadMarked();
  } catch (error) {
    console.error('Failed to load marked:', error);
  }

  if (currentPopup) {
    const contentDiv = currentPopup.querySelector('.summary-content');
    contentDiv.textContent = '';
    markdownContent = '';
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
    markdownContent = '';
  });

  return popup;
}

// 修改内容渲染函数
async function renderMarkdown(content) {
  if (!markedLoaded) {
    try {
      await loadMarked();
    } catch (error) {
      return content; // 如果加载失败，返回原始文本
    }
  }
  
  try {
    return marked.parse(content, {
      breaks: true,
      gfm: true
    });
  } catch (error) {
    console.error('Markdown parsing failed:', error);
    return content;
  }
}

// 修改消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  switch (request.action) {
    case "prepareSummary":
      getOrCreateSummaryPopup().then(() => {
        markdownContent = '';
        showStatus('正在生成总结...');
      });
      break;

    case "appendSummary":
      if (currentPopup && request.content) {
        markdownContent += request.content;
        renderMarkdown(markdownContent).then(html => {
          const contentDiv = currentPopup.querySelector('.summary-content');
          if (contentDiv) {
            contentDiv.innerHTML = html;
            contentDiv.scrollTop = contentDiv.scrollHeight;
          }
        });
      }
      break;

    case "completeSummary":
      if (currentPopup) {
        hideStatus();
      }
      break;

    case "showError":
      getOrCreateSummaryPopup().then(() => {
        const contentDiv = currentPopup.querySelector('.summary-content');
        if (contentDiv) {
          contentDiv.innerHTML = `<div class="error-message">错误：${request.error}</div>`;
        }
        hideStatus();
      });
      break;
  }

  sendResponse({success: true});
  return true;
});

// 立即执行一个测试弹窗来验证脚本是否正常加载
// createTestPopup(); // 取消注释这行来测试弹窗功能