import React, { useEffect, useState } from 'react'
import {
  Observable,
  Subscription,
  defer,
  firstValueFrom,
  from,
  retry,
} from 'rxjs'

import { Result } from './result'
import { useMounted } from './utility-hooks'

export function useObservable<T>(
  block: () => Observable<T>,
  deps?: React.DependencyList,
): Result<T> {
  const [ret, setRet] = useState(Result.pending<T>())
  const mounted = useMounted()

  useEffect(() => {
    let d = Subscription.EMPTY
    let set = false,
      done = false
    if (!mounted.current) {
      return () => {}
    }

    try {
      d = block().subscribe({
        next: (x) => {
          set = true
          if (mounted.current) setRet(Result.ok(x))
        },
        error: (e) => {
          set = true
          done = true
          if (mounted.current) {
            setRet(Result.err(e))
          }
        },
        complete: () => {
          done = true
          Promise.resolve().then(() => {
            if (ret.isPending() && !set) {
              setRet(
                Result.err(
                  new Error('Observable must have at least one element'),
                ),
              )
            }
          })
        },
      })
    } catch (e: any) {
      setRet(Result.err(e))
    }

    return () => d.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ret
}

export function usePromise<T>(
  block: (isCancelled: { cancelled: boolean }) => Promise<T>,
  deps: React.DependencyList,
): Result<T> {
  return useObservable(() => fromCancellablePromise(block), deps)
}

export function fromCancellablePromise<T>(
  block: (isCancelled: { cancelled: boolean }) => Promise<T>,
): Observable<T> {
  return new Observable<T>((subj) => {
    const done = { cancelled: false }
    subj.add(() => (done.cancelled = true))

    try {
      const p = block(done)
      p.then(
        (x) => {
          if (!done.cancelled) {
            done.cancelled = true

            subj.next(x)
            subj.complete()
          }
        },
        (e) => {
          if (!done.cancelled) {
            done.cancelled = true

            subj.error(e)
          }
        },
      )
    } catch (e) {
      if (!done.cancelled) {
        done.cancelled = true

        subj.error(e)
      }
    }
  })
}

export function retryPromise<T>(
  func: () => Promise<T>,
  retries = 3,
): Promise<T> {
  const ret = defer(() => from(func())).pipe(retry(retries))

  return firstValueFrom(ret)
}

export function timeout<T>(p: Promise<T> | null | undefined, timeout: number) {
  if (!p || !('then' in p)) {
    return Promise.resolve(p)
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout exceeded'))
    }, timeout)

    p.then(
      (result) => {
        clearTimeout(timer)
        resolve(result)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms))
}
