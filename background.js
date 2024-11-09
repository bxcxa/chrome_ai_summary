// 确保右键菜单被创建
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.contextMenus.create({
    id: "aiSummary",
    title: "AI总结所选文本",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('创建菜单失败:', chrome.runtime.lastError);
    } else {
      console.log('右键菜单创建成功');
    }
  });
});

// 添加字数限制状态
let currentWordLimit = '';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateWordLimit") {
    currentWordLimit = request.limit;
    sendResponse({success: true});
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "aiSummary") {
    try {
      const { settings } = await chrome.storage.sync.get('settings');
      
      // 准备提示词
      let prompt = settings.customPrompt || getDefaultPrompt();
      prompt = prompt.replace('{{text}}', info.selectionText);
      
      // 如果设置了字数限制，添加到提示词中
      if (settings.wordLimit) {
        prompt += `\n\n请控制在 ${settings.wordLimit} 字以内`;
      }

      // 发送准备消息
      chrome.tabs.sendMessage(tab.id, {
        action: "prepareSummary"
      });

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings?.deepseek?.apiKey || ''}`
        },
        body: JSON.stringify({
          model: settings?.deepseek?.model || "deepseek-chat",
          messages: [{
            role: "user",
            content: prompt
          }],
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.includes('data: [DONE]')) continue;
          
          try {
            const jsonStr = line.replace(/^data: /, '');
            const json = JSON.parse(jsonStr);
            
            // 检查响应格式
            if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
              const content = json.choices[0].delta.content;
              // 发送内容到内容脚本
              chrome.tabs.sendMessage(tab.id, {
                action: "appendSummary",
                content: content
              });
            }
          } catch (e) {
            console.error('解析响应出错:', e, line);
          }
        }
      }

      // 发送完成信号
      chrome.tabs.sendMessage(tab.id, {
        action: "completeSummary"
      });

    } catch (error) {
      console.error('处理失败:', error);
      chrome.tabs.sendMessage(tab.id, {
        action: "showError",
        error: error.message
      });
    }
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  sendResponse({received: true});
});

function getDefaultPrompt() {
  return `请用markdown格式总结以下文本，要求：
1. 分点概括主要内容
2. 语言简洁清晰
3. 保持原文的关键信息

原文：{{text}}`;
}