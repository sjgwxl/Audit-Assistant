const { contextBridge, ipcRenderer } = require('electron')

/**
 * 通过 contextBridge 暴露安全的 API 给渲染进程
 * 所有 IPC 调用都通过 window.api 访问
 */

contextBridge.exposeInMainWorld('api', {

  // ============================================================
  // 认证相关
  // ============================================================
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    changePassword: (userId, oldPassword, newPassword) => ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
    listUsers: () => ipcRenderer.invoke('auth:listUsers'),
    updateUser: (userId, updates) => ipcRenderer.invoke('auth:updateUser', userId, updates),
    deleteUser: (userId) => ipcRenderer.invoke('auth:deleteUser', userId)
  },

  // ============================================================
  // 审计项目
  // ============================================================
  projects: {
    create: (projectData) => ipcRenderer.invoke('projects:create', projectData),
    getById: (id) => ipcRenderer.invoke('projects:getById', id),
    list: (filters) => ipcRenderer.invoke('projects:list', filters),
    update: (id, updates) => ipcRenderer.invoke('projects:update', id, updates),
    delete: (id) => ipcRenderer.invoke('projects:delete', id),
    getStats: () => ipcRenderer.invoke('projects:getStats')
  },

  // ============================================================
  // 被访谈人
  // ============================================================
  interviewees: {
    create: (data) => ipcRenderer.invoke('interviewees:create', data),
    getById: (id) => ipcRenderer.invoke('interviewees:getById', id),
    list: (filters) => ipcRenderer.invoke('interviewees:list', filters),
    update: (id, updates) => ipcRenderer.invoke('interviewees:update', id, updates),
    delete: (id) => ipcRenderer.invoke('interviewees:delete', id)
  },

  // ============================================================
  // 访谈记录
  // ============================================================
  interviews: {
    create: (data) => ipcRenderer.invoke('interviews:create', data),
    getById: (id) => ipcRenderer.invoke('interviews:getById', id),
    list: (filters) => ipcRenderer.invoke('interviews:list', filters),
    update: (id, updates) => ipcRenderer.invoke('interviews:update', id, updates),
    delete: (id) => ipcRenderer.invoke('interviews:delete', id)
  },

  // ============================================================
  // 风险点
  // ============================================================
  riskPoints: {
    create: (data) => ipcRenderer.invoke('riskPoints:create', data),
    getById: (id) => ipcRenderer.invoke('riskPoints:getById', id),
    list: (filters) => ipcRenderer.invoke('riskPoints:list', filters),
    getRiskMatrix: (projectId) => ipcRenderer.invoke('riskPoints:getRiskMatrix', projectId),
    update: (id, updates) => ipcRenderer.invoke('riskPoints:update', id, updates),
    delete: (id) => ipcRenderer.invoke('riskPoints:delete', id)
  },

  // ============================================================
  // AI 分析
  // ============================================================
  aiAnalysis: {
    save: (data) => ipcRenderer.invoke('aiAnalysis:save', data),
    getById: (id) => ipcRenderer.invoke('aiAnalysis:getById', id),
    list: (filters) => ipcRenderer.invoke('aiAnalysis:list', filters),
    update: (id, updates) => ipcRenderer.invoke('aiAnalysis:update', id, updates),
    delete: (id) => ipcRenderer.invoke('aiAnalysis:delete', id)
  },

  // ============================================================
  // AI 服务
  // ============================================================
  ai: {
    chat: (options) => ipcRenderer.invoke('ai:chat', options),
    chatWithFallback: (options, fallbackProviders) => ipcRenderer.invoke('ai:chatWithFallback', options, fallbackProviders),
    analyzeInterview: (content, projectName) => ipcRenderer.invoke('ai:analyzeInterview', content, projectName),
    assessRisk: (riskDescription, context) => ipcRenderer.invoke('ai:assessRisk', riskDescription, context),
    generateAuditSummary: (projectInfo, findings) => ipcRenderer.invoke('ai:generateAuditSummary', projectInfo, findings),
    auditQA: (question, context) => ipcRenderer.invoke('ai:auditQA', question, context),
    getProviders: () => ipcRenderer.invoke('ai:getProviders'),
    saveApiKey: (provider, apiKey) => ipcRenderer.invoke('ai:saveApiKey', provider, apiKey),
    testConnection: (provider) => ipcRenderer.invoke('ai:testConnection', provider),
    clearCache: () => ipcRenderer.invoke('ai:clearCache')
  },

  // ============================================================
  // 待办事项
  // ============================================================
  todos: {
    create: (data) => ipcRenderer.invoke('todos:create', data),
    getById: (id) => ipcRenderer.invoke('todos:getById', id),
    list: (filters) => ipcRenderer.invoke('todos:list', filters),
    update: (id, updates) => ipcRenderer.invoke('todos:update', id, updates),
    delete: (id) => ipcRenderer.invoke('todos:delete', id)
  },

  // ============================================================
  // 附件
  // ============================================================
  attachments: {
    create: (data) => ipcRenderer.invoke('attachments:create', data),
    list: (filters) => ipcRenderer.invoke('attachments:list', filters),
    delete: (id) => ipcRenderer.invoke('attachments:delete', id)
  },

  // ============================================================
  // 系统设置
  // ============================================================
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value, type, category, description) => ipcRenderer.invoke('settings:set', key, value, type, category, description),
    list: (category) => ipcRenderer.invoke('settings:list', category),
    delete: (key) => ipcRenderer.invoke('settings:delete', key)
  },

  // ============================================================
  // 操作日志
  // ============================================================
  logs: {
    list: (filters) => ipcRenderer.invoke('logs:list', filters),
    clear: (days) => ipcRenderer.invoke('logs:clear', days)
  },

  // ============================================================
  // 数据库备份与恢复
  // ============================================================
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupFilePath) => ipcRenderer.invoke('backup:restore', backupFilePath),
    list: () => ipcRenderer.invoke('backup:list'),
    delete: (backupPath) => ipcRenderer.invoke('backup:delete', backupPath)
  },

  // ============================================================
  // 全局搜索
  // ============================================================
  search: {
    global: (keyword, limit) => ipcRenderer.invoke('search:global', keyword, limit)
  },

  // ============================================================
  // 文件对话框
  // ============================================================
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
  },

  // ============================================================
  // 自动保存
  // ============================================================
  autosave: {
    setInterval: (interval) => ipcRenderer.invoke('autosave:setInterval', interval),
    onTrigger: (callback) => ipcRenderer.on('autosave:trigger', (_event) => callback())
  },

  // ============================================================
  // 菜单事件
  // ============================================================
  onMenu: {
    newProject: (callback) => ipcRenderer.on('menu:new-project', (_event) => callback())
  }
})
