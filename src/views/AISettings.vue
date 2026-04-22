<template>
  <div class="ai-settings-container">
    <el-card shadow="hover">
      <template #header>
        <h3>AI 设置</h3>
      </template>

      <el-form label-width="140px" style="max-width: 600px;">
        <el-form-item label="AI 提供商">
          <el-select v-model="settingsStore.currentProvider" style="width: 100%" @change="handleProviderChange">
            <el-option
              v-for="p in settingsStore.aiProviders"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="API Key">
          <el-input
            v-model="apiKeyInput"
            type="password"
            placeholder="请输入 API Key"
            show-password
          />
        </el-form-item>

        <el-form-item label="模型">
          <el-select v-model="selectedModel" style="width: 100%" @change="handleModelChange">
            <el-option
              v-for="m in currentModels"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSaveApiKey">保存 API Key</el-button>
          <el-button @click="handleTestConnection">测试连接</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'

const settingsStore = useSettingsStore()
const apiKeyInput = ref('')
const selectedModel = ref('')

const currentModels = computed(() => {
  const provider = settingsStore.aiProviders.find(p => p.id === settingsStore.currentProvider)
  return provider?.models || []
})

onMounted(() => {
  settingsStore.fetchAIProviders()
})

function handleProviderChange(provider) {
  settingsStore.setActiveProvider(provider)
  const models = settingsStore.aiProviders.find(p => p.id === provider)?.models
  if (models && models.length > 0) {
    selectedModel.value = models[0]
    settingsStore.setActiveModel(provider, models[0])
  }
}

function handleModelChange(model) {
  settingsStore.setActiveModel(settingsStore.currentProvider, model)
}

async function handleSaveApiKey() {
  if (!apiKeyInput.value) {
    ElMessage.warning('请输入 API Key')
    return
  }
  const result = await settingsStore.saveApiKey(settingsStore.currentProvider, apiKeyInput.value)
  if (result.success) {
    ElMessage.success('API Key 保存成功')
    apiKeyInput.value = ''
  } else {
    ElMessage.error(result.message || '保存失败')
  }
}

async function handleTestConnection() {
  const result = await settingsStore.testAIConnection(settingsStore.currentProvider)
  if (result.success) {
    ElMessage.success(`连接成功! 模型: ${result.model}`)
  } else {
    ElMessage.error(result.message || '连接失败')
  }
}
</script>

<style scoped>
.ai-settings-container {
  padding: 20px;
}
</style>
