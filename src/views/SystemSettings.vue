<template>
  <div class="system-settings-container">
    <el-card shadow="hover">
      <template #header>
        <h3>系统设置</h3>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本设置" name="general">
          <el-form label-width="140px" style="max-width: 600px;">
            <el-form-item label="自动保存间隔">
              <el-input-number v-model="autoSaveInterval" :min="10" :max="300" :step="10" />
              <span style="margin-left: 10px; color: #909399;">秒</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveAutoSaveInterval">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="数据备份" name="backup">
          <el-space direction="vertical" :size="20" style="width: 100%;">
            <div>
              <el-button type="primary" @click="handleCreateBackup">
                <el-icon><Download /></el-icon> 创建备份
              </el-button>
            </div>

            <el-divider />

            <div>
              <h4>备份文件列表</h4>
              <el-table :data="backups" stripe style="margin-top: 10px;">
                <el-table-column prop="name" label="文件名" />
                <el-table-column prop="size" label="大小" width="120">
                  <template #default="{ row }">
                    {{ (row.size / 1024).toFixed(2) }} KB
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="200" />
                <el-table-column label="操作" width="150">
                  <template #default="{ row }">
                    <el-button type="primary" link @click="handleRestore(row.path)">恢复</el-button>
                    <el-button type="danger" link @click="handleDeleteBackup(row.path)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-space>
        </el-tab-pane>

        <el-tab-pane label="用户管理" name="users">
          <el-table :data="users" stripe>
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="real_name" label="姓名" />
            <el-table-column prop="role" label="角色" width="100" />
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="last_login_at" label="最后登录" width="180" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="操作日志" name="logs">
          <el-table :data="logs" stripe max-height="500">
            <el-table-column prop="username" label="用户" width="100" />
            <el-table-column prop="action" label="操作" width="150" />
            <el-table-column prop="target_type" label="对象类型" width="100" />
            <el-table-column prop="detail" label="详情" />
            <el-table-column prop="created_at" label="时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('general')
const autoSaveInterval = ref(30)
const backups = ref([])
const users = ref([])
const logs = ref([])

onMounted(async () => {
  await loadBackups()
  await loadUsers()
  await loadLogs()
})

async function loadBackups() {
  const result = await window.api.backup.list()
  if (result.success) {
    backups.value = result.data
  }
}

async function loadUsers() {
  const result = await window.api.auth.listUsers()
  if (result.success) {
    users.value = result.data
  }
}

async function loadLogs() {
  const result = await window.api.logs.list({ limit: 100 })
  if (result.success) {
    logs.value = result.data
  }
}

async function saveAutoSaveInterval() {
  const result = await window.api.autosave.setInterval(autoSaveInterval.value)
  if (result.success) {
    ElMessage.success('自动保存间隔已更新')
  }
}

async function handleCreateBackup() {
  const result = await window.api.backup.create()
  if (result.success) {
    ElMessage.success('备份创建成功')
    await loadBackups()
  } else {
    ElMessage.error(result.message || '备份失败')
  }
}

async function handleRestore(backupPath) {
  try {
    await ElMessageBox.confirm('确定要恢复此备份吗？当前数据将被替换。', '确认恢复', {
      type: 'warning'
    })
    const result = await window.api.backup.restore(backupPath)
    if (result.success) {
      ElMessage.success('数据库已恢复，应用将重新启动')
    } else {
      ElMessage.error(result.message || '恢复失败')
    }
  } catch {
    // 用户取消
  }
}

async function handleDeleteBackup(backupPath) {
  try {
    await ElMessageBox.confirm('确定要删除此备份文件吗？', '确认删除', {
      type: 'warning'
    })
    const result = await window.api.backup.delete(backupPath)
    if (result.success) {
      ElMessage.success('备份已删除')
      await loadBackups()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.system-settings-container {
  padding: 20px;
}
</style>
