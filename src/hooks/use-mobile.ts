import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
    // Initialize state with the current value to avoid setState in effect
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        return window.innerWidth < MOBILE_BREAKPOINT
    })

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        }
        mql.addEventListener("change", onChange)
        // No need to call setIsMobile here - state is already initialized correctly
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return isMobile
}
