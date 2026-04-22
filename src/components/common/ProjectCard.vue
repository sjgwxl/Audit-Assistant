<template>
  <el-card class="project-card" shadow="hover">
    <div class="card-header">
      <div class="card-title-row">
        <el-tag :type="statusType" size="small" effect="dark" class="status-tag">
          {{ statusLabel }}
        </el-tag>
        <el-tag :type="typeTagType" size="small" effect="plain" class="type-tag">
          {{ typeLabel }}
        </el-tag>
        <h3 class="project-name" :title="project.name">{{ project.name }}</h3>
      </div>
      <el-dropdown trigger="click" @command="handleCommand">
        <el-icon class="more-btn"><MoreFilled /></el-icon>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="view">
              <el-icon><View /></el-icon>查看详情
            </el-dropdown-item>
            <el-dropdown-item command="edit">
              <el-icon><Edit /></el-icon>编辑
            </el-dropdown-item>
            <el-dropdown-item command="delete" divided>
              <el-icon><Delete /></el-icon>
              <span style="color: #F56C6C">删除</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">项目编号：</span>
        <span class="value">{{ project.code || '-' }}</span>
      </div>
      <div class="info-row" v-if="project.audit_object">
        <span class="label">审计对象：</span>
        <span class="value text-ellipsis">{{ project.audit_object }}</span>
      </div>
      <div class="info-row">
        <span class="label">审计期间：</span>
        <span class="value">{{ auditPeriod }}</span>
      </div>
      <div class="info-row" v-if="project.description">
        <span class="label">项目描述：</span>
        <span class="value text-ellipsis">{{ project.description }}</span>
      </div>
      <div class="info-row" v-if="project.risk_level">
        <span class="label">风险等级：</span>
        <span class="value">
          <el-tag :type="riskLevelType" size="small" effect="light">
            {{ riskLevelLabel }}
          </el-tag>
        </span>
      </div>
    </div>

    <div class="card-footer">
      <div class="stat-item">
        <el-icon :size="16"><User /></el-icon>
        <span>{{ project.interview_count || 0 }} 次访谈</span>
      </div>
      <div class="stat-item">
        <el-icon :size="16" color="#E6A23C"><Warning /></el-icon>
        <span>{{ project.risk_count || 0 }} 个风险</span>
      </div>
      <div class="stat-item">
        <el-icon :size="16" color="#909399"><Clock /></el-icon>
        <span>{{ project.pending_todo_count || 0 }} 待办</span>
      </div>
      <div class="stat-item last-update">
        <span class="update-text">更新于 {{ relativeTime }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { MoreFilled, View, Edit, Delete, User, Warning, Clock } from '@element-plus/icons-vue'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['view', 'edit', 'delete'])

// 状态映射：planning=准备中(blue), executing=进行中(green), reviewing=审查中(orange), completed=已完成(gray), archived=已归档(info)
const statusMap = {
  planning: { type: '', label: '准备中' },
  executing: { type: 'success', label: '进行中' },
  reviewing: { type: 'warning', label: '审查中' },
  completed: { type: 'info', label: '已完成' },
  archived: { type: 'info', label: '已归档' }
}

// 类型映射：routine=常规审计, special=专项审计, follow-up=跟踪审计, other=其他
const typeMap = {
  routine: '常规审计',
  special: '专项审计',
  'follow-up': '跟踪审计',
  other: '其他'
}

// 风险等级映射：low=低(green), medium=中(orange), high=高(red), critical=严重(darkred)
const riskLevelMap = {
  low: { type: 'success', label: '低' },
  medium: { type: 'warning', label: '中' },
  high: { type: 'danger', label: '高' },
  critical: { type: 'danger', label: '严重' }
}

const statusType = computed(() => statusMap[props.project.status]?.type || 'info')
const statusLabel = computed(() => statusMap[props.project.status]?.label || props.project.status)

const typeTagType = computed(() => {
  const map = { routine: '', special: 'warning', 'follow-up': 'success', other: 'info' }
  return map[props.project.type] || 'info'
})

const typeLabel = computed(() => typeMap[props.project.type] || props.project.type || '其他')

const riskLevelType = computed(() => riskLevelMap[props.project.risk_level]?.type || 'info')
const riskLevelLabel = computed(() => {
  if (props.project.risk_level === 'critical') return '严重'
  return riskLevelMap[props.project.risk_level]?.label || props.project.risk_level || '-'
})

const auditPeriod = computed(() => {
  const start = props.project.audit_period_start
  const end = props.project.audit_period_end
  if (!start && !end) return '-'
  const fmt = (d) => {
    if (!d) return ''
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return `${fmt(start)} 至 ${fmt(end)}`
})

const relativeTime = computed(() => {
  const dateStr = props.project.updated_at
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
})

function handleCommand(command) {
  switch (command) {
    case 'view':
      emit('view', props.project)
      break
    case 'edit':
      emit('edit', props.project)
      break
    case 'delete':
      emit('delete', props.project)
      break
  }
}
</script>

<style scoped>
.project-card {
  cursor: default;
  transition: all 0.3s ease;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
}

.project-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: #c6e2ff;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.status-tag {
  flex-shrink: 0;
}

.type-tag {
  flex-shrink: 0;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.more-btn {
  cursor: pointer;
  color: #909399;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.more-btn:hover {
  background-color: #f5f7fa;
  color: #409EFF;
}

.card-body {
  margin-bottom: 14px;
}

.info-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.label {
  color: #909399;
  flex-shrink: 0;
  min-width: 78px;
}

.value {
  color: #606266;
  flex: 1;
  min-width: 0;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
  font-size: 13px;
  color: #909399;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.last-update {
  margin-left: auto;
}

.update-text {
  font-size: 12px;
  color: #C0C4CC;
}
</style>
