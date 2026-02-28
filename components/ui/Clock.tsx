import React from 'react'

export function Clock() {
    const [time, setTime] = React.useState(new Date())
    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="flex items-center gap-2 bg-blue-500/5 backdrop-blur-sm px-3 py-1 rounded-xl border border-blue-500/20 shadow-inner group transition-all hover:bg-blue-500/10 hover:border-blue-500/30">
            <div className="flex gap-1 text-blue-400 font-mono text-lg font-bold tracking-widest drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                <span>{time.getHours().toString().padStart(2, '0')}</span>
                <span className="animate-pulse opacity-80">:</span>
                <span>{time.getMinutes().toString().padStart(2, '0')}</span>
                <span className="animate-pulse opacity-80 text-blue-500/50">:</span>
                <span className="text-blue-300/90 w-[2ch]">{time.getSeconds().toString().padStart(2, '0')}</span>
            </div>
        </div>
    )
}
