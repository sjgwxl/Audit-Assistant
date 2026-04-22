import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref({})
  const loading = ref(false)
  const aiProviders = ref([])
  const currentProvider = ref('deepseek')
  const currentModel = ref('')

  // 方法

  /**
   * 加载所有设置
   */
  async function fetchSettings(category) {
    loading.value = true
    try {
      const result = await window.api.settings.list(category)
      if (result.success) {
        const settingsMap = {}
        for (const item of result.data) {
          settingsMap[item.key] = item.value
        }
        settings.value = settingsMap
      }
      return result
    } catch (err) {
      console.error('获取设置失败:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取单个设置
   */
  async function getSetting(key) {
    try {
      const result = await window.api.settings.get(key)
      if (result.success) {
        settings.value[key] = result.data
        return result.data
      }
      return null
    } catch (err) {
      console.error(`获取设置 ${key} 失败:`, err)
      return null
    }
  }

  /**
   * 保存设置
   */
  async function saveSetting(key, value, type = 'string', category = 'general', description = '') {
    try {
      const result = await window.api.settings.set(key, value, type, category, description)
      if (result.success) {
        settings.value[key] = value
      }
      return result
    } catch (err) {
      console.error(`保存设置 ${key} 失败:`, err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 批量保存设置
   */
  async function saveSettings(settingsList) {
    const results = []
    for (const item of settingsList) {
      const result = await saveSetting(item.key, item.value, item.type, item.category, item.description)
      results.push({ key: item.key, ...result })
    }
    return results
  }

  /**
   * 删除设置
   */
  async function deleteSetting(key) {
    try {
      const result = await window.api.settings.delete(key)
      if (result.success) {
        delete settings.value[key]
      }
      return result
    } catch (err) {
      console.error(`删除设置 ${key} 失败:`, err)
      return { success: false, message: err.message }
    }
  }

  // AI 相关方法

  /**
   * 获取 AI 提供商列表
   */
  async function fetchAIProviders() {
    try {
      const result = await window.api.ai.getProviders()
      if (result.success) {
        aiProviders.value = result.data
      }
      return result
    } catch (err) {
      console.error('获取 AI 提供商列表失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 保存 AI API Key
   */
  async function saveApiKey(provider, apiKey) {
    try {
      const result = await window.api.ai.saveApiKey(provider, apiKey)
      if (result.success) {
        // 刷新提供商列表
        await fetchAIProviders()
      }
      return result
    } catch (err) {
      console.error('保存 API Key 失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 测试 AI 连接
   */
  async function testAIConnection(provider) {
    try {
      return await window.api.ai.testConnection(provider)
    } catch (err) {
      console.error('测试 AI 连接失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 设置当前 AI 提供商
   */
  async function setActiveProvider(provider) {
    currentProvider.value = provider
    await saveSetting('ai_provider', provider, 'string', 'ai', '当前使用的 AI 提供商')
  }

  /**
   * 设置当前 AI 模型
   */
  async function setActiveModel(provider, model) {
    currentModel.value = model
    await saveSetting(`ai_model_${provider}`, model, 'string', 'ai', `${provider} 使用的模型`)
  }

  return {
    // 状态
    settings,
    loading,
    aiProviders,
    currentProvider,
    currentModel,
    // 方法
    fetchSettings,
    getSetting,
    saveSetting,
    saveSettings,
    deleteSetting,
    fetchAIProviders,
    saveApiKey,
    testAIConnection,
    setActiveProvider,
    setActiveModel
  }
})
