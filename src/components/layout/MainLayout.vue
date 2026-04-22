<template>
  <el-container class="main-layout">
    <!-- 左侧导航栏 -->
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="sidebar">
      <div class="logo-area">
        <el-icon :size="28" color="#409EFF"><Monitor /></el-icon>
        <span v-show="!isCollapsed" class="logo-text">审计辅助系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="true"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        <el-menu-item index="/projects">
          <el-icon><FolderOpened /></el-icon>
          <template #title>项目管理</template>
        </el-menu-item>
        <el-menu-item index="/risk-matrix">
          <el-icon><Warning /></el-icon>
          <template #title>风险分析</template>
        </el-menu-item>
        <el-menu-item index="/ai-settings">
          <el-icon><Cpu /></el-icon>
          <template #title>AI设置</template>
        </el-menu-item>
        <el-menu-item index="/system-settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container class="content-container">
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            :size="20"
            @click="toggleCollapse"
          >
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="breadcrumbItems.length > 0">
              {{ breadcrumbItems[0] }}
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="breadcrumbItems.length > 1">
              {{ breadcrumbItems[1] }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项目、访谈、风险点..."
            prefix-icon="Search"
            clearable
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
            <el-icon :size="20" class="header-icon" @click="showNotifications">
              <Bell />
            </el-icon>
          </el-badge>
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">{{ username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="system-settings">系统设置</el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <span style="color: #F56C6C">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Monitor, DataAnalysis, FolderOpened, Warning, Cpu, Setting,
  Fold, Expand, Search, Bell, ArrowDown, UserFilled
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 侧边栏折叠状态
const isCollapsed = ref(false)
const searchKeyword = ref('')
const unreadCount = ref(3)
const username = ref('审计员')

// 当前激活菜单
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/projects')) return '/projects'
  if (path.startsWith('/risk-matrix')) return '/risk-matrix'
  if (path.startsWith('/ai-settings')) return '/ai-settings'
  if (path.startsWith('/system-settings')) return '/system-settings'
  return '/dashboard'
})

// 面包屑
const breadcrumbItems = computed(() => {
  const items = []
  const pathMap = {
    '/projects': ['项目管理'],
    '/risk-matrix': ['风险分析'],
    '/ai-settings': ['AI设置'],
    '/system-settings': ['系统设置'],
  }
  if (route.meta && route.meta.breadcrumb) {
    return route.meta.breadcrumb
  }
  if (pathMap[route.path]) {
    return pathMap[route.path]
  }
  // 动态路由面包屑
  if (route.path.startsWith('/projects/')) {
    items.push('项目管理')
    if (route.path.includes('/interviews/')) {
      items.push('访谈详情')
    } else if (route.path.includes('/interviewees/')) {
      items.push('被访谈人详情')
    } else {
      items.push('项目详情')
    }
  }
  return items
})

// 切换侧边栏
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 搜索处理
function handleSearch() {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/projects', query: { search: searchKeyword.value.trim() } })
  }
}

// 通知
function showNotifications() {
  ElMessage.info('消息中心开发中...')
}

// 用户菜单命令
function handleUserCommand(command) {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息页面开发中...')
      break
    case 'system-settings':
      router.push('/system-settings')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 退出登录
async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    if (window.api) {
      localStorage.removeItem('audit_user')
      router.push('/login')
    }
  } catch {
    // 取消操作
  }
}

// 加载用户信息
async function loadUserInfo() {
  try {
    const userStr = localStorage.getItem('audit_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      username.value = user.username || '审计员'
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

loadUserInfo()
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}

.content-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: #409EFF;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 280px;
}

.notification-badge {
  line-height: 1;
}

.header-icon {
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.header-icon:hover {
  color: #409EFF;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
}

.main-content {
  background: #f0f2f5;
  overflow-y: auto;
  padding: 20px;
}

/* 路由过渡动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
