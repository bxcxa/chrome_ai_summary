// 在文件开头添加右键菜单注册代码
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "aiSummary",
    title: "AI总结所选文本",
    contexts: ["selection"]
  });
});

async function callAPI(text, settings) {
  console.log('Starting API call with settings:', settings);
  
  if (settings.apiService === 'ollama') {
    return callOllamaAPI(text, settings);
  } else if (settings.apiService === 'deepseek') {
    return callDeepseekAPI(text, settings);
  } else {
    throw new Error('未支持的 API 服务');
  }
}

async function callOllamaAPI(text, settings, tab) {
  console.log('Calling Ollama API...', settings.ollama);
  
  try {
    const response = await fetch(`${settings.ollama.url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.ollama.model,
        prompt: text,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API 错误: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            // 发送每个响应片段到内容脚本
            chrome.tabs.sendMessage(tab.id, {
              action: "appendSummary",
              content: json.response
            });
          }
        } catch (e) {
          console.error('解析响应出错:', e);
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

async function callDeepseekAPI(text, settings, tab) {
  console.log('Calling Deepseek API...');
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.deepseek.apiKey}`
      },
      body: JSON.stringify({
        model: settings.deepseek.model,
        messages: [{
          role: 'user',
          content: text
        }],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Deepseek API 错误: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() === '' || line.includes('data: [DONE]')) continue;
        try {
          const jsonStr = line.replace(/^data: /, '');
          const json = JSON.parse(jsonStr);
          if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
            // 发送每个响应片段到内容脚本
            chrome.tabs.sendMessage(tab.id, {
              action: "appendSummary",
              content: json.choices[0].delta.content
            });
          }
        } catch (e) {
          console.error('解析响应出错:', e);
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

// 修改右键菜单点击处理器
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "aiSummary") {
    console.log('Menu clicked, processing text...');
    
    try {
      const { settings } = await chrome.storage.sync.get('settings');
      if (!settings) {
        throw new Error('请先配置 AI 服务设置');
      }

      // 发送准备消息
      chrome.tabs.sendMessage(tab.id, {
        action: "prepareSummary"
      });

      // 准备提示词
      let prompt = settings.customPrompt || getDefaultPrompt();
      prompt = prompt.replace('{{text}}', info.selectionText);
      
      if (settings.wordLimit) {
        prompt += `\n\n请控制在 ${settings.wordLimit} 字以内`;
      }

      // 根据选择的服务调用不同的 API
      if (settings.apiService === 'ollama') {
        await callOllamaAPI(prompt, settings, tab);
      } else if (settings.apiService === 'deepseek') {
        await callDeepseekAPI(prompt, settings, tab);
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

function getDefaultPrompt() {
  return `请用markdown格式总结以下文本：\n\n{{text}}`;
} 