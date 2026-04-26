'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

type CatalogProduct = {
    id: string
    name: string
    sku: string
    base_price: number
    dealer_price: number
    image_url: string
}

type CartItem = CatalogProduct & { quantity: number }

type CartState = {
    cart: CartItem[]
    addToCart: (product: CatalogProduct) => void
    removeFromCart: (id: string) => void
    updateCartQuantity: (id: string, delta: number) => void
    clearCart: () => void
    getCartTotal: () => number
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            cart: [],
            addToCart: (product) => {
                set((state) => {
                    const existing = state.cart.find((item) => item.id === product.id)
                    if (existing) {
                        return {
                            cart: state.cart.map((item) =>
                                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                            ),
                        }
                    }
                    return { cart: [...state.cart, { ...product, quantity: 1 }] }
                })
            },
            removeFromCart: (id) => {
                set((state) => ({
                    cart: state.cart.filter((item) => item.id !== id),
                }))
            },
            updateCartQuantity: (id, delta) => {
                set((state) => ({
                    cart: state.cart
                        .map((item) => {
                            if (item.id === id) {
                                const newQuantity = Math.max(0, item.quantity + delta)
                                return { ...item, quantity: newQuantity }
                            }
                            return item
                        })
                        .filter((item) => item.quantity > 0),
                }))
            },
            clearCart: () => set({ cart: [] }),
            getCartTotal: () => {
                return get().cart.reduce((total, item) => total + item.dealer_price * item.quantity, 0)
            },
        }),
        {
            name: 'shopping-cart',
            storage: createJSONStorage(() => getSafeStorage()),
        }
    )
)
