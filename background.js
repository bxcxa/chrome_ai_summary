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

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Menu clicked', info.menuItemId);
  if (info.menuItemId === "aiSummary") {
    console.log('Selected text:', info.selectionText);

    try {
      const { settings } = await chrome.storage.sync.get('settings');
      
      // 先发送一个消息来清空/准备容器
      chrome.tabs.sendMessage(tab.id, {
        action: "prepareSummary"
      });

      // 使用 fetch 发送流式请求
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.deepseek.apiKey}`
        },
        body: JSON.stringify({
          model: settings.deepseek.model || "deepseek-chat",
          messages: [{
            role: "user",
            content: `请总结以下文本：\n${info.selectionText}`
          }],
          stream: true  // 启用流式输出
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析返回的数据
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.includes('data: [DONE]')) continue;
          
          try {
            const jsonStr = line.replace(/^data: /, '');
            const json = JSON.parse(jsonStr);
            const content = json.choices[0].delta.content;
            
            if (content) {
              // 发送每个文本片段到内容脚本
              chrome.tabs.sendMessage(tab.id, {
                action: "appendSummary",
                content: content
              });
            }
          } catch (e) {
            console.error('解析响应出错:', e);
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