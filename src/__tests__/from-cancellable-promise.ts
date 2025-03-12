import { Observable, firstValueFrom } from 'rxjs'
import { fromCancellablePromise } from '../promise'

describe('fromCancellablePromise', () => {
  it('should resolve with the promise result', async () => {
    const promiseFunc = (isCancelled: { cancelled: boolean }) => {
      return Promise.resolve('success')
    }

    const observable = fromCancellablePromise(promiseFunc)
    const result = await firstValueFrom(observable)

    expect(result).toBe('success')
  })

  it('should handle rejected promises', async () => {
    const error = new Error('Failed')
    const promiseFunc = (isCancelled: { cancelled: boolean }) => {
      return Promise.reject(error)
    }

    const observable = fromCancellablePromise(promiseFunc)

    await expect(firstValueFrom(observable)).rejects.toThrow('Failed')
  })

  it('should honor cancellation', async () => {
    // We'll use this flag to track if the promise block detected cancellation
    let cancellationDetected = false
    let promiseResolved = false

    // Create a promise function that checks the cancelled flag
    const promiseFunc = (isCancelled: { cancelled: boolean }) => {
      return new Promise<string>((resolve) => {
        // Small delay to give time for cancellation
        setTimeout(() => {
          if (isCancelled.cancelled) {
            cancellationDetected = true
          } else {
            promiseResolved = true
            resolve('completed')
          }
        }, 50)
      })
    }

    // Create the observable
    const observable = fromCancellablePromise(promiseFunc)

    // Subscribe and immediately unsubscribe to trigger cancellation
    const subscription = observable.subscribe({
      next: () => {},
      error: () => {},
    })

    subscription.unsubscribe()

    // Wait for our timeout to complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Cancellation should have been detected and the promise should not have resolved
    expect(cancellationDetected).toBe(true)
    expect(promiseResolved).toBe(false)
  })

  it('should handle synchronous errors in the promise function', async () => {
    const promiseFunc = (isCancelled: { cancelled: boolean }) => {
      throw new Error('Sync error')
    }

    const observable = fromCancellablePromise(promiseFunc)

    await expect(firstValueFrom(observable)).rejects.toThrow('Sync error')
  })

  it('should not emit after cancellation', async () => {
    let emittedValues: string[] = []

    // Create a promise that ignores cancellation (to test that the Observable handles it)
    const promiseFunc = (isCancelled: { cancelled: boolean }) => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          // Even though we're ignoring cancellation here, the Observable should
          // prevent this value from being emitted
          resolve('should not be emitted')
        }, 50)
      })
    }

    // Create the observable
    const observable = fromCancellablePromise(promiseFunc)

    // Subscribe and capture values
    const subscription = observable.subscribe({
      next: (value) => emittedValues.push(value),
      error: () => {},
    })

    // Immediately unsubscribe to trigger cancellation
    subscription.unsubscribe()

    // Wait for our timeout to complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    // No values should have been emitted
    expect(emittedValues.length).toBe(0)
  })
})
