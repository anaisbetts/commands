import React, { useEffect, useState } from 'react'
import {
  Observable,
  Subscription,
  defer,
  firstValueFrom,
  from,
  map,
  mergeAll,
  reduce,
  retry,
} from 'rxjs'

import { Result } from './result'
import { useMounted } from './utility-hooks'

/**
 * A React hook that consumes an RxJS Observable and returns its latest result
 *
 * @param block - A block that generates the Observable to Subscribe to. It will
 *                be called when the component is mounted or whenever deps change.
 * @param deps - the dependencies for the hook, similar to `useEffect`.
 * @return A Result that represents the latest value from the Observable,
 *         initially set to the pending state until the Observable produces a value
 */
export function useObservable<T>(
  block: () => Observable<T>,
  deps?: React.DependencyList,
): Result<T> {
  const [ret, setRet] = useState(Result.pending<T>())
  const mounted = useMounted()

  useEffect(() => {
    let d = Subscription.EMPTY
    let set = false
    let done = false
    let isCurrentSubscription = true
    if (!mounted.current) {
      return () => {}
    }

    try {
      d = block().subscribe({
        next: (x) => {
          if (!isCurrentSubscription || !mounted.current) return
          set = true
          setRet(Result.ok(x))
        },
        error: (e) => {
          if (!isCurrentSubscription || !mounted.current) return
          set = true
          done = true
          setRet(Result.err(e))
        },
        complete: () => {
          if (!isCurrentSubscription) return
          done = true
          Promise.resolve().then(() => {
            if (
              isCurrentSubscription &&
              mounted.current &&
              ret.isPending() &&
              !set
            ) {
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

    return () => {
      isCurrentSubscription = false
      d.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ret
}

/**
 * A React hook that consumes a Promise and returns its latest result. Unlike other
 * versions of this method commonly on the Internet, this version respects deps similar
 * to useEffect
 * 
 * @param block - A block that generates the Promise to Subscribe to. It will 
 *                be called when the component is mounted or whenever deps change.
   @param deps?: React.DependencyList,
 * @return A Result that represents the latest value from the Observable, 
 *         initially set to the pending state until the Observable produces a value
 */
export function usePromise<T>(
  block: (isCancelled: { cancelled: boolean }) => Promise<T>,
  deps: React.DependencyList,
): Result<T> {
  return useObservable(() => fromCancellablePromise(block), deps)
}

/**
 * Converts a Promise to an Observable, while allowing the Promise handler to
 * signal cancellation
 *
 * @param block - the async method that creates the Promise
 * @return - an Observable representing the Promise. Unsubscribing from the
 *           Observable will set cancelled
 */
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
/**
 * Retries a promise function a specified number of times.
 *
 * @param func - The promise function to retry.
 * @param retries - The number of times to retry the function. Default is 3.
 * @returns A promise that resolves with the result of the function.
 */
export function retryPromise<T>(
  func: () => Promise<T>,
  retries = 3,
): Promise<T> {
  const ret = defer(() => from(func())).pipe(retry(retries))

  return firstValueFrom(ret)
}

/**
 * Wraps a promise with a timeout.
 * @param p - The promise to wrap.
 * @param timeout - The timeout duration in milliseconds.
 * @returns A new promise that resolves or rejects based on the original promise, with a timeout.
 */
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

/**
 * Delays the execution of a function by the specified number of milliseconds.
 * @param ms - The number of milliseconds to delay the execution.
 * @returns A promise that resolves after the specified delay.
 */
export function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms))
}

/**
 * Executes a promise without awaiting its resolution.
 * @param p - The promise to execute.
 * @returns void
 */
export function unawaited<T>(p: Promise<T>) {
  p.then((_) => {})
}

/**
 * Executes a block of code after a promise is settled, whether it is fulfilled or rejected.
 *
 * @param p - The promise to be executed.
 * @param block - The block of code to be executed after the promise is settled.
 * @returns A new promise that resolves or rejects with the same value as the input promise.
 */
export function promiseFinally<T>(p: Promise<T>, block: () => unknown) {
  return p.then(
    (x) => {
      block()
      return Promise.resolve(x)
    },
    (e) => {
      block()
      return Promise.reject(e)
    },
  )
}

/**
 * Maps an array of values to a new array of values using an asynchronous
 * selector function.
 *
 * @param array - the input array to map through
 * @param selector - the selector to apply to each element in the array
 * @param {number} - the maximum number of concurrent promises to run
 * @return A Map of inputs to results
 */
export function asyncMap<T, TRet>(
  array: T[],
  selector: (x: T) => Promise<TRet>,
  maxConcurrency = 4,
): Promise<Map<T, TRet>> {
  const promiseSelToObs = (k: T) =>
    defer(() => from(selector(k)).pipe(map((v) => ({ k, v }))))

  const ret = from(array).pipe(
    map(promiseSelToObs),
    mergeAll(maxConcurrency),
    reduce<{ k: T; v: TRet }, Map<T, TRet>>((acc, kvp) => {
      acc.set(kvp.k, kvp.v)
      return acc
    }, new Map()),
  )

  return firstValueFrom(ret)
}

/**
 * Like reduce, but each selected item is a Promise that is resolved
 *
 * @param array - the input array of values to fold over
 * @param selector - a selector that, given the current state and the new item,
 *                   will produce an asynchronous result
 * @param seed - the initial value for the accumulator
 * @return The reduced value
 */
export async function asyncReduce<T, TAcc>(
  array: T[],
  selector: (acc: TAcc, x: T) => TAcc,
  seed: TAcc,
) {
  let acc = seed
  for (const x of array) {
    acc = await selector(acc, x)
  }

  return acc
}
