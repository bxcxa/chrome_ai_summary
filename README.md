# AI 文本总结扩展

一个简单而强大的 Chrome 扩展，可以使用多种 AI 模型来总结选中的文本。

## 功能特点

- 支持多个 AI 服务
  - Deepseek
  - 通义千问
  - Gemini
  - Ollama（本地模型）
- Markdown 格式输出
- 实时流式响应
- 可自定义提示词
- 可设置总结字数限制
- 简洁的浮窗界面

## 安装说明

1. 下载源代码
2. 打开 Chrome 浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择源代码所在文件夹

## 使用方法

1. 配置 AI 服务
   - 点击扩展图标
   - 选择想要使用的 AI 服务
   - 填写相应的配置信息（API Key 等）
   - 点击保存

2. 使用总结功能
   - 在网页中选择要总结的文本
   - 右键点击，选择"AI总结所选文本"
   - 等待 AI 生成总结

## 支持的 AI 服务配置

### Deepseek
- 需要 API Key
- 支持的模型：
  - deepseek-chat
  - deepseek-coder

### 通义千问
- 需要 API Key
- 支持的模型：
  - qwen-turbo
  - qwen-plus

### Gemini
- 需要 API Key

### Ollama（本地）
- 需要本地运行 Ollama 服务
- 默认地址：`http://localhost:11434`
- 支持所有已安装的本地模型
- 启动命令（允许跨域访问）：
  ```bash
  OLLAMA_ORIGINS=* ollama serve
  ```

## 自定义设置

### 提示词模板
可以在设置中自定义提示词模板，使用 `{{text}}` 作为文本占位符。

默认模板： 
```
请用markdown格式总结以下文本：
{{text}}
```

### 字数限制
可选择预设的字数限制：
- 不限字数
- 100字以内
- 200字以内
- 500字以内

## 注意事项

1. 使用 Ollama 时需要：
   - 确保 Ollama 服务已启动
   - 正确配置跨域访问权限
   - 已安装所需的模型

2. 使用其他 AI 服务时：
   - 确保 API Key 有效
   - 网络环境能够访问相应的服务

## 常见问题

1. Ollama 连接失败
   - 检查 Ollama 服务是否启动
   - 确认服务地址是否正确
   - 验证是否允许跨域访问

2. API 调用失败
   - 检查 API Key 是否正确
   - 确认网络连接是否正常
   - 查看配额是否充足

3. 总结结果不显示
   - 刷新页面后重试
   - 检查浏览器控制台是否有错误信息
   - 确认扩展权限是否正确

## 技术栈

- JavaScript
- Chrome Extension API
- Marked.js（Markdown 渲染）

## 开发相关

### 文件结构
```
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
└── marked.min.js
```

### 权限说明
- `contextMenus`: 创建右键菜单
- `storage`: 存储设置
- `activeTab`: 访问当前标签页
- `host_permissions`: API 访问权限

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个扩展。

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 支持多个 AI 服务
- 实现基本的总结功能

## 联系方式

如有问题或建议，请通过 GitHub Issues 联系。