<template>
  <div class="interview-detail-container">
    <!-- 页面头部 -->
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <span v-if="interview" class="page-title">{{ interview.title }}</span>
        <span v-else>访谈详情</span>
      </template>
    </el-page-header>

    <!-- 加载状态 -->
    <div v-if="pageLoading" class="loading-wrapper">
      <el-skeleton :rows="10" animated />
    </div>

    <!-- 错误状态 -->
    <el-result v-else-if="loadError" icon="error" title="加载失败" :sub-title="loadError">
      <template #extra>
        <el-button type="primary" @click="loadInterview">重新加载</el-button>
      </template>
    </el-result>

    <!-- 主内容 -->
    <div v-else-if="interview" class="main-content">
      <!-- ==================== 访谈信息头部 ==================== -->
      <el-card class="info-header-card" shadow="never">
        <div class="header-top">
          <div class="header-info">
            <h2 class="interview-title">{{ interview.title }}</h2>
            <div class="header-meta">
              <el-tag :type="statusTypeMap[interview.status] || 'info'" size="small">
                {{ statusLabelMap[interview.status] || interview.status }}
              </el-tag>
              <span class="meta-item">
                <el-icon><Calendar /></el-icon>
                {{ interview.date || '-' }}
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ interview.time_start || '-' }} ~ {{ interview.time_end || '-' }}
              </span>
              <span class="meta-item">
                <el-icon><Location /></el-icon>
                {{ interview.location || '-' }}
              </span>
            </div>
          </div>
          <div class="header-actions">
            <el-dropdown trigger="click" @command="handleStatusChange">
              <el-button>
                状态: {{ statusLabelMap[interview.status] || interview.status }}
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="draft">草稿</el-dropdown-item>
                  <el-dropdown-item command="reviewed">已审查</el-dropdown-item>
                  <el-dropdown-item command="confirmed">已确认</el-dropdown-item>
                  <el-dropdown-item command="archived">已归档</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <el-divider />
        <el-descriptions :column="4" size="small">
          <el-descriptions-item label="访谈类型">{{ interview.interview_type === 'meeting' ? '会议访谈' : '单人访谈' }}</el-descriptions-item>
          <el-descriptions-item label="访谈人">{{ interview.interviewer || '-' }}</el-descriptions-item>
          <el-descriptions-item label="被访谈人">{{ intervieweeName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ interview.created_at || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- ==================== 自动保存指示器 ==================== -->
      <div class="autosave-bar">
        <span v-if="isDirty" class="dirty-indicator">
          <el-icon><Warning /></el-icon>
          有未保存的更改
        </span>
        <span v-else-if="lastSavedTime" class="saved-indicator">
          <el-icon><CircleCheck /></el-icon>
          已保存于 {{ lastSavedTime }}
        </span>
        <span v-else class="clean-indicator">
          <el-icon><CircleCheck /></el-icon>
          所有更改已保存
        </span>
      </div>

      <!-- ==================== 结构化编辑区域 ==================== -->
      <div class="edit-sections">
        <!-- 访谈内容 -->
        <el-card class="section-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <span class="section-title">访谈内容</span>
              <el-button link type="primary" size="small" @click="expandSection('content')">
                {{ expandedSections.content ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="expandedSections.content ? 12 : 6"
            placeholder="请输入访谈内容，记录访谈过程中的主要信息和对话要点..."
            @input="markDirty"
          />
        </el-card>

        <!-- 访谈摘要 -->
        <el-card class="section-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <span class="section-title">访谈摘要</span>
              <div class="section-actions">
                <el-button
                  link
                  type="success"
                  size="small"
                  :loading="aiSummaryLoading"
                  :icon="MagicStick"
                  @click="handleAIGenerateSummary"
                >
                  AI生成摘要
                </el-button>
                <el-button link type="primary" size="small" @click="expandSection('summary')">
                  {{ expandedSections.summary ? '收起' : '展开' }}
                </el-button>
              </div>
            </div>
          </template>
          <el-input
            v-model="formData.summary"
            type="textarea"
            :rows="expandedSections.summary ? 10 : 5"
            placeholder="请输入访谈摘要，概括访谈的核心内容和主要结论..."
            @input="markDirty"
          />
        </el-card>

        <!-- 关键发现 -->
        <el-card class="section-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <span class="section-title">关键发现</span>
              <div class="section-actions">
                <el-button
                  link
                  type="success"
                  size="small"
                  :loading="aiFindingsLoading"
                  :icon="MagicStick"
                  @click="handleAIExtractFindings"
                >
                  AI提取关键发现
                </el-button>
                <el-button link type="primary" size="small" @click="expandSection('key_findings')">
                  {{ expandedSections.key_findings ? '收起' : '展开' }}
                </el-button>
              </div>
            </div>
          </template>
          <el-input
            v-model="formData.key_findings"
            type="textarea"
            :rows="expandedSections.key_findings ? 10 : 5"
            placeholder="请输入关键发现，记录访谈中识别到的重要问题和发现..."
            @input="markDirty"
          />
        </el-card>

        <!-- 风险指标 -->
        <el-card class="section-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <span class="section-title">风险指标</span>
              <div class="section-actions">
                <el-button
                  link
                  type="success"
                  size="small"
                  :loading="aiRiskLoading"
                  :icon="MagicStick"
                  @click="handleAIExtractRisks"
                >
                  AI提取风险指标
                </el-button>
                <el-button link type="primary" size="small" @click="expandSection('risk_indicators')">
                  {{ expandedSections.risk_indicators ? '收起' : '展开' }}
                </el-button>
              </div>
            </div>
          </template>
          <el-input
            v-model="formData.risk_indicators"
            type="textarea"
            :rows="expandedSections.risk_indicators ? 8 : 4"
            placeholder="请输入风险指标，描述访谈中发现的潜在风险信号..."
            @input="markDirty"
          />
        </el-card>

        <!-- 待办事项 -->
        <el-card class="section-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <span class="section-title">待办事项</span>
              <el-button link type="primary" size="small" @click="expandSection('action_items')">
                {{ expandedSections.action_items ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
          <el-input
            v-model="formData.action_items"
            type="textarea"
            :rows="expandedSections.action_items ? 8 : 4"
            placeholder="请输入待办事项，记录需要跟进的行动项（每行一条）..."
            @input="markDirty"
          />
        </el-card>

        <!-- 备注 -->
        <el-card class="section-card" shadow="hover">
          <template #header>
            <div class="section-header">
              <span class="section-title">备注</span>
              <el-button link type="primary" size="small" @click="expandSection('remark')">
                {{ expandedSections.remark ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="expandedSections.remark ? 6 : 3"
            placeholder="其他补充说明（选填）..."
            @input="markDirty"
          />
        </el-card>
      </div>

      <!-- ==================== 附件区域 ==================== -->
      <el-card class="section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <span class="section-title">附件</span>
          </div>
        </template>
        <div v-if="interview.audio_file_path" class="attachment-info">
          <el-icon :size="24"><Headset /></el-icon>
          <div class="attachment-detail">
            <span class="attachment-name">录音文件</span>
            <span class="attachment-path">{{ interview.audio_file_path }}</span>
          </div>
        </div>
        <div v-else class="no-attachment">
          <el-icon :size="24"><Upload /></el-icon>
          <span>暂无附件。如需上传录音文件，请在本地文件系统中管理。</span>
        </div>
      </el-card>

      <!-- ==================== AI审查面板 ==================== -->
      <el-card class="section-card ai-panel" shadow="hover">
        <template #header>
          <div class="section-header">
            <span class="section-title">AI智能审查</span>
            <el-button
              type="success"
              size="small"
              :icon="MagicStick"
              :loading="aiAnalyzing"
              @click="handleAIAnalyze"
            >
              AI审查
            </el-button>
          </div>
        </template>
        <div v-if="aiAnalyzing" class="ai-loading">
          <el-icon class="is-loading" :size="28"><Loading /></el-icon>
          <span>AI正在分析访谈内容，请稍候...</span>
        </div>
        <div v-else-if="aiAnalysisResult" class="ai-result">
          <pre>{{ aiAnalysisResult }}</pre>
        </div>
        <div v-else class="ai-placeholder">
          <el-icon :size="40" color="#c0c4cc"><MagicStick /></el-icon>
          <p>点击"AI审查"按钮，AI将基于访谈内容自动分析风险点、关键发现和改进建议。</p>
        </div>
      </el-card>

      <!-- ==================== 底部操作栏 ==================== -->
      <div class="bottom-bar">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :loading="saving" :icon="Check" @click="handleSave">
          保存
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Calendar, Clock, Location, ArrowDown, Warning, CircleCheck,
  MagicStick, Check, Headset, Upload, Loading
} from '@element-plus/icons-vue'

// ==================== Props & Route ====================
const props = defineProps({ id: [String, Number] })
const route = useRoute()
const router = useRouter()

// ==================== 映射表 ====================
const statusLabelMap = {
  draft: '草稿', reviewed: '已审查', confirmed: '已确认', archived: '已归档'
}
const statusTypeMap = {
  draft: 'info', reviewed: 'warning', confirmed: 'success', archived: ''
}

// ==================== 基础状态 ====================
const interview = ref(null)
const intervieweeName = ref('')
const pageLoading = ref(true)
const loadError = ref('')
const saving = ref(false)

// ==================== 表单数据 ====================
const formData = reactive({
  content: '',
  summary: '',
  key_findings: '',
  risk_indicators: '',
  action_items: '',
  remark: ''
})

// ==================== 脏数据 & 自动保存 ====================
const isDirty = ref(false)
const lastSavedTime = ref('')
let autoSaveTimer = null
const AUTO_SAVE_INTERVAL = 30000 // 30秒

// ==================== 展开/收起 ====================
const expandedSections = reactive({
  content: false,
  summary: false,
  key_findings: false,
  risk_indicators: false,
  action_items: false,
  remark: false
})

// ==================== AI ====================
const aiAnalyzing = ref(false)
const aiSummaryLoading = ref(false)
const aiFindingsLoading = ref(false)
const aiRiskLoading = ref(false)
const aiAnalysisResult = ref('')

// ==================== 数据加载 ====================
async function loadInterview() {
  pageLoading.value = true
  loadError.value = ''
  try {
    const result = await window.api.interviews.getById(props.id)
    if (result.success && result.data) {
      interview.value = result.data
      // 填充表单
      formData.content = result.data.content || ''
      formData.summary = result.data.summary || ''
      formData.key_findings = result.data.key_findings || ''
      formData.risk_indicators = result.data.risk_indicators || ''
      formData.action_items = result.data.action_items || ''
      formData.remark = result.data.remark || ''
      isDirty.value = false
      // 加载被访谈人名称
      if (result.data.interviewee_ids) {
        await loadIntervieweeNames(result.data.interviewee_ids)
      }
    } else {
      loadError.value = result.message || '加载访谈数据失败'
    }
  } catch (err) {
    console.error('加载访谈失败:', err)
    loadError.value = err.message || '网络错误'
  } finally {
    pageLoading.value = false
  }
}

async function loadIntervieweeNames(intervieweeIds) {
  try {
    const ids = (intervieweeIds || '').split(',').filter(Boolean)
    if (ids.length === 0) {
      intervieweeName.value = ''
      return
    }
    const names = []
    for (const id of ids) {
      const result = await window.api.interviewees.getById(id)
      if (result.success && result.data) {
        names.push(result.data.name)
      }
    }
    intervieweeName.value = names.join('、')
  } catch (err) {
    console.error('加载被访谈人信息失败:', err)
    intervieweeName.value = ''
  }
}

// ==================== 脏数据管理 ====================
function markDirty() {
  isDirty.value = true
  resetAutoSaveTimer()
}

function resetAutoSaveTimer() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  autoSaveTimer = setTimeout(() => {
    autoSave()
  }, AUTO_SAVE_INTERVAL)
}

async function autoSave() {
  if (!isDirty.value || !interview.value) return
  try {
    const result = await window.api.interviews.update(props.id, { ...formData })
    if (result.success) {
      isDirty.value = false
      const now = new Date()
      lastSavedTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    }
  } catch (err) {
    console.error('自动保存失败:', err)
  }
}

// ==================== 保存 ====================
async function handleSave() {
  saving.value = true
  try {
    const result = await window.api.interviews.update(props.id, { ...formData })
    if (result.success) {
      isDirty.value = false
      const now = new Date()
      lastSavedTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (err) {
    console.error('保存失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// ==================== 状态变更 ====================
async function handleStatusChange(newStatus) {
  try {
    const result = await window.api.interviews.update(props.id, { status: newStatus })
    if (result.success) {
      interview.value.status = newStatus
      ElMessage.success(`状态已更新为"${statusLabelMap[newStatus] || newStatus}"`)
    } else {
      ElMessage.error(result.message || '状态更新失败')
    }
  } catch (err) {
    console.error('更新状态失败:', err)
    ElMessage.error('状态更新失败')
  }
}

// ==================== 展开/收起 ====================
function expandSection(section) {
  expandedSections[section] = !expandedSections[section]
}

// ==================== AI审查 ====================
async function handleAIAnalyze() {
  if (!formData.content && !formData.summary) {
    ElMessage.warning('请先填写访谈内容或摘要，再进行AI审查')
    return
  }
  aiAnalyzing.value = true
  aiAnalysisResult.value = ''
  try {
    const analyzeContent = {
      content: formData.content,
      summary: formData.summary,
      key_findings: formData.key_findings,
      risk_indicators: formData.risk_indicators
    }
    const result = await window.api.ai.analyzeInterview(
      JSON.stringify(analyzeContent),
      interview.value?.title || ''
    )
    if (result.success) {
      const analysisContent = result.content || result.fullResponse?.choices?.[0]?.message?.content || ''
      if (analysisContent) {
        aiAnalysisResult.value = analysisContent
        ElMessage.success('AI审查完成')
      } else {
        aiAnalysisResult.value = 'AI未返回有效内容，请重试'
        ElMessage.warning('AI审查结果为空')
      }
    } else {
      aiAnalysisResult.value = '审查失败: ' + (result.message || '未知错误')
      ElMessage.error('AI审查失败')
    }
  } catch (err) {
    console.error('AI审查失败:', err)
    aiAnalysisResult.value = 'AI审查出错: ' + (err.message || '请检查AI服务配置')
    ElMessage.error('AI审查失败，请检查AI服务配置')
  } finally {
    aiAnalyzing.value = false
  }
}

// ==================== AI生成摘要 ====================
async function handleAIGenerateSummary() {
  if (!formData.content) {
    ElMessage.warning('请先填写访谈内容，再生成摘要')
    return
  }
  aiSummaryLoading.value = true
  try {
    const result = await window.api.ai.generateSummary(formData.content, interview.value?.interview_type || 'individual')
    if (result && result.success) {
      formData.summary = result.content || ''
      markDirty()
      ElMessage.success('AI摘要已生成')
    } else {
      const msg = (result && result.message) || '未知错误'
      if (msg.includes('API Key')) {
        ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
      } else if (msg.includes('aborted') || msg.includes('timeout')) {
        ElMessage.error({ message: 'AI请求超时，请检查网络后重试', duration: 5000 })
      } else {
        ElMessage.error({ message: '生成失败: ' + msg, duration: 5000 })
      }
    }
  } catch (err) {
    console.error('AI生成摘要失败:', err)
    const msg = err.message || ''
    if (msg.includes('API Key')) {
      ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
    } else if (msg.includes('aborted') || msg.includes('timeout')) {
      ElMessage.error({ message: 'AI请求超时，请检查网络后重试', duration: 5000 })
    } else {
      ElMessage.error({ message: '生成失败: ' + msg, duration: 5000 })
    }
  } finally {
    aiSummaryLoading.value = false
  }
}

// ==================== AI提取关键发现 ====================
async function handleAIExtractFindings() {
  if (!formData.content) {
    ElMessage.warning('请先填写访谈内容，再提取关键发现')
    return
  }
  aiFindingsLoading.value = true
  try {
    const result = await window.api.ai.extractKeyFindings(formData.content, interview.value?.title || '', interview.value?.interview_type || 'individual')
    if (result && result.success) {
      formData.key_findings = result.content || ''
      markDirty()
      ElMessage.success('关键发现已提取')
    } else {
      const msg = (result && result.message) || '未知错误'
      if (msg.includes('API Key')) {
        ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
      } else {
        ElMessage.error({ message: '提取失败: ' + msg, duration: 5000 })
      }
    }
  } catch (err) {
    console.error('AI提取关键发现失败:', err)
    const msg = err.message || ''
    if (msg.includes('API Key')) {
      ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
    } else {
      ElMessage.error({ message: '提取失败: ' + msg, duration: 5000 })
    }
  } finally {
    aiFindingsLoading.value = false
  }
}

// ==================== AI提取风险指标 ====================
async function handleAIExtractRisks() {
  if (!formData.content) {
    ElMessage.warning('请先填写访谈内容，再提取风险指标')
    return
  }
  aiRiskLoading.value = true
  try {
    const result = await window.api.ai.extractRiskIndicators(formData.content, interview.value?.title || '', interview.value?.interview_type || 'individual')
    if (result && result.success) {
      formData.risk_indicators = result.content || ''
      markDirty()
      ElMessage.success('风险指标已提取')
    } else {
      const msg = (result && result.message) || '未知错误'
      if (msg.includes('API Key')) {
        ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
      } else {
        ElMessage.error({ message: '提取失败: ' + msg, duration: 5000 })
      }
    }
  } catch (err) {
    console.error('AI提取风险指标失败:', err)
    const msg = err.message || ''
    if (msg.includes('API Key')) {
      ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
    } else {
      ElMessage.error({ message: '提取失败: ' + msg, duration: 5000 })
    }
  } finally {
    aiRiskLoading.value = false
  }
}

// ==================== 导航 ====================
function goBack() {
  if (isDirty.value) {
    ElMessageBox.confirm('有未保存的更改，确定要离开吗？', '提示', {
      confirmButtonText: '离开',
      cancelButtonText: '留在此页',
      type: 'warning'
    }).then(() => {
      navigateBack()
    }).catch(() => {
      // 用户选择留在此页
    })
  } else {
    navigateBack()
  }
}

function navigateBack() {
  if (interview.value?.project_id) {
    router.push(`/projects/${interview.value.project_id}`)
  } else {
    router.back()
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await loadInterview()
  // 启动自动保存计时器
  resetAutoSaveTimer()
})

onBeforeUnmount(() => {
  // 离开前尝试自动保存
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  if (isDirty.value && interview.value) {
    autoSave()
  }
})

// 监听路由 id 变化
watch(() => props.id, (newId) => {
  if (newId) {
    isDirty.value = false
    lastSavedTime.value = ''
    aiAnalysisResult.value = ''
    loadInterview()
  }
})
</script>

<style scoped>
.interview-detail-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.loading-wrapper {
  margin-top: 40px;
}

.main-content {
  margin-top: 20px;
}

/* ==================== 信息头部 ==================== */
.info-header-card {
  margin-bottom: 12px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.interview-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #606266;
}

.header-actions {
  flex-shrink: 0;
}

/* ==================== 自动保存指示器 ==================== */
.autosave-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 6px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  border-radius: 4px;
}

.dirty-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #E6A23C;
}

.saved-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67C23A;
}

.clean-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
}

/* ==================== 编辑区域 ==================== */
.edit-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ==================== 附件 ==================== */
.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.attachment-detail {
  display: flex;
  flex-direction: column;
}

.attachment-name {
  font-weight: 500;
  color: #303133;
}

.attachment-path {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.no-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 14px;
}

/* ==================== AI面板 ==================== */
.ai-panel {
  margin-bottom: 16px;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  color: #409EFF;
  font-size: 14px;
}

.ai-result {
  max-height: 600px;
  overflow-y: auto;
}

.ai-result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.7;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin: 0;
}

.ai-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 0;
  color: #c0c4cc;
  text-align: center;
}

.ai-placeholder p {
  margin: 0;
  font-size: 14px;
  max-width: 400px;
}

/* ==================== 底部操作栏 ==================== */
.bottom-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #ebeef5;
}
</style>
