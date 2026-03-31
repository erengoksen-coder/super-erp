import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { workflowEngine } from '@/lib/workflow/engine'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'
import type { WorkflowDefinition } from '@/types/workflow'

// GET: List all workflows
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const active = searchParams.get('active')
    
    // In a real implementation, query database
    const workflows: WorkflowDefinition[] = []
    
    return createSuccessResponse(workflows)
  } catch (error) {
    throw error
  }
})

// POST: Create new workflow
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const workflow = await parseJsonBody(request) as Omit<WorkflowDefinition, 'id' | 'created_at' | 'updated_at'>
    
    if (!workflow.companyId || !workflow.name || !workflow.actions?.length) {
      throw createError.validation('Required fields missing: companyId, name, actions')
    }

    const createdWorkflow = await workflowEngine.createWorkflow(workflow)
    
    return createSuccessResponse(createdWorkflow, 'Workflow created successfully')
  } catch (error) {
    throw error
  }
})

// PUT: Update existing workflow
export const PUT = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { id, ...workflowData } = body
    
    if (!id) {
      throw createError.validation('Workflow ID is required')
    }

    // In a real implementation, update database
    const updatedWorkflow = { id, ...workflowData }
    
    return createSuccessResponse(updatedWorkflow, 'Workflow updated successfully')
  } catch (error) {
    throw error
  }
})

// DELETE: Delete workflow
export const DELETE = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    
    if (!workflowId) {
      throw createError.validation('Workflow ID is required')
    }

    // In a real implementation, delete from database
    // Also stop any scheduled executions
    workflowEngine.stopScheduledWorkflow(workflowId)
    
    return createSuccessResponse(null, 'Workflow deleted successfully')
  } catch (error) {
    throw error
  }
})
