<template>
  <div class="interviewee-detail-container">
    <!-- 顶部导航 -->
    <el-page-header @back="$router.back()" title="返回">
      <template #content>
        <span class="page-title">被访谈人详情</span>
      </template>
    </el-page-header>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 错误状态 -->
    <el-result
      v-else-if="error"
      icon="error"
      :title="error"
      sub-title="请检查数据后重试"
    >
      <template #extra>
        <el-button type="primary" @click="loadInterviewee">重新加载</el-button>
      </template>
    </el-result>

    <!-- 主内容 -->
    <div v-else-if="interviewee" class="detail-content">
      <!-- 人员信息卡片 -->
      <el-card shadow="hover" class="info-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-avatar :size="48" class="avatar">
                {{ interviewee.name?.charAt(0) || '?' }}
              </el-avatar>
              <div class="header-info">
                <h2 class="interviewee-name">{{ interviewee.name }}</h2>
                <el-tag v-if="interviewee.role_in_audit" size="small" type="primary" effect="plain">
                  {{ interviewee.role_in_audit }}
                </el-tag>
              </div>
            </div>
            <el-button type="primary" plain @click="openEditDialog">
              <el-icon><Edit /></el-icon>
              编辑信息
            </el-button>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ interviewee.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ genderMap[interviewee.gender] || interviewee.gender || '-' }}</el-descriptions-item>
          <el-descriptions-item label="职位">{{ interviewee.position || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ interviewee.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="公司">{{ interviewee.company || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审计角色">{{ interviewee.role_in_audit || '-' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ interviewee.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ interviewee.email || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="interviewee.remark" label="备注" :span="2">
            {{ interviewee.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 沟通时间线 -->
      <el-card shadow="hover" class="timeline-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">
              <el-icon><ChatDotRound /></el-icon>
              沟通时间线
            </span>
            <el-tag type="info" size="small">共 {{ interviews.length }} 条记录</el-tag>
          </div>
        </template>

        <div v-if="loadingInterviews" class="loading-wrapper">
          <el-skeleton :rows="3" animated />
        </div>

        <el-empty v-else-if="interviews.length === 0" description="暂无访谈记录" />

        <el-timeline v-else>
          <el-timeline-item
            v-for="item in sortedInterviews"
            :key="item.id"
            :timestamp="formatDateTime(item.date, item.time_start)"
            placement="top"
            :color="getTimelineColor(item.status)"
          >
            <el-card shadow="never" class="timeline-item-card" @click="goToInterview(item.id)">
              <div class="timeline-item-header">
                <span class="timeline-item-title">{{ item.title || '未命名访谈' }}</span>
                <el-tag
                  v-if="item.status"
                  :type="getInterviewStatusType(item.status)"
                  size="small"
                >
                  {{ getInterviewStatusLabel(item.status) }}
                </el-tag>
              </div>
              <div class="timeline-item-meta">
                <span v-if="item.project_name" class="meta-item">
                  <el-icon><Folder /></el-icon>
                  {{ item.project_name }}
                </span>
                <span v-if="item.location" class="meta-item">
                  <el-icon><Location /></el-icon>
                  {{ item.location }}
                </span>
                <span v-if="item.interviewer" class="meta-item">
                  <el-icon><User /></el-icon>
                  {{ item.interviewer }}
                </span>
              </div>
              <div v-if="item.summary" class="timeline-item-summary">
                {{ truncateText(item.summary, 120) }}
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- 相关风险点 -->
      <el-card shadow="hover" class="risk-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">
              <el-icon><Warning /></el-icon>
              相关风险点
            </span>
            <el-tag type="info" size="small">共 {{ relatedRisks.length }} 个</el-tag>
          </div>
        </template>

        <div v-if="loadingRisks" class="loading-wrapper">
          <el-skeleton :rows="3" animated />
        </div>

        <el-empty v-else-if="relatedRisks.length === 0" description="暂无相关风险点" />

        <el-table v-else :data="relatedRisks" stripe size="small">
          <el-table-column prop="title" label="风险标题" min-width="200" show-overflow-tooltip />
          <el-table-column prop="category" label="类别" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getCategoryType(row.category)">
                {{ getCategoryLabel(row.category) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="risk_level" label="风险等级" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getRiskLevelType(row.risk_level)">
                {{ getRiskLevelLabel(row.risk_level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getRiskStatusType(row.status)">
                {{ getRiskStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="source" label="来源" width="120" show-overflow-tooltip />
        </el-table>
      </el-card>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑被访谈人信息"
      width="600px"
      :close-on-click-modal="false"
      @closed="resetEditForm"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="editForm.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职位" prop="position">
              <el-input v-model="editForm.position" placeholder="请输入职位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-input v-model="editForm.department" placeholder="请输入部门" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="公司" prop="company">
          <el-input v-model="editForm.company" placeholder="请输入公司名称" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="editForm.phone" placeholder="请输入电话号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="editForm.email" placeholder="请输入邮箱地址" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="审计角色" prop="role_in_audit">
          <el-input v-model="editForm.role_in_audit" placeholder="请输入审计角色" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="备注信息（选填）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const props = defineProps({ id: [String, Number] })
const route = useRoute()
const router = useRouter()

// ==================== 状态 ====================
const loading = ref(false)
const loadingInterviews = ref(false)
const loadingRisks = ref(false)
const error = ref('')
const interviewee = ref(null)
const interviews = ref([])
const relatedRisks = ref([])
const projectMap = ref({})

// 编辑相关
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const saving = ref(false)

const editForm = reactive({
  name: '',
  gender: '',
  position: '',
  department: '',
  company: '',
  phone: '',
  email: '',
  role_in_audit: '',
  remark: ''
})

const editRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

// ==================== 映射表 ====================
const genderMap = {
  male: '男',
  female: '女'
}

const categoryMap = {
  financial: { label: '财务', type: '' },
  operational: { label: '运营', type: 'success' },
  compliance: { label: '合规', type: 'warning' },
  strategic: { label: '战略', type: 'danger' },
  information: { label: '信息', type: 'info' },
  other: { label: '其他', type: 'info' }
}

const riskLevelMap = {
  low: { label: '低', type: 'success' },
  medium: { label: '中', type: 'warning' },
  high: { label: '高', type: 'danger' },
  critical: { label: '严重', type: 'danger' }
}

const riskStatusMap = {
  identified: { label: '已识别', type: 'info' },
  analyzing: { label: '分析中', type: 'warning' },
  mitigated: { label: '已缓解', type: 'success' },
  accepted: { label: '已接受', type: '' },
  closed: { label: '已关闭', type: 'info' }
}

const interviewStatusMap = {
  draft: { label: '草稿', type: 'info' },
  reviewed: { label: '已审查', type: 'warning' },
  confirmed: { label: '已确认', type: 'success' },
  archived: { label: '已归档', type: '' }
}

// ==================== 计算属性 ====================
const sortedInterviews = computed(() => {
  return [...interviews.value].sort((a, b) => {
    const dateA = a.date ? new Date(a.date + (a.time_start || '')).getTime() : 0
    const dateB = b.date ? new Date(b.date + (b.time_start || '')).getTime() : 0
    return dateB - dateA
  })
})

// ==================== 工具函数 ====================
function getCategoryLabel(category) {
  return categoryMap[category]?.label || category || '其他'
}

function getCategoryType(category) {
  return categoryMap[category]?.type || 'info'
}

function getRiskLevelLabel(level) {
  return riskLevelMap[level]?.label || level || '未知'
}

function getRiskLevelType(level) {
  return riskLevelMap[level]?.type || 'info'
}

function getRiskStatusLabel(status) {
  return riskStatusMap[status]?.label || status || '未知'
}

function getRiskStatusType(status) {
  return riskStatusMap[status]?.type || 'info'
}

function getInterviewStatusLabel(status) {
  return interviewStatusMap[status]?.label || status || '未知'
}

function getInterviewStatusType(status) {
  return interviewStatusMap[status]?.type || 'info'
}

function getTimelineColor(status) {
  const colorMap = {
    completed: '#67C23A',
    planned: '#409EFF',
    cancelled: '#F56C6C'
  }
  return colorMap[status] || '#909399'
}

function formatDateTime(date, time) {
  if (!date) return '日期未知'
  const parts = [date]
  if (time) parts.push(time)
  return parts.join(' ')
}

function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

function goToInterview(interviewId) {
  router.push(`/interviews/${interviewId}`)
}

// ==================== 数据加载 ====================
async function loadInterviewee() {
  const id = props.id || route.params.id
  if (!id) {
    error.value = '缺少被访谈人 ID'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await window.api.interviewees.getById(id)
    if (result.success && result.data) {
      interviewee.value = result.data
      // 加载关联数据
      loadInterviews(id)
      loadRelatedRisks(id)
    } else {
      error.value = result.message || '未找到该被访谈人'
    }
  } catch (err) {
    console.error('加载被访谈人详情失败:', err)
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function loadInterviews(intervieweeId) {
  loadingInterviews.value = true
  try {
    const result = await window.api.interviews.list({ interviewee_id: intervieweeId })
    if (result.success && result.data) {
      interviews.value = result.data
      // 收集所有 project_id 并批量加载项目信息
      const projectIds = [...new Set(result.data.map(i => i.project_id).filter(Boolean))]
      if (projectIds.length > 0) {
        await loadProjectNames(projectIds)
      }
    }
  } catch (err) {
    console.error('加载访谈记录失败:', err)
    ElMessage.error('加载访谈记录失败')
  } finally {
    loadingInterviews.value = false
  }
}

async function loadProjectNames(projectIds) {
  try {
    const result = await window.api.projects.list({})
    if (result.success && result.data) {
      const map = {}
      result.data.forEach(p => {
        map[p.id] = p.name
      })
      projectMap.value = map
    }
  } catch (err) {
    console.error('加载项目信息失败:', err)
  }
}

async function loadRelatedRisks(intervieweeId) {
  loadingRisks.value = true
  try {
    // 通过全局搜索查找与该被访谈人相关的风险点
    const searchName = interviewee.value?.name
    if (!searchName) {
      relatedRisks.value = []
      return
    }
    const result = await window.api.search.global(searchName, 50)
    if (result.success && result.data) {
      relatedRisks.value = result.data.filter(item => item.type === 'risk_point')
    } else {
      relatedRisks.value = []
    }
  } catch (err) {
    console.error('加载相关风险点失败:', err)
    relatedRisks.value = []
  } finally {
    loadingRisks.value = false
  }
}

// ==================== 编辑功能 ====================
function openEditDialog() {
  if (!interviewee.value) return
  Object.assign(editForm, {
    name: interviewee.value.name || '',
    gender: interviewee.value.gender || '',
    position: interviewee.value.position || '',
    department: interviewee.value.department || '',
    company: interviewee.value.company || '',
    phone: interviewee.value.phone || '',
    email: interviewee.value.email || '',
    role_in_audit: interviewee.value.role_in_audit || '',
    remark: interviewee.value.remark || ''
  })
  editDialogVisible.value = true
}

function resetEditForm() {
  editFormRef.value?.resetFields()
  Object.assign(editForm, {
    name: '',
    gender: '',
    position: '',
    department: '',
    company: '',
    phone: '',
    email: '',
    role_in_audit: '',
    remark: ''
  })
}

async function handleSaveEdit() {
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const id = interviewee.value.id
    const updates = {
      name: editForm.name,
      gender: editForm.gender,
      position: editForm.position,
      department: editForm.department,
      company: editForm.company,
      phone: editForm.phone,
      email: editForm.email,
      role_in_audit: editForm.role_in_audit,
      remark: editForm.remark
    }
    const result = await window.api.interviewees.update(id, updates)
    if (result.success) {
      ElMessage.success('信息已更新')
      editDialogVisible.value = false
      // 刷新数据
      await loadInterviewee()
    } else {
      ElMessage.error(result.message || '更新失败')
    }
  } catch (err) {
    console.error('更新被访谈人信息失败:', err)
    ElMessage.error('更新失败，请重试')
  } finally {
    saving.value = false
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadInterviewee()
})

watch(() => props.id, (newId) => {
  if (newId) {
    loadInterviewee()
  }
})
</script>

<style scoped>
.interviewee-detail-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.loading-wrapper {
  padding: 20px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  background: linear-gradient(135deg, #409EFF, #79bbff);
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.interviewee-name {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 时间线 */
.timeline-card :deep(.el-card__body) {
  padding: 20px;
}

.timeline-item-card {
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #ebeef5;
}

.timeline-item-card:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.timeline-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-item-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.timeline-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.timeline-item-summary {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

/* 风险点表格 */
.risk-card :deep(.el-card__body) {
  padding: 0;
}
</style>
