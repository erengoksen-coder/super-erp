'use client'

import * as React from "react"
import { Modal } from "./modal"
import { Button } from "./Button"
import { AlertCircle, HelpCircle, AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string | React.ReactNode
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    loading?: boolean
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Tamam',
    cancelText = 'İptal',
    variant = 'info',
    loading = false
}: ConfirmDialogProps) {

    const variants = {
        danger: {
            icon: AlertCircle,
            iconColor: 'text-red-400',
            iconBg: 'bg-red-500/10',
            confirmColor: 'error' as const,
            border: 'border-red-500/20'
        },
        warning: {
            icon: AlertTriangle,
            iconColor: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
            confirmColor: 'warning' as const,
            border: 'border-amber-500/20'
        },
        info: {
            icon: HelpCircle,
            iconColor: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
            confirmColor: 'primary' as const,
            border: 'border-blue-500/20'
        }
    }

    const { icon: Icon, iconColor, iconBg, confirmColor, border } = variants[variant]

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="flex flex-col gap-6">
                <div className="flex gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center border ${border}`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="text-slate-300 text-sm leading-relaxed">
                            {message}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        color={confirmColor}
                        loading={loading}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
