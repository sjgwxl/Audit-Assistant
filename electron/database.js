import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const DB_NAME = 'audit-assistant.db'
let db = null

/**
 * 获取数据库路径
 */
function getDbPath() {
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  return path.join(userDataPath, DB_NAME)
}

/**
 * 初始化数据库连接
 */
export function initDatabase() {
  const dbPath = getDbPath()
  db = new Database(dbPath)

  // 启用 WAL 模式提升性能
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  createDefaultAdmin()

  return db
}

/**
 * 获取数据库实例
 */
export function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * 创建所有数据表
 */
function createTables() {
  const createStatements = [
    // 用户表
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      real_name TEXT,
      role TEXT NOT NULL DEFAULT 'auditor' CHECK(role IN ('admin', 'auditor', 'viewer')),
      department TEXT,
      email TEXT,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,

    // 审计项目表
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      type TEXT NOT NULL DEFAULT 'routine' CHECK(type IN ('routine', 'special', 'follow-up', 'other')),
      status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'executing', 'reviewing', 'completed', 'archived')),
      description TEXT,
      audit_object TEXT,
      audit_period_start TEXT,
      audit_period_end TEXT,
      audit_scope TEXT,
      audit_team TEXT,
      leader_id TEXT,
      budget_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low', 'medium', 'high', 'critical')),
      findings_count INTEGER DEFAULT 0,
      remark TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (leader_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // 被审计对象（被访谈人）表
    `CREATE TABLE IF NOT EXISTS interviewees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      position TEXT,
      department TEXT,
      company TEXT,
      phone TEXT,
      email TEXT,
      id_card TEXT,
      role_in_audit TEXT,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,

    // 访谈记录表
    `CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      interviewee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time_start TEXT,
      time_end TEXT,
      location TEXT,
      interviewer TEXT,
      content TEXT,
      summary TEXT,
      key_findings TEXT,
      risk_indicators TEXT,
      action_items TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'reviewed', 'confirmed', 'archived')),
      audio_file_path TEXT,
      remark TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (interviewee_id) REFERENCES interviewees(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // 风险点表
    `CREATE TABLE IF NOT EXISTS risk_points (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'financial' CHECK(category IN ('financial', 'operational', 'compliance', 'strategic', 'information', 'other')),
      description TEXT,
      risk_level TEXT NOT NULL DEFAULT 'medium' CHECK(risk_level IN ('low', 'medium', 'high', 'critical')),
      likelihood TEXT DEFAULT 'medium' CHECK(likelihood IN ('rare', 'unlikely', 'possible', 'likely', 'almost_certain')),
      impact TEXT DEFAULT 'moderate' CHECK(impact IN ('insignificant', 'minor', 'moderate', 'major', 'catastrophic')),
      source TEXT,
      related_interview_id TEXT,
      evidence TEXT,
      mitigation_plan TEXT,
      responsible_person TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'identified' CHECK(status IN ('identified', 'analyzing', 'mitigating', 'resolved', 'accepted', 'transferred')),
      remark TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (related_interview_id) REFERENCES interviews(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // AI 分析结果表
    `CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      source_type TEXT NOT NULL CHECK(source_type IN ('interview', 'document', 'risk', 'general')),
      source_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      prompt TEXT,
      full_response TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      quality_score REAL,
      is_saved INTEGER DEFAULT 0,
      remark TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // 待办事项表
    `CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      due_date TEXT,
      assignee_id TEXT,
      completed_at TEXT,
      remark TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // 附件表
    `CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      related_type TEXT NOT NULL CHECK(related_type IN ('interview', 'risk_point', 'ai_analysis', 'project')),
      related_id TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      file_type TEXT,
      mime_type TEXT,
      remark TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // 系统设置表
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
      category TEXT DEFAULT 'general',
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`,

    // 操作日志表
    `CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ]

  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
    'CREATE INDEX IF NOT EXISTS idx_projects_leader ON projects(leader_id)',
    'CREATE INDEX IF NOT EXISTS idx_interviews_project ON interviews(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_interviews_interviewee ON interviews(interviewee_id)',
    'CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(date)',
    'CREATE INDEX IF NOT EXISTS idx_risk_points_project ON risk_points(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_risk_points_level ON risk_points(risk_level)',
    'CREATE INDEX IF NOT EXISTS idx_risk_points_status ON risk_points(status)',
    'CREATE INDEX IF NOT EXISTS idx_ai_analyses_project ON ai_analyses(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_analyses_source ON ai_analyses(source_type, source_id)',
    'CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)',
    'CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee_id)',
    'CREATE INDEX IF NOT EXISTS idx_attachments_project ON attachments(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_attachments_related ON attachments(related_type, related_id)',
    'CREATE INDEX IF NOT EXISTS idx_operation_logs_user ON operation_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action)',
    'CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at)'
  ]

  const transaction = db.transaction(() => {
    for (const sql of createStatements) {
      db.exec(sql)
    }
    for (const sql of createIndexes) {
      db.exec(sql)
    }
  })

  transaction()
}

