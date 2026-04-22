import axios from 'axios'
import crypto from 'crypto'
import { settingsDB } from './database.mjs'

/**
 * AI 服务适配器
 * 支持 DeepSeek、通义千问(Qwen)、腾讯元宝(Hunyuan)、豆包(Doubao)
 */

// 支持的 AI 提供商配置
const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    chatEndpoint: '/chat/completions',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    maxTokens: 8192,
    supportStream: true
  },
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatEndpoint: '/chat/completions',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
    maxTokens: 8192,
    supportStream: true
  },
  hunyuan: {
    name: '腾讯元宝',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    chatEndpoint: '/chat/completions',
    defaultModel: 'hunyuan-pro',
    models: ['hunyuan-lite', 'hunyuan-standard', 'hunyuan-pro', 'hunyuan-turbo'],
    maxTokens: 4096,
    supportStream: true
  },
  doubao: {
    name: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    chatEndpoint: '/chat/completions',
    defaultModel: 'doubao-pro-32k',
    models: ['doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-32k', 'doubao-lite-128k'],
    maxTokens: 4096,
    supportStream: true
  }
}

// 加密密钥（用于加密存储 API Key）
const ENCRYPTION_KEY = 'audit-assistant-ai-key-2024'

/**
 * 加密文本
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16)
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (err) {
    console.error('加密失败:', err)
    return text
  }
}

/**
 * 解密文本
 */
function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) return encryptedText

    const iv = Buffer.from(parts[0], 'hex')
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(parts[1], 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('解密失败:', err)
    return encryptedText
  }
}

/**
 * 结果缓存
 */
const responseCache = new Map()
const CACHE_MAX_SIZE = 100
const CACHE_TTL = 30 * 60 * 1000 // 30 分钟

function getCacheKey(provider, model, prompt) {
  return crypto.createHash('md5').update(`${provider}:${model}:${prompt}`).digest('hex')
}

function getCachedResponse(cacheKey) {
  const cached = responseCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response
  }
  responseCache.delete(cacheKey)
  return null
}

function setCachedResponse(cacheKey, response) {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    // 删除最早的缓存
    const firstKey = responseCache.keys().next().value
    responseCache.delete(firstKey)
  }
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  })
}

/**
 * AI 服务类
 */
class AIService {
  constructor() {
    this.providers = PROVIDERS
    this.maxRetries = 3
    this.retryDelay = 2000
    this.timeout = 180000 // 180 秒超时（审查报告生成需要较长时间）
  }

  /**
   * 获取当前配置的 AI 提供商
   */
  getActiveProvider() {
    const provider = settingsDB.get('ai_provider') || 'deepseek'
    return provider
  }

  /**
   * 获取 API Key（解密后）
   */
  getApiKey(provider) {
    const encryptedKey = settingsDB.get(`ai_api_key_${provider}`)
    if (!encryptedKey) return null
    return decrypt(encryptedKey)
  }

  /**
   * 保存 API Key（加密存储）
   */
  saveApiKey(provider, apiKey) {
    const encryptedKey = encrypt(apiKey)
    return settingsDB.set(`ai_api_key_${provider}`, encryptedKey, 'string', 'ai', `${PROVIDERS[provider].name} API Key`)
  }

  /**
   * 获取当前模型
   */
  getModel(provider) {
    return settingsDB.get(`ai_model_${provider}`) || PROVIDERS[provider].defaultModel
  }

