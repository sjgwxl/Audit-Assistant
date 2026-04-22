# 审计助手系统 - 构建与部署指南

## 目录

- [1. 环境要求](#1-环境要求)
- [2. 获取源码](#2-获取源码)
- [3. 安装依赖](#3-安装依赖)
- [4. 开发模式](#4-开发模式)
- [5. 生产构建](#5-生产构建)
- [6. 数据库](#6-数据库)
- [7. AI 服务配置](#7-ai-服务配置)
- [8. 备份恢复](#8-备份恢复)
- [9. 常见问题](#9-常见问题)
- [10. 项目结构](#10-项目结构)
- [11. 技术栈](#11-技术栈)

---

## 1. 环境要求

### 1.1 运行时依赖

| 依赖项 | 最低版本 | 推荐版本 | 说明 |
|--------|---------|---------|------|
| Node.js | 18.0.0 | 18.x LTS 或 20.x LTS | 必须包含 npm |
| npm | 9.0.0 | 9.x 或 10.x | 随 Node.js 一同安装 |
| Python | 3.8+ | 3.10+ | 用于编译 better-sqlite3 原生模块（node-gyp 依赖） |

### 1.2 操作系统支持

| 操作系统 | 最低版本 | 构建产物格式 |
|---------|---------|-------------|
| Windows | Windows 10 (1903+) | NSIS 安装程序 (.exe) |
| macOS | macOS 12 Monterey+ | DMG 磁盘镜像 (.dmg) |
| Linux (Ubuntu) | Ubuntu 20.04 LTS | AppImage (.AppImage) |

### 1.3 构建工具链（各平台额外要求）

**Windows：**

- 需要安装 Visual Studio Build Tools（C++ 桌面开发工作负载），用于编译 `better-sqlite3` 原生模块
- 推荐通过 `npm install --global windows-build-tools` 或手动安装 VS Build Tools

**macOS：**

- 需要 Xcode Command Line Tools：`xcode-select --install`

**Linux (Ubuntu)：**

```bash
sudo apt-get update
sudo apt-get install -y build-essential libssl-dev python3
```

### 1.4 版本检查

```bash
node -v    # 应输出 v18.x.x 或更高
npm -v     # 应输出 9.x.x 或更高
python3 --version  # 应输出 3.8+ 或更高
```

---

## 2. 获取源码

```bash
# HTTPS 方式
git clone https://github.com/your-organization/audit-assistant-system.git

# SSH 方式
git clone git@github.com:your-organization/audit-assistant-system.git

# 进入项目目录
cd audit-assistant-system
```

---

## 3. 安装依赖

### 3.1 安装项目依赖

```bash
npm install
```

该命令会安装 `package.json` 中列出的所有依赖，包括：
- **运行时依赖**：Vue 3、Element Plus、better-sqlite3、axios、bcryptjs、pinia、vue-router、uuid 等
- **开发依赖**：Electron、Vite、electron-builder、concurrently、cross-env、wait-on 等

> **注意**：`postinstall` 脚本会自动执行 `electron-rebuild` 重新编译 `better-sqlite3` 原生模块。

### 3.2 better-sqlite3 原生模块编译说明

本项目使用了 `better-sqlite3`（SQLite 的原生 Node.js 绑定），该模块需要在安装时编译原生 C++ 代码。

**如果安装过程中出现原生模块编译错误，请尝试以下步骤：**

```bash
# 1. 清除缓存和已安装的依赖
rm -rf node_modules package-lock.json

# 2. 重新安装
npm install

# 3. 如果仍然失败，尝试单独重新编译原生模块
npm run rebuild
```

**Windows 用户如果遇到编译问题：**

```bash
# 确保已安装 windows-build-tools，然后执行：
npm config set msvs_version 2022
npm run rebuild
```

**macOS/Linux 用户如果遇到 Python 相关错误：**

```bash
# 确保 Python 3 可用
python3 --version

# 如果系统使用 Python 3，告知 npm 使用 Python 3
npm config set python python3
```

### 3.3 验证安装

```bash
# 检查 Electron 是否正确安装
npx electron --version

# 检查 better-sqlite3 是否可用
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
```

---

## 4. 开发模式

### 4.1 启动开发服务器

```bash
npm run electron:dev
```

该命令会同时执行以下操作：

1. 启动 Vite 开发服务器（`http://localhost:5173`），提供 Vue 前端的热模块替换（HMR）
2. 等待 Vite 服务器就绪后（通过 `wait-on` 工具），自动启动 Electron 窗口加载前端页面
3. 自动打开 Electron 的开发者工具（DevTools）

### 4.2 开发模式说明

- **前端热更新**：修改 `src/` 目录下的 Vue 文件后，页面会自动刷新
- **Electron 主进程**：修改 `electron/` 目录下的文件后，需要手动重启应用（Ctrl+C 后重新运行 `npm run electron:dev`）
- **开发端口**：Vite 开发服务器固定使用 `5173` 端口（`vite.config.js` 中配置了 `strictPort: true`）

### 4.3 仅启动前端开发服务器（不含 Electron）

如果只需要调试前端页面，可以单独启动 Vite：

```bash
npm run dev
```

然后在浏览器中访问 `http://localhost:5173`。

---

## 5. 生产构建

### 5.1 执行构建命令

```bash
npm run electron:build
```

该命令会依次执行：

1. `vite build` -- 将 Vue 前端代码打包到 `dist/` 目录
2. `electron-builder` -- 将 Electron 应用和前端产物打包为各平台安装程序

### 5.2 构建产物

构建完成后，产物输出到 `release/` 目录：

| 平台 | 产物格式 | 文件路径示例 | 说明 |
|------|---------|-------------|------|
| Windows | NSIS 安装程序 | `release/审计助手系统 Setup 1.0.0.exe` | 标准 Windows 安装程序，支持自定义安装路径 |
| macOS | DMG 磁盘镜像 | `release/审计助手系统-1.0.0.dmg` | 拖拽安装的 macOS 磁盘镜像 |
| Linux | AppImage | `release/审计助手系统-1.0.0.AppImage` | 免安装的 Linux 可执行文件 |

### 5.3 跨平台构建

`electron-builder` 支持在当前平台上构建当前平台的安装包。推荐在各目标平台上分别执行构建。

### 5.4 构建配置说明

构建配置位于 `package.json` 的 `build` 字段：

```json
{
  "appId": "com.audit.assistant",
  "productName": "审计助手系统",
  "directories": { "output": "release" },
  "files": ["dist/**/*", "electron/**/*"],
  "mac": { "target": "dmg" },
  "win": { "target": "nsis" },
  "linux": { "target": "AppImage" }
}
```

如需自定义安装程序（如添加图标、修改 NSIS 配置等），可在 `build` 字段中扩展配置。详见 [electron-builder 官方文档](https://www.electron.build/)。

---

## 6. 数据库

### 6.1 数据库类型

本项目使用 **SQLite** 作为本地数据库，通过 `better-sqlite3` 原生模块访问。数据库文件名为 `audit-assistant.db`。

### 6.2 数据库文件位置

数据库文件存储在 Electron 的用户数据目录中：

| 操作系统 | 数据库文件路径 |
|---------|--------------|
| Windows | `C:\Users\<用户名>\AppData\Roaming\audit-assistant-system\audit-assistant.db` |
| macOS | `~/Library/Application Support/audit-assistant-system/audit-assistant.db` |
| Linux | `~/.config/audit-assistant-system/audit-assistant.db` |

同目录下还可能存在 WAL 模式产生的文件：

- `audit-assistant.db-wal` -- WAL 日志文件
- `audit-assistant.db-shm` -- 共享内存文件

> **注意**：请勿手动删除或修改这些文件，否则可能导致数据损坏。

### 6.3 数据库特性

- **WAL 模式**：启用了 Write-Ahead Logging（`journal_mode = WAL`），提升并发读写性能
- **外键约束**：已启用 `foreign_keys = ON`，核心表之间通过外键维护数据完整性
- **自动初始化**：应用首次启动时自动创建所有数据表并初始化默认管理员账户

### 6.4 默认管理员账户

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |
| 角色 | admin（管理员） |
| 姓名 | 系统管理员 |
| 部门 | 信息中心 |

> **安全提示**：首次登录后，请务必修改默认管理员密码。

### 6.5 数据表概览

| 数据表 | 说明 | 主要字段 |
|--------|------|---------|
| `users` | 用户账户表 | username, password_hash, real_name, role, department |
| `projects` | 审计项目表 | name, type, status, audit_scope, start_date, end_date |
| `interviewees` | 被访谈人信息表 | name, gender, position, department, company, phone |
| `interviews` | 访谈记录表 | title, content, summary, key_findings, risk_indicators, status |
| `risk_points` | 风险点表 | title, category, risk_level, likelihood, impact, status |
| `ai_analyses` | AI 分析记录表 | title, content, provider, model, tokens_used |
| `todos` | 待办事项表 | title, description, priority, status, due_date |
| `attachments` | 附件表 | filename, file_path, file_size, file_type |
| `settings` | 系统设置表 | key, value, category |
| `operation_logs` | 操作日志表 | action, target_type, target_id, detail |

### 6.6 数据库重置

如果数据库出现异常，可以删除数据库文件后重启应用，系统会自动重建：

```bash
# Windows（在文件资源管理器地址栏输入）
%APPDATA%\audit-assistant-system

# 删除该目录下的所有 .db、.db-wal、.db-shm 文件
```

> **警告**：此操作将清除所有数据，请先备份。

---

## 7. AI 服务配置

### 7.1 支持的 AI 提供商

本系统内置支持以下 AI 服务提供商（均兼容 OpenAI API 格式）：

| 提供商 | 标识 | 默认模型 | API 基础地址 |
|--------|------|---------|-------------|
| DeepSeek | `deepseek` | `deepseek-chat` | `https://api.deepseek.com/v1` |
| 通义千问 | `qwen` | `qwen-turbo` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 腾讯元宝 | `hunyuan` | `hunyuan-pro` | `https://api.hunyuan.cloud.tencent.com/v1` |
| 豆包 | `doubao` | `doubao-pro-32k` | `https://ark.cn-beijing.volces.com/api/v3` |

### 7.2 配置步骤

1. 登录系统后，进入左侧菜单 **AI 设置** 页面
2. 选择要配置的 AI 提供商
3. 输入对应的 API Key
4. 选择要使用的模型
5. 点击 **保存 API Key** 按钮
6. 点击 **测试连接** 按钮验证配置是否正确

API Key 会通过 AES-256-CBC 加密后存储在本地数据库中，不会以明文形式保存。

### 7.3 可用模型列表

**DeepSeek：**

- `deepseek-chat` -- 通用对话模型（默认）
- `deepseek-coder` -- 代码专用模型
- `deepseek-reasoner` -- 推理增强模型

**通义千问：**

- `qwen-turbo` -- 快速响应模型（默认）
- `qwen-plus` -- 均衡性能模型
- `qwen-max` -- 高性能模型
- `qwen-long` -- 长文本模型

**腾讯元宝：**

- `hunyuan-lite` -- 轻量模型
- `hunyuan-standard` -- 标准模型
- `hunyuan-pro` -- 高性能模型（默认）
- `hunyuan-turbo` -- 快速模型

**豆包：**

- `doubao-pro-32k` -- 32K 上下文专业版（默认）
- `doubao-pro-128k` -- 128K 上下文专业版
- `doubao-lite-32k` -- 32K 上下文轻量版
- `doubao-lite-128k` -- 128K 上下文轻量版

### 7.4 AI 功能说明

系统提供两类 AI 辅助功能：

#### 单条访谈辅助分析（轻量级，快速响应）

| 功能 | 说明 | 触发位置 |
|------|------|---------|
| AI 生成摘要 | 根据访谈内容自动生成简洁摘要（不超过300字） | 访谈详情页 > 摘要区域 |
| AI 提取关键发现 | 提取关键信息，识别语言矛盾点和含糊表述 | 访谈详情页 > 关键发现区域 |
| AI 提取风险指标 | 识别潜在风险并按等级分类 | 访谈详情页 > 风险指标区域 |

#### 项目整体分析（深度分析，信息全面）

| 功能 | 说明 | 触发位置 |
|------|------|---------|
| 生成 AI 审查报告 | 综合所有访谈记录，生成包含关键发现、风险分析、内控评估、审计建议的完整审查报告 | 项目详情页 > AI分析标签页 |
| 生成项目摘要 | 根据项目信息和审计发现生成项目整体摘要 | 项目详情页 > AI分析标签页 |
| AI 风险评估 | 对风险点进行智能评估，给出风险等级、成因分析和应对建议 | 项目详情页 > 风险点列表 |

### 7.5 多提供商降级策略

系统支持配置多个 AI 提供商的降级顺序。当首选提供商不可用时，系统会自动尝试使用备选提供商（最多重试 3 次，每次间隔递增），确保 AI 功能的可用性。

### 7.6 AI 请求超时设置

- 单条访谈辅助分析：请求超时 180 秒
- 项目整体分析：请求超时 180 秒
- 超时后自动重试，重试间隔 2-5 秒

---

## 8. 备份恢复

### 8.1 创建备份

#### 方式一：通过应用菜单

1. 在应用中点击菜单栏 **文件 > 备份数据库**
2. 系统会自动在用户数据目录的 `backups/` 子目录下创建备份文件
3. 备份文件命名格式：`audit-backup-YYYY-MM-DDTHH-MM-SS.db`
4. 弹窗会显示备份文件的完整路径和大小

#### 方式二：通过系统设置页面

1. 进入 **系统设置 > 数据备份** 选项卡
2. 点击 **创建备份** 按钮
3. 备份文件列表中会显示新增的备份记录

### 8.2 备份文件存储位置

| 操作系统 | 备份目录 |
|---------|---------|
| Windows | `C:\Users\<用户名>\AppData\Roaming\audit-assistant-system\backups\` |
| macOS | `~/Library/Application Support/audit-assistant-system/backups/` |
| Linux | `~/.config/audit-assistant-system/backups/` |

### 8.3 恢复数据

1. 在应用中点击菜单栏 **文件 > 恢复数据库**（或在系统设置的数据备份页面点击恢复按钮）
2. 在文件选择对话框中选择 `.db` 格式的备份文件
3. 系统会自动执行以下操作：
   - 先对当前数据库创建一份备份（防止误操作）
   - 关闭当前数据库连接
   - 用备份文件替换当前数据库
   - 重新初始化数据库连接
4. 恢复成功后，应用会提示重启，确认后应用将自动重启

### 8.4 备份管理

在系统设置的数据备份页面可以：

- 查看所有备份文件的文件名、大小和创建时间
- 恢复指定备份
- 删除不需要的备份文件

---

## 9. 常见问题

### 9.1 原生模块编译错误（better-sqlite3）

**问题现象：**

```
Error: node-gyp rebuild failed
gyp ERR! stack Error: not found: make
```

**解决方案：**

- **Windows**：安装 Visual Studio Build Tools（C++ 桌面开发工作负载）
- **macOS**：执行 `xcode-select --install`
- **Linux**：执行 `sudo apt-get install -y build-essential python3`

**通用解决方案：**

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 9.2 开发端口被占用

**问题现象：**

```
Error: Port 5173 is already in use
```

**解决方案：**

```bash
# macOS / Linux
lsof -i :5173
kill -9 <PID>

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

> 本项目的 Vite 配置了 `strictPort: true`，端口 5173 被占用时不会自动切换到其他端口。

### 9.3 应用白屏或加载失败

**排查步骤：**

1. **开发模式**：打开 DevTools（Ctrl+Shift+I）查看控制台错误信息
2. **生产模式**：检查 `dist/index.html` 是否存在，路径是否正确
3. 确认 `vite.config.js` 中 `base` 配置为 `'./'`（相对路径），而非 `'/'`
4. 检查 CSP（Content Security Policy）是否阻止了资源加载

### 9.4 AI 服务调用失败

**排查步骤：**

1. 确认已在 **AI 设置** 中正确配置了 API Key
2. 使用 **测试连接** 功能验证 API Key 是否有效
3. 检查网络连接是否正常，确认可以访问 AI 提供商的 API 地址
4. 确认 API 账户余额充足、未超出调用频率限制
5. 如果使用代理，确认代理配置正确

**常见错误信息：**

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `请先配置 xxx 的 API Key` | 未配置 API Key | 进入 AI 设置页面配置 |
| `API Key 无效或已过期` | Key 错误或过期 | 重新获取 API Key |
| `AI请求超时` | 网络不稳定或内容过多 | 检查网络，稍后重试 |
| `请求参数错误` | 模型名称不正确 | 检查模型名称是否在支持列表中 |

### 9.5 数据库初始化失败

**问题现象：**

```
数据库初始化失败: SQLITE_CANTOPEN: unable to open database file
```

**解决方案：**

1. 检查用户数据目录是否有写入权限
2. 确认磁盘空间充足
3. Linux 系统检查 `~/.config/` 目录权限：`chmod 755 ~/.config`

### 9.6 数据库 Schema 变更后数据异常

**问题现象：**

更新代码后，部分功能（如创建风险点、保存AI分析）报错。

**解决方案：**

数据库 Schema 发生变更后需要重置数据库：

1. 关闭应用
2. 打开数据库文件所在目录：`Win+R` 输入 `%APPDATA%\audit-assistant-system`
3. 删除所有 `.db`、`.db-wal`、`.db-shm` 文件
4. 重新启动应用，系统会自动重建数据库

### 9.7 构建失败（electron-builder）

**解决方案：**

```bash
# 先单独构建前端，确认 dist 目录正确生成
npm run build
ls dist/
# 确认 dist/index.html 存在后，再执行完整构建
npm run electron:build
```

### 9.8 macOS DMG 构建失败

```bash
xcode-select --install
sudo xcode-select --reset
```

### 9.9 Linux AppImage 无法运行

```bash
chmod +x 审计助手系统-*.AppImage
./审计助手系统-*.AppImage

# 如果缺少 FUSE 库
sudo apt-get install -y fuse libfuse2
```

---

## 10. 项目结构

```
audit-assistant-system/
├── electron/                    # Electron 主进程代码
│   ├── main.mjs                 # 主进程入口（窗口管理、IPC 注册、应用生命周期）
│   ├── preload.mjs              # 预加载脚本（contextBridge 安全 API 暴露）
│   ├── database.mjs             # 数据库模块（SQLite 连接、数据表定义、CRUD）
│   └── ai-service.mjs           # AI 服务适配器（DeepSeek/Qwen/Hunyuan/Doubao）
│
├── src/                         # Vue 前端源码
│   ├── main.js                  # Vue 应用入口
│   ├── App.vue                  # 根组件
│   ├── router/
│   │   └── index.js             # Vue Router 路由配置（含自动登录）
│   ├── stores/
│   │   ├── auth.js              # 认证状态管理（Pinia）
│   │   ├── project.js           # 项目状态管理（Pinia）
│   │   └── settings.js          # 设置状态管理（Pinia）
│   ├── views/
│   │   ├── Login.vue            # 登录页面
│   │   ├── Dashboard.vue        # 仪表盘/首页
│   │   ├── ProjectList.vue      # 审计项目列表
│   │   ├── ProjectDetail.vue    # 审计项目详情（含AI分析、风险点、待办事项）
│   │   ├── InterviewDetail.vue  # 访谈记录详情（含AI辅助分析）
│   │   ├── IntervieweeDetail.vue# 被访谈人详情
│   │   ├── RiskMatrix.vue       # 风险矩阵视图（5x5矩阵）
│   │   ├── AISettings.vue       # AI 服务配置页面
│   │   └── SystemSettings.vue   # 系统设置页面
│   └── components/
│       ├── layout/
│       │   └── MainLayout.vue   # 主布局组件（侧边栏 + 顶栏 + 内容区）
│       └── common/
│           ├── ProjectCard.vue      # 项目卡片组件
│           ├── InterviewForm.vue    # 访谈表单组件
│           └── RiskPointDialog.vue  # 风险点编辑对话框组件
│
├── public/                      # 静态资源目录
│   └── icon.png                 # 应用图标
│
├── index.html                   # Vite 入口 HTML
├── package.json                 # 项目配置与依赖声明
├── vite.config.js               # Vite 构建配置
├── DEPLOY.md                    # 构建与部署指南（本文档）
├── USER_GUIDE.md                # 用户使用说明书
├── .gitignore                   # Git 忽略规则
├── dist/                        # Vite 构建输出（git 忽略）
└── release/                     # electron-builder 构建产物（git 忽略）
```

---

## 11. 技术栈

### 11.1 核心框架

| 技术 | 版本 | 说明 |
|------|------|------|
| Electron | ^31.0.2 | 跨平台桌面应用框架 |
| Vue | ^3.4.31 | 渐进式 JavaScript 框架 |
| Element Plus | ^2.7.6 | 基于 Vue 3 的 UI 组件库 |
| @element-plus/icons-vue | ^2.3.1 | Element Plus 图标库 |

### 11.2 构建工具

| 技术 | 版本 | 说明 |
|------|------|------|
| Vite | ^5.3.3 | 前端构建工具 |
| @vitejs/plugin-vue | ^5.0.5 | Vite Vue 3 插件 |
| electron-builder | ^24.13.3 | Electron 应用打包工具 |
| @electron/rebuild | ^3.7.1 | Electron 原生模块重编译工具 |

### 11.3 数据与状态管理

| 技术 | 版本 | 说明 |
|------|------|------|
| better-sqlite3 | ^11.0.0 | SQLite 原生绑定（同步 API） |
| Pinia | ^2.1.7 | Vue 状态管理库 |
| vue-router | ^4.4.0 | Vue 官方路由 |

### 11.4 工具库

| 技术 | 版本 | 说明 |
|------|------|------|
| axios | ^1.7.2 | HTTP 客户端（用于 AI API 调用） |
| bcryptjs | ^2.4.3 | 密码哈希（纯 JavaScript 实现） |
| uuid | ^10.0.0 | UUID 生成器 |

### 11.5 开发工具

| 技术 | 版本 | 说明 |
|------|------|------|
| concurrently | ^8.2.2 | 并行运行多个命令 |
| cross-env | ^7.0.3 | 跨平台环境变量设置 |
| wait-on | ^7.2.0 | 等待资源就绪（端口、文件等） |

### 11.6 NPM Scripts

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 前端开发服务器 |
| `npm run build` | 构建前端产物到 `dist/` |
| `npm run electron:dev` | 启动 Electron + Vite 联合开发模式 |
| `npm run electron:build` | 构建生产环境安装包 |
| `npm run rebuild` | 重新编译 better-sqlite3 原生模块 |
| `npm run preview` | 预览构建后的前端产物 |

---

## 附录：快速开始清单

1. 安装 Node.js 18+、npm 9+ 和 Python 3.8+
2. 安装平台对应的 C++ 编译工具链
3. 克隆项目仓库：`git clone <仓库地址>`
4. 安装依赖：`npm install`
5. 启动开发模式：`npm run electron:dev`
6. 使用默认账户登录：用户名 `admin`，密码 `admin123`
7. 在 AI 设置中配置 API Key 并测试连接
8. 开始使用审计助手系统