/**
 * 创建默认管理员账户
 */
function createDefaultAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!existing) {
    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync('admin123', salt)
    const id = generateId()

    db.prepare(`
      INSERT INTO users (id, username, password_hash, real_name, role, department, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'admin', passwordHash, '系统管理员', 'admin', '信息中心', 1)
  }
}

/**
 * 生成 UUID
 */
function generateId() {
  return uuidv4()
}

// ============================================================
// 用户认证相关操作
// ============================================================

export const authDB = {
  /**
   * 用户登录
   */
  login(username, password) {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username)
    if (!user) {
      return { success: false, message: '用户名或密码错误' }
    }

    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) {
      return { success: false, message: '用户名或密码错误' }
    }

    // 更新最后登录时间
    db.prepare('UPDATE users SET last_login_at = datetime("now", "localtime") WHERE id = ?').run(user.id)

    // 记录操作日志
    logOperation(user.id, user.username, 'login', 'user', user.id, '用户登录')

    const { password_hash, ...userInfo } = user
    return { success: true, user: userInfo }
  },

  /**
   * 用户注册
   */
  register(userData) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username)
    if (existing) {
      return { success: false, message: '用户名已存在' }
    }

    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync(userData.password, salt)
    const id = generateId()

    db.prepare(`
      INSERT INTO users (id, username, password_hash, real_name, role, department, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userData.username,
      passwordHash,
      userData.real_name || '',
      userData.role || 'auditor',
      userData.department || '',
      userData.email || '',
      userData.phone || ''
    )

    logOperation(id, userData.username, 'register', 'user', id, '新用户注册')

    return { success: true, message: '注册成功', userId: id }
  },

  /**
   * 修改密码
   */
  changePassword(userId, oldPassword, newPassword) {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId)
    if (!user) {
      return { success: false, message: '用户不存在' }
    }

    const valid = bcrypt.compareSync(oldPassword, user.password_hash)
    if (!valid) {
      return { success: false, message: '原密码错误' }
    }

    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync(newPassword, salt)

    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now", "localtime") WHERE id = ?')
      .run(passwordHash, userId)

    logOperation(userId, '', 'change_password', 'user', userId, '修改密码')

    return { success: true, message: '密码修改成功' }
  },

  /**
   * 获取所有用户
   */
  listUsers() {
    return db.prepare('SELECT id, username, real_name, role, department, email, phone, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC').all()
  },

  /**
   * 更新用户信息
   */
  updateUser(userId, updates) {
    const allowedFields = ['real_name', 'role', 'department', 'email', 'phone', 'is_active']
    const setClauses = []
    const values = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (setClauses.length === 0) {
      return { success: false, message: '没有需要更新的字段' }
    }

    setClauses.push('updated_at = datetime("now", "localtime")')
    values.push(userId)

    db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: true, message: '更新成功' }
  },

  /**
   * 删除用户
   */
  deleteUser(userId) {
    // 不允许删除 admin 用户
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId)
    if (user && user.username === 'admin') {
      return { success: false, message: '不能删除管理员账户' }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    return { success: true, message: '删除成功' }
  }
}

