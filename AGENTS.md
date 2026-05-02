# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **AI SDK**: coze-coding-dev-sdk

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── api/               # API 路由
│   │   │   ├── chat/          # LLM 对话 API
│   │   │   ├── tts/           # TTS 语音合成 API
│   │   │   └── image/         # 图像生成 API
│   │   ├── HomeContent.tsx    # 主页面组件
│   │   ├── layout.tsx         # 全局布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式
│   ├── components/
│   │   ├── ui/                # Shadcn UI 组件库
│   │   ├── CharacterSelect.tsx # 角色选择界面
│   │   ├── ChatScreen.tsx     # 聊天主界面
│   │   ├── MessageBubble.tsx  # 消息气泡组件
│   │   ├── VoicePlayer.tsx     # 语音播放器组件
│   │   ├── ImageViewer.tsx    # 图片查看器组件
│   │   └── TypingIndicator.tsx # 正在输入动画
│   ├── context/
│   │   └── ChatContext.tsx    # 聊天状态管理
│   ├── data/
│   │   └── characters.ts      # 角色数据和系统提示词
│   ├── types/
│   │   └── chat.ts            # 类型定义
│   └── utils/
│       ├── parseReply.ts      # 解析 LLM 回复
│       └── cleanText.ts       # 文本清理工具
├── public/
│   └── avatars/               # 角色头像目录
└── ...
```

## 核心功能

### 1. 角色选择界面
- 展示4个预设角色卡片
- 每个卡片包含：头像、名字、一句话介绍、性格标签
- 点击卡片进入聊天界面

### 2. 聊天界面
- 微信私聊风格界面
- 支持文字消息、语音消息、图片消息
- 角色头像+在线状态
- 底部输入框+发送按钮

### 3. AI 功能
- **LLM 对话**：角色扮演对话，保持人设和记忆
- **TTS 语音**：自动生成语音，不同角色不同声线
- **AI 生图**：角色主动发送"自拍照片"

## 角色列表

| ID | 名字 | 性格标签 | 声音 |
|---|---|---|---|
| warm-boy | 林屿 | 温柔、体贴、细心 | zh_male_taocheng_uranus_bigtts |
| cool-guy | 顾冽 | 高冷、毒舌、反差萌 | zh_male_m191_uranus_bigtts |
| sunshine | 苏晨 | 活泼、搞笑、暖 | zh_male_taocheng_uranus_bigtts |
| artsy | 沈默 | 文艺、安静、浪漫 | zh_male_m191_uranus_bigtts |

## 开发命令

```bash
# 开发环境
pnpm dev

# 生产构建
pnpm build

# 生产启动
pnpm start

# 类型检查
pnpm ts-check

# 代码检查
pnpm lint
```

## 环境变量

需要配置以下环境变量（在部署时由系统自动注入）：
- `COZE_TOKEN`: Coze API Token
- `COZE_BASE_URL`: Coze API 基础 URL

## 关键实现逻辑

### 消息发送流程
1. 用户输入文字 → 点击发送
2. 用户消息立刻显示在右侧
3. 显示"正在输入..."动画
4. 调用 `/api/chat` 获取 LLM 回复
5. 解析回复：提取文字 + [IMAGE:...] 标记
6. 并行处理：文字显示 + TTS 生成 + 图片生成

### 图片标记格式
LLM 回复中包含 `[IMAGE: 描述]` 标记，前端解析后调用图像生成 API。

### 防重复请求
使用 `isGeneratingRef` 防止连续快速发送导致重复请求。

## 常见问题

### 图片加载失败
- 检查网络连接
- 图像生成 API 超时为 30 秒
- 失败时显示占位图

### 语音无法播放
- TTS 失败静默处理，不影响文字显示
- 检查浏览器音频权限

### 对话响应慢
- 检查对话历史长度（限制最近 20 条）
- LLM API 超时为 30 秒
