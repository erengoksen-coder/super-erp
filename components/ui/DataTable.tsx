'use client'

import React, { useState, useEffect } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    getSortedRowModel,
    SortingState,
    RowData
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, Check, X, Pencil } from 'lucide-react'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/ContextMenu"

// TanStack type extension for our custom inline edit metadata
declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
        updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    }
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    onDataUpdate?: (updatedData: TData[]) => void
    onRowEdit?: (originalRow: TData, columnId: string, newValue: any) => Promise<boolean> // returns true if success
    onRowDoubleClick?: (row: TData) => void
    contextMenuItems?: (row: TData) => { label: string; icon?: React.ComponentType<{ className?: string }>; onClick: (row: TData) => void; variant?: 'default' | 'danger' }[]
}

// Custom hook / wrapper for inline editable cells
export const EditableCell = ({ getValue, row, column, table }: any) => {
    const initialValue = getValue()
    const [value, setValue] = useState(initialValue)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Sync state if external data changes
    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    const onBlur = async () => {
        if (value === initialValue) {
            setIsEditing(false)
            return
        }
        setIsSaving(true)
        table.options.meta?.updateData(row.index, column.id, value)
        setIsSaving(false)
        setIsEditing(false)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onBlur();
        }
        if (e.key === 'Escape') {
            setValue(initialValue)
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <div className="relative flex items-center w-full min-w-[120px]">
                <input
                    value={value as string}
                    onChange={e => setValue(e.target.value)}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    autoFocus
                    className="w-full bg-slate-800 border-2 border-blue-500 text-white px-2 py-1 rounded-md shadow-lg outline-none text-sm transition-all animate-in fade-in zoom-in-95"
                    disabled={isSaving}
                />
                {isSaving && <div className="absolute right-2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
            </div>
        )
    }

    // Hover to show edit capability
    return (
        <div
            className="group relative flex items-center h-full w-full cursor-text rounded-md px-2 py-1 -ml-2 hover:bg-slate-700/50 transition-colors"
            onClick={() => setIsEditing(true)}
            onDoubleClick={() => setIsEditing(true)}
        >
            <span className="truncate">{value as React.ReactNode}</span>
            <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-2 transition-opacity" />
        </div>
    )
}


export function DataTable<TData, TValue>({
    columns,
    data: initialData,
    onDataUpdate,
    onRowEdit,
    onRowDoubleClick,
    contextMenuItems
}: DataTableProps<TData, TValue>) {
    const [data, setData] = useState<TData[]>(initialData)
    const [sorting, setSorting] = useState<SortingState>([])

    useEffect(() => {
        setData(initialData)
    }, [initialData])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        meta: {
            updateData: async (rowIndex, columnId, value) => {
                // Skip if value hasn't actually changed
                if (data[rowIndex][columnId as keyof TData] === value) return;

                let success = true;
                if (onRowEdit) {
                    success = await onRowEdit(data[rowIndex], columnId, value);
                }

                if (success) {
                    setData(old =>
                        old.map((row, index) => {
                            if (index === rowIndex) {
                                return {
                                    ...old[rowIndex]!,
                                    [columnId]: value,
                                }
                            }
                            return row
                        })
                    )
                    if (onDataUpdate) onDataUpdate(data)
                }
            }
        }
    })

    return (
        <div className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800/80 text-xs uppercase text-slate-300 border-b border-slate-700/50">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    return (
                                        <th key={header.id} className="px-6 py-4 font-semibold tracking-wider whitespace-nowrap group">
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    {...{
                                                        className: header.column.getCanSort()
                                                            ? 'cursor-pointer select-none flex items-center gap-2 hover:text-blue-400 transition-colors'
                                                            : 'flex items-center gap-2',
                                                        onClick: header.column.getToggleSortingHandler(),
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: <ChevronUp className="w-4 h-4 text-blue-500" />,
                                                        desc: <ChevronDown className="w-4 h-4 text-blue-500" />,
                                                    }[header.column.getIsSorted() as string] ?? (
                                                            header.column.getCanSort() ? (
                                                                <ChevronUp className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            ) : null
                                                        )}
                                                </div>
                                            )}
                                        </th>
                                    )
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => {
                                const rowContent = (
                                    <tr
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={`hover:bg-slate-800/40 transition-colors ${onRowDoubleClick ? 'cursor-pointer' : ''}`}
                                        onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row.original)}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-3 whitespace-nowrap text-slate-200">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                );

                                if (contextMenuItems) {
                                    const items = contextMenuItems(row.original);
                                    return (
                                        <ContextMenu key={row.id}>
                                            <ContextMenuTrigger asChild>
                                                {rowContent}
                                            </ContextMenuTrigger>
                                            <ContextMenuContent className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                                                {items.map((item, idx) => (
                                                    <React.Fragment key={idx}>
                                                        {item.label === 'separator' ? (
                                                            <ContextMenuSeparator className="bg-slate-700" />
                                                        ) : (
                                                            <ContextMenuItem
                                                                onClick={() => item.onClick(row.original)}
                                                                className={`flex items-center gap-2 cursor-pointer ${item.variant === 'danger' ? 'text-red-400 focus:text-red-300 focus:bg-red-900/30' : 'focus:bg-slate-800 focus:text-white'}`}
                                                            >
                                                                {item.icon && <item.icon className="w-4 h-4" />}
                                                                {item.label}
                                                            </ContextMenuItem>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    );
                                }

                                return rowContent;
                            })
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center text-slate-400">
                                    Sonuç bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
