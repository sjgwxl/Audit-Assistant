import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import {
  initDatabase,
  closeDatabase,
  authDB,
  projectDB,
  intervieweeDB,
  interviewDB,
  riskPointDB,
  aiAnalysisDB,
  todoDB,
  attachmentDB,
  settingsDB,
  logDB,
  backupDB,
  globalSearch
} from './database.mjs'
import aiService from './ai-service.mjs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let autoSaveTimer = null

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    title: '审计助手系统',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    frame: true,
    backgroundColor: '#f5f7fa'
  })

  // 窗口准备好后显示
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 加载页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 外部链接在默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * 创建应用菜单
 */
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:new-project')
            }
          }
        },
        { type: 'separator' },
        {
          label: '备份数据库',
          click: async () => {
            const result = backupDB.create()
            if (result.success) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '备份成功',
                message: `数据库已备份至:\n${result.path}\n大小: ${(result.size / 1024).toFixed(2)} KB`
              })
            } else {
              dialog.showErrorBox('备份失败', result.message)
            }
          }
        },
        {
          label: '恢复数据库',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: '选择备份文件',
              filters: [{ name: '数据库备份', extensions: ['db'] }],
              properties: ['openFile']
            })
            if (!result.canceled && result.filePaths.length > 0) {
              const restoreResult = backupDB.restore(result.filePaths[0])
              if (restoreResult.success) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: '恢复成功',
                  message: '数据库已恢复，应用将重新启动。',
                  buttons: ['确定']
                }).then(() => {
                  app.relaunch()
                  app.exit()
                })
              } else {
                dialog.showErrorBox('恢复失败', restoreResult.message)
              }
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于审计助手系统',
              message: '审计助手系统 v1.0.0',
              detail: '基于 Electron + Vue 3 + Element Plus 构建的桌面审计辅助工具。\n支持 AI 智能分析，助力审计工作数字化。'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ============================================================
// 注册 IPC 处理器
// ============================================================

