<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // 从本地存储恢复登录状态
  authStore.restoreSession()

  // 监听自动保存事件
  if (window.api?.autosave) {
    window.api.autosave.onTrigger(() => {
      console.log('[AutoSave] 自动保存触发')
      // 可以在这里触发全局保存逻辑
    })
  }

  // 监听菜单事件
  if (window.api?.onMenu) {
    window.api.onMenu.newProject(() => {
      // 导航到新建项目页面
      window.location.hash = '#/projects?action=new'
    })
  }
})

onUnmounted(() => {
  // 清理
})
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

/* Element Plus 全局覆盖 */
.el-card {
  border-radius: 8px;
}

.el-table th.el-table__cell {
  background-color: #f5f7fa !important;
}
</style>