// ============================================================
// 审计项目 CRUD
// ============================================================

export const projectDB = {
  /**
   * 创建项目
   */
  create(projectData) {
    const id = generateId()
    db.prepare(`
      INSERT INTO projects (
        id, name, code, type, status, description, audit_object,
        audit_period_start, audit_period_end, audit_scope, audit_team,
        leader_id, budget_hours, risk_level, remark, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectData.name,
      projectData.code || null,
      projectData.type || 'routine',
      projectData.status || 'planning',
      projectData.description || '',
      projectData.audit_object || '',
      projectData.audit_period_start || null,
      projectData.audit_period_end || null,
      projectData.audit_scope || '',
      projectData.audit_team || '',
      projectData.leader_id || null,
      projectData.budget_hours || 0,
      projectData.risk_level || 'medium',
      projectData.remark || '',
      projectData.created_by || null
    )

    logOperation(projectData.created_by, '', 'create_project', 'project', id, `创建项目: ${projectData.name}`)
    return { success: true, id }
  },

  /**
   * 获取单个项目
   */
  getById(id) {
    const project = db.prepare(`
      SELECT p.*,
        u.real_name as leader_name
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
      WHERE p.id = ?
    `).get(id)

    if (!project) return null

    // 获取项目统计
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM interviews WHERE project_id = ?) as interview_count,
        (SELECT COUNT(*) FROM risk_points WHERE project_id = ?) as risk_count,
        (SELECT COUNT(*) FROM todos WHERE project_id = ? AND status != 'completed' AND status != 'cancelled') as pending_todo_count,
        (SELECT COUNT(*) FROM ai_analyses WHERE project_id = ?) as ai_analysis_count
    `).get(id, id, id, id)

    return { ...project, ...stats }
  },

  /**
   * 获取项目列表
   */
  list(filters = {}) {
    let sql = `
      SELECT p.*,
        u.real_name as leader_name,
        (SELECT COUNT(*) FROM interviews WHERE project_id = p.id) as interview_count,
        (SELECT COUNT(*) FROM risk_points WHERE project_id = p.id) as risk_count
      FROM projects p
      LEFT JOIN users u ON p.leader_id = u.id
      WHERE 1=1
    `
    const params = []

    if (filters.status) {
      sql += ' AND p.status = ?'
      params.push(filters.status)
    }
    if (filters.type) {
      sql += ' AND p.type = ?'
      params.push(filters.type)
    }
    if (filters.risk_level) {
      sql += ' AND p.risk_level = ?'
      params.push(filters.risk_level)
    }
    if (filters.keyword) {
      sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)'
      const kw = `%${filters.keyword}%`
      params.push(kw, kw, kw)
    }

    sql += ' ORDER BY p.updated_at DESC'

    if (filters.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }
    if (filters.offset) {
      sql += ' OFFSET ?'
      params.push(filters.offset)
    }

    return db.prepare(sql).all(...params)
  },

  /**
   * 更新项目
   */
  update(id, updates) {
    const allowedFields = [
      'name', 'code', 'type', 'status', 'description', 'audit_object',
      'audit_period_start', 'audit_period_end', 'audit_scope', 'audit_team',
      'leader_id', 'budget_hours', 'actual_hours', 'risk_level', 'findings_count', 'remark'
    ]
    const setClauses = ['updated_at = datetime("now", "localtime")']
    const values = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    values.push(id)

    const result = db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: result.changes > 0 }
  },

  /**
   * 删除项目
   */
  delete(id) {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    return { success: true }
  },

  /**
   * 获取项目统计概览
   */
  getStats() {
    return db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
        SUM(CASE WHEN status = 'executing' THEN 1 ELSE 0 END) as executing,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
      FROM projects
    `).get()
  }
}

// ============================================================
// 被访谈人 CRUD
// ============================================================

export const intervieweeDB = {
  create(data) {
    const id = generateId()
    db.prepare(`
      INSERT INTO interviewees (id, name, gender, position, department, company, phone, email, id_card, role_in_audit, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.gender || null, data.position || '', data.department || '',
      data.company || '', data.phone || '', data.email || '', data.id_card || '',
      data.role_in_audit || '', data.remark || ''
    )
    return { success: true, id }
  },

  getById(id) {
    return db.prepare('SELECT * FROM interviewees WHERE id = ?').get(id)
  },

  list(filters = {}) {
    let sql = 'SELECT * FROM interviewees WHERE 1=1'
    const params = []

    if (filters.project_id) {
      // 通过访谈关联查询
      sql = `
        SELECT DISTINCT i.* FROM interviewees i
        INNER JOIN interviews iv ON i.id = iv.interviewee_id
        WHERE iv.project_id = ?
      `
      params.push(filters.project_id)
    }

    if (filters.keyword) {
      if (filters.project_id) {
        sql += ' AND (i.name LIKE ? OR i.department LIKE ? OR i.company LIKE ?)'
      } else {
        sql += ' AND (name LIKE ? OR department LIKE ? OR company LIKE ?)'
      }
      const kw = `%${filters.keyword}%`
      params.push(kw, kw, kw)
    }

    sql += ' ORDER BY updated_at DESC'
    return db.prepare(sql).all(...params)
  },

  update(id, updates) {
    const allowedFields = ['name', 'gender', 'position', 'department', 'company', 'phone', 'email', 'id_card', 'role_in_audit', 'remark']
    const setClauses = ['updated_at = datetime("now", "localtime")']
    const values = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    values.push(id)
    const result = db.prepare(`UPDATE interviewees SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: result.changes > 0 }
  },

  delete(id) {
    db.prepare('DELETE FROM interviewees WHERE id = ?').run(id)
    return { success: true }
  }
}

// ============================================================
// 访谈记录 CRUD
// ============================================================

export const interviewDB = {
  create(data) {
    const id = generateId()
    db.prepare(`
      INSERT INTO interviews (
        id, project_id, interviewee_id, title, date, time_start, time_end,
        location, interviewer, content, summary, key_findings, risk_indicators,
        action_items, status, audio_file_path, remark, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.project_id, data.interviewee_id, data.title, data.date,
      data.time_start || null, data.time_end || null, data.location || '',
      data.interviewer || '', data.content || '', data.summary || '',
      data.key_findings || '', data.risk_indicators || '', data.action_items || '',
      data.status || 'draft', data.audio_file_path || null, data.remark || '',
      data.created_by || null
    )

    logOperation(data.created_by, '', 'create_interview', 'interview', id, `创建访谈: ${data.title}`)
    return { success: true, id }
  },

  getById(id) {
    return db.prepare(`
      SELECT iv.*,
        ie.name as interviewee_name,
        ie.department as interviewee_department,
        ie.position as interviewee_position
      FROM interviews iv
      LEFT JOIN interviewees ie ON iv.interviewee_id = ie.id
      WHERE iv.id = ?
    `).get(id)
  },

  list(filters = {}) {
    let sql = `
      SELECT iv.*,
        ie.name as interviewee_name,
        ie.department as interviewee_department
      FROM interviews iv
      LEFT JOIN interviewees ie ON iv.interviewee_id = ie.id
      WHERE 1=1
    `
    const params = []

    if (filters.project_id) {
      sql += ' AND iv.project_id = ?'
      params.push(filters.project_id)
    }
    if (filters.interviewee_id) {
      sql += ' AND iv.interviewee_id = ?'
      params.push(filters.interviewee_id)
    }
    if (filters.status) {
      sql += ' AND iv.status = ?'
      params.push(filters.status)
    }
    if (filters.keyword) {
      sql += ' AND (iv.title LIKE ? OR iv.summary LIKE ? OR ie.name LIKE ?)'
      const kw = `%${filters.keyword}%`
      params.push(kw, kw, kw)
    }
    if (filters.date_from) {
      sql += ' AND iv.date >= ?'
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      sql += ' AND iv.date <= ?'
      params.push(filters.date_to)
    }

    sql += ' ORDER BY iv.date DESC, iv.updated_at DESC'
    return db.prepare(sql).all(...params)
  },

  update(id, updates) {
    const allowedFields = [
      'project_id', 'interviewee_id', 'title', 'date', 'time_start', 'time_end',
      'location', 'interviewer', 'content', 'summary', 'key_findings',
      'risk_indicators', 'action_items', 'status', 'audio_file_path', 'remark'
    ]
    const setClauses = ['updated_at = datetime("now", "localtime")']
    const values = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    values.push(id)
    const result = db.prepare(`UPDATE interviews SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: result.changes > 0 }
  },

  delete(id) {
    db.prepare('DELETE FROM interviews WHERE id = ?').run(id)
    return { success: true }
  }
}

// ============================================================
// 风险点 CRUD
// ============================================================

export const riskPointDB = {
  create(data) {
    const id = generateId()
    db.prepare(`
      INSERT INTO risk_points (
        id, project_id, title, category, description, risk_level,
        likelihood, impact, source, related_interview_id, evidence,
        mitigation_plan, responsible_person, due_date, status, remark, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.project_id, data.title, data.category || 'financial',
      data.description || '', data.risk_level || 'medium',
      data.likelihood || 'medium', data.impact || 'moderate',
      data.source || '', data.related_interview_id || null,
      data.evidence || '', data.mitigation_plan || '',
      data.responsible_person || '', data.due_date || null,
      data.status || 'identified', data.remark || '', data.created_by || null
    )

    logOperation(data.created_by, '', 'create_risk', 'risk_point', id, `创建风险点: ${data.title}`)
    return { success: true, id }
  },

  getById(id) {
    return db.prepare(`
      SELECT rp.*,
        iv.title as interview_title
      FROM risk_points rp
      LEFT JOIN interviews iv ON rp.related_interview_id = iv.id
      WHERE rp.id = ?
    `).get(id)
  },

  list(filters = {}) {
    let sql = `
      SELECT rp.*,
        iv.title as interview_title
      FROM risk_points rp
      LEFT JOIN interviews iv ON rp.related_interview_id = iv.id
      WHERE 1=1
    `
    const params = []

    if (filters.project_id) {
      sql += ' AND rp.project_id = ?'
      params.push(filters.project_id)
    }
    if (filters.category) {
      sql += ' AND rp.category = ?'
      params.push(filters.category)
    }
    if (filters.risk_level) {
      sql += ' AND rp.risk_level = ?'
      params.push(filters.risk_level)
    }
    if (filters.status) {
      sql += ' AND rp.status = ?'
      params.push(filters.status)
    }
    if (filters.keyword) {
      sql += ' AND (rp.title LIKE ? OR rp.description LIKE ?)'
      const kw = `%${filters.keyword}%`
      params.push(kw, kw)
    }

    sql += ' ORDER BY rp.risk_level DESC, rp.updated_at DESC'
    return db.prepare(sql).all(...params)
  },

  /**
   * 获取风险矩阵数据
   */
  getRiskMatrix(projectId) {
    return db.prepare(`
      SELECT risk_level, likelihood, impact, COUNT(*) as count
      FROM risk_points
      WHERE project_id = ?
      GROUP BY risk_level, likelihood, impact
    `).all(projectId)
  },

  update(id, updates) {
    const allowedFields = [
      'title', 'category', 'description', 'risk_level', 'likelihood', 'impact',
      'source', 'related_interview_id', 'evidence', 'mitigation_plan',
      'responsible_person', 'due_date', 'status', 'remark'
    ]
    const setClauses = ['updated_at = datetime("now", "localtime")']
    const values = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    values.push(id)
    const result = db.prepare(`UPDATE risk_points SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: result.changes > 0 }
  },

  delete(id) {
    db.prepare('DELETE FROM risk_points WHERE id = ?').run(id)
    return { success: true }
  }
}

// ============================================================
// AI 分析 CRUD
// ============================================================

export const aiAnalysisDB = {
  create(data) {
    const id = generateId()
    db.prepare(`
      INSERT INTO ai_analyses (
        id, project_id, source_type, source_id, title, content,
        provider, model, prompt, full_response, tokens_used, cost,
        quality_score, is_saved, remark, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.project_id || null, data.source_type, data.source_id || null,
      data.title, data.content, data.provider || '', data.model || '',
      data.prompt || '', data.full_response || '', data.tokens_used || 0,
      data.cost || 0, data.quality_score || null, data.is_saved ? 1 : 0,
      data.remark || '', data.created_by || null
    )
    return { success: true, id }
  },

  getById(id) {
    return db.prepare('SELECT * FROM ai_analyses WHERE id = ?').get(id)
  },

  list(filters = {}) {
    let sql = 'SELECT * FROM ai_analyses WHERE 1=1'
    const params = []

    if (filters.project_id) {
      sql += ' AND project_id = ?'
      params.push(filters.project_id)
    }
    if (filters.source_type) {
      sql += ' AND source_type = ?'
      params.push(filters.source_type)
    }
    if (filters.source_id) {
      sql += ' AND source_id = ?'
      params.push(filters.source_id)
    }
    if (filters.is_saved !== undefined) {
      sql += ' AND is_saved = ?'
      params.push(filters.is_saved ? 1 : 0)
    }
    if (filters.keyword) {
      sql += ' AND (title LIKE ? OR content LIKE ?)'
      const kw = `%${filters.keyword}%`
      params.push(kw, kw)
    }

    sql += ' ORDER BY created_at DESC'
    return db.prepare(sql).all(...params)
  },

  update(id, updates) {
    const allowedFields = ['title', 'content', 'is_saved', 'remark', 'quality_score']
    const setClauses = ['updated_at = datetime("now", "localtime")']
    const values = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'is_saved') {
          setClauses.push(`${field} = ?`)
          values.push(updates[field] ? 1 : 0)
        } else {
          setClauses.push(`${field} = ?`)
          values.push(updates[field])
        }
      }
    }

    values.push(id)
    const result = db.prepare(`UPDATE ai_analyses SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: result.changes > 0 }
  },

  delete(id) {
    db.prepare('DELETE FROM ai_analyses WHERE id = ?').run(id)
    return { success: true }
  }
}

// ============================================================
// 待办事项 CRUD
// ============================================================

export const todoDB = {
  create(data) {
    const id = generateId()
    db.prepare(`
      INSERT INTO todos (id, project_id, title, description, priority, status, due_date, assignee_id, remark, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.project_id || null, data.title, data.description || '',
      data.priority || 'medium', data.status || 'pending',
      data.due_date || null, data.assignee_id || null,
      data.remark || '', data.created_by || null
    )
    return { success: true, id }
  },

  getById(id) {
    return db.prepare(`
      SELECT t.*, u.real_name as assignee_name
      FROM todos t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(id)
  },

  list(filters = {}) {
    let sql = `
      SELECT t.*, u.real_name as assignee_name
      FROM todos t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE 1=1
    `
    const params = []

    if (filters.project_id) {
      sql += ' AND t.project_id = ?'
      params.push(filters.project_id)
    }
    if (filters.status) {
      sql += ' AND t.status = ?'
      params.push(filters.status)
    }
    if (filters.priority) {
      sql += ' AND t.priority = ?'
      params.push(filters.priority)
    }
    if (filters.assignee_id) {
      sql += ' AND t.assignee_id = ?'
      params.push(filters.assignee_id)
    }

    sql += ' ORDER BY t.priority DESC, t.due_date ASC, t.created_at DESC'
    return db.prepare(sql).all(...params)
  },

  update(id, updates) {
    const allowedFields = ['title', 'description', 'priority', 'status', 'due_date', 'assignee_id', 'remark']
    const setClauses = ['updated_at = datetime("now", "localtime")']
    const values = []

    if (updates.status === 'completed') {
      setClauses.push('completed_at = datetime("now", "localtime")')
    }

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    values.push(id)
    const result = db.prepare(`UPDATE todos SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
    return { success: result.changes > 0 }
  },

  delete(id) {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id)
    return { success: true }
  }
}