  /**
   * 统一调用接口
   * @param {Object} options - 调用选项
   * @param {string} options.prompt - 提示词
   * @param {string} options.systemPrompt - 系统提示词
   * @param {string} options.provider - 提供商（可选，默认使用当前配置）
   * @param {string} options.model - 模型（可选，默认使用当前配置）
   * @param {number} options.maxTokens - 最大 token 数
   * @param {number} options.temperature - 温度
   * @param {Array} options.messages - 消息历史（可选，与 prompt 二选一）
   * @param {boolean} options.useCache - 是否使用缓存
   * @param {boolean} options.stream - 是否流式输出
   */
  async chat(options) {
    const {
      prompt,
      systemPrompt,
      provider: optProvider,
      model: optModel,
      maxTokens,
      temperature = 0.7,
      messages: optMessages,
      useCache = true,
      stream = false
    } = options

    const provider = optProvider || this.getActiveProvider()
    const model = optModel || this.getModel(provider)
    const providerConfig = PROVIDERS[provider]

    if (!providerConfig) {
      throw new Error(`不支持的 AI 提供商: ${provider}`)
    }

    const apiKey = this.getApiKey(provider)
    if (!apiKey) {
      throw new Error(`请先配置 ${providerConfig.name} 的 API Key`)
    }

    // 构建消息
    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    if (optMessages) {
      messages.push(...optMessages)
    }
    if (prompt) {
      messages.push({ role: 'user', content: prompt })
    }

    // 检查缓存
    if (useCache && !stream) {
      const cacheKey = getCacheKey(provider, model, JSON.stringify(messages))
      const cached = getCachedResponse(cacheKey)
      if (cached) {
        return { ...cached, fromCache: true }
      }
    }

    // 构建请求
    const requestData = {
      model,
      messages,
      max_tokens: maxTokens || providerConfig.maxTokens,
      temperature,
      stream
    }

    const url = providerConfig.baseUrl + providerConfig.chatEndpoint

    // 带重试的请求
    let lastError = null
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.post(url, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: this.timeout,
          responseType: stream ? 'stream' : 'json'
        })

        if (stream) {
          return {
            success: true,
            provider,
            model,
            stream: response.data,
            fromCache: false
          }
        }

        const result = {
          success: true,
          provider,
          model,
          content: response.data.choices?.[0]?.message?.content || '',
          fullResponse: response.data,
          tokensUsed: response.data.usage?.total_tokens || 0,
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          finishReason: response.data.choices?.[0]?.finish_reason || '',
          fromCache: false
        }

        // 缓存结果
        if (useCache) {
          const cacheKey = getCacheKey(provider, model, JSON.stringify(messages))
          setCachedResponse(cacheKey, result)
        }

