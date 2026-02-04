export interface WorkflowDefinition {
  id: string
  companyId: string
  name: string
  description: string
  triggerType: 'manual' | 'scheduled' | 'event' | 'webhook'
  triggerConfig: {
    schedule?: string // cron expression for scheduled
    eventType?: string // event name for event trigger
    webhookUrl?: string // webhook URL for external trigger
    conditions?: Record<string, any> // conditions for automatic trigger
  }
  actions: WorkflowAction[]
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowAction {
  id: string
  order: number
  type: 'api_call' | 'email' | 'database_update' | 'webhook' | 'approval' | 'delay' | 'condition'
  config: Record<string, any>
  retryPolicy?: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
  timeout?: number
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  triggerType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  triggerData?: Record<string, any>
  executionContext?: Record<string, any>
  currentStep: number
  totalSteps: number
  startedAt: string
  completedAt?: string
  errorMessage?: string
  retryCount: number
  companyId: string
  createdBy: string
}

export interface WorkflowTemplate {
  id: string
  category: string
  name: string
  description: string
  definition: Omit<WorkflowDefinition, 'id' | 'companyId' | 'created_at' | 'updated_at'>
  variables?: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'date'
    required: boolean
    defaultValue?: any
    description?: string
  }>
}