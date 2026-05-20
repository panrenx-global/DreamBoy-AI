# DreamBoy AI — 纸片人男友

## 项目简介

AI 虚拟男友聊天应用，面向女性用户。用户注册后选择不同人设的虚拟角色（温柔学长、高冷总监、阳光邻家、文艺音乐人），进行沉浸式恋爱聊天体验。支持文字对话、AI 语音回复、AI 生成角色"自拍"图片。通过邮件系统每日发送 AI 情话、召回不活跃用户。

- **线上地址**: https://ai.prx2025.xyz
- **产品名称**: 纸片人男友

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 前端 | React 19, TypeScript 5 |
| UI | shadcn/ui (Radix UI), Tailwind CSS 4 |
| 动画 | Framer Motion |
| 后端 | Next.js API Routes (Node.js runtime) |
| 数据库 | PostgreSQL (pg 连接池, 自动 schema 初始化) |
| AI 对话 | 火山方舟 ARK API / Coze SDK (doubao-seed 模型) |
| AI 图片 | Coze ImageGeneration API |
| 语音合成 | 火山引擎 TTS (openspeech.bytedance.com) |
| 对象存储 | Cloudflare R2 (S3 兼容) |
| 邮件 | Resend + React Email |
| 人机验证 | Cloudflare Turnstile |
| 包管理 | pnpm 9+ (强制, 禁止 npm/yarn) |
| 部署 | Coze Coding 平台 |

## 核心目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # 登录/注册/登出/会话验证
│   │   ├── chat/          # AI 对话 + 聊天历史
│   │   ├── image/         # AI 图片生成 → R2 存储
│   │   ├── tts/           # 火山引擎语音合成
│   │   ├── characters/    # 角色列表 API
│   │   └── cron/          # 定时任务 (每日情话、召回邮件)
│   ├── page.tsx           # 首页入口
│   └── HomeContent.tsx    # 主页面组件 (角色选择 ↔ 聊天)
├── components/
│   ├── ui/                # shadcn/ui 基础组件 (勿手动修改)
│   ├── ChatScreen.tsx     # 聊天主界面
│   ├── CharacterSelect.tsx # 角色卡片选择
│   ├── MessageBubble.tsx  # 消息气泡 (文字/语音/图片)
│   ├── VoicePlayer.tsx    # 语音播放器
│   ├── ImageViewer.tsx    # 图片全屏查看
│   └── AuthDialog.tsx     # 登录/注册弹窗
├── context/
│   ├── AuthContext.tsx    # 用户认证状态
│   └── ChatContext.tsx    # 聊天状态机 (核心状态管理)
├── data/
│   └── characters.ts      # 角色定义: 人设、提示词、外貌描述
├── emails/                # React Email 邮件模板
├── lib/
│   ├── auth.ts            # 认证: 密码哈希、Session 管理
│   ├── db.ts              # PostgreSQL 连接池
│   ├── db-init.ts         # 数据库 schema 自动初始化 + 角色种子
│   ├── chat-store.ts      # 聊天持久化: 线程/消息 CRUD
│   ├── email.ts           # 邮件发送 + AI 情话生成
│   ├── r2.ts              # Cloudflare R2 文件上传
│   ├── rate-limit.ts      # 基于 PG 的速率限制
│   ├── turnstile.ts       # Cloudflare Turnstile 验证
│   └── site.ts            # 站点配置常量
├── types/
│   ├── chat.ts            # 聊天相关类型定义
│   └── auth.ts            # 认证相关类型定义
└── utils/
    ├── parseReply.ts      # 从 LLM 回复解析文字 + [IMAGE:] 标记
    └── cleanText.ts       # TTS 前文本清理
scripts/
├── init-db.ts             # 手动数据库初始化脚本
├── send-daily-love-letters.ts # 手动触发每日情话
└── dev.sh / build.sh / start.sh
```

## 常用命令

| 命令 | 用途 |
|------|------|
| `pnpm dev` | 启动开发服务器 (localhost:5000) |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm ts-check` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm db:init` | 手动初始化数据库 |
| `pnpm daily-love-letters` | 手动发送每日情话邮件 |
| `pnpm email-status` | 查看邮件发送状态 |

## 数据库表结构

数据库通过 `lib/db-init.ts` 自动初始化，无需手动 migration：

- `users` — 用户 (username, password_hash, email, status, last_login_at)
- `user_sessions` — 会话 (token_hash, expires_at, 30天有效)
- `characters` — 角色 (name, system_prompt, avatar_url, speaker, appearance)
- `chat_threads` — 聊天线程 (user_id + character_id 唯一约束)
- `chat_messages` — 消息 (text/voice/image/mixed, audio_url, image_url)
- `message_assets` — 媒体资源附件
- `rate_limit_events` — 速率限制事件
- `scheduled_email_deliveries` — 邮件发送去重记录

## 核心业务流程

### 消息发送链路

```
用户输入 → POST /api/chat → LLM 生成回复 → parseReply 解析
  ├── 文字回复 → 持久化到 chat_messages → 返回前端
  ├── TTS (异步) → POST /api/tts → 火山引擎 → base64 音频更新到消息
  └── 图片 (异步) → POST /api/image → Coze 生图 → R2 上传 → 新建 image 消息
