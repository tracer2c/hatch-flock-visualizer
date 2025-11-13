import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_MIN = 768
const TABLET_MAX = 1023

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TABLET_MIN}px) and (max-width: ${TABLET_MAX}px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= TABLET_MIN && window.innerWidth <= TABLET_MAX)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= TABLET_MIN && window.innerWidth <= TABLET_MAX)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}
