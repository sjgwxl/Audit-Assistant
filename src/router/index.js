import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', requiresAuth: true }
      },
      {
        path: 'projects',
        name: 'ProjectList',
        component: () => import('@/views/ProjectList.vue'),
        meta: { title: '项目列表', requiresAuth: true }
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/ProjectDetail.vue'),
        meta: { title: '项目详情', requiresAuth: true },
        props: true
      },
      {
        path: 'interviews/:id',
        name: 'InterviewDetail',
        component: () => import('@/views/InterviewDetail.vue'),
        meta: { title: '访谈详情', requiresAuth: true },
        props: true
      },
      {
        path: 'interviewees/:id',
        name: 'IntervieweeDetail',
        component: () => import('@/views/IntervieweeDetail.vue'),
        meta: { title: '被访谈人详情', requiresAuth: true },
        props: true
      },
      {
        path: 'risk-matrix',
        name: 'RiskMatrix',
        component: () => import('@/views/RiskMatrix.vue'),
        meta: { title: '风险矩阵', requiresAuth: true }
      },
      {
        path: 'ai-settings',
        name: 'AISettings',
        component: () => import('@/views/AISettings.vue'),
        meta: { title: 'AI 设置', requiresAuth: true }
      },
      {
        path: 'system-settings',
        name: 'SystemSettings',
        component: () => import('@/views/SystemSettings.vue'),
        meta: { title: '系统设置', requiresAuth: true }
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '页面未找到', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 审计助手系统` : '审计助手系统'

  // 跳过登录：如果没有用户信息，自动设置默认admin用户
  if (to.meta.requiresAuth !== false) {
    const userStr = localStorage.getItem('audit_user')
    if (!userStr) {
      // 默认以admin身份登录，无需输入密码
      localStorage.setItem('audit_user', JSON.stringify({
        id: 'admin-default',
        username: 'admin',
        real_name: '系统管理员',
        role: 'admin',
        department: '信息中心'
      }))
      localStorage.setItem('audit_token', btoa('admin-default:' + Date.now()))
    }
  }

  next()
})

export default router
