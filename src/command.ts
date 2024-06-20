import { FormEvent, useCallback, useMemo, useRef, useState } from 'react'
import { usePromise } from './promise'
import { Result } from './result'
import { promiseFinally } from './utility'
import { useMounted } from './utility-hooks'

type CommandResult<T> = [
  // InvokeCommand => Invokes the action, call this in an event handler
  (e?: FormEvent<HTMLFormElement>) => Promise<T | null>,
  // Result => The last result from the command invocation
  Result<T | null>,
  // Reset => Resets the action to its unset value
  () => void,
]

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
    try {
      if (mounted.current) setCurrent(Result.pending<T>())
      const ret = await block()
      if (mounted.current) setCurrent(Result.ok(ret))

      return ret
    } catch (e) {
      if (mounted.current) setCurrent(Result.err(e as Error))
      throw e
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

export function useAsyncCallbackDedup<T>(
  block: () => Promise<T>,
  deps: React.DependencyList,
): () => Promise<T | null> {
  const cur = useRef<Promise<T>>()

  const cb = useCallback(async () => {
    if (cur.current) return null

    cur.current = block()
    return await promiseFinally(cur.current, () => (cur.current = undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return cb
}
