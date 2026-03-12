# API 故障排查指南

## 🔧 第二阶段剧情扩写错误：`AI 调用失败：API 服务暂时不可用，请稍后重试。`

### 🚨 错误信息
这是一个 HTTP 503 错误，表示 API 服务器暂时不可用。

### 🔍 根本原因
1. **API服务器维护或宕机** - 后端服务暂时不可用
2. **API Key 无效或过期** - 认证失败
3. **API端点配置错误** - `/v1/responses` 路径可能不正确
4. **网络连接问题** - 代理配置或网络限制

### ✅ 解决方案

#### 方案1：检查API配置
检查 `.env` 文件中的配置：

```bash
# 确保以下配置正确
VITE_AI_BASE_URL=https://gmn.chuangzuoli.com
VITE_AI_API_KEY=sk-5177af14b35f62f8e5d63c05d5dc12d6ed7804ca43d3476536d61500a7bbe279
VITE_AI_MODEL=gpt-5.4
VITE_AI_WIRE_API=responses  # 注意：必须是 responses 而不是 chat
```

#### 方案2：查看详细错误信息
**操作步骤：**
1. 点击"推进到下一阶段"按钮
2. 当弹出错误提示时，点击"确定"
3. 查看详细的错误信息面板，包含：
   - 完整的错误信息
   - 错误堆栈
   - 诊断建议
   - 复制错误到剪贴板功能

#### 方案3：调试API连接
在浏览器开发者工具的 Console 中运行：

```javascript
// 测试API服务器连接
fetch('https://gmn.chuangzuoli.com', { method: 'HEAD' })
  .then(res => console.log('服务器状态:', res.status))
  .catch(err => console.error('连接失败:', err))
```

#### 方案4：检查代理配置
`vite.config.ts` 中的代理配置：
```typescript
proxy: {
  '/api/ai': {
    target: 'https://gmn.chuangzuoli.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/ai/, '')
  }
}
```

### 🔧 技术诊断

#### 1. 查看浏览器Console日志
1. 按 F12 打开开发者工具
2. 点击"Console"标签页
3. 查看API请求的详细日志（已添加详细日志输出）

#### 2. 验证API端点
检查API端点的实际访问地址：
```
开发模式: /api/ai/v1/responses
生产模式: https://gmn.chuangzuoli.com/v1/responses
```

#### 3. 重启开发服务器
```bash
# 停止当前服务器
Ctrl+C

# 重新启动
npm run dev
```

### 📋 错误处理流程

#### 当前实现：
- ✅ **不模拟数据** - 直接报错，保证交付质量
- ✅ **详细的错误日志** - 在Console中记录完整的API请求和响应信息
- ✅ **可选的错误详情** - 用户可以选择查看详细的错误信息
- ✅ **诊断工具** - 错误查看器提供复制、导出和帮助功能

#### 用户操作：
1. 点击"推进到下一阶段"按钮
2. 如果AI调用失败，会弹出错误提示
3. 用户可以选择：
   - **点击"确定"** - 查看详细的错误信息面板
   - **点击"取消"** - 继续操作，稍后重试

### 🔄 问题排查步骤

1. **第一步：检查API配置**
   ```bash
   cat .env | grep VITE_AI_
   ```

2. **第二步：查看错误详情**
   - 在错误面板中查看完整的错误信息
   - 复制错误信息用于技术支持

3. **第三步：测试网络连接**
   ```bash
   ping gmn.chuangzuoli.com
   ```

4. **第四步：联系服务提供商**
   - 确认API服务状态
   - 验证API Key有效性
   - 检查配额和使用限制

### 📞 技术支持

如果问题持续存在：
1. 使用错误查看器的"复制错误信息"功能
2. 将错误信息提供给API服务提供商
3. 检查API服务商的状态页面
4. 确认网络代理配置正确

### ⚠️ 重要提示
- **系统不提供模拟数据** - 确保所有AI调用都是真实数据
- **错误信息详细记录** - 所有API调用错误都会详细记录
- **用户可选的诊断** - 用户可以选择是否查看技术细节
- **保持交付质量** - 宁可失败报错，也不使用模拟数据交付