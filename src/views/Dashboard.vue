<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="项目总数" :value="projectStore.projectStats.total">
            <template #prefix><el-icon><Folder /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="进行中" :value="projectStore.projectStats.executing">
            <template #prefix><el-icon><Loading /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="待审查" :value="projectStore.projectStats.reviewing">
            <template #prefix><el-icon><Document /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="已完成" :value="projectStore.projectStats.completed">
            <template #prefix><el-icon><CircleCheck /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <span>最近项目</span>
          </template>
          <el-table :data="projectStore.activeProjects.slice(0, 5)" stripe>
            <el-table-column prop="name" label="项目名称" />
            <el-table-column prop="type" label="类型" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="risk_level" label="风险等级" width="100">
              <template #default="{ row }">
                <el-tag :type="getRiskType(row.risk_level)" size="small">{{ getRiskLabel(row.risk_level) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>快捷操作</span>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/projects')">
              <el-icon><Folder /></el-icon> 项目管理
            </el-button>
            <el-button type="success" @click="$router.push('/risk-matrix')">
              <el-icon><Warning /></el-icon> 风险矩阵
            </el-button>
            <el-button type="warning" @click="$router.push('/ai-settings')">
              <el-icon><MagicStick /></el-icon> AI 分析
            </el-button>
            <el-button @click="$router.push('/system-settings')">
              <el-icon><Setting /></el-icon> 系统设置
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()

onMounted(() => {
  projectStore.fetchProjects()
  projectStore.fetchStats()
})

function getStatusType(status) {
  const map = { planning: 'info', executing: 'warning', reviewing: '', completed: 'success', archived: 'info' }
  return map[status] || 'info'
}

function getStatusLabel(status) {
  const map = { planning: '计划中', executing: '执行中', reviewing: '审查中', completed: '已完成', archived: '已归档' }
  return map[status] || status
}

function getRiskType(level) {
  const map = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' }
  return map[level] || 'info'
}

function getRiskLabel(level) {
  const map = { low: '低', medium: '中', high: '高', critical: '严重' }
  return map[level] || level
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.stat-card {
  text-align: center;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  width: 100%;
}
</style>
