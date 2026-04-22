import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref([])
  const currentProject = ref(null)
  const loading = ref(false)
  const stats = ref({
    total: 0,
    planning: 0,
    executing: 0,
    reviewing: 0,
    completed: 0,
    archived: 0
  })

  // 计算属性
  const activeProjects = computed(() =>
    projects.value.filter(p => p.status !== 'archived')
  )

  const projectStats = computed(() => stats.value)

  // 方法

  /**
   * 加载项目列表
   */
  async function fetchProjects(filters = {}) {
    loading.value = true
    try {
      const result = await window.api.projects.list(filters)
      if (result.success) {
        projects.value = result.data
      }
      return result
    } catch (err) {
      console.error('获取项目列表失败:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取项目详情
   */
  async function fetchProjectById(id) {
    loading.value = true
    try {
      const result = await window.api.projects.getById(id)
      if (result.success) {
        currentProject.value = result.data
      }
      return result
    } catch (err) {
      console.error('获取项目详情失败:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建项目
   */
  async function createProject(projectData) {
    try {
      const result = await window.api.projects.create(projectData)
      if (result.success) {
        await fetchProjects()
      }
      return result
    } catch (err) {
      console.error('创建项目失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 更新项目
   */
  async function updateProject(id, updates) {
    try {
      const result = await window.api.projects.update(id, updates)
      if (result.success) {
        await fetchProjects()
        if (currentProject.value && currentProject.value.id === id) {
          await fetchProjectById(id)
        }
      }
      return result
    } catch (err) {
      console.error('更新项目失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 删除项目
   */
  async function deleteProject(id) {
    try {
      const result = await window.api.projects.delete(id)
      if (result.success) {
        projects.value = projects.value.filter(p => p.id !== id)
        if (currentProject.value && currentProject.value.id === id) {
          currentProject.value = null
        }
      }
      return result
    } catch (err) {
      console.error('删除项目失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取项目统计
   */
  async function fetchStats() {
    try {
      const result = await window.api.projects.getStats()
      if (result.success) {
        stats.value = result.data
      }
      return result
    } catch (err) {
      console.error('获取项目统计失败:', err)
      return { success: false, message: err.message }
    }
  }

  /**
   * 清空当前项目
   */
  function clearCurrentProject() {
    currentProject.value = null
  }

  return {
    // 状态
    projects,
    currentProject,
    loading,
    stats,
    // 计算属性
    activeProjects,
    projectStats,
    // 方法
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProject,
    deleteProject,
    fetchStats,
    clearCurrentProject
  }
})