function registerIpcHandlers() {

  // ----------------------------------------------------------
  // 认证相关
  // ----------------------------------------------------------
  ipcMain.handle('auth:login', async (_event, username, password) => {
    try {
      return authDB.login(username, password)
    } catch (err) {
      return { success: false, message: `登录失败: ${err.message}` }
    }
  })

  ipcMain.handle('auth:register', async (_event, userData) => {
    try {
      return authDB.register(userData)
    } catch (err) {
      return { success: false, message: `注册失败: ${err.message}` }
    }
  })

  ipcMain.handle('auth:changePassword', async (_event, userId, oldPassword, newPassword) => {
    try {
      return authDB.changePassword(userId, oldPassword, newPassword)
    } catch (err) {
      return { success: false, message: `修改密码失败: ${err.message}` }
    }
  })

  ipcMain.handle('auth:listUsers', async () => {
    try {
      return { success: true, data: authDB.listUsers() }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('auth:updateUser', async (_event, userId, updates) => {
    try {
      return authDB.updateUser(userId, updates)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('auth:deleteUser', async (_event, userId) => {
    try {
      return authDB.deleteUser(userId)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // ----------------------------------------------------------
  // 审计项目 CRUD
  // ----------------------------------------------------------
  ipcMain.handle('projects:create', async (_event, projectData) => {
    try {
      return projectDB.create(projectData)
    } catch (err) {
      return { success: false, message: `创建项目失败: ${err.message}` }
    }
  })

  ipcMain.handle('projects:getById', async (_event, id) => {
    try {
      const project = projectDB.getById(id)
      return project ? { success: true, data: project } : { success: false, message: '项目不存在' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('projects:list', async (_event, filters) => {
    try {
      return { success: true, data: projectDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('projects:update', async (_event, id, updates) => {
    try {
      return projectDB.update(id, updates)
    } catch (err) {
      return { success: false, message: `更新项目失败: ${err.message}` }
    }
  })

  ipcMain.handle('projects:delete', async (_event, id) => {
    try {
      return projectDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除项目失败: ${err.message}` }
    }
  })

  ipcMain.handle('projects:getStats', async () => {
    try {
      return { success: true, data: projectDB.getStats() }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // ----------------------------------------------------------
  // 被访谈人 CRUD
  // ----------------------------------------------------------
  ipcMain.handle('interviewees:create', async (_event, data) => {
    try {
      return intervieweeDB.create(data)
    } catch (err) {
      return { success: false, message: `创建被访谈人失败: ${err.message}` }
    }
  })

  ipcMain.handle('interviewees:getById', async (_event, id) => {
    try {
      const data = intervieweeDB.getById(id)
      return data ? { success: true, data } : { success: false, message: '被访谈人不存在' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('interviewees:list', async (_event, filters) => {
    try {
      return { success: true, data: intervieweeDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('interviewees:update', async (_event, id, updates) => {
    try {
      return intervieweeDB.update(id, updates)
    } catch (err) {
      return { success: false, message: `更新被访谈人失败: ${err.message}` }
    }
  })

  ipcMain.handle('interviewees:delete', async (_event, id) => {
    try {
      return intervieweeDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除被访谈人失败: ${err.message}` }
    }
  })

  // ----------------------------------------------------------
  // 访谈记录 CRUD
  // ----------------------------------------------------------
  ipcMain.handle('interviews:create', async (_event, data) => {
    try {
      return interviewDB.create(data)
    } catch (err) {
      return { success: false, message: `创建访谈记录失败: ${err.message}` }
    }
  })

  ipcMain.handle('interviews:getById', async (_event, id) => {
    try {
      const data = interviewDB.getById(id)
      return data ? { success: true, data } : { success: false, message: '访谈记录不存在' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('interviews:list', async (_event, filters) => {
    try {
      return { success: true, data: interviewDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('interviews:update', async (_event, id, updates) => {
    try {
      return interviewDB.update(id, updates)
    } catch (err) {
      return { success: false, message: `更新访谈记录失败: ${err.message}` }
    }
  })

  ipcMain.handle('interviews:delete', async (_event, id) => {
    try {
      return interviewDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除访谈记录失败: ${err.message}` }
    }
  })

  // ----------------------------------------------------------
  // 风险点 CRUD
  // ----------------------------------------------------------
  ipcMain.handle('riskPoints:create', async (_event, data) => {
    try {
      return riskPointDB.create(data)
    } catch (err) {
      return { success: false, message: `创建风险点失败: ${err.message}` }
    }
  })

  ipcMain.handle('riskPoints:getById', async (_event, id) => {
    try {
      const data = riskPointDB.getById(id)
      return data ? { success: true, data } : { success: false, message: '风险点不存在' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('riskPoints:list', async (_event, filters) => {
    try {
      return { success: true, data: riskPointDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('riskPoints:getRiskMatrix', async (_event, projectId) => {
    try {
      return { success: true, data: riskPointDB.getRiskMatrix(projectId) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('riskPoints:update', async (_event, id, updates) => {
    try {
      return riskPointDB.update(id, updates)
    } catch (err) {
      return { success: false, message: `更新风险点失败: ${err.message}` }
    }
  })

  ipcMain.handle('riskPoints:delete', async (_event, id) => {
    try {
      return riskPointDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除风险点失败: ${err.message}` }
    }
  })

  // ----------------------------------------------------------
  // AI 分析
  // ----------------------------------------------------------
  ipcMain.handle('aiAnalysis:save', async (_event, data) => {
    try {
      console.log('[AI分析] 保存请求:', { project_id: data.project_id, title: data.title, content_length: data.content?.length })
      const result = aiAnalysisDB.create(data)
      console.log('[AI分析] 保存成功:', result)
      return result
    } catch (err) {
      console.error('[AI分析] 保存失败:', err.message)
      return { success: false, message: `保存 AI 分析失败: ${err.message}` }
    }
  })

  ipcMain.handle('aiAnalysis:getById', async (_event, id) => {
    try {
      const data = aiAnalysisDB.getById(id)
      return data ? { success: true, data } : { success: false, message: '分析记录不存在' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('aiAnalysis:list', async (_event, filters) => {
    try {
      const list = aiAnalysisDB.list(filters || {})
      console.log('[AI分析] 列表查询:', { filters, count: list?.length })
      return { success: true, data: list }
    } catch (err) {
      console.error('[AI分析] 列表查询失败:', err.message)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('aiAnalysis:update', async (_event, id, updates) => {
    try {
      return aiAnalysisDB.update(id, updates)
    } catch (err) {
      return { success: false, message: `更新 AI 分析失败: ${err.message}` }
    }
  })

  ipcMain.handle('aiAnalysis:delete', async (_event, id) => {
    try {
      return aiAnalysisDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除 AI 分析失败: ${err.message}` }
    }
  })

  // AI 聊天调用
  ipcMain.handle('ai:chat', async (_event, options) => {
    try {
      return await aiService.chat(options)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 带降级的调用
  ipcMain.handle('ai:chatWithFallback', async (_event, options, fallbackProviders) => {
    try {
      return await aiService.chatWithFallback(options, fallbackProviders)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 分析访谈记录
  ipcMain.handle('ai:analyzeInterview', async (_event, content, projectName) => {
    try {
      return await aiService.analyzeInterview(content, projectName)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 风险评估
  ipcMain.handle('ai:assessRisk', async (_event, riskDescription, context) => {
    try {
      return await aiService.assessRisk(riskDescription, context)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 生成报告摘要
  ipcMain.handle('ai:generateAuditSummary', async (_event, projectInfo, findings) => {
    try {
      return await aiService.generateAuditSummary(projectInfo, findings)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 智能问答
  ipcMain.handle('ai:auditQA', async (_event, question, context) => {
    try {
      return await aiService.auditQA(question, context)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 获取提供商列表
  ipcMain.handle('ai:getProviders', async () => {
    try {
      return { success: true, data: aiService.getProviders() }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 轻量级：生成访谈摘要
  ipcMain.handle('ai:generateSummary', async (_event, content) => {
    try {
      return await aiService.generateSummary(content)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 轻量级：提取关键发现
  ipcMain.handle('ai:extractKeyFindings', async (_event, content, projectName) => {
    try {
      return await aiService.extractKeyFindings(content, projectName)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 轻量级：提取风险指标
  ipcMain.handle('ai:extractRiskIndicators', async (_event, content, projectName) => {
    try {
      return await aiService.extractRiskIndicators(content, projectName)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 保存 API Key
  ipcMain.handle('ai:saveApiKey', async (_event, provider, apiKey) => {
    try {
      aiService.saveApiKey(provider, apiKey)
      return { success: true, message: 'API Key 保存成功' }
    } catch (err) {
      return { success: false, message: `保存 API Key 失败: ${err.message}` }
    }
  })

  // AI 测试连接
  ipcMain.handle('ai:testConnection', async (_event, provider) => {
    try {
      return await aiService.testConnection(provider)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // AI 清除缓存
  ipcMain.handle('ai:clearCache', async () => {
    try {
      return aiService.clearCache()
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // ----------------------------------------------------------
  // 待办事项
  // ----------------------------------------------------------
  ipcMain.handle('todos:create', async (_event, data) => {
    try {
      return todoDB.create(data)
    } catch (err) {
      return { success: false, message: `创建待办事项失败: ${err.message}` }
    }
  })

  ipcMain.handle('todos:getById', async (_event, id) => {
    try {
      const data = todoDB.getById(id)
      return data ? { success: true, data } : { success: false, message: '待办事项不存在' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('todos:list', async (_event, filters) => {
    try {
      return { success: true, data: todoDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('todos:update', async (_event, id, updates) => {
    try {
      return todoDB.update(id, updates)
    } catch (err) {
      return { success: false, message: `更新待办事项失败: ${err.message}` }
    }
  })

  ipcMain.handle('todos:delete', async (_event, id) => {
    try {
      return todoDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除待办事项失败: ${err.message}` }
    }
  })

  // ----------------------------------------------------------
  // 附件
  // ----------------------------------------------------------
  ipcMain.handle('attachments:create', async (_event, data) => {
    try {
      return attachmentDB.create(data)
    } catch (err) {
      return { success: false, message: `创建附件失败: ${err.message}` }
    }
  })

  ipcMain.handle('attachments:list', async (_event, filters) => {
    try {
      return { success: true, data: attachmentDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('attachments:delete', async (_event, id) => {
    try {
      return attachmentDB.delete(id)
    } catch (err) {
      return { success: false, message: `删除附件失败: ${err.message}` }
    }
  })

  // 选择文件对话框
  ipcMain.handle('dialog:openFile', async (_event, options) => {
    return dialog.showOpenDialog(mainWindow, options || {})
  })

  // 保存文件对话框
  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    return dialog.showSaveDialog(mainWindow, options || {})
  })

  // ----------------------------------------------------------
  // 系统设置
  // ----------------------------------------------------------
  ipcMain.handle('settings:get', async (_event, key) => {
    try {
      return { success: true, data: settingsDB.get(key) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('settings:set', async (_event, key, value, type, category, description) => {
    try {
      return settingsDB.set(key, value, type, category, description)
    } catch (err) {
      return { success: false, message: `保存设置失败: ${err.message}` }
    }
  })

  ipcMain.handle('settings:list', async (_event, category) => {
    try {
      return { success: true, data: settingsDB.list(category) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('settings:delete', async (_event, key) => {
    try {
      return settingsDB.delete(key)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // ----------------------------------------------------------
  // 操作日志
  // ----------------------------------------------------------
  ipcMain.handle('logs:list', async (_event, filters) => {
    try {
      return { success: true, data: logDB.list(filters || {}) }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('logs:clear', async (_event, days) => {
    try {
      return logDB.clear(days || 90)
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  // ----------------------------------------------------------
  // 数据库备份与恢复
  // ----------------------------------------------------------
  ipcMain.handle('backup:create', async () => {
    try {
      return backupDB.create()
    } catch (err) {
      return { success: false, message: `备份失败: ${err.message}` }
    }
  })

  ipcMain.handle('backup:restore', async (_event, backupFilePath) => {
    try {
      return backupDB.restore(backupFilePath)
    } catch (err) {
      return { success: false, message: `恢复失败: ${err.message}` }
    }
  })

  ipcMain.handle('backup:list', async () => {
    try {
      return { success: true, data: backupDB.listBackups() }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('backup:delete', async (_event, backupPath) => {
    try {
      return backupDB.deleteBackup(backupPath)
    } catch (err) {
      return { success: false, message: `删除备份失败: ${err.message}` }
    }
  })

  // ----------------------------------------------------------
  // 全局搜索
  // ----------------------------------------------------------
  ipcMain.handle('search:global', async (_event, keyword, limit) => {
    try {
      return globalSearch(keyword, limit || 50)
    } catch (err) {
      return { success: false, message: err.message, results: [], total: 0 }
    }
  })

  // ----------------------------------------------------------
  // 自动保存
  // ----------------------------------------------------------
  ipcMain.handle('autosave:setInterval', async (_event, interval) => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
    }
    const ms = (interval || 30) * 1000
    autoSaveTimer = setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('autosave:trigger')
      }
    }, ms)
    return { success: true, interval }
  })
}

// ============================================================
// 应用生命周期
// ============================================================

app.whenReady().then(() => {
  // 初始化数据库
  try {
    initDatabase()
    console.log('数据库初始化成功')
  } catch (err) {
    console.error('数据库初始化失败:', err)
    dialog.showErrorBox('数据库错误', `数据库初始化失败: ${err.message}`)
    app.quit()
    return
  }

  // 创建窗口
  createWindow()

  // 创建菜单
  createMenu()

  // 注册 IPC 处理器
  registerIpcHandlers()

  // 启动自动保存（默认 30 秒）
  autoSaveTimer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('autosave:trigger')
    }
  }, 30000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // 清理自动保存定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }

  // 关闭数据库
  try {
    closeDatabase()
    console.log('数据库连接已关闭')
  } catch (err) {
    console.error('关闭数据库失败:', err)
  }
})

// 进程错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err)
  dialog.showErrorBox('应用程序错误', `发生未预期的错误: ${err.message}`)
})

process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason)
})