// ============================================================
// 附件 CRUD
// ============================================================

export const attachmentDB = {
  create(data) {
    const id = generateId()
    db.prepare(`
      INSERT INTO attachments (id, project_id, related_type, related_id, file_name, file_path, file_size, file_type, mime_type, remark, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.project_id || null, data.related_type, data.related_id || null,
      data.file_name, data.file_path, data.file_size || 0,
      data.file_type || '', data.mime_type || '',
      data.remark || '', data.created_by || null
    )
    return { success: true, id }
  },

  list(filters = {}) {
    let sql = 'SELECT * FROM attachments WHERE 1=1'
    const params = []

    if (filters.project_id) {
      sql += ' AND project_id = ?'
      params.push(filters.project_id)
    }
    if (filters.related_type) {
      sql += ' AND related_type = ?'
      params.push(filters.related_type)
    }
    if (filters.related_id) {
      sql += ' AND related_id = ?'
      params.push(filters.related_id)
    }

    sql += ' ORDER BY created_at DESC'
    return db.prepare(sql).all(...params)
  },

  delete(id) {
    const attachment = db.prepare('SELECT file_path FROM attachments WHERE id = ?').get(id)
    if (attachment) {
      try {
        if (fs.existsSync(attachment.file_path)) {
          fs.unlinkSync(attachment.file_path)
        }
      } catch (err) {
        console.error('删除附件文件失败:', err)
      }
    }
    db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
    return { success: true }
  }
}

// ============================================================
// 系统设置
// ============================================================

export const settingsDB = {
  get(key) {
    const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key)
    if (!row) return null

    // 根据类型转换值
    switch (row.type) {
      case 'number': return Number(row.value)
      case 'boolean': return row.value === 'true'
      case 'json':
        try { return JSON.parse(row.value) }
        catch { return row.value }
      default: return row.value
    }
  },

  set(key, value, type = 'string', category = 'general', description = '') {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

    db.prepare(`
      INSERT INTO settings (key, value, type, category, description, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        category = excluded.category,
        description = excluded.description,
        updated_at = datetime('now', 'localtime')
    `).run(key, stringValue, type, category, description)

    return { success: true }
  },

  list(category) {
    if (category) {
      return db.prepare('SELECT * FROM settings WHERE category = ? ORDER BY key').all(category)
    }
    return db.prepare('SELECT * FROM settings ORDER BY category, key').all()
  },

  delete(key) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key)
    return { success: true }
  }
}

// ============================================================
// 操作日志
// ============================================================

function logOperation(userId, username, action, targetType, targetId, detail) {
  try {
    db.prepare(`
      INSERT INTO operation_logs (id, user_id, username, action, target_type, target_id, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), userId, username, action, targetType, targetId, detail)
  } catch (err) {
    console.error('记录操作日志失败:', err)
  }
}

export const logDB = {
  list(filters = {}) {
    let sql = `
      SELECT ol.*, u.real_name as user_real_name
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE 1=1
    `
    const params = []

    if (filters.user_id) {
      sql += ' AND ol.user_id = ?'
      params.push(filters.user_id)
    }
    if (filters.action) {
      sql += ' AND ol.action = ?'
      params.push(filters.action)
    }
    if (filters.target_type) {
      sql += ' AND ol.target_type = ?'
      params.push(filters.target_type)
    }
    if (filters.date_from) {
      sql += ' AND ol.created_at >= ?'
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      sql += ' AND ol.created_at <= ?'
      params.push(filters.date_to)
    }

    sql += ' ORDER BY ol.created_at DESC'

    if (filters.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }

    return db.prepare(sql).all(...params)
  },

  clear(days = 90) {
    db.prepare(`
      DELETE FROM operation_logs
      WHERE created_at < datetime('now', 'localtime', '-' || ? || ' days')
    `).run(days)
    return { success: true }
  }
}

// ============================================================
// 数据库备份与恢复
// ============================================================

export const backupDB = {
  /**
   * 创建数据库备份
   */
  create() {
    try {
      const dbPath = getDbPath()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const backupDir = path.join(app.getPath('userData'), 'backups')

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const backupPath = path.join(backupDir, `audit-backup-${timestamp}.db`)

      // 使用 SQLite 的 backup API
      const backupDb = new Database(backupPath)
      db.backup(backupDb)
      backupDb.close()

      // 获取文件大小
      const stats = fs.statSync(backupPath)

      return {
        success: true,
        path: backupPath,
        size: stats.size,
        timestamp: new Date().toISOString()
      }
    } catch (err) {
      return { success: false, message: `备份失败: ${err.message}` }
    }
  },

  /**
   * 从备份恢复数据库
   */
  restore(backupFilePath) {
    try {
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, message: '备份文件不存在' }
      }

      // 先备份当前数据库
      const currentBackup = this.create()

      // 关闭当前连接
      closeDatabase()

      // 替换数据库文件
      const dbPath = getDbPath()
      fs.copyFileSync(backupFilePath, dbPath)

      // 重新初始化
      initDatabase()

      return {
        success: true,
        message: '数据库恢复成功',
        previousBackup: currentBackup.path
      }
    } catch (err) {
      // 尝试重新初始化
      try { initDatabase() } catch {}
      return { success: false, message: `恢复失败: ${err.message}` }
    }
  },

  /**
   * 获取备份文件列表
   */
  listBackups() {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups')
      if (!fs.existsSync(backupDir)) {
        return []
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(backupDir, f)
          const stats = fs.statSync(filePath)
          return {
            name: f,
            path: filePath,
            size: stats.size,
            created_at: stats.birthtime.toISOString()
          }
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return files
    } catch (err) {
      return []
    }
  },

  /**
   * 删除备份文件
   */
  deleteBackup(backupPath) {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath)
      }
      return { success: true }
    } catch (err) {
      return { success: false, message: `删除备份失败: ${err.message}` }
    }
  }
}

