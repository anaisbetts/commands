import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Custom React hook that returns a boolean value indicating whether the component is mounted or not.
 * The value is initially set to `true` and is updated to `false` when the component is unmounted.
 *
 * @returns A `boolean` value indicating whether the component is mounted or not.
 */
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

/**
 * Custom React hook that provides explicit rendering functionality.
 * It returns an object with a dependency value and a rerender function.
 *
 * @returns An object with a dependency value and a rerender function.
 */
export function useExplicitRender() {
  const [n, setN] = useState(0)

  const rerender = useCallback(() => setN((x) => x + 1), [])
  return { dep: n, rerender }
}
