'use client'
import { motion } from 'framer-motion'
import React from 'react'

export function DashboardAnimation({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    )
}