        return result
      } catch (err) {
        lastError = err
        const status = err.response?.status
        const message = err.response?.data?.error?.message || err.message
        const code = err.code || ''

        // 不可重试的错误
        if (status === 401 || status === 403) {
          throw new Error(`API Key 无效或已过期: ${message}`)
        }
        if (status === 400) {
          throw new Error(`请求参数错误: ${message}`)
        }

        // 超时或中断错误，增加重试等待时间
        const isTimeout = code === 'ECONNABORTED' || message.includes('aborted') || message.includes('timeout')

        console.warn(`AI 请求失败 (尝试 ${attempt + 1}/${this.maxRetries}):`, message)

        // 等待后重试（超时错误等待更久）
        if (attempt < this.maxRetries - 1) {
          const waitTime = isTimeout ? 5000 : this.retryDelay * (attempt + 1)
          console.log(`等待 ${waitTime}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    throw new Error(`AI 请求失败，已重试 ${this.maxRetries} 次: ${lastError?.message}`)
  }

  /**
   * 流式调用（返回 SSE 流）
   */
  async chatStream(options) {
    return this.chat({ ...options, stream: true })
  }

  /**
   * 带降级的调用（主提供商失败后尝试备用提供商）
   */
  async chatWithFallback(options, fallbackProviders = []) {
    const primaryProvider = options.provider || this.getActiveProvider()

    try {
      return await this.chat(options)
    } catch (primaryError) {
      console.warn(`主提供商 ${primaryProvider} 调用失败，尝试降级:`, primaryError.message)

      for (const fallbackProvider of fallbackProviders) {
        if (fallbackProvider === primaryProvider) continue

        const fallbackKey = this.getApiKey(fallbackProvider)
        if (!fallbackKey) continue

        try {
          console.log(`尝试使用备用提供商: ${fallbackProvider}`)
          const result = await this.chat({
            ...options,
            provider: fallbackProvider
          })
          result.fallbackProvider = fallbackProvider
          return result
        } catch (fallbackError) {
          console.warn(`备用提供商 ${fallbackProvider} 也失败:`, fallbackError.message)
        }
      }

      throw primaryError
    }
  }

  /**
   * 审计专用：分析访谈记录
   */
  async analyzeInterview(interviewContent, projectName = '') {
    const systemPrompt = `你是一位专业的审计分析师，拥有丰富的内部控制审查和合规审计经验。请根据提供的审计项目信息和访谈记录，进行深入分析。

分析要求：
1. 结合项目的重点审计方向，有针对性地分析访谈内容
2. 提取关键信息和潜在风险点，标注风险等级（低/中/高/严重）
3. 识别可能存在的内部控制缺陷和流程漏洞
4. 评估合规风险，引用相关法规要求
5. 对比不同被访谈人的表述，识别矛盾点和一致点
6. 提出具体的审计建议和后续行动方案
7. 明确标注需要进一步核实的事项和证据缺口
8. 建议后续审计沟通的重点方向和需要追问的问题

请使用以下结构化格式输出：
## 一、关键发现
（列出从访谈中提取的关键信息）

## 二、风险分析
（逐项分析识别的风险点，包含风险等级和依据）

## 三、内部控制评估
（评估相关内部控制的有效性）

## 四、信息缺口与待确认事项
（列出需要进一步核实的信息）

## 五、审计建议
（提出具体的后续审计行动建议）

## 六、后续沟通方向
（建议下次访谈应重点关注的问题）`

    const prompt = `审计项目：${projectName}

访谈记录内容：
${interviewContent}

请对以上访谈记录进行专业审计分析，结合项目的重点审计方向给出有针对性的建议。`

    return this.chat({
      prompt,
      systemPrompt,
      temperature: 0.3,
      useCache: false
    })
  }

  /**
   * 审计专用：风险评估
   */
  async assessRisk(riskDescription, context = '') {
    const systemPrompt = `你是一位资深审计风险评估专家。请根据提供的风险描述和项目背景，进行专业的风险评估。

评估要求：
1. 风险等级评估（低/中/高/严重），给出评估依据
2. 风险发生可能性评估（罕见/不太可能/可能/很可能/几乎确定）
3. 风险影响程度评估（可忽略/轻微/中等/重大/灾难性）
4. 风险成因分析，区分根本原因和直接原因
5. 建议的应对措施和缓释方案，明确责任人和时间要求
6. 需要关注的关联风险
7. 建议收集的证据类型和审计程序

请使用以下结构化格式输出：
## 风险评估结论
- 风险等级：
- 发生可能性：
- 影响程度：

## 成因分析

## 建议应对措施

## 关联风险

## 建议审计程序`

    const prompt = `风险描述：${riskDescription}

项目背景信息：${context}

请进行专业的风险评估。`

    return this.chat({
      prompt,
      systemPrompt,
      temperature: 0.2,
      useCache: false
    })
  }

  /**
   * 审计专用：生成审计报告摘要
   */
  async generateAuditSummary(projectInfo, findings) {
    const systemPrompt = `你是一位专业的审计报告撰写专家。请根据提供的项目信息和审计发现，生成一份专业的审计报告摘要。

要求：
1. 语言简洁专业
2. 突出重要发现
3. 按风险等级排序
4. 包含改进建议
5. 符合审计报告规范`

    const prompt = `项目信息：${JSON.stringify(projectInfo)}

审计发现：${JSON.stringify(findings)}

请生成审计报告摘要。`

    return this.chat({
      prompt,
      systemPrompt,
      temperature: 0.4,
      maxTokens: 4096,
      useCache: false
    })
  }

  /**
   * 审计专用：智能问答
   */
  async auditQA(question, context = '') {
    const systemPrompt = `你是一位专业的审计顾问。请根据用户的问题和提供的上下文，给出专业的审计建议和解答。

注意：
1. 回答应基于审计准则和最佳实践
2. 如需更多信息，请明确指出
3. 建议应具体可操作
4. 引用相关法规或准则时请注明`

    const prompt = context
      ? `背景信息：${context}\n\n问题：${question}`
      : question

    return this.chat({
      prompt,
      systemPrompt,
      temperature: 0.5,
      useCache: true
    })
  }

  /**
   * 轻量级：生成访谈摘要（简短prompt，快速响应）
   */
  async generateSummary(content) {
    const systemPrompt = `你是一位专业的审计分析师。请根据访谈内容生成简洁的摘要，不超过300字。只输出摘要文本，不要输出其他内容。`

    return this.chat({
      prompt: content,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
      useCache: false
    })
  }

  /**
   * 轻量级：从访谈内容中提取关键发现（含语言矛盾点分析）
   */
  async extractKeyFindings(content, projectName = '') {
    const systemPrompt = `你是一位专业的审计分析师。请从访谈内容中提取关键发现。

要求：
1. 提取所有重要信息和关键陈述
2. 重点关注被访谈人对数字、金额、流程、时间节点的描述
3. 识别语言中的矛盾点、含糊表述和前后不一致之处（如"大概""可能""不太清楚"等）
4. 标注需要进一步核实的事项
5. 按重要性排序，每条发现用编号列出

输出格式（直接输出，不要加标题）：
1. 【关键发现】具体内容...
2. 【矛盾点】被访谈人表述"..."与"..."存在矛盾，原因可能是...
3. 【待核实】关于...的描述不够清晰，需要进一步确认...`

    const prompt = projectName
      ? `审计项目：${projectName}\n\n访谈内容：\n${content}`
      : `访谈内容：\n${content}`

    return this.chat({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      useCache: false
    })
  }

  /**
   * 轻量级：从访谈内容中提取风险指标
   */
  async extractRiskIndicators(content, projectName = '') {
    const systemPrompt = `你是一位专业的审计风险评估专家。请从访谈内容中提取风险指标。

要求：
1. 识别访谈中提到的所有潜在风险
2. 对每个风险标注等级（低/中/高/严重）
3. 说明风险来源和可能的影响
4. 按风险等级从高到低排序

输出格式（直接输出，不要加标题）：
- 【严重】风险描述 —— 来源：... —— 影响：...
- 【高】风险描述 —— 来源：... —— 影响：...
- 【中】风险描述 —— 来源：... —— 影响：...
- 【低】风险描述 —— 来源：... —— 影响：...`

    const prompt = projectName
      ? `审计项目：${projectName}\n\n访谈内容：\n${content}`
      : `访谈内容：\n${content}`

    return this.chat({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      useCache: false
    })
  }

  /**
   * 获取提供商列表
   */
  getProviders() {
    return Object.entries(PROVIDERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      models: config.models,
      defaultModel: config.defaultModel,
      maxTokens: config.maxTokens,
      supportStream: config.supportStream,
      configured: !!this.getApiKey(key)
    }))
  }

  /**
   * 测试 API 连接
   */
  async testConnection(provider) {
    const apiKey = this.getApiKey(provider)
    if (!apiKey) {
      return { success: false, message: '未配置 API Key' }
    }

    try {
      const result = await this.chat({
        provider,
        prompt: '你好，请回复"连接成功"。',
        maxTokens: 20,
        temperature: 0,
        useCache: false
      })

      return {
        success: true,
        message: '连接成功',
        model: result.model,
        tokensUsed: result.tokensUsed
      }
    } catch (err) {
      return {
        success: false,
        message: `连接失败: ${err.message}`
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    responseCache.clear()
    return { success: true, message: '缓存已清除' }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: responseCache.size,
      maxSize: CACHE_MAX_SIZE,
      ttl: CACHE_TTL / 1000
    }
  }
}

// 导出单例
export const aiService = new AIService()
export default aiService
