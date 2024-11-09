// 保存设置到 Chrome 存储
function saveSettings() {
  const settings = {
    apiService: document.getElementById('apiService').value,
    wordLimit: document.getElementById('wordLimit').value,
    customPrompt: document.getElementById('customPrompt').value,
    ollama: {
      model: document.getElementById('ollamaModel').value,
      url: document.getElementById('ollamaUrl').value
    },
    deepseek: {
      apiKey: document.getElementById('deepseekApiKey').value,
      model: document.getElementById('deepseekModel').value
    }
  };

  chrome.storage.sync.set({ settings }, () => {
    const status = document.createElement('div');
    status.textContent = '设置已保存';
    status.style.color = 'green';
    status.style.marginTop = '10px';
    status.style.textAlign = 'center';
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 2000);
  });
}

// 添加获取 Ollama 模型列表的函数
async function fetchOllamaModels(ollamaUrl) {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error; // 向上传递错误
  }
}

// 更新 Ollama 模型选择列表
async function updateOllamaModelList(ollamaUrl) {
  const modelSelect = document.getElementById('ollamaModel');
  const statusElement = document.getElementById('ollamaStatus');
  const currentValue = modelSelect.value;
  
  try {
    modelSelect.disabled = true;
    modelSelect.innerHTML = '<option value="">加载中...</option>';
    
    const models = await fetchOllamaModels(ollamaUrl);
    
    if (models.length > 0) {
      modelSelect.innerHTML = models.map(model => 
        `<option value="${model.name}">${model.name}</option>`
      ).join('');
      
      if (currentValue && models.some(m => m.name === currentValue)) {
        modelSelect.value = currentValue;
      }
      
      if (statusElement) {
        statusElement.textContent = '已连接到 Ollama';
        statusElement.style.color = 'green';
      }
    } else {
      throw new Error('未找到可用模型');
    }
  } catch (error) {
    console.error('Error updating Ollama model list:', error);
    modelSelect.innerHTML = '<option value="">无法连接到 Ollama</option>';
    if (statusElement) {
      statusElement.textContent = '无法连接到 Ollama，请确保服务已启动';
      statusElement.style.color = 'red';
    }
  } finally {
    modelSelect.disabled = false;
  }
}

// 修改加载设置函数
function loadSettings() {
  chrome.storage.sync.get('settings', async (data) => {
    if (data.settings) {
      document.getElementById('apiService').value = data.settings.apiService || 'deepseek';
      document.getElementById('wordLimit').value = data.settings.wordLimit || '';
      document.getElementById('customPrompt').value = data.settings.customPrompt || getDefaultPrompt();
      document.getElementById('ollamaUrl').value = data.settings.ollama?.url || 'http://localhost:11434';
      document.getElementById('deepseekApiKey').value = data.settings.deepseek?.apiKey || '';
      document.getElementById('deepseekModel').value = data.settings.deepseek?.model || 'deepseek-chat';
      
      // 如果当前选择的是 Ollama，更新模型列表
      if (data.settings.apiService === 'ollama') {
        await updateOllamaModelList(data.settings.ollama.url);
      }
      
      toggleApiSettings(data.settings.apiService);
    }
  });
}

function getDefaultPrompt() {
  return `请用markdown格式总结以下文本，要求：
1. 分点概括主要内容
2. 语言简洁清晰
3. 保持原文的关键信息

原文：{{text}}`;
}

// 切换不同API服务的设置表单
function toggleApiSettings(service) {
  const apiSettings = document.querySelectorAll('.api-settings');
  apiSettings.forEach(setting => {
    setting.style.display = 'none';
  });
  
  const selectedSettings = document.getElementById(`${service}Settings`);
  if (selectedSettings) {
    selectedSettings.style.display = 'block';
    
    // 如果切换到 Ollama，更新模型列表
    if (service === 'ollama') {
      const ollamaUrl = document.getElementById('ollamaUrl').value;
      updateOllamaModelList(ollamaUrl);
    }
  }
}

// 添加 Ollama URL 变更监听
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  document.getElementById('apiService').addEventListener('change', (e) => {
    toggleApiSettings(e.target.value);
  });
  
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  
  // 添加 Ollama URL 变更监听
  document.getElementById('ollamaUrl').addEventListener('change', (e) => {
    if (document.getElementById('apiService').value === 'ollama') {
      updateOllamaModelList(e.target.value);
    }
  });
});