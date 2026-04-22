<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑访谈记录' : '新建访谈记录'"
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
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="访谈日期" prop="date">
            <el-date-picker
              v-model="formData.date"
              type="date"
              placeholder="请选择访谈日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="被访谈人" prop="interviewee_id">
            <el-select
              v-model="formData.interviewee_id"
              placeholder="请选择被访谈人"
              filterable
              :loading="intervieweesLoading"
              style="width: 100%"
            >
              <el-option
                v-for="person in interviewees"
                :key="person.id"
                :label="`${person.name} - ${person.department || ''} ${person.position || ''}`"
                :value="person.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="访谈标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入访谈标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="开始时间" prop="time_start">
            <el-time-picker
              v-model="formData.time_start"
              placeholder="开始时间"
              value-format="HH:mm"
              format="HH:mm"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间" prop="time_end">
            <el-time-picker
              v-model="formData.time_end"
              placeholder="结束时间"
              value-format="HH:mm"
              format="HH:mm"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="访谈地点" prop="location">
            <el-input v-model="formData.location" placeholder="请输入访谈地点" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="访谈人" prop="interviewer">
            <el-input v-model="formData.interviewer" placeholder="请输入访谈人" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">访谈详情</el-divider>

      <el-form-item label="访谈内容" prop="content">
        <el-input
          v-model="formData.content"
          type="textarea"
          :rows="5"
          placeholder="请输入访谈详细内容"
        />
      </el-form-item>

      <el-form-item label="访谈摘要" prop="summary">
        <el-input
          v-model="formData.summary"
          type="textarea"
          :rows="3"
          placeholder="请输入访谈摘要"
        />
      </el-form-item>

      <el-form-item label="关键发现" prop="key_findings">
        <el-input
          v-model="formData.key_findings"
          type="textarea"
          :rows="3"
          placeholder="请输入关键发现"
        />
      </el-form-item>

      <el-form-item label="风险指标" prop="risk_indicators">
        <el-input
          v-model="formData.risk_indicators"
          type="textarea"
          :rows="3"
          placeholder="请输入风险指标"
        />
      </el-form-item>

      <el-form-item label="行动计划" prop="action_items">
        <el-input
          v-model="formData.action_items"
          type="textarea"
          :rows="3"
          placeholder="请输入行动计划"
        />
      </el-form-item>

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
        {{ isEdit ? '保存修改' : '创建访谈' }}
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
const interviewees = ref([])
const intervieweesLoading = ref(false)

const isEdit = computed(() => !!props.editData)

const formData = reactive({
  title: '',
  date: '',
  time_start: '',
  time_end: '',
  location: '',
  interviewer: '',
  interviewee_id: '',
  content: '',
  summary: '',
  key_findings: '',
  risk_indicators: '',
  action_items: '',
  remark: ''
})

const rules = {
  title: [
    { required: true, message: '请输入访谈标题', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择访谈日期', trigger: 'change' }
  ]
}

// 加载被访谈人列表
async function loadInterviewees() {
  intervieweesLoading.value = true
  try {
    const res = await window.api.interviewees.list()
    interviewees.value = res || []
  } catch (error) {
    console.error('加载被访谈人列表失败:', error)
    interviewees.value = []
  } finally {
    intervieweesLoading.value = false
  }
}

// 监听对话框打开，加载数据
watch(() => props.visible, (val) => {
  if (val) {
    loadInterviewees()
    if (props.editData) {
      // 编辑模式：填充表单
      Object.assign(formData, {
        title: props.editData.title || '',
        date: props.editData.date || '',
        time_start: props.editData.time_start || '',
        time_end: props.editData.time_end || '',
        location: props.editData.location || '',
        interviewer: props.editData.interviewer || '',
        interviewee_id: props.editData.interviewee_id || '',
        content: props.editData.content || '',
        summary: props.editData.summary || '',
        key_findings: props.editData.key_findings || '',
        risk_indicators: props.editData.risk_indicators || '',
        action_items: props.editData.action_items || '',
        remark: props.editData.remark || ''
      })
    } else {
      // 新建模式：初始化日期为今天
      formData.date = new Date().toISOString().split('T')[0]
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
      await window.api.interviews.update({ ...data, id: props.editData.id })
      ElMessage.success('访谈记录已更新')
    } else {
      await window.api.interviews.create(data)
      ElMessage.success('访谈记录已创建')
    }

    emit('update:visible', false)
    emit('saved')
  } catch (error) {
    console.error('保存访谈记录失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

function resetForm() {
  formRef.value?.resetFields()
  Object.assign(formData, {
    title: '',
    date: '',
    time_start: '',
    time_end: '',
    location: '',
    interviewer: '',
    interviewee_id: '',
    content: '',
    summary: '',
    key_findings: '',
    risk_indicators: '',
    action_items: '',
    remark: ''
  })
  interviewees.value = []
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
