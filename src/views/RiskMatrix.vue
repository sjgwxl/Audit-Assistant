<template>
  <div class="risk-matrix-container">
    <!-- 顶部操作栏 -->
    <el-card shadow="hover" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <h3 class="page-title">风险矩阵分析</h3>
          <el-select
            v-model="selectedProject"
            placeholder="请选择项目"
            style="width: 280px"
            clearable
            @change="handleProjectChange"
          >
            <el-option
              v-for="p in projects"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button
            type="primary"
            :disabled="!selectedProject"
            @click="showRiskDialog = true"
          >
            <el-icon><Plus /></el-icon>
            新建风险点
          </el-button>
          <el-button
            type="success"
            :disabled="!selectedRiskPoint"
            :loading="aiAssessing"
            @click="handleAiAssess"
          >
            <el-icon><MagicStick /></el-icon>
            AI 风险评估
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 筛选栏 -->
    <el-card v-if="selectedProject" shadow="never" class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">风险等级：</span>
          <el-select
            v-model="filterRiskLevel"
            placeholder="全部等级"
            clearable
            style="width: 140px"
            @change="applyFilters"
          >
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="严重" value="critical" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">状态：</span>
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 140px"
            @change="applyFilters"
          >
            <el-option label="已识别" value="identified" />
            <el-option label="分析中" value="analyzing" />
            <el-option label="缓解中" value="mitigating" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已接受" value="accepted" />
            <el-option label="已转移" value="transferred" />
          </el-select>
        </div>
        <div class="filter-item">
          <el-tag type="info" size="small">
            显示 {{ filteredRisks.length }} / {{ allRisks.length }} 条
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 未选择项目提示 -->
    <el-card v-if="!selectedProject" shadow="hover" class="empty-card">
      <el-empty description="请选择一个项目以查看风险矩阵" />
    </el-card>

    <!-- 风险矩阵内容 -->
    <template v-if="selectedProject">
      <!-- 风险矩阵可视化 -->
      <el-card shadow="hover" class="matrix-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">风险矩阵</span>
            <div class="matrix-legend">
              <span class="legend-item"><span class="legend-color" style="background: #67C23A" />低</span>
              <span class="legend-item"><span class="legend-color" style="background: #E6A23C" />中</span>
              <span class="legend-item"><span class="legend-color" style="background: #F78989" />高</span>
              <span class="legend-item"><span class="legend-color" style="background: #F56C6C" />严重</span>
            </div>
          </div>
        </template>

        <div v-loading="loadingMatrix" class="matrix-wrapper">
          <div class="matrix-grid">
            <!-- Y 轴标签 -->
            <div class="matrix-y-label">影响程度</div>
            <div class="matrix-corner"></div>
            <div class="matrix-y-axis">
              <div
                v-for="(label, idx) in impactLabels"
                :key="'y-' + idx"
                class="axis-label y-label"
              >
                {{ label }}
              </div>
            </div>

            <!-- 矩阵主体 -->
            <div class="matrix-body">
              <!-- X 轴标签 -->
              <div class="matrix-x-axis">
                <div
                  v-for="(label, idx) in likelihoodLabels"
                  :key="'x-' + idx"
                  class="axis-label x-label"
                >
                  {{ label }}
                </div>
              </div>

              <!-- 5x5 网格 -->
              <div class="matrix-cells">
                <div
                  v-for="(row, rowIdx) in matrixRows"
                  :key="'row-' + rowIdx"
                  class="matrix-row"
                >
                  <div
                    v-for="(cell, colIdx) in row"
                    :key="'cell-' + rowIdx + '-' + colIdx"
                    class="matrix-cell"
                    :style="{ backgroundColor: cell.color }"
                    @click="handleCellClick(rowIdx, colIdx)"
                  >
                    <div v-if="cell.risks.length > 0" class="cell-content">
                      <el-badge :value="cell.risks.length" :max="9" type="danger" class="cell-badge">
                        <div class="cell-titles">
                          <span
                            v-for="risk in cell.risks.slice(0, 3)"
                            :key="risk.id"
                            class="risk-badge"
                            :class="'risk-badge-' + risk.risk_level"
                            :title="risk.title"
                          >
                            {{ truncateText(risk.title, 6) }}
                          </span>
                          <span v-if="cell.risks.length > 3" class="more-count">
                            +{{ cell.risks.length - 3 }}
                          </span>
                        </div>
                      </el-badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- X 轴标签 -->
          <div class="matrix-x-label">可能性</div>
        </div>
      </el-card>

      <!-- 风险点列表 -->
      <el-card shadow="hover" class="table-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">风险点列表</span>
          </div>
        </template>

        <el-table
          v-loading="loadingRisks"
          :data="filteredRisks"
          stripe
          highlight-current-row
          @current-change="handleCurrentChange"
          style="width: 100%"
        >
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="title" label="风险标题" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="risk-title-link" @click="handleRowClick(row)">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="类别" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getCategoryType(row.category)">
                {{ getCategoryLabel(row.category) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="risk_level" label="风险等级" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getRiskLevelType(row.risk_level)" effect="dark">
                {{ getRiskLevelLabel(row.risk_level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="likelihood" label="可能性" width="100">
            <template #default="{ row }">
              {{ getLikelihoodLabel(row.likelihood) }}
            </template>
          </el-table-column>
          <el-table-column prop="impact" label="影响程度" width="100">
            <template #default="{ row }">
              {{ getImpactLabel(row.impact) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getRiskStatusType(row.status)">
                {{ getRiskStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="due_date" label="截止日期" width="120">
            <template #default="{ row }">
              {{ row.due_date || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleEditRisk(row)">
                编辑
              </el-button>
              <el-button type="danger" link size="small" @click="handleDeleteRisk(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 新建/编辑风险点对话框 -->
    <RiskPointDialog
      v-model:visible="showRiskDialog"
      :is-edit="isEditRisk"
      :risk-point="editingRiskPoint"
      :project-id="selectedProject"
      @saved="handleRiskSaved"
    />

    <!-- AI 评估结果对话框 -->
    <el-dialog
      v-model="showAiResult"
      title="AI 风险评估结果"
      width="600px"
    >
      <div v-if="aiResult" class="ai-result-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="风险等级建议">
            <el-tag :type="getRiskLevelType(aiResult.suggestedLevel)" effect="dark">
              {{ getRiskLevelLabel(aiResult.suggestedLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="可能性评估">
            {{ getLikelihoodLabel(aiResult.suggestedLikelihood) }}
          </el-descriptions-item>
          <el-descriptions-item label="影响评估">
            {{ getImpactLabel(aiResult.suggestedImpact) }}
          </el-descriptions-item>
          <el-descriptions-item label="分析说明">
            {{ aiResult.analysis }}
          </el-descriptions-item>
          <el-descriptions-item label="缓解建议">
            {{ aiResult.mitigation }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showAiResult = false">关闭</el-button>
        <el-button type="primary" @click="applyAiAssessment">应用评估结果</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import RiskPointDialog from '@/components/common/RiskPointDialog.vue'

// ==================== 状态 ====================
const projects = ref([])
const selectedProject = ref('')
const allRisks = ref([])
const loadingMatrix = ref(false)
const loadingRisks = ref(false)
const loadingProjects = ref(false)

// 筛选
const filterRiskLevel = ref('')
const filterStatus = ref('')

// 风险对话框
const showRiskDialog = ref(false)
const isEditRisk = ref(false)
const editingRiskPoint = ref({})

// AI 评估
const selectedRiskPoint = ref(null)
const aiAssessing = ref(false)
const showAiResult = ref(false)
const aiResult = ref(null)

// ==================== 矩阵配置 ====================
const likelihoodLabels = ['罕见', '不太可能', '可能', '很可能', '几乎确定']
const likelihoodValues = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain']
const impactLabels = ['可忽略', '轻微', '中等', '重大', '灾难性']
const impactValues = ['insignificant', 'minor', 'moderate', 'major', 'catastrophic']

// 风险等级颜色映射 (基于 likelihood * impact 的数字索引 1-5)
function getCellColor(lIdx, iIdx) {
  const score = (lIdx + 1) * (iIdx + 1)
  if (score <= 3) return '#e8f5e9'       // 绿色 - 低
  if (score <= 6) return '#fff9c4'       // 黄色 - 中
  if (score <= 12) return '#ffe0b2'      // 橙色 - 高
  return '#ffcdd2'                        // 红色 - 严重
}

function getCellRiskLevel(lIdx, iIdx) {
  const score = (lIdx + 1) * (iIdx + 1)
  if (score <= 3) return 'low'
  if (score <= 6) return 'medium'
  if (score <= 12) return 'high'
  return 'critical'
}

// ==================== 映射表 ====================
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
  mitigating: { label: '缓解中', type: '' },
  resolved: { label: '已解决', type: 'success' },
  accepted: { label: '已接受', type: '' },
  transferred: { label: '已转移', type: 'info' }
}

function getCategoryLabel(cat) { return categoryMap[cat]?.label || cat || '其他' }
function getCategoryType(cat) { return categoryMap[cat]?.type || 'info' }
function getRiskLevelLabel(level) { return riskLevelMap[level]?.label || level || '未知' }
function getRiskLevelType(level) { return riskLevelMap[level]?.type || 'info' }
function getRiskStatusLabel(status) { return riskStatusMap[status]?.label || status || '未知' }
function getRiskStatusType(status) { return riskStatusMap[status]?.type || 'info' }

function getLikelihoodLabel(val) {
  if (val === undefined || val === null) return '-'
  const idx = likelihoodValues.indexOf(val)
  return idx >= 0 ? likelihoodLabels[idx] : val
}

function getImpactLabel(val) {
  if (val === undefined || val === null) return '-'
  const idx = impactValues.indexOf(val)
  return idx >= 0 ? impactLabels[idx] : val
}

function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

// ==================== 计算属性 ====================
const filteredRisks = computed(() => {
  let result = allRisks.value
  if (filterRiskLevel.value) {
    result = result.filter(r => r.risk_level === filterRiskLevel.value)
  }
  if (filterStatus.value) {
    result = result.filter(r => r.status === filterStatus.value)
  }
  return result
})

// 构建 5x5 矩阵数据 (Y 轴从上到下: impact 灾难性->可忽略, X 轴从左到右: likelihood 罕见->几乎确定)
const matrixRows = computed(() => {
  const rows = []
  // impact 从 4(灾难性) 到 0(可忽略), 从上到下
  for (let iIdx = 4; iIdx >= 0; iIdx--) {
    const row = []
    // likelihood 从 0(罕见) 到 4(几乎确定), 从左到右
    for (let lIdx = 0; lIdx <= 4; lIdx++) {
      const risksInCell = allRisks.value.filter(r => {
        return r.likelihood === likelihoodValues[lIdx] && r.impact === impactValues[iIdx]
      })
      row.push({
        likelihoodIdx: lIdx,
        impactIdx: iIdx,
        color: getCellColor(lIdx, iIdx),
        risks: risksInCell
      })
    }
    rows.push(row)
  }
  return rows
})

// ==================== 数据加载 ====================
async function loadProjects() {
  loadingProjects.value = true
  try {
    const result = await window.api.projects.list({})
    if (result.success && result.data) {
      projects.value = result.data
    }
  } catch (err) {
    console.error('加载项目列表失败:', err)
    ElMessage.error('加载项目列表失败')
  } finally {
    loadingProjects.value = false
  }
}

async function loadRiskData() {
  if (!selectedProject.value) return

  loadingMatrix.value = true
  loadingRisks.value = true

  try {
    // 并行加载矩阵数据和风险点列表
    const [matrixResult, listResult] = await Promise.all([
      window.api.riskPoints.getRiskMatrix(selectedProject.value),
      window.api.riskPoints.list({ project_id: selectedProject.value })
    ])

    if (listResult.success && listResult.data) {
      allRisks.value = listResult.data
    } else {
      allRisks.value = []
    }

    // 矩阵数据可用于补充显示
    if (!matrixResult.success) {
      console.warn('加载风险矩阵数据失败:', matrixResult.message)
    }
  } catch (err) {
    console.error('加载风险数据失败:', err)
    ElMessage.error('加载风险数据失败')
    allRisks.value = []
  } finally {
    loadingMatrix.value = false
    loadingRisks.value = false
  }
}

// ==================== 事件处理 ====================
function handleProjectChange() {
  filterRiskLevel.value = ''
  filterStatus.value = ''
  selectedRiskPoint.value = null
  if (selectedProject.value) {
    loadRiskData()
  } else {
    allRisks.value = []
  }
}

function applyFilters() {
  // 筛选是计算属性自动处理的，这里可以添加额外逻辑
}

function handleCurrentChange(row) {
  selectedRiskPoint.value = row
}

function handleCellClick(rowIdx, colIdx) {
  // rowIdx: 0=灾难性行, 4=可忽略行; colIdx: 0=罕见列, 4=几乎确定列
  const iIdx = 4 - rowIdx
  const lIdx = colIdx
  const cellRisks = allRisks.value.filter(r => {
    return r.likelihood === likelihoodValues[lIdx] && r.impact === impactValues[iIdx]
  })
  if (cellRisks.length > 0) {
    selectedRiskPoint.value = cellRisks[0]
  }
}

function handleRowClick(row) {
  selectedRiskPoint.value = row
}

function handleEditRisk(row) {
  editingRiskPoint.value = { ...row }
  isEditRisk.value = true
  showRiskDialog.value = true
}

async function handleDeleteRisk(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除风险点「${row.title}」吗？此操作不可撤销。`,
      '确认删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    const result = await window.api.riskPoints.delete(row.id)
    if (result.success) {
      ElMessage.success('风险点已删除')
      await loadRiskData()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除风险点失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

function handleRiskSaved() {
  showRiskDialog.value = false
  isEditRisk.value = false
  editingRiskPoint.value = {}
  loadRiskData()
}

// ==================== AI 评估 ====================
async function handleAiAssess() {
  if (!selectedRiskPoint.value) {
    ElMessage.warning('请先选择一个风险点')
    return
  }

  aiAssessing.value = true
  try {
    const risk = selectedRiskPoint.value
    const context = {
      category: risk.category,
      description: risk.description,
      currentLevel: risk.risk_level,
      likelihood: risk.likelihood,
      impact: risk.impact
    }
    const result = await window.api.ai.assessRisk(risk.description, JSON.stringify(context))
    if (result.success && result.data) {
      aiResult.value = result.data
      showAiResult.value = true
    } else {
      ElMessage.error(result.message || 'AI 评估失败')
    }
  } catch (err) {
    console.error('AI 风险评估失败:', err)
    ElMessage.error('AI 评估服务异常，请检查 AI 设置')
  } finally {
    aiAssessing.value = false
  }
}

async function applyAiAssessment() {
  if (!aiResult.value || !selectedRiskPoint.value) return

  try {
    const updates = {}
    if (aiResult.value.suggestedLevel) updates.risk_level = aiResult.value.suggestedLevel
    if (aiResult.value.suggestedLikelihood) updates.likelihood = aiResult.value.suggestedLikelihood
    if (aiResult.value.suggestedImpact) updates.impact = aiResult.value.suggestedImpact
    if (aiResult.value.mitigation) updates.mitigation_plan = aiResult.value.mitigation

    const result = await window.api.riskPoints.update(selectedRiskPoint.value.id, updates)
    if (result.success) {
      ElMessage.success('AI 评估结果已应用')
      showAiResult.value = false
      aiResult.value = null
      await loadRiskData()
    } else {
      ElMessage.error(result.message || '应用评估结果失败')
    }
  } catch (err) {
    console.error('应用 AI 评估结果失败:', err)
    ElMessage.error('应用失败')
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.risk-matrix-container {
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

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
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
  gap: 24px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 矩阵图例 */
.matrix-legend {
  display: flex;
  gap: 16px;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.legend-color {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #dcdfe6;
}

/* 矩阵布局 */
.matrix-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
}

.matrix-grid {
  display: grid;
  grid-template-columns: auto auto 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 0;
  width: 100%;
  max-width: 900px;
}

.matrix-y-label {
  grid-column: 1;
  grid-row: 1 / 4;
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  padding-right: 8px;
}

.matrix-corner {
  grid-column: 2;
  grid-row: 1;
}

.matrix-y-axis {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
}

.y-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  font-size: 12px;
  color: #606266;
  min-height: 60px;
}

.matrix-body {
  grid-column: 3;
  grid-row: 2;
  display: flex;
  flex-direction: column;
}

.matrix-x-axis {
  display: flex;
  margin-bottom: 4px;
}

.x-label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #606266;
  padding-bottom: 6px;
}

.matrix-cells {
  display: flex;
  flex-direction: column;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.matrix-row {
  display: flex;
}

.matrix-cell {
  flex: 1;
  min-height: 60px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.matrix-cell:hover {
  opacity: 0.85;
  box-shadow: inset 0 0 0 2px #409EFF;
  z-index: 1;
}

.matrix-x-label {
  grid-column: 3;
  grid-row: 3;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  padding-top: 8px;
}

/* 单元格内容 */
.cell-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell-badge {
  width: 100%;
}

.cell-badge :deep(.el-badge__content) {
  top: -6px;
  right: -6px;
}

.cell-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.risk-badge {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  color: #fff;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.risk-badge-low {
  background-color: #67C23A;
}

.risk-badge-medium {
  background-color: #E6A23C;
}

.risk-badge-high {
  background-color: #F78989;
}

.risk-badge-critical {
  background-color: #F56C6C;
}

.more-count {
  font-size: 11px;
  color: #909399;
}

/* 表格 */
.risk-title-link {
  color: #409EFF;
  cursor: pointer;
}

.risk-title-link:hover {
  text-decoration: underline;
}

/* AI 结果 */
.ai-result-content {
  max-height: 400px;
  overflow-y: auto;
}

/* 空状态 */
.empty-card {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 筛选卡片 */
.filter-card :deep(.el-card__body) {
  padding: 12px 20px;
}

/* 工具栏卡片 */
.toolbar-card :deep(.el-card__body) {
  padding: 16px 20px;
}
</style>