// ============================================================
// 全局搜索
// ============================================================

export function globalSearch(keyword, limit = 50) {
  if (!keyword || keyword.trim() === '') {
    return { results: [], total: 0 }
  }

  const kw = `%${keyword.trim()}%`
  const results = []

  // 搜索项目
  const projects = db.prepare(`
    SELECT 'project' as type, id, name as title, description as content, updated_at
    FROM projects WHERE name LIKE ? OR code LIKE ? OR description LIKE ?
    LIMIT ?
  `).all(kw, kw, kw, limit)
  results.push(...projects)

  // 搜索访谈记录
  const interviews = db.prepare(`
    SELECT 'interview' as type, id, title, summary as content, updated_at
    FROM interviews WHERE title LIKE ? OR summary LIKE ? OR content LIKE ?
    LIMIT ?
  `).all(kw, kw, kw, limit)
  results.push(...interviews)

  // 搜索风险点
  const risks = db.prepare(`
    SELECT 'risk_point' as type, id, title, description as content, updated_at
    FROM risk_points WHERE title LIKE ? OR description LIKE ?
    LIMIT ?
  `).all(kw, kw, limit)
  results.push(...risks)

  // 搜索被访谈人
  const interviewees = db.prepare(`
    SELECT 'interviewee' as type, id, name as title, department || ' ' || position as content, updated_at
    FROM interviewees WHERE name LIKE ? OR department LIKE ? OR company LIKE ?
    LIMIT ?
  `).all(kw, kw, kw, limit)
  results.push(...interviewees)

  // 搜索 AI 分析
  const analyses = db.prepare(`
    SELECT 'ai_analysis' as type, id, title, content, updated_at
    FROM ai_analyses WHERE title LIKE ? OR content LIKE ?
    LIMIT ?
  `).all(kw, kw, limit)
  results.push(...analyses)

  return {
    results: results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, limit),
    total: results.length
  }
}
