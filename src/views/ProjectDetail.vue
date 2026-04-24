<template>
  <div class="project-detail-container">
    <!-- 页面头部 -->
    <el-page-header @back="$router.push('/projects')" title="返回项目列表">
      <template #content>
        <span v-if="project" class="page-title">{{ project.name }}</span>
        <span v-else>项目详情</span>
      </template>
    </el-page-header>

    <!-- 加载状态 -->
    <div v-if="pageLoading" class="loading-wrapper">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 错误状态 -->
    <el-result v-else-if="loadError" icon="error" title="加载失败" :sub-title="loadError">
      <template #extra>
        <el-button type="primary" @click="loadProject">重新加载</el-button>
      </template>
    </el-result>

    <!-- 主内容 -->
    <div v-else-if="project" class="main-content">
      <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
        <!-- ==================== Tab 1: 基本信息 ==================== -->
        <el-tab-pane label="基本信息" name="info">
          <div class="tab-header">
            <el-button type="primary" :icon="Edit" @click="openEditDialog">编辑项目</el-button>
          </div>
          <el-descriptions :column="2" border class="info-descriptions">
            <el-descriptions-item label="项目名称">{{ project.name }}</el-descriptions-item>
            <el-descriptions-item label="项目编号">{{ project.code }}</el-descriptions-item>
            <el-descriptions-item label="项目类型">
              <el-tag :type="projectTypeMap[project.type]?.type || 'info'" size="small">
                {{ projectTypeMap[project.type]?.label || project.type }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="项目状态">
              <el-tag :type="statusTypeMap[project.status] || 'info'" size="small">
                {{ statusLabelMap[project.status] || project.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审计对象">{{ project.audit_object || '-' }}</el-descriptions-item>
            <el-descriptions-item label="风险等级">
              <el-tag :type="riskTypeMap[project.risk_level] || 'info'" size="small">
                {{ riskLabelMap[project.risk_level] || project.risk_level }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审计期间" :span="2">
              {{ project.audit_period_start || '-' }} ~ {{ project.audit_period_end || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="审计范围" :span="2">{{ project.audit_scope || '-' }}</el-descriptions-item>
            <el-descriptions-item label="审计团队" :span="2">{{ project.audit_team || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预算工时">{{ project.budget_hours ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="发现数量">{{ project.findings_count ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ project.description || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ project.remark || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ project.created_at || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ project.updated_at || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- ==================== Tab 2: 访谈记录 ==================== -->
        <el-tab-pane label="访谈记录" name="interviews">
          <div class="tab-header">
            <div class="filter-bar">
              <el-date-picker
                v-model="interviewDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 260px"
                @change="loadInterviews"
              />
              <el-select
                v-model="interviewFilterInterviewee"
                placeholder="筛选被访谈人"
                clearable
                filterable
                style="width: 180px"
                @change="loadInterviews"
              >
                <el-option
                  v-for="p in intervieweeList"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                />
              </el-select>
            </div>
            <el-button type="primary" :icon="Plus" @click="openInterviewDialog(null)">新建访谈</el-button>
          </div>
          <el-table
            :data="interviewList"
            stripe
            v-loading="interviewsLoading"
            @row-click="(row) => $router.push(`/interviews/${row.id}`)"
            style="width: 100%; cursor: pointer"
          >
            <el-table-column prop="date" label="日期" width="120" sortable />
            <el-table-column prop="title" label="访谈主题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="interviewer" label="访谈人" width="120" show-overflow-tooltip />
            <el-table-column label="被访谈人" width="160">
              <template #default="{ row }">
                {{ row.interviewee_name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="interviewStatusTypeMap[row.status] || 'info'" size="small">
                  {{ interviewStatusLabelMap[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click.stop="$router.push(`/interviews/${row.id}`)">查看</el-button>
                <el-button link type="warning" size="small" @click.stop="openInterviewDialog(row)">编辑</el-button>
                <el-popconfirm title="确定删除该访谈记录？" @confirm="handleDeleteInterview(row.id)">
                  <template #reference>
                    <el-button link type="danger" size="small" @click.stop>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!interviewsLoading && interviewList.length === 0" description="暂无访谈记录" />
        </el-tab-pane>

        <!-- ==================== Tab 3: 访谈人员 ==================== -->
        <el-tab-pane label="访谈人员" name="interviewees">
          <div class="tab-header">
            <el-button type="primary" :icon="Plus" @click="openIntervieweeDialog(null)">添加人员</el-button>
          </div>
          <div v-loading="intervieweesLoading" class="interviewee-cards">
            <el-card
              v-for="person in intervieweeList"
              :key="person.id"
              shadow="hover"
              class="interviewee-card"
              @click="$router.push(`/interviewees/${person.id}`)"
            >
              <div class="card-header">
                <div class="card-name">
                  <el-icon :size="20"><User /></el-icon>
                  <span>{{ person.name }}</span>
                </div>
                <div class="card-actions" @click.stop>
                  <el-button link type="warning" size="small" @click="openIntervieweeDialog(person)">编辑</el-button>
                  <el-popconfirm title="确定删除该人员？" @confirm="handleDeleteInterviewee(person.id)">
                    <template #reference>
                      <el-button link type="danger" size="small">删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
              <el-descriptions :column="1" size="small" class="card-info">
                <el-descriptions-item label="职位">{{ person.position || '-' }}</el-descriptions-item>
                <el-descriptions-item label="部门">{{ person.department || '-' }}</el-descriptions-item>
                <el-descriptions-item label="审计角色">{{ person.role_in_audit || '-' }}</el-descriptions-item>
                <el-descriptions-item label="访谈次数">{{ getInterviewCountForPerson(person.id) }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </div>
          <el-empty v-if="!intervieweesLoading && intervieweeList.length === 0" description="暂无访谈人员" />
        </el-tab-pane>

        <!-- ==================== Tab 4: 风险点 ==================== -->
        <el-tab-pane label="风险点" name="risks">
          <div class="tab-header">
            <div class="filter-bar">
              <el-select
                v-model="riskFilterLevel"
                placeholder="风险等级"
                clearable
                style="width: 130px"
                @change="loadRiskPoints"
              >
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="严重" value="critical" />
              </el-select>
              <el-select
                v-model="riskFilterStatus"
                placeholder="风险状态"
                clearable
                style="width: 130px"
                @change="loadRiskPoints"
              >
                <el-option label="已识别" value="identified" />
                <el-option label="分析中" value="analyzing" />
                <el-option label="缓解中" value="mitigating" />
                <el-option label="已解决" value="resolved" />
                <el-option label="已接受" value="accepted" />
                <el-option label="已转移" value="transferred" />
              </el-select>
            </div>
            <div>
              <el-button :icon="MagicStick" @click="handleAIRiskMatch" :disabled="!selectedRiskId">AI风险匹配</el-button>
              <el-button type="primary" :icon="Plus" @click="openRiskDialog(null)">新建风险点</el-button>
            </div>
          </div>
          <el-table
            :data="riskList"
            stripe
            v-loading="risksLoading"
            @selection-change="handleRiskSelection"
            style="width: 100%"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="title" label="风险标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="category" label="分类" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.category" type="info" size="small">{{ row.category }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="risk_level" label="风险等级" width="100">
              <template #default="{ row }">
                <el-tag :type="riskTypeMap[row.risk_level] || 'info'" size="small">
                  {{ riskLabelMap[row.risk_level] || row.risk_level }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="riskStatusTypeMap[row.status] || 'info'" size="small">
                  {{ riskStatusLabelMap[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="likelihood" label="可能性" width="80" align="center" />
            <el-table-column prop="impact" label="影响" width="80" align="center" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openRiskDialog(row)">编辑</el-button>
                <el-popconfirm title="确定删除该风险点？" @confirm="handleDeleteRisk(row.id)">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!risksLoading && riskList.length === 0" description="暂无风险点" />
        </el-tab-pane>

        <!-- ==================== Tab 5: AI分析 ==================== -->
        <el-tab-pane label="AI分析" name="ai">
          <div class="tab-header">
            <el-button type="success" :icon="MagicStick" :loading="aiAnalyzing" @click="handleGenerateAIReport">
              生成AI审查报告
            </el-button>
            <el-button type="warning" :icon="Document" :loading="aiSummaryLoading" @click="handleGenerateSummary">
              生成项目摘要
            </el-button>
          </div>
          <el-table :data="aiAnalysisList" stripe v-loading="aiListLoading" style="width: 100%">
            <el-table-column prop="title" label="分析标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="source_type" label="来源类型" width="120">
              <template #default="{ row }">
                {{ aiSourceTypeMap[row.source_type] || row.source_type || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="provider" label="AI提供商" width="120" />
            <el-table-column prop="model" label="模型" width="140" show-overflow-tooltip />
            <el-table-column prop="tokens_used" label="Token用量" width="100" align="center" />
            <el-table-column prop="created_at" label="生成时间" width="170" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewAIAnalysis(row)">查看</el-button>
                <el-popconfirm title="确定删除该分析记录？" @confirm="handleDeleteAIAnalysis(row.id)">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!aiListLoading && aiAnalysisList.length === 0" description="暂无AI分析记录" />
        </el-tab-pane>

        <!-- ==================== Tab 6: 待办事项 ==================== -->
        <el-tab-pane label="待办事项" name="todos">
          <div class="tab-header">
            <el-button type="primary" :icon="Plus" @click="openTodoDialog(null)">新建待办</el-button>
          </div>
          <el-table :data="todoList" stripe v-loading="todosLoading" style="width: 100%">
            <el-table-column prop="title" label="待办事项" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span :class="{ 'todo-completed': row.status === 'completed' }">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" width="100">
              <template #default="{ row }">
                <el-tag :type="todoPriorityTypeMap[row.priority] || 'info'" size="small">
                  {{ todoPriorityLabelMap[row.priority] || row.priority }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="todoStatusTypeMap[row.status] || 'info'" size="small">
                  {{ todoStatusLabelMap[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="due_date" label="截止日期" width="120" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  :type="row.status === 'completed' ? 'warning' : 'success'"
                  size="small"
                  @click="toggleTodoStatus(row)"
                >
                  {{ row.status === 'completed' ? '标为未完成' : '标为已完成' }}
                </el-button>
                <el-button link type="primary" size="small" @click="openTodoDialog(row)">编辑</el-button>
                <el-popconfirm title="确定删除该待办事项？" @confirm="handleDeleteTodo(row.id)">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!todosLoading && todoList.length === 0" description="暂无待办事项" />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- ==================== 编辑项目对话框 ==================== -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑项目信息"
      width="700px"
      :close-on-click-modal="false"
      @closed="resetEditForm"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目名称" prop="name">
              <el-input v-model="editForm.name" placeholder="请输入项目名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目编号" prop="code">
              <el-input v-model="editForm.code" placeholder="请输入项目编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目类型" prop="type">
              <el-select v-model="editForm.type" placeholder="请选择项目类型" style="width: 100%">
                <el-option label="常规审计" value="routine" />
                <el-option label="专项审计" value="special" />
                <el-option label="跟踪审计" value="follow-up" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目状态" prop="status">
              <el-select v-model="editForm.status" placeholder="请选择项目状态" style="width: 100%">
                <el-option label="准备中" value="planning" />
                <el-option label="进行中" value="executing" />
                <el-option label="审查中" value="reviewing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已归档" value="archived" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="风险等级" prop="risk_level">
              <el-select v-model="editForm.risk_level" placeholder="请选择风险等级" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="严重" value="critical" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预算工时" prop="budget_hours">
              <el-input-number v-model="editForm.budget_hours" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="审计对象" prop="audit_object">
          <el-input v-model="editForm.audit_object" placeholder="请输入审计对象" />
        </el-form-item>
        <el-form-item label="审计期间">
          <el-date-picker
            v-model="editForm.auditPeriodRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="审计范围" prop="audit_scope">
          <el-input v-model="editForm.audit_scope" type="textarea" :rows="2" placeholder="请输入审计范围" />
        </el-form-item>
        <el-form-item label="审计团队" prop="audit_team">
          <el-input v-model="editForm.audit_team" placeholder="请输入审计团队成员" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="handleSaveProject">保存修改</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 新建/编辑访谈对话框 ==================== -->
    <el-dialog
      v-model="interviewDialogVisible"
      :title="interviewFormIsEdit ? '编辑访谈记录' : '新建访谈记录'"
      width="680px"
      :close-on-click-modal="false"
      @closed="resetInterviewForm"
    >
      <el-form ref="interviewFormRef" :model="interviewForm" :rules="interviewRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="访谈日期" prop="date">
              <el-date-picker
                v-model="interviewForm.date"
                type="date"
                placeholder="请选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="访谈主题" prop="title">
              <el-input v-model="interviewForm.title" placeholder="请输入访谈主题" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="被访谈人" prop="interviewee_ids">
              <el-select v-model="interviewForm.interviewee_ids" placeholder="请选择（可多选）" filterable multiple collapse-tags collapse-tags-tooltip style="width: 100%">
                <el-option
                  v-for="p in intervieweeList"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="访谈人" prop="interviewer">
              <el-input v-model="interviewForm.interviewer" placeholder="请输入访谈人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间" prop="time_start">
              <el-time-picker v-model="interviewForm.time_start" placeholder="开始时间" format="HH:mm" value-format="HH:mm" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="time_end">
              <el-time-picker v-model="interviewForm.time_end" placeholder="结束时间" format="HH:mm" value-format="HH:mm" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地点" prop="location">
          <el-input v-model="interviewForm.location" placeholder="请输入访谈地点" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="interviewForm.remark" type="textarea" :rows="2" placeholder="备注信息（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="interviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="interviewSaving" @click="handleSaveInterview">
          {{ interviewFormIsEdit ? '保存修改' : '创建访谈' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 添加/编辑访谈人员对话框 ==================== -->
    <el-dialog
      v-model="intervieweeDialogVisible"
      :title="intervieweeFormIsEdit ? '编辑人员信息' : '添加访谈人员'"
      width="600px"
      :close-on-click-modal="false"
      @closed="resetIntervieweeForm"
    >
      <el-form ref="intervieweeFormRef" :model="intervieweeForm" :rules="intervieweeRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="intervieweeForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="intervieweeForm.gender" placeholder="请选择" style="width: 100%">
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职位" prop="position">
              <el-input v-model="intervieweeForm.position" placeholder="请输入职位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-input v-model="intervieweeForm.department" placeholder="请输入部门" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="company">
              <el-input v-model="intervieweeForm.company" placeholder="请输入单位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审计角色" prop="role_in_audit">
              <el-input v-model="intervieweeForm.role_in_audit" placeholder="请输入审计角色" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="intervieweeForm.phone" placeholder="请输入电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="intervieweeForm.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="intervieweeForm.remark" type="textarea" :rows="2" placeholder="备注信息（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="intervieweeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="intervieweeSaving" @click="handleSaveInterviewee">
          {{ intervieweeFormIsEdit ? '保存修改' : '添加人员' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 新建/编辑风险点对话框 ==================== -->
    <el-dialog
      v-model="riskDialogVisible"
      :title="riskFormIsEdit ? '编辑风险点' : '新建风险点'"
      width="700px"
      :close-on-click-modal="false"
      @closed="resetRiskForm"
    >
      <el-form ref="riskFormRef" :model="riskForm" :rules="riskRules" label-width="100px">
        <el-form-item label="风险标题" prop="title">
          <el-input v-model="riskForm.title" placeholder="请输入风险点标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="风险描述" prop="description">
          <el-input v-model="riskForm.description" type="textarea" :rows="3" placeholder="请详细描述风险点" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="风险等级" prop="risk_level">
              <el-select v-model="riskForm.risk_level" placeholder="请选择" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="严重" value="critical" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="可能性" prop="likelihood">
              <el-select v-model="riskForm.likelihood" placeholder="请选择" style="width: 100%">
                <el-option label="罕见" value="rare" />
                <el-option label="不太可能" value="unlikely" />
                <el-option label="可能" value="possible" />
                <el-option label="很可能" value="likely" />
                <el-option label="几乎确定" value="almost_certain" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="影响程度" prop="impact">
              <el-select v-model="riskForm.impact" placeholder="请选择" style="width: 100%">
                <el-option label="可忽略" value="insignificant" />
                <el-option label="轻微" value="minor" />
                <el-option label="中等" value="moderate" />
                <el-option label="重大" value="major" />
                <el-option label="灾难性" value="catastrophic" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="riskForm.category" placeholder="请选择风险分类" style="width: 100%">
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
            <el-form-item label="状态" prop="status">
              <el-select v-model="riskForm.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="已识别" value="identified" />
                <el-option label="分析中" value="analyzing" />
                <el-option label="缓解中" value="mitigating" />
                <el-option label="已解决" value="resolved" />
                <el-option label="已接受" value="accepted" />
                <el-option label="已转移" value="transferred" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="来源" prop="source">
          <el-input v-model="riskForm.source" placeholder="请输入风险来源" />
        </el-form-item>
        <el-form-item label="证据" prop="evidence">
          <el-input v-model="riskForm.evidence" type="textarea" :rows="2" placeholder="请描述相关证据" />
        </el-form-item>
        <el-form-item label="缓解方案" prop="mitigation_plan">
          <el-input v-model="riskForm.mitigation_plan" type="textarea" :rows="2" placeholder="请输入缓解方案" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="责任人" prop="responsible_person">
              <el-input v-model="riskForm.responsible_person" placeholder="请输入责任人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="due_date">
              <el-date-picker v-model="riskForm.due_date" type="date" placeholder="请选择" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="riskForm.remark" type="textarea" :rows="2" placeholder="备注信息（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="riskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="riskSaving" @click="handleSaveRisk">
          {{ riskFormIsEdit ? '保存修改' : '创建风险点' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 新建/编辑待办事项对话框 ==================== -->
    <el-dialog
      v-model="todoDialogVisible"
      :title="todoFormIsEdit ? '编辑待办事项' : '新建待办事项'"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetTodoForm"
    >
      <el-form ref="todoFormRef" :model="todoForm" :rules="todoRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="todoForm.title" placeholder="请输入待办事项标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="todoForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="todoForm.priority" placeholder="请选择" style="width: 100%">
                <el-option label="紧急" value="urgent" />
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="due_date">
              <el-date-picker v-model="todoForm.due_date" type="date" placeholder="请选择" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="todoForm.remark" type="textarea" :rows="2" placeholder="备注信息（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="todoDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="todoSaving" @click="handleSaveTodo">
          {{ todoFormIsEdit ? '保存修改' : '创建待办' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== AI分析结果对话框 ==================== -->
    <el-dialog v-model="aiResultDialogVisible" title="AI分析结果" width="700px">
      <div v-loading="aiResultLoading" class="ai-result-content">
        <pre v-if="aiResultContent">{{ aiResultContent }}</pre>
        <el-empty v-else-if="!aiResultLoading" description="暂无分析结果" />
      </div>
      <template #footer>
        <el-button @click="aiResultDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Plus, MagicStick, Document, User } from '@element-plus/icons-vue'

// ==================== Props & Route ====================
const props = defineProps({ id: [String, Number] })
const route = useRoute()
const router = useRouter()

// ==================== 映射表 ====================
const statusLabelMap = {
  planning: '准备中', executing: '进行中', reviewing: '审查中',
  completed: '已完成', archived: '已归档'
}
const statusTypeMap = {
  planning: 'info', executing: 'warning', reviewing: '',
  completed: 'success', archived: 'info'
}
const riskLabelMap = { low: '低', medium: '中', high: '高', critical: '严重' }
const riskTypeMap = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' }
const riskStatusLabelMap = {
  identified: '已识别', analyzing: '分析中', mitigating: '缓解中',
  resolved: '已解决', accepted: '已接受', transferred: '已转移'
}
const riskStatusTypeMap = {
  identified: 'info', analyzing: 'warning', mitigating: '',
  resolved: 'success', accepted: 'success', transferred: 'info'
}
const interviewStatusLabelMap = {
  draft: '草稿', reviewed: '已审查', confirmed: '已确认', archived: '已归档'
}
const interviewStatusTypeMap = {
  draft: 'info', reviewed: 'warning', confirmed: 'success', archived: ''
}
const projectTypeMap = {
  routine: { label: '常规审计', type: '' },
  special: { label: '专项审计', type: 'warning' },
  'follow-up': { label: '跟踪审计', type: 'success' },
  other: { label: '其他', type: 'info' }
}
const aiSourceTypeMap = {
  interview: '访谈分析', document: '文档分析', risk: '风险评估', general: '综合分析'
}
const todoPriorityLabelMap = { urgent: '紧急', high: '高', medium: '中', low: '低' }
const todoPriorityTypeMap = { urgent: 'danger', high: 'danger', medium: 'warning', low: 'success' }
const todoStatusLabelMap = { pending: '待办', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }
const todoStatusTypeMap = { pending: 'info', in_progress: 'warning', completed: 'success', cancelled: 'danger' }

// ==================== 基础状态 ====================
const project = ref(null)
const pageLoading = ref(true)
const loadError = ref('')
const activeTab = ref('info')

// ==================== 访谈记录 ====================
const interviewList = ref([])
const interviewsLoading = ref(false)
const interviewDateRange = ref(null)
const interviewFilterInterviewee = ref(null)
const interviewDialogVisible = ref(false)
const interviewFormIsEdit = ref(false)
const interviewSaving = ref(false)
const interviewFormRef = ref(null)
const editingInterviewId = ref(null)
const interviewForm = reactive({
  date: '', title: '', interviewee_ids: [], interview_type: 'individual', interviewer: '',
  time_start: '', time_end: '', location: '', remark: ''
})
const interviewRules = {
  date: [{ required: true, message: '请选择访谈日期', trigger: 'change' }],
  title: [{ required: true, message: '请输入访谈主题', trigger: 'blur' }],
  interviewee_ids: [{ required: true, type: 'array', min: 1, message: '请选择被访谈人', trigger: 'change' }],
}

// ==================== 访谈人员 ====================
const intervieweeList = ref([])
const intervieweesLoading = ref(false)
const intervieweeDialogVisible = ref(false)
const intervieweeFormIsEdit = ref(false)
const intervieweeSaving = ref(false)
const intervieweeFormRef = ref(null)
const editingIntervieweeId = ref(null)
const intervieweeForm = reactive({
  name: '', gender: '', position: '', department: '',
  company: '', phone: '', email: '', role_in_audit: '', remark: ''
})
const intervieweeRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

// ==================== 风险点 ====================
const riskList = ref([])
const risksLoading = ref(false)
const riskFilterLevel = ref('')
const riskFilterStatus = ref('')
const selectedRiskId = ref(null)
const riskDialogVisible = ref(false)
const riskFormIsEdit = ref(false)
const riskSaving = ref(false)
const riskFormRef = ref(null)
const editingRiskId = ref(null)
const riskForm = reactive({
  title: '', description: '', category: '', risk_level: '',
  likelihood: 3, impact: 3, source: '', status: 'identified',
  evidence: '', mitigation_plan: '', responsible_person: '',
  due_date: '', remark: ''
})
const riskRules = {
  title: [{ required: true, message: '请输入风险标题', trigger: 'blur' }],
  risk_level: [{ required: true, message: '请选择风险等级', trigger: 'change' }]
}

// ==================== AI分析 ====================
const aiAnalysisList = ref([])
const aiListLoading = ref(false)
const aiAnalyzing = ref(false)
const aiSummaryLoading = ref(false)
const aiResultDialogVisible = ref(false)
const aiResultLoading = ref(false)
const aiResultContent = ref('')

// ==================== 待办事项 ====================
const todoList = ref([])
const todosLoading = ref(false)
const todoDialogVisible = ref(false)
const todoFormIsEdit = ref(false)
const todoSaving = ref(false)
const todoFormRef = ref(null)
const editingTodoId = ref(null)
const todoForm = reactive({
  title: '', description: '', priority: 'medium', due_date: '', remark: ''
})
const todoRules = {
  title: [{ required: true, message: '请输入待办标题', trigger: 'blur' }]
}

// ==================== 编辑项目 ====================
const editDialogVisible = ref(false)
const editSaving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  name: '', code: '', type: '', status: '', risk_level: '',
  audit_object: '', audit_scope: '', audit_team: '',
  budget_hours: 0, description: '', remark: '', auditPeriodRange: null
})
const editRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入项目编号', trigger: 'blur' }]
}

// ==================== 数据加载 ====================
async function loadProject() {
  pageLoading.value = true
  loadError.value = ''
  try {
    const result = await window.api.projects.getById(props.id)
    if (result.success) {
      project.value = result.data
    } else {
      loadError.value = result.message || '加载项目数据失败'
    }
  } catch (err) {
    console.error('加载项目失败:', err)
    loadError.value = err.message || '网络错误'
  } finally {
    pageLoading.value = false
  }
}

async function loadInterviews() {
  interviewsLoading.value = true
  try {
    const filters = { project_id: props.id }
    if (interviewDateRange.value && interviewDateRange.value.length === 2) {
      filters.date_start = interviewDateRange.value[0]
      filters.date_end = interviewDateRange.value[1]
    }
    if (interviewFilterInterviewee.value) {
      filters.interviewee_id = interviewFilterInterviewee.value
    }
    const result = await window.api.interviews.list(filters)
    interviewList.value = result.success ? (result.data || []) : []
  } catch (err) {
    console.error('加载访谈记录失败:', err)
    ElMessage.error('加载访谈记录失败')
  } finally {
    interviewsLoading.value = false
  }
}

async function loadInterviewees() {
  intervieweesLoading.value = true
  try {
    const result = await window.api.interviewees.list({})
    intervieweeList.value = result.success ? (result.data || []) : []
  } catch (err) {
    console.error('加载访谈人员失败:', err)
    ElMessage.error('加载访谈人员失败')
  } finally {
    intervieweesLoading.value = false
  }
}

async function loadRiskPoints() {
  risksLoading.value = true
  try {
    const filters = { project_id: props.id }
    if (riskFilterLevel.value) filters.risk_level = riskFilterLevel.value
    if (riskFilterStatus.value) filters.status = riskFilterStatus.value
    const result = await window.api.riskPoints.list(filters)
    riskList.value = result.success ? (result.data || []) : []
  } catch (err) {
    console.error('加载风险点失败:', err)
    ElMessage.error('加载风险点失败')
  } finally {
    risksLoading.value = false
  }
}

async function loadAIAnalyses() {
  aiListLoading.value = true
  try {
    const result = await window.api.aiAnalysis.list({ project_id: props.id })
    aiAnalysisList.value = result.success ? (result.data || []) : []
  } catch (err) {
    console.error('加载AI分析失败:', err)
    ElMessage.error('加载AI分析记录失败')
  } finally {
    aiListLoading.value = false
  }
}

async function loadTodos() {
  todosLoading.value = true
  try {
    const result = await window.api.todos.list({ project_id: props.id })
    todoList.value = result.success ? (result.data || []) : []
  } catch (err) {
    console.error('加载待办事项失败:', err)
    ElMessage.error('加载待办事项失败')
  } finally {
    todosLoading.value = false
  }
}

// ==================== Tab 切换懒加载 ====================
const loadedTabs = ref(new Set(['info']))

function handleTabChange(tabName) {
  if (loadedTabs.value.has(tabName)) return
  loadedTabs.value.add(tabName)
  switch (tabName) {
    case 'interviews':
      loadInterviewees().then(() => loadInterviews())
      break
    case 'interviewees':
      loadInterviewees()
      break
    case 'risks':
      loadRiskPoints()
      break
    case 'ai':
      loadInterviews().then(() => loadAIAnalyses())
      break
    case 'todos':
      loadTodos()
      break
  }
}

// ==================== 辅助方法 ====================
function getIntervieweeName(intervieweeIds) {
  if (!intervieweeIds) return '-'
  const ids = String(intervieweeIds).split(',').filter(Boolean)
  return ids.map(id => {
    const person = intervieweeList.value.find(p => p.id === id)
    return person ? person.name : ''
  }).filter(Boolean).join('、') || '-'
}

function getInterviewCountForPerson(personId) {
  return interviewList.value.filter(i => {
    const ids = (i.interviewee_ids || '').split(',').filter(Boolean)
    return ids.includes(personId)
  }).length
}

function handleRiskSelection(selection) {
  selectedRiskId.value = selection.length > 0 ? selection[0].id : null
}

// ==================== 编辑项目 ====================
function openEditDialog() {
  if (!project.value) return
  Object.assign(editForm, {
    name: project.value.name || '',
    code: project.value.code || '',
    type: project.value.type || '',
    status: project.value.status || '',
    risk_level: project.value.risk_level || '',
    audit_object: project.value.audit_object || '',
    audit_scope: project.value.audit_scope || '',
    audit_team: project.value.audit_team || '',
    budget_hours: project.value.budget_hours || 0,
    description: project.value.description || '',
    remark: project.value.remark || '',
    auditPeriodRange: (project.value.audit_period_start && project.value.audit_period_end)
      ? [project.value.audit_period_start, project.value.audit_period_end]
      : null
  })
  editDialogVisible.value = true
}

async function handleSaveProject() {
  try {
    await editFormRef.value.validate()
  } catch { return }
  editSaving.value = true
  try {
    const updates = { ...editForm }
    if (updates.auditPeriodRange) {
      updates.audit_period_start = updates.auditPeriodRange[0]
      updates.audit_period_end = updates.auditPeriodRange[1]
    } else {
      updates.audit_period_start = null
      updates.audit_period_end = null
    }
    delete updates.auditPeriodRange
    const result = await window.api.projects.update(props.id, updates)
    if (result.success) {
      ElMessage.success('项目信息已更新')
      editDialogVisible.value = false
      await loadProject()
    } else {
      ElMessage.error(result.message || '更新失败')
    }
  } catch (err) {
    console.error('更新项目失败:', err)
    ElMessage.error('更新失败，请重试')
  } finally {
    editSaving.value = false
  }
}

function resetEditForm() {
  editFormRef.value?.resetFields()
}

// ==================== 访谈记录 CRUD ====================
function openInterviewDialog(row) {
  interviewFormIsEdit.value = !!row
  editingInterviewId.value = row ? row.id : null
  if (row) {
    Object.assign(interviewForm, {
      date: row.date || '', title: row.title || '',
      interviewee_ids: row.interviewee_list || (row.interviewee_ids || '').split(',').filter(Boolean) || [],
      interview_type: row.interview_type || 'individual', interviewer: row.interviewer || '',
      time_start: row.time_start || '', time_end: row.time_end || '',
      location: row.location || '', remark: row.remark || ''
    })
  } else {
    Object.assign(interviewForm, {
      date: new Date().toISOString().split('T')[0], title: '',
      interviewee_ids: [], interview_type: 'individual', interviewer: '', time_start: '',
      time_end: '', location: '', remark: ''
    })
  }
  interviewDialogVisible.value = true
}

async function handleSaveInterview() {
  try { await interviewFormRef.value.validate() } catch { return }
  interviewSaving.value = true
  try {
    const data = {
      ...interviewForm,
      interviewee_ids: (interviewForm.interviewee_ids || []).join(','),
      project_id: props.id
    }
    let result
    if (interviewFormIsEdit.value) {
      result = await window.api.interviews.update(editingInterviewId.value, data)
    } else {
      result = await window.api.interviews.create(data)
    }
    if (result.success) {
      ElMessage.success(interviewFormIsEdit.value ? '访谈记录已更新' : '访谈记录已创建')
      interviewDialogVisible.value = false
      await loadInterviews()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (err) {
    console.error('保存访谈记录失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    interviewSaving.value = false
  }
}

async function handleDeleteInterview(id) {
  try {
    const result = await window.api.interviews.delete(id)
    if (result.success) {
      ElMessage.success('访谈记录已删除')
      await loadInterviews()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    console.error('删除访谈记录失败:', err)
    ElMessage.error('删除失败')
  }
}

function resetInterviewForm() {
  interviewFormRef.value?.resetFields()
}

// ==================== 访谈人员 CRUD ====================
function openIntervieweeDialog(row) {
  intervieweeFormIsEdit.value = !!row
  editingIntervieweeId.value = row ? row.id : null
  if (row) {
    Object.assign(intervieweeForm, {
      name: row.name || '', gender: row.gender || '',
      position: row.position || '', department: row.department || '',
      company: row.company || '', phone: row.phone || '',
      email: row.email || '', role_in_audit: row.role_in_audit || '',
      remark: row.remark || ''
    })
  } else {
    Object.assign(intervieweeForm, {
      name: '', gender: '', position: '', department: '',
      company: '', phone: '', email: '', role_in_audit: '', remark: ''
    })
  }
  intervieweeDialogVisible.value = true
}

async function handleSaveInterviewee() {
  try { await intervieweeFormRef.value.validate() } catch { return }
  intervieweeSaving.value = true
  try {
    let result
    if (intervieweeFormIsEdit.value) {
      result = await window.api.interviewees.update(editingIntervieweeId.value, { ...intervieweeForm })
    } else {
      result = await window.api.interviewees.create({ ...intervieweeForm, project_id: props.id })
    }
    if (result.success) {
      ElMessage.success(intervieweeFormIsEdit.value ? '人员信息已更新' : '人员已添加')
      intervieweeDialogVisible.value = false
      await loadInterviewees()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (err) {
    console.error('保存人员信息失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    intervieweeSaving.value = false
  }
}

async function handleDeleteInterviewee(id) {
  try {
    const result = await window.api.interviewees.delete(id)
    if (result.success) {
      ElMessage.success('人员已删除')
      await loadInterviewees()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    console.error('删除人员失败:', err)
    ElMessage.error('删除失败')
  }
}

function resetIntervieweeForm() {
  intervieweeFormRef.value?.resetFields()
}

// ==================== 风险点 CRUD ====================
function openRiskDialog(row) {
  riskFormIsEdit.value = !!row
  editingRiskId.value = row ? row.id : null
  if (row) {
    Object.assign(riskForm, {
      title: row.title || '', description: row.description || '',
      category: row.category || '', risk_level: row.risk_level || '',
      likelihood: row.likelihood || 'possible', impact: row.impact || 'moderate',
      source: row.source || '', status: row.status || 'identified',
      evidence: row.evidence || '', mitigation_plan: row.mitigation_plan || '',
      responsible_person: row.responsible_person || '',
      due_date: row.due_date || '', remark: row.remark || ''
    })
  } else {
    Object.assign(riskForm, {
      title: '', description: '', category: '', risk_level: '',
      likelihood: 'possible', impact: 'moderate', source: '', status: 'identified',
      evidence: '', mitigation_plan: '', responsible_person: '',
      due_date: '', remark: ''
    })
  }
  riskDialogVisible.value = true
}

async function handleSaveRisk() {
  try { await riskFormRef.value.validate() } catch { return }
  riskSaving.value = true
  try {
    const data = { ...riskForm, project_id: props.id }
    let result
    if (riskFormIsEdit.value) {
      result = await window.api.riskPoints.update(editingRiskId.value, data)
    } else {
      result = await window.api.riskPoints.create(data)
    }
    if (result.success) {
      ElMessage.success(riskFormIsEdit.value ? '风险点已更新' : '风险点已创建')
      riskDialogVisible.value = false
      await loadRiskPoints()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (err) {
    console.error('保存风险点失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    riskSaving.value = false
  }
}

async function handleDeleteRisk(id) {
  try {
    const result = await window.api.riskPoints.delete(id)
    if (result.success) {
      ElMessage.success('风险点已删除')
      await loadRiskPoints()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    console.error('删除风险点失败:', err)
    ElMessage.error('删除失败')
  }
}

function resetRiskForm() {
  riskFormRef.value?.resetFields()
}

// ==================== AI风险匹配 ====================
async function handleAIRiskMatch() {
  if (!selectedRiskId.value) {
    ElMessage.warning('请先选择一个风险点')
    return
  }
  const risk = riskList.value.find(r => r.id === selectedRiskId.value)
  if (!risk) return
  aiResultLoading.value = true
  aiResultContent.value = ''
  aiResultDialogVisible.value = true
  try {
    const result = await window.api.ai.assessRisk(
      risk.description || risk.title,
      { project_name: project.value?.name, category: risk.category, risk_level: risk.risk_level }
    )
    if (result.success) {
      aiResultContent.value = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)
    } else {
      aiResultContent.value = '分析失败: ' + (result.message || '未知错误')
    }
  } catch (err) {
    console.error('AI风险匹配失败:', err)
    const msg = err.message || ''
    if (msg.includes('API Key') || msg.includes('api_key')) {
      aiResultContent.value = '⚠️ 请先在左侧菜单"AI设置"页面配置 API Key 后再使用此功能。\n\n配置步骤：\n1. 点击左侧菜单"AI设置"\n2. 选择AI服务商（如DeepSeek）\n3. 输入对应的API Key\n4. 点击"测试连接"确认可用'
    } else {
      aiResultContent.value = 'AI分析出错: ' + msg
    }
  } finally {
    aiResultLoading.value = false
  }
}

// ==================== AI分析 ====================
async function handleGenerateAIReport() {
  if (interviewList.value.length === 0) {
    ElMessage.warning('暂无访谈记录，无法生成审查报告')
    return
  }
  aiAnalyzing.value = true
  try {
    // 组装访谈数据，结合项目审计方向
    const auditDirections = project.value?.audit_scope || ''
    const interviewData = interviewList.value.map(i => ({
      title: i.title,
      content: i.content || '',
      summary: i.summary || '',
      key_findings: i.key_findings || '',
      risk_indicators: i.risk_indicators || '',
      date: i.date,
      interviewee: i.interviewee_name || '',
      interview_type: i.interview_type || 'individual'
    }))
    const prompt = JSON.stringify(interviewData)
    const result = await window.api.ai.analyzeInterview(prompt, project.value?.name)
    console.log('[AI审查报告] AI返回结果:', { success: result?.success, content_length: result?.content?.length, provider: result?.provider })
    if (result && result.success) {
      // 确保content不为空
      const reportContent = result.content || result.fullResponse?.choices?.[0]?.message?.content || JSON.stringify(result, null, 2)
      console.log('[AI审查报告] 报告内容长度:', reportContent?.length)
      if (!reportContent || reportContent === '{}') {
        ElMessage.error('AI返回内容为空，请重试')
        return
      }
      // 保存分析结果
      const userStr = localStorage.getItem('audit_user')
      const userId = userStr ? JSON.parse(userStr).id : null
      const saveResult = await window.api.aiAnalysis.save({
        project_id: props.id,
        source_type: 'general',
        source_id: props.id,
        title: `${project.value?.name} - AI审查报告`,
        content: reportContent,
        provider: result.provider || '',
        model: result.model || '',
        tokens_used: result.tokensUsed || 0,
        created_by: userId
      })
      console.log('[AI审查报告] 保存结果:', saveResult)
      if (saveResult && saveResult.success) {
        ElMessage.success('AI审查报告已生成并保存')
        await loadAIAnalyses()
      } else {
        console.error('保存AI分析失败:', saveResult)
        ElMessage.error({ message: '保存失败: ' + ((saveResult && saveResult.message) || '未知错误'), duration: 5000 })
      }
    } else {
      const errMsg = (result && result.message) || '未知错误'
      if (errMsg.includes('API Key')) {
        ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
      } else {
        ElMessage.error({ message: '生成失败: ' + errMsg, duration: 5000 })
      }
    }
  } catch (err) {
    console.error('生成AI审查报告失败:', err)
    const msg = err.message || ''
    if (msg.includes('API Key') || msg.includes('api_key')) {
      ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
    } else if (msg.includes('aborted') || msg.includes('timeout') || msg.includes('超时')) {
      ElMessage.error({ message: 'AI请求超时，请检查网络连接后重试', duration: 5000 })
    } else {
      ElMessage.error({ message: '生成失败: ' + msg, duration: 5000 })
    }
  } finally {
    aiAnalyzing.value = false
  }
}

async function handleGenerateSummary() {
  aiSummaryLoading.value = true
  try {
    const result = await window.api.ai.generateAuditSummary(
      { name: project.value?.name, type: project.value?.type, status: project.value?.status, audit_scope: project.value?.audit_scope || '' },
      interviewList.value.map(i => ({ title: i.title, summary: i.summary, key_findings: i.key_findings }))
    )
    if (result && result.success) {
      // 确保content不为空
      const summaryContent = result.content || result.fullResponse?.choices?.[0]?.message?.content || JSON.stringify(result, null, 2)
      if (!summaryContent || summaryContent === '{}') {
        ElMessage.error('AI返回内容为空，请重试')
        return
      }
      const userStr2 = localStorage.getItem('audit_user')
      const userId2 = userStr2 ? JSON.parse(userStr2).id : null
      const saveResult2 = await window.api.aiAnalysis.save({
        project_id: props.id,
        source_type: 'general',
        source_id: props.id,
        title: `${project.value?.name} - AI项目摘要`,
        content: summaryContent,
        provider: result.provider || '',
        model: result.model || '',
        tokens_used: result.tokensUsed || 0,
        created_by: userId2
      })
      if (saveResult2 && saveResult2.success) {
        ElMessage.success('项目摘要已生成并保存')
        await loadAIAnalyses()
      } else {
        console.error('保存AI摘要失败:', saveResult2)
        ElMessage.error({ message: '保存失败: ' + ((saveResult2 && saveResult2.message) || '未知错误'), duration: 5000 })
      }
    } else {
      const errMsg = (result && result.message) || '未知错误'
      if (errMsg.includes('API Key')) {
        ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
      } else if (errMsg.includes('aborted') || errMsg.includes('timeout') || errMsg.includes('超时')) {
        ElMessage.error({ message: 'AI请求超时，请检查网络连接后重试', duration: 5000 })
      } else {
        ElMessage.error({ message: '生成失败: ' + errMsg, duration: 5000 })
      }
    }
  } catch (err) {
    console.error('生成项目摘要失败:', err)
    const msg = err.message || ''
    if (msg.includes('API Key') || msg.includes('api_key')) {
      ElMessage.error({ message: '请先在"AI设置"页面配置API Key', duration: 5000 })
    } else if (msg.includes('aborted') || msg.includes('timeout') || msg.includes('超时')) {
      ElMessage.error({ message: 'AI请求超时，请检查网络连接后重试', duration: 5000 })
    } else {
      ElMessage.error({ message: '生成失败: ' + msg, duration: 5000 })
    }
  } finally {
    aiSummaryLoading.value = false
  }
}

async function viewAIAnalysis(row) {
  aiResultLoading.value = true
  aiResultContent.value = ''
  aiResultDialogVisible.value = true
  try {
    const result = await window.api.aiAnalysis.getById(row.id)
    if (result.success && result.data) {
      aiResultContent.value = result.data.content || JSON.stringify(result.data, null, 2)
    } else {
      aiResultContent.value = '加载分析详情失败'
    }
  } catch (err) {
    console.error('加载AI分析详情失败:', err)
    aiResultContent.value = '加载失败: ' + (err.message || '未知错误')
  } finally {
    aiResultLoading.value = false
  }
}

async function handleDeleteAIAnalysis(id) {
  try {
    const result = await window.api.aiAnalysis.delete(id)
    if (result.success) {
      ElMessage.success('分析记录已删除')
      await loadAIAnalyses()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    console.error('删除AI分析失败:', err)
    ElMessage.error('删除失败')
  }
}

// ==================== 待办事项 CRUD ====================
function openTodoDialog(row) {
  todoFormIsEdit.value = !!row
  editingTodoId.value = row ? row.id : null
  if (row) {
    Object.assign(todoForm, {
      title: row.title || '', description: row.description || '',
      priority: row.priority || 'medium', due_date: row.due_date || '',
      remark: row.remark || ''
    })
  } else {
    Object.assign(todoForm, {
      title: '', description: '', priority: 'medium', due_date: '', remark: ''
    })
  }
  todoDialogVisible.value = true
}

async function handleSaveTodo() {
  try { await todoFormRef.value.validate() } catch { return }
  todoSaving.value = true
  try {
    const data = { ...todoForm, project_id: props.id }
    let result
    if (todoFormIsEdit.value) {
      result = await window.api.todos.update(editingTodoId.value, data)
    } else {
      result = await window.api.todos.create(data)
    }
    if (result.success) {
      ElMessage.success(todoFormIsEdit.value ? '待办事项已更新' : '待办事项已创建')
      todoDialogVisible.value = false
      await loadTodos()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (err) {
    console.error('保存待办事项失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    todoSaving.value = false
  }
}

async function toggleTodoStatus(row) {
  const newStatus = row.status === 'completed' ? 'pending' : 'completed'
  const updates = { status: newStatus }
  if (newStatus === 'completed') {
    updates.completed_at = new Date().toISOString()
  } else {
    updates.completed_at = null
  }
  try {
    const result = await window.api.todos.update(row.id, updates)
    if (result.success) {
      ElMessage.success(newStatus === 'completed' ? '已标为完成' : '已标为未完成')
      await loadTodos()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (err) {
    console.error('更新待办状态失败:', err)
    ElMessage.error('操作失败')
  }
}

async function handleDeleteTodo(id) {
  try {
    const result = await window.api.todos.delete(id)
    if (result.success) {
      ElMessage.success('待办事项已删除')
      await loadTodos()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (err) {
    console.error('删除待办事项失败:', err)
    ElMessage.error('删除失败')
  }
}

function resetTodoForm() {
  todoFormRef.value?.resetFields()
}

// ==================== 生命周期 ====================
onMounted(async () => {
  await loadProject()
})

watch(() => props.id, (newId) => {
  if (newId) {
    loadedTabs.value = new Set(['info'])
    activeTab.value = 'info'
    loadProject()
  }
})
</script>

<style scoped>
.project-detail-container {
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.loading-wrapper {
  margin-top: 40px;
}

.main-content {
  margin-top: 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.info-descriptions {
  margin-top: 8px;
}

.interviewee-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.interviewee-card {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.interviewee-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-info {
  margin-top: 4px;
}

.todo-completed {
  text-decoration: line-through;
  color: #909399;
}

.ai-result-content {
  max-height: 500px;
  overflow-y: auto;
}

.ai-result-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.6;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
}
</style>
