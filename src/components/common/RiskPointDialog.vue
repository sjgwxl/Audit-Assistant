<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑风险点' : '新建风险点'"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="top"
    >
      <el-form-item label="风险标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入风险点标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="风险类别" prop="category">
            <el-select v-model="formData.category" placeholder="请选择风险类别" style="width: 100%">
              <el-option label="财务风险" value="financial" />
              <el-option label="运营风险" value="operational" />
              <el-option label="合规风险" value="compliance" />
              <el-option label="战略风险" value="strategic" />
              <el-option label="信息风险" value="information" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="风险等级" prop="risk_level">
            <el-select v-model="formData.risk_level" placeholder="请选择风险等级" style="width: 100%">
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
                <span style="color: #8B0000; font-weight: 600">严重</span>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="发生可能性" prop="likelihood">
            <el-select v-model="formData.likelihood" placeholder="请选择发生可能性" style="width: 100%">
              <el-option label="罕见" value="rare" />
              <el-option label="不太可能" value="unlikely" />
              <el-option label="可能" value="possible" />
              <el-option label="很可能" value="likely" />
              <el-option label="几乎确定" value="almost_certain" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="影响程度" prop="impact">
            <el-select v-model="formData.impact" placeholder="请选择影响程度" style="width: 100%">
              <el-option label="可忽略" value="insignificant" />
              <el-option label="轻微" value="minor" />
              <el-option label="中等" value="moderate" />
              <el-option label="重大" value="major" />
              <el-option label="灾难性" value="catastrophic" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="风险描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请详细描述风险点"
        />
      </el-form-item>

      <el-divider content-position="left">应对措施</el-divider>

      <el-form-item label="审计证据" prop="evidence">
        <el-input
          v-model="formData.evidence"
          type="textarea"
          :rows="3"
          placeholder="请描述相关审计证据"
        />
      </el-form-item>

      <el-form-item label="缓解计划" prop="mitigation_plan">
        <el-input
          v-model="formData.mitigation_plan"
          type="textarea"
          :rows="3"
          placeholder="请输入风险缓解计划"
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="责任人" prop="responsible_person">
            <el-input
              v-model="formData.responsible_person"
              placeholder="请输入责任人"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="截止日期" prop="due_date">
            <el-date-picker
              v-model="formData.due_date"
              type="date"
              placeholder="请选择截止日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          placeholder="其他补充说明（选填）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? '保存修改' : '创建风险点' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: [String, Number],
    default: ''
  },
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'saved'])

const formRef = ref(null)
const saving = ref(false)

const isEdit = computed(() => !!props.editData)

const formData = reactive({
  title: '',
  category: 'other',
  description: '',
  risk_level: 'medium',
  likelihood: 'possible',
  impact: 'moderate',
  evidence: '',
  mitigation_plan: '',
  responsible_person: '',
  due_date: '',
  remark: ''
})

const rules = {
  title: [
    { required: true, message: '请输入风险标题', trigger: 'blur' }
  ]
}

// 监听对话框打开，加载数据
watch(() => props.visible, (val) => {
  if (val) {
    if (props.editData) {
      // 编辑模式：填充表单
      Object.assign(formData, {
        title: props.editData.title || '',
        category: props.editData.category || '',
        description: props.editData.description || '',
        risk_level: props.editData.risk_level || '',
        likelihood: props.editData.likelihood || '',
        impact: props.editData.impact || '',
        evidence: props.editData.evidence || '',
        mitigation_plan: props.editData.mitigation_plan || '',
        responsible_person: props.editData.responsible_person || '',
        due_date: props.editData.due_date || '',
        remark: props.editData.remark || ''
      })
    }
  }
})

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    // 从 localStorage 获取当前用户
    const userStr = localStorage.getItem('audit_user')
    let createdBy = null
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        createdBy = user.id || user.username || user
      } catch {
        createdBy = userStr
      }
    }

    const data = {
      ...formData,
      project_id: props.projectId,
      created_by: createdBy
    }

    if (isEdit.value) {
      await window.api.riskPoints.update({ ...data, id: props.editData.id })
      ElMessage.success('风险点已更新')
    } else {
      await window.api.riskPoints.create(data)
      ElMessage.success('风险点已创建')
    }

    emit('update:visible', false)
    emit('saved')
  } catch (error) {
    console.error('保存风险点失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

function resetForm() {
  formRef.value?.resetFields()
  Object.assign(formData, {
    title: '',
    category: 'other',
    description: '',
    risk_level: 'medium',
    likelihood: 'possible',
    impact: 'moderate',
    evidence: '',
    mitigation_plan: '',
    responsible_person: '',
    due_date: '',
    remark: ''
  })
}
</script>

<style scoped>
:deep(.el-divider__text) {
  font-weight: 600;
  color: #303133;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}
</style>
