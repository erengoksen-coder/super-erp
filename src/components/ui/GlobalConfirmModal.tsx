'use client'

import { ConfirmDialog } from "./ConfirmDialog"
import { useConfirmStore } from "@/lib/store/confirmStore"

export function GlobalConfirmModal() {
    const { isOpen, options, closeConfirm } = useConfirmStore()

    if (!isOpen) return null

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={() => closeConfirm(false)}
            onConfirm={() => closeConfirm(true)}
            title={options.title || 'Onay Gerekiyor'}
            message={options.message}
            confirmText={options.confirmText || 'Tamam'}
            cancelText={options.cancelText || 'İptal'}
            variant={options.variant || 'warning'}
        />
    )
}