```

### LLM 回复中的图片标记

角色回复可能包含 `[IMAGE: 中文描述]`，由 `parseReply.ts` 提取。前端拿到 imagePrompt 后增强提示词（加上动漫风格 + 角色外貌）再调用图片生成。

### 认证流程

注册/登录 → scrypt 密码哈希 → 创建 Session (SHA256 token hash) → HttpOnly Cookie (`dreamboy_session`, 30天)

## 开发规范

### 修改代码前必读

1. **改角色人设** → 先读 `src/data/characters.ts`，注意系统提示词中的 IMAGE_INSTRUCTION 模板
2. **改聊天逻辑** → 先读 `src/context/ChatContext.tsx`，理解完整的消息发送状态机
3. **改数据库** → 修改 `src/lib/db-init.ts` 中的 `schemaSql`，使用 `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 保证幂等
4. **改 API** → 所有 API 路由第一步都调用 `ensureDatabaseInitialized()`，认证使用 `getSessionUserFromRequest(request)`

### 注意事项

- **pnpm only** — 项目有 `preinstall` 脚本强制 pnpm，用 npm/yarn 会报错
- **数据库 schema 无 migration 工具** — 所有 DDL 写在 `db-init.ts`，必须保持幂等 (IF NOT EXISTS)
- **图片存储在 R2** — 生成的图片上传到 Cloudflare R2，返回永久公开链接
- **TTS 音频是 base64** — 直接存在 `chat_messages.audio_url` 字段 (data:audio/mp3;base64,...)
- **LLM 超时 20s** — `invokeChatModel` 有 20 秒硬超时，超时后返回 fallback 回复
- **对话上下文限制 20 条** — `listRecentTextMessages(threadId, 20)` 只取最近 20 条作为 LLM 上下文
- **邮件去重** — `scheduled_email_deliveries` 表通过 (user_id, email_type, delivery_date) 唯一约束防重发
- **速率限制基于 PG** — 使用 `pg_advisory_xact_lock` 实现原子性检查
- **环境变量** — 开发时在 `.env.local` 配置，生产由平台注入

### 命名约定

- **文件**: PascalCase 组件 (`ChatScreen.tsx`)、kebab-case 工具 (`rate-limit.ts`)
- **数据库**: snake_case (`chat_messages`, `sender_type`)
- **API 路由**: 小写目录 (`/api/chat/history/route.ts`)
- **类型**: PascalCase (`ChatMessagePayload`, `SessionUser`)

### 组件开发

- 优先使用 `src/components/ui/` 中的 shadcn 组件，不要重复造轮子
- 客户端组件必须在文件顶部标记 `'use client'`
- 使用 `cn()` 工具函数合并 className

## 输出风格要求

在本项目中回答问题和修改代码时：

1. **代码注释用中文** — 项目面向中文用户，日志和错误信息也用中文
2. **保持现有模式** — 新 API 路由参考 `api/chat/route.ts` 的结构: ensureDatabaseInitialized → 认证 → 参数校验 → 业务逻辑 → 错误处理
3. **数据库操作用原生 SQL** — 本项目不用 ORM，直接写 parameterized SQL
4. **不引入新依赖除非必要** — 优先用项目已有的工具 (nanoid, pg, resend 等)
5. **API 错误返回统一格式** — `{ error: string }` + 对应 HTTP 状态码
6. **异步任务静默失败** — TTS/图片生成失败不阻塞主流程，仅 console.error

## 环境变量清单

核心变量 (`.env.example` + 实际使用):

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `ARK_API_KEY` / `ARK_BASE_URL` | 火山方舟 LLM API |
| `ARK_CHAT_MODEL` | 聊天模型 ID (默认 doubao-seed-1-6-251015) |
| `COZE_TOKEN` / `COZE_BASE_URL` | Coze SDK 备用 LLM |
| `COZE_WORKLOAD_IDENTITY_API_KEY` | Coze 图片生成 |
| `COZE_INTEGRATION_BASE_URL` | Coze Integration 端点 |
| `VOLCENGINE_TTS_API_KEY` | 火山引擎 TTS |
| `VOLCENGINE_TTS_RESOURCE_ID` | TTS 资源 ID |
| `VOLCENGINE_TTS_ENDPOINT` | TTS 端点 |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | R2 存储桶配置 |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend 邮件服务 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | 人机验证 |
| `CRON_SECRET` | 定时任务鉴权密钥 |
| `APP_BASE_URL` | 应用公开地址 |

## 已知限制

- 无测试套件 — 项目目前没有单元测试或 E2E 测试
- 无 migration 工具 — schema 变更全部在 `db-init.ts` 中追加
- TTS 音频为 base64 存储在数据库 — 大量消息后可能影响存储和查询性能
- 对话无流式输出 — LLM 回复是一次性返回，不是 SSE 流式

---
**Last Updated**: 2026-05-19
