import { useCallback, useEffect, useRef, useState } from 'react'

export function useMounted() {
  const mounted = useRef<boolean>(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [mounted])

  return mounted
}
export function useExplicitRender() {
  const [n, setN] = useState(0)

  const rerender = useCallback(() => setN((x) => x + 1), [])
  return { dep: n, rerender }
}
