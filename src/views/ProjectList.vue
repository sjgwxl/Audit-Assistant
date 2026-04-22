<template>
  <div class="project-list-container">
    <!-- 顶部操作栏 -->
    <el-card shadow="hover" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <h3 class="page-title">审计项目列表</h3>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项目名称或编号"
            clearable
            style="width: 260px"
            :prefix-icon="Search"
            @input="handleSearch"
            @clear="handleSearch"
          />
        </div>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建项目
        </el-button>
      </div>
    </el-card>

    <!-- 筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">状态：</span>
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 130px"
            @change="applyFilters"
          >
            <el-option label="准备中" value="planning" />
            <el-option label="进行中" value="executing" />
            <el-option label="审查中" value="reviewing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">类型：</span>
          <el-select
            v-model="filterType"
            placeholder="全部类型"
            clearable
            style="width: 130px"
            @change="applyFilters"
          >
            <el-option label="常规" value="routine" />
            <el-option label="专项" value="special" />
            <el-option label="跟踪" value="follow-up" />
            <el-option label="其他" value="other" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">风险等级：</span>
          <el-select
            v-model="filterRiskLevel"
            placeholder="全部等级"
            clearable
            style="width: 130px"
            @change="applyFilters"
          >
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="严重" value="critical" />
          </el-select>
        </div>
        <div class="filter-item filter-right">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="table">
              <el-icon><List /></el-icon>
              表格
            </el-radio-button>
            <el-radio-button value="card">
              <el-icon><Grid /></el-icon>
              卡片
            </el-radio-button>
          </el-radio-group>
          <el-tag type="info" size="small">
            共 {{ filteredProjects.length }} 个项目
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 表格视图 -->
    <el-card v-if="viewMode === 'table'" shadow="hover" class="table-card">
      <el-table
        v-loading="loading"
        :data="paginatedProjects"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="项目名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="project-name-link" @click="goToDetail(row.id)">
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="项目编号" width="150" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="risk_level" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getRiskType(row.risk_level)" effect="dark">
              {{ getRiskLabel(row.risk_level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="interview_count" label="访谈数" width="80" align="center">
          <template #default="{ row }">
            {{ row.interview_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="risk_count" label="风险数" width="80" align="center">
          <template #default="{ row }">
            {{ row.risk_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="审计期间" width="200">
          <template #default="{ row }">
            <span v-if="row.audit_period_start || row.audit_period_end" class="period-text">
              {{ row.audit_period_start || '?' }} ~ {{ row.audit_period_end || '?' }}
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goToDetail(row.id)">
              查看
            </el-button>
            <el-button type="warning" link size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredProjects.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 卡片视图 -->
    <div v-if="viewMode === 'card'" class="card-grid">
      <div v-loading="loading" class="card-grid-inner">
        <el-empty v-if="!loading && filteredProjects.length === 0" description="暂无项目数据" />
        <ProjectCard
          v-for="project in paginatedProjects"
          v-else
          :key="project.id"
          :project="adaptProjectForCard(project)"
          @edit="openEditDialog"
          @delete="handleDelete"
        />
      </div>

      <!-- 分页 -->
      <div v-if="filteredProjects.length > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[9, 18, 36]"
          :total="filteredProjects.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '新建项目'"
      width="680px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="top"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入项目名称" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目编号" prop="code">
              <el-input v-model="formData.code" placeholder="请输入项目编号" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="项目类型" prop="type">
              <el-select v-model="formData.type" placeholder="请选择" style="width: 100%">
                <el-option label="常规" value="routine" />
                <el-option label="专项" value="special" />
                <el-option label="跟踪" value="follow-up" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="项目状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择" style="width: 100%">
                <el-option label="准备中" value="planning" />
                <el-option label="进行中" value="executing" />
                <el-option label="审查中" value="reviewing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已归档" value="archived" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="风险等级" prop="risk_level">
              <el-select v-model="formData.risk_level" placeholder="请选择" style="width: 100%">
                <el-option label="低" value="low">
                  <span style="color: #67C23A; font-weight: 600">低</span>
                </el-option>
                <el-option label="中" value="medium">
                  <span style="color: #E6A23C; font-weight: 600">中</span>
                </el-option>
                <el-option label="高" value="high">
                  <span style="color: #F56C6C; font-weight: 600">高</span>
                </el-option>
                <el-option label="严重" value="critical">
                  <span style="color: #F56C6C; font-weight: 600">严重</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>

        <el-form-item label="审计对象" prop="audit_object">
          <el-input v-model="formData.audit_object" placeholder="请输入审计对象" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="审计开始日期" prop="audit_period_start">
              <el-date-picker
                v-model="formData.audit_period_start"
                type="date"
                placeholder="选择开始日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审计结束日期" prop="audit_period_end">
              <el-date-picker
                v-model="formData.audit_period_end"
                type="date"
                placeholder="选择结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建项目' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import ProjectCard from '@/components/common/ProjectCard.vue'

const router = useRouter()

// ==================== 状态 ====================
const loading = ref(false)
const saving = ref(false)
const allProjects = ref([])
const searchKeyword = ref('')
const filterStatus = ref('')
const filterType = ref('')
const filterRiskLevel = ref('')
const viewMode = ref('table')
const currentPage = ref(1)
const pageSize = ref(10)

// 对话框
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const formData = reactive({
  name: '',
  code: '',
  type: '',
  status: 'planning',
  description: '',
  audit_object: '',
  audit_period_start: '',
  audit_period_end: '',
  risk_level: 'medium'
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  code: [{ required: false }],
  type: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择项目状态', trigger: 'change' }]
}

// ==================== 映射表 ====================
const statusMap = {
  planning: { label: '准备中', type: '' },
  executing: { label: '进行中', type: 'success' },
  reviewing: { label: '审查中', type: 'warning' },
  completed: { label: '已完成', type: 'info' },
  archived: { label: '已归档', type: 'info' }
}

const typeMap = {
  routine: { label: '常规', type: '' },
  special: { label: '专项', type: 'success' },
  'follow-up': { label: '跟踪', type: 'warning' },
  other: { label: '其他', type: 'info' }
}

const riskMap = {
  low: { label: '低', type: 'success' },
  medium: { label: '中', type: 'warning' },
  high: { label: '高', type: 'danger' },
  critical: { label: '严重', type: 'danger' }
}

function getStatusLabel(status) { return statusMap[status]?.label || status || '未知' }
function getStatusType(status) { return statusMap[status]?.type || 'info' }
function getTypeLabel(type) { return typeMap[type]?.label || type || '未知' }
function getTypeType(type) { return typeMap[type]?.type || 'info' }
function getRiskLabel(level) { return riskMap[level]?.label || level || '未知' }
function getRiskType(level) { return riskMap[level]?.type || 'info' }

// ==================== 计算属性 ====================
const filteredProjects = computed(() => {
  let result = allProjects.value

  // 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(p =>
      (p.name && p.name.toLowerCase().includes(keyword)) ||
      (p.code && p.code.toLowerCase().includes(keyword))
    )
  }

  // 状态过滤
  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value)
  }

  // 类型过滤
  if (filterType.value) {
    result = result.filter(p => p.type === filterType.value)
  }

  // 风险等级过滤
  if (filterRiskLevel.value) {
    result = result.filter(p => p.risk_level === filterRiskLevel.value)
  }

  return result
})

const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProjects.value.slice(start, start + pageSize.value)
})

// ==================== 工具函数 ====================
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

// 适配项目数据给 ProjectCard 组件使用
function adaptProjectForCard(project) {
  return {
    ...project,
    projectNumber: project.code,
    startDate: project.audit_period_start,
    endDate: project.audit_period_end,
    backgroundInfo: project.description,
    interviewCount: project.interview_count || 0,
    riskCount: project.risk_count || 0,
    updatedAt: project.updated_at,
    status: getStatusLabel(project.status)
  }
}

// ==================== 数据加载 ====================
async function loadProjects() {
  loading.value = true
  try {
    const result = await window.api.projects.list({})
    if (result.success && result.data) {
      allProjects.value = result.data
    } else {
      ElMessage.error(result.message || '加载项目列表失败')
    }
  } catch (err) {
    console.error('加载项目列表失败:', err)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

// ==================== 搜索与筛选 ====================
let searchTimer = null
function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
  }, 300)
}

function applyFilters() {
  currentPage.value = 1
}

// ==================== 分页 ====================
function handleSizeChange() {
  currentPage.value = 1
}

function handlePageChange() {
  // 页码变更，由 v-model 自动处理
}

// ==================== 导航 ====================
function goToDetail(id) {
  router.push(`/projects/${id}`)
}

// ==================== 新建/编辑 ====================
function openCreateDialog() {
  isEdit.value = false
  editingId.value = null
  Object.assign(formData, {
    name: '',
    code: '',
    type: '',
    status: 'planning',
    description: '',
    audit_object: '',
    audit_period_start: '',
    audit_period_end: '',
    risk_level: 'medium'
  })
  dialogVisible.value = true
}

function openEditDialog(project) {
  isEdit.value = true
  editingId.value = project.id
  Object.assign(formData, {
    name: project.name || '',
    code: project.code || '',
    type: project.type || '',
    status: project.status || 'planning',
    description: project.description || '',
    audit_object: project.audit_object || '',
    audit_period_start: project.audit_period_start || '',
    audit_period_end: project.audit_period_end || '',
    risk_level: project.risk_level || 'medium'
  })
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  Object.assign(formData, {
    name: '',
    code: '',
    type: '',
    status: 'planning',
    description: '',
    audit_object: '',
    audit_period_start: '',
    audit_period_end: '',
    risk_level: 'medium'
  })
  editingId.value = null
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const data = { ...formData }

    if (isEdit.value) {
      const result = await window.api.projects.update(editingId.value, data)
      if (result.success) {
        ElMessage.success('项目已更新')
        dialogVisible.value = false
        await loadProjects()
      } else {
        ElMessage.error(result.message || '更新失败')
      }
    } else {
      const result = await window.api.projects.create(data)
      if (result.success) {
        ElMessage.success('项目已创建')
        dialogVisible.value = false
        await loadProjects()
      } else {
        ElMessage.error(result.message || '创建失败')
      }
    }
  } catch (err) {
    console.error('保存项目失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// ==================== 删除 ====================
async function handleDelete(project) {
  try {
    await ElMessageBox.confirm(
      `确定要删除项目「${project.name}」吗？此操作不可撤销。`,
      '确认删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    const result = await window.api.projects.delete(project.id)
    if (result.success) {
      ElMessage.success('项目已删除')
      await loadProjects()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除项目失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.project-list-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
  white-space: nowrap;
}

/* 筛选栏 */
.filter-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

/* 表格 */
.project-name-link {
  color: #409EFF;
  cursor: pointer;
  font-weight: 500;
}

.project-name-link:hover {
  text-decoration: underline;
}

.period-text {
  font-size: 13px;
  color: #606266;
}

.text-muted {
  color: #C0C4CC;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}

/* 卡片视图 */
.card-grid {
  min-height: 200px;
}

.card-grid-inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* 筛选卡片 */
.filter-card :deep(.el-card__body) {
  padding: 12px 20px;
}

/* 工具栏卡片 */
.toolbar-card :deep(.el-card__body) {
  padding: 16px 20px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .card-grid-inner {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .card-grid-inner {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-direction: column;
  }

  .filter-right {
    margin-left: 0;
  }
}
</style>
