import { getDatabase } from '@/lib/database/db'
import { createError } from '@/lib/utils/errors'
import type { WorkflowDefinition, WorkflowExecution, WorkflowAction } from '@/types/workflow'

export interface WorkflowEngineConfig {
  maxConcurrentExecutions: number
  defaultTimeout: number
  retryDelay: number
  enablePersistence: boolean
}

export class WorkflowEngine {
  private db = getDatabase()
  private activeExecutions = new Map<string, WorkflowExecution>()
  private scheduledJobs = new Map<string, NodeJS.Timeout>()
  private config: WorkflowEngineConfig

  constructor(config: Partial<WorkflowEngineConfig> = {}) {
    this.config = {
      maxConcurrentExecutions: 10,
      defaultTimeout: 300000, // 5 minutes
      retryDelay: 5000, // 5 seconds
      enablePersistence: true,
      ...config
    }
  }

  // Create new workflow
  async createWorkflow(
    workflow: Omit<WorkflowDefinition, 'id' | 'created_at' | 'updated_at'>
  ): Promise<WorkflowDefinition> {
    try {
      const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      this.db.prepare(`
        INSERT INTO workflows (
          id, company_id, name, description, trigger_type, trigger_config,
          actions, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        workflowId,
        workflow.companyId,
        workflow.name,
        workflow.description,
        workflow.triggerType,
        JSON.stringify(workflow.triggerConfig),
        JSON.stringify(workflow.actions),
        workflow.isActive,
        new Date().toISOString(),
        new Date().toISOString()
      )

      const createdWorkflow = await this.getWorkflow(workflowId)
      if (!createdWorkflow) {
        throw createError.database('Failed to create workflow')
      }

      // Schedule workflow if needed
      if (workflow.triggerType === 'scheduled' && workflow.isActive) {
        this.scheduleWorkflow(createdWorkflow)
      }

      return createdWorkflow
    } catch (error) {
      throw createError.database('Failed to create workflow', error)
    }
  }

  // Execute workflow
  async executeWorkflow(
    workflowId: string,
    triggerData?: Record<string, any>
  ): Promise<WorkflowExecution> {
    try {
      // Check concurrent execution limit
      if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
        throw new Error('Maximum concurrent executions reached')
      }

      const workflow = await this.getWorkflow(workflowId)
      if (!workflow) {
        throw createError.notFound('Workflow not found')
      }

      if (!workflow.isActive) {
        throw createError.validation('Workflow is not active')
      }

      // Create execution record
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        triggerType: workflow.triggerType,
        status: 'running',
        triggerData,
        executionContext: { ...triggerData },
        currentStep: 0,
        totalSteps: workflow.actions.length,
        startedAt: new Date().toISOString(),
        retryCount: 0,
        companyId: workflow.companyId,
        createdBy: 'system'
      }

      // Persist execution
      if (this.config.enablePersistence) {
        await this.persistExecution(execution)
      }

      this.activeExecutions.set(executionId, execution)

      // Execute workflow actions
      try {
        await this.executeActions(workflow.actions, execution)
        
        // Mark as completed
        execution.status = 'completed'
        execution.completedAt = new Date().toISOString()
        
      } catch (error) {
        // Handle execution error
        execution.status = 'failed'
        execution.errorMessage = error instanceof Error ? error.message : String(error)
        
        // Check if retry is possible
        if (await this.shouldRetry(execution, error as Error)) {
          await this.scheduleRetry(execution, error as Error)
        }
      } finally {
        // Update execution in database
        if (this.config.enablePersistence) {
          await this.updateExecution(execution)
        }

        this.activeExecutions.delete(executionId)
      }

      return execution
    } catch (error) {
      throw createError.internal('Failed to execute workflow', error)
    }
  }

  // Execute individual actions
  private async executeActions(
    actions: WorkflowAction[],
    execution: WorkflowExecution
  ): Promise<void> {
    const sortedActions = actions.sort((a, b) => a.order - b.order)
    
    for (let i = 0; i < sortedActions.length; i++) {
      const action = sortedActions[i]
      execution.currentStep = i + 1

      switch (action.type) {
        case 'api_call':
          await this.executeApiCall(action, execution)
          break
        case 'email':
          await this.executeEmail(action, execution)
          break
        case 'database_update':
          await this.executeDatabaseUpdate(action, execution)
          break
        case 'webhook':
          await this.executeWebhook(action, execution)
          break
        case 'approval':
          await this.executeApproval(action, execution)
          break
        case 'delay':
          await this.executeDelay(action, execution)
          break
        case 'condition':
          await this.executeCondition(action, execution, sortedActions.slice(i + 1))
          break
        default:
          throw createError.validation(`Unknown action type: ${action.type}`)
      }

      // Update execution context
      if (this.config.enablePersistence) {
        await this.updateExecution(execution)
      }
    }
  }

  // Action execution methods
  private async executeApiCall(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { url, method, headers, body, timeout = this.config.defaultTimeout } = action.config
    
    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout)
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      execution.executionContext!.apiResult = result
      
    } catch (error) {
      throw new Error(`API call execution failed: ${(error as Error).message}`)
    }
  }

  private async executeEmail(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { to, cc, bcc, subject, body, template, variables } = action.config
    
    try {
      // In a real implementation, integrate with email service
      console.log(`Sending email to ${to}`, {
        subject,
        body,
        template,
        variables: { ...variables, ...execution.executionContext }
      })
      
      execution.executionContext!.emailSent = true
      
    } catch (error) {
      throw new Error(`Email execution failed: ${(error as Error).message}`)
    }
  }

  private async executeDatabaseUpdate(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { query, params, table, operation, data } = action.config
    
    try {
      if (query) {
        // Execute custom query
        this.db.prepare(query).run(...(params || []))
      } else if (table && operation) {
        // Execute table operation
        switch (operation) {
          case 'insert':
            this.db.prepare(`INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')})`)
              .run(...Object.values(data))
            break
          case 'update':
            const { where, ...updateData } = data
            const updateClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
            this.db.prepare(`UPDATE ${table} SET ${updateClause} WHERE ${where}`)
              .run(...Object.values(updateData))
            break
          case 'delete':
            this.db.prepare(`DELETE FROM ${table} WHERE ${data.where}`)
              .run(...Object.values(data.params || {}))
            break
        }
      }
      
      execution.executionContext!.databaseUpdated = true
      
    } catch (error) {
      throw new Error(`Database update failed: ${(error as Error).message}`)
    }
  }

  private async executeWebhook(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { url, method, headers, body, timeout = this.config.defaultTimeout } = action.config
    
    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Workflow-Engine/1.0',
          ...headers
        },
        body: JSON.stringify({
          ...body,
          executionId: execution.id,
          workflowId: execution.workflowId,
          context: execution.executionContext
        }),
        signal: AbortSignal.timeout(timeout)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      execution.executionContext!.webhookResult = await response.json()
      
    } catch (error) {
      throw new Error(`Webhook execution failed: ${(error as Error).message}`)
    }
  }

  private async executeApproval(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { approvers, message, deadline } = action.config
    
    try {
      // Create approval request
      const approvalId = `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      this.db.prepare(`
        INSERT INTO approval_requests (
          id, workflow_execution_id, approvers, message, deadline, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        approvalId,
        execution.id,
        JSON.stringify(approvers),
        message,
        deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours default
        'pending',
        new Date().toISOString()
      )

      // Pause execution until approved
      execution.status = 'pending'
      await this.updateExecution(execution)
      
      // In a real implementation, this would be handled by an approval API
      console.log(`Approval request created: ${approvalId}`)
      
    } catch (error) {
      throw new Error(`Approval setup failed: ${(error as Error).message}`)
    }
  }

  private async executeDelay(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { duration, unit = 'milliseconds' } = action.config
    
    try {
      let delayMs = duration
      
      switch (unit) {
        case 'seconds':
          delayMs = duration * 1000
          break
        case 'minutes':
          delayMs = duration * 60 * 1000
          break
        case 'hours':
          delayMs = duration * 60 * 60 * 1000
          break
        case 'days':
          delayMs = duration * 24 * 60 * 60 * 1000
          break
      }

      await new Promise(resolve => setTimeout(resolve, delayMs))
      
      execution.executionContext!.delayCompleted = true
      
    } catch (error) {
      throw new Error(`Delay execution failed: ${(error as Error).message}`)
    }
  }

  private async executeCondition(
    action: WorkflowAction,
    execution: WorkflowExecution,
    remainingActions: WorkflowAction[]
  ): Promise<void> {
    const { condition, thenActions, elseActions } = action.config
    
    try {
      // Evaluate condition
      const result = this.evaluateCondition(condition, execution.executionContext!)
      
      // Execute based on condition result
      if (result && thenActions) {
        await this.executeActions(thenActions, execution)
      } else if (!result && elseActions) {
        await this.executeActions(elseActions, execution)
      }
      
      execution.executionContext!.conditionResult = result
      
    } catch (error) {
      throw new Error(`Condition execution failed: ${(error as Error).message}`)
    }
  }

  private evaluateCondition(condition: any, context: Record<string, any>): boolean {
    // Simple condition evaluation - in production, use a proper expression parser
    try {
      const expression = condition.replace(/\{(\w+)\}/g, 'context.$1')
      const func = new Function('context', `return ${expression}`)
      return func(context)
    } catch {
      return false
    }
  }

  // Scheduling methods
  private scheduleWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow || workflow.triggerType !== 'scheduled' || !workflow.triggerConfig.schedule) {
      return
    }

    // Simple cron parsing - in production, use a proper cron library
    const interval = this.parseCronToInterval(workflow.triggerConfig.schedule)
    
    const job = setInterval(() => {
      this.executeWorkflow(workflow.id).catch(error => {
        console.error(`Scheduled workflow execution failed: ${error.message}`)
      })
    }, interval)

    this.scheduledJobs.set(workflow.id, job)
  }

  private parseCronToInterval(cronExpression: string): number {
    // Simplified cron parsing
    // Format: "minute hour day month dayOfWeek"
    const parts = cronExpression.split(' ')
    
    if (parts[0] === '*' && parts[1] === '*' && parts[2] === '*' && parts[3] === '*') {
      return 60 * 60 * 1000 // Every hour
    }
    
    if (parts[0] === '0' && parts[1] === '9' && parts[2] === '*' && parts[3] === '*') {
      return 24 * 60 * 60 * 1000 // Every day at 9 AM
    }
    
    return 60 * 60 * 1000 // Default to hourly
  }

  // Retry logic
  private async shouldRetry(execution: WorkflowExecution, error: Error): Promise<boolean> {
    const workflow = await this.getWorkflow(execution.workflowId)
    if (!workflow) return false
    
    const currentAction = workflow.actions[execution.currentStep - 1]
    
    if (!currentAction.retryPolicy) {
      return false
    }

    const { maxRetries } = currentAction.retryPolicy
    return execution.retryCount < maxRetries
  }

  private async scheduleRetry(execution: WorkflowExecution, error: Error): Promise<void> {
    const workflow = await this.getWorkflow(execution.workflowId)
    if (!workflow) return
    
    const currentAction = workflow.actions[execution.currentStep - 1]
    const { retryDelay, backoffMultiplier } = currentAction.retryPolicy!

    const delay = retryDelay * Math.pow(backoffMultiplier, execution.retryCount)
    
    setTimeout(async () => {
      execution.retryCount++
      execution.status = 'running'
      
      try {
        await this.executeActions([currentAction], execution)
        execution.status = 'completed'
        execution.completedAt = new Date().toISOString()
      } catch (retryError) {
        execution.status = 'failed'
        execution.errorMessage = retryError instanceof Error ? retryError.message : String(retryError)
        
        if (await this.shouldRetry(execution, retryError as Error)) {
          await this.scheduleRetry(execution, retryError as Error)
        }
      }
      
      await this.updateExecution(execution)
    }, delay)
  }

  // Database operations
  private async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    const result = this.db.prepare(`
      SELECT * FROM workflows WHERE id = ?
    `).get(workflowId) as any
    
    if (!result) return null

    return {
      id: result.id,
      companyId: result.company_id,
      name: result.name,
      description: result.description,
      triggerType: result.trigger_type,
      triggerConfig: JSON.parse(result.trigger_config),
      actions: JSON.parse(result.actions),
      isActive: Boolean(result.is_active),
      created_at: result.created_at,
      updated_at: result.updated_at
    }
  }

  private async persistExecution(execution: WorkflowExecution): Promise<void> {
    this.db.prepare(`
      INSERT INTO workflow_executions (
        id, workflow_id, trigger_type, status, trigger_data, execution_context,
        current_step, total_steps, started_at, retry_count, company_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      execution.id,
      execution.workflowId,
      execution.triggerType,
      execution.status,
      JSON.stringify(execution.triggerData),
      JSON.stringify(execution.executionContext),
      execution.currentStep,
      execution.totalSteps,
      execution.startedAt,
      execution.retryCount,
      execution.companyId,
      execution.createdBy
    )
  }

  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    this.db.prepare(`
      UPDATE workflow_executions SET 
        status = ?, execution_context = ?, current_step = ?, 
        completed_at = ?, error_message = ?, retry_count = ?
      WHERE id = ?
    `).run(
      execution.status,
      JSON.stringify(execution.executionContext),
      execution.currentStep,
      execution.completedAt,
      execution.errorMessage,
      execution.retryCount,
      execution.id
    )
  }

  // Management methods
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId)
    if (!execution) {
      throw createError.notFound('Execution not found')
    }

    execution.status = 'cancelled'
    await this.updateExecution(execution)
    this.activeExecutions.delete(executionId)
  }

  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    // Check active executions first
    const activeExecution = this.activeExecutions.get(executionId)
    if (activeExecution) {
      return activeExecution
    }

    // Check database
    const result = this.db.prepare(`
      SELECT * FROM workflow_executions WHERE id = ?
    `).get(executionId) as any
    
    if (!result) return null

    return {
      id: result.id,
      workflowId: result.workflow_id,
      triggerType: result.trigger_type,
      status: result.status,
      triggerData: JSON.parse(result.trigger_data),
      executionContext: JSON.parse(result.execution_context),
      currentStep: result.current_step,
      totalSteps: result.total_steps,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      errorMessage: result.error_message,
      retryCount: result.retry_count,
      companyId: result.company_id,
      createdBy: result.created_by
    }
  }

  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values())
  }

  async getWorkflowExecutions(workflowId: string, limit = 50): Promise<WorkflowExecution[]> {
    const results = this.db.prepare(`
      SELECT * FROM workflow_executions 
      WHERE workflow_id = ? 
      ORDER BY started_at DESC 
      LIMIT ?
    `).all(workflowId, limit) as any[]

    return results.map(result => ({
      id: result.id,
      workflowId: result.workflow_id,
      triggerType: result.trigger_type,
      status: result.status,
      triggerData: JSON.parse(result.trigger_data),
      executionContext: JSON.parse(result.execution_context),
      currentStep: result.current_step,
      totalSteps: result.total_steps,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      errorMessage: result.error_message,
      retryCount: result.retry_count,
      companyId: result.company_id,
      createdBy: result.created_by
    }))
  }

  // Cleanup methods
  stopScheduledWorkflow(workflowId: string): void {
    const job = this.scheduledJobs.get(workflowId)
    if (job) {
      clearInterval(job)
      this.scheduledJobs.delete(workflowId)
    }
  }

  stopAllScheduledWorkflows(): void {
    for (const [workflowId, job] of this.scheduledJobs) {
      clearInterval(job)
    }
    this.scheduledJobs.clear()
  }

  async cleanupOldExecutions(daysOld = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    this.db.prepare(`
      DELETE FROM workflow_executions 
      WHERE started_at < ? AND status IN ('completed', 'failed', 'cancelled')
    `).run(cutoffDate.toISOString())
  }
}

// Helper function
function objectValues(obj: Record<string, any>): any[] {
  return Object.values(obj)
}

export const workflowEngine = new WorkflowEngine()