= 'approval_pending' ${searchClause}
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, ...searchParamsList) as CountRow | undefined

    return NextResponse.json({
      pending: Number(pendingRow?.count ?? 0),
      approval_pending: Number(approvalPendingRow?.count ?? 0),
      in_production: Number(inProductionRow?.count ?? 0),
      completed: Number(completedRow?.count ?? 0),
      deliveriesThisWeek: Number(deliveriesThisWeekRow?.count ?? 0),
      overdue: Number(overdueRow?.count ?? 0),
      cancelled: Number(cancelledRow?.count ?? 0),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'SipariÅŸ Ã¶zeti alÄ±namadÄ±'
    apiLogger.error('Orders summary failed', { error: message })
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
})
