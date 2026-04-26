import { create } from 'zustand'

type ConfirmOptions = {
    title?: string
    message: string | React.ReactNode
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
}

type ConfirmStore = {
    isOpen: boolean
    options: ConfirmOptions
    resolveRef: ((value: boolean) => void) | null
    showConfirm: (options: ConfirmOptions | string) => Promise<boolean>
    closeConfirm: (result: boolean) => void
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    isOpen: false,
    options: { message: '' },
    resolveRef: null,
    showConfirm: (options) => {
        return new Promise<boolean>((resolve) => {
            const parsedOptions = typeof options === 'string' ? { message: options, title: 'Onay Gerekiyor' } : options
            set({
                isOpen: true,
                options: {
                    title: 'Onay Gerekiyor',
                    ...parsedOptions
                },
                resolveRef: resolve
            })
        })
    },
    closeConfirm: (result) => {
        const { resolveRef } = get()
        if (resolveRef) {
            resolveRef(result)
        }
        set({ isOpen: false, resolveRef: null })
    }
}))

// Çoğu dosyadan fonksiyon olarak kolay erişim (Hook zorunluluğunu aşmak için)
export const confirmDialog = (options: ConfirmOptions | string) => {
    return useConfirmStore.getState().showConfirm(options)
}
