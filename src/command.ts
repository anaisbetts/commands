import { FormEvent, useCallback, useMemo, useRef, useState } from 'react'
import { usePromise } from './promise'
import { Result } from './result'
import { useMounted } from './utility-hooks'

type CommandResult<T> = [
  // InvokeCommand => Invokes the action, call this in an event handler
  (e?: FormEvent<HTMLFormElement>) => Promise<T | null>,
  // Result => The last result from the command invocation
  Result<T | null>,
  // Reset => Resets the action to its unset value
  () => void,
]

/**
 * Create a Command. A Command is a method that you can pass to an event handler
 * like onClick which runs an asynchronous operation (like fetch) in the background,
 * then returns a result. You can think of it as a `usePromise` that generates its
 * result when an event handler happens.
 *
 * Commands are guaranteed to be debounced (i.e. only one invocation can be live at
 * a time)
 *
 * @param block - the asynchronous command to run in the background
 * @param deps - the dependencies for the Command, similar to `useEffect`.
 * @param runOnStart - if true, the Command will be invoked automatically when
 *                     the component is initially mounted or when the `deps` change
 * @return an array of three values:
 *    invoke => Invokes the action, call this in an event handler
 *    current => The result of the last Command invocation
 *    reset => Resets the action to its unset value
 */
export function useCommand<T>(
  block: () => Promise<T>,
  deps: React.DependencyList,
  runOnStart = false,
): CommandResult<T> {
  const mounted = useMounted()
  const [current, setCurrent] = useState<Result<T | null>>(Result.ok(null))

  const reset = useCallback(() => {
    if (mounted.current) {
      setCurrent(Result.ok(null))
    }
  }, [mounted])

  const invokeCommand = useAsyncCallbackDedup(async () => {
    let isCurrentInvocation = true
    try {
      if (mounted.current) setCurrent(Result.pending<T>())
      const ret = await block()
      if (isCurrentInvocation && mounted.current) setCurrent(Result.ok(ret))

      return ret
    } catch (e) {
      if (isCurrentInvocation && mounted.current)
        setCurrent(Result.err(e as Error))
      throw e
    } finally {
      // Mark this invocation as no longer active after it completes
      isCurrentInvocation = false
    }
  }, deps)

  const icPreventDefault = useMemo(
    () => (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault()
      return invokeCommand()
    },
    [invokeCommand],
  )

  usePromise(async () => {
    if (runOnStart) {
      await invokeCommand()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invokeCommand])

  return useMemo(
    () => [icPreventDefault, current, reset],
    [icPreventDefault, current, reset],
  )
}

/**
 * Create a debounced callback that will only run one instance of the block at
 * a time. If the block is already running, the callback will return the pending
 * invocation's Promise.
 *
 * You probably don't need this method and want useCommand instead, it is included
 * just in case it might be useful
 *
 * @param block - the callback to memoize
 * @param deps - the dependencies for the callback, similar to useEffect
 * @return - a memoized debounced callback
 */
export function useAsyncCallbackDedup<T>(
  block: () => Promise<T>,
  deps: React.DependencyList,
): () => Promise<T | null> {
  const cur = useRef<Promise<T>>()
  const mounted = useMounted()

  const cb = useCallback(async () => {
    if (cur.current) return null
    if (!mounted.current) return null

    const promise = block()
    cur.current = promise

    try {
      const result = await promise
      // Only clear current if this specific promise is still the current one
      if (cur.current === promise) {
        cur.current = undefined
      }
      return result
    } catch (error) {
      // Only clear current if this specific promise is still the current one
      if (cur.current === promise) {
        cur.current = undefined
      }
      throw error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return cb
}
