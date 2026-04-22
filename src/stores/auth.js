import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // 状态
  const user = ref(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)

  // 计算属性
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isAuditor = computed(() => ['admin', 'auditor'].includes(user.value?.role))
  const userName = computed(() => user.value?.real_name || user.value?.username || '')

  // 方法

  /**
   * 用户登录
   */
  async function login(username, password) {
    loading.value = true
    try {
      const result = await window.api.auth.login(username, password)
      if (result.success) {
        user.value = result.user
        isAuthenticated.value = true

        // 保存会话到本地存储
        localStorage.setItem('audit_user', JSON.stringify(result.user))
        localStorage.setItem('audit_token', btoa(`${result.user.id}:${Date.now()}`))

        return result
      }
      return result
    } catch (err) {
      console.error('登录失败:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户注册
   */
  async function register(userData) {
    loading.value = true
    try {
      const result = await window.api.auth.register(userData)
      return result
    } catch (err) {
      console.error('注册失败:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 修改密码
   */
  async function changePassword(oldPassword, newPassword) {
    if (!user.value) {
      return { success: false, message: '未登录' }
    }
    try {
      const result = await window.api.auth.changePassword(user.value.id, oldPassword, newPassword)
      return result
    } catch (err) {
      console.error('修改密码失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 退出登录
   */
  function logout() {
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('audit_user')
    localStorage.removeItem('audit_token')
    router.push('/login')
  }

  /**
   * 从本地存储恢复会话
   */
  function restoreSession() {
    const userStr = localStorage.getItem('audit_user')
    if (userStr) {
      try {
        user.value = JSON.parse(userStr)
        isAuthenticated.value = true
      } catch (err) {
        localStorage.removeItem('audit_user')
        localStorage.removeItem('audit_token')
      }
    }
  }

  /**
   * 检查权限
   */
  function hasRole(...roles) {
    if (!user.value) return false
    return roles.includes(user.value.role)
  }

  return {
    // 状态
    user,
    isAuthenticated,
    loading,
    // 计算属性
    isAdmin,
    isAuditor,
    userName,
    // 方法
    login,
    register,
    changePassword,
    logout,
    restoreSession,
    hasRole
  }
})
