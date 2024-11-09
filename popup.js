 // 保存设置到 Chrome 存储
function saveSettings() {
    const settings = {
      apiService: document.getElementById('apiService').value,
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
  
  // 加载已保存的设置
  function loadSettings() {
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings) {
        document.getElementById('apiService').value = data.settings.apiService;
        document.getElementById('ollamaModel').value = data.settings.ollama.model;
        document.getElementById('ollamaUrl').value = data.settings.ollama.url;
        document.getElementById('deepseekApiKey').value = data.settings.deepseek.apiKey;
        document.getElementById('deepseekModel').value = data.settings.deepseek.model;
        toggleApiSettings(data.settings.apiService);
      }
    });
  }
  
  // 切换不同API服务的设置表单
  function toggleApiSettings(service) {
    const ollamaSettings = document.getElementById('ollamaSettings');
    const deepseekSettings = document.getElementById('deepseekSettings');
    
    if (service === 'ollama') {
      ollamaSettings.style.display = 'block';
      deepseekSettings.style.display = 'none';
    } else {
      ollamaSettings.style.display = 'none';
      deepseekSettings.style.display = 'block';
    }
  }
  
  // 事件监听器
  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    document.getElementById('apiService').addEventListener('change', (e) => {
      toggleApiSettings(e.target.value);
    });
    
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
  });