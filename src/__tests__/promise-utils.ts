import {
  retryPromise,
  timeout,
  delay,
  unawaited,
  promiseFinally,
  asyncMap,
  asyncReduce,
} from '../promise'

describe('promise utilities', () => {
  describe('retryPromise', () => {
    it('should retry a failing promise', async () => {
      // Create a function that fails twice then succeeds
      let callCount = 0
      const flaky = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          throw new Error(`Attempt ${callCount} failed`)
        }
        return 'success'
      })

      const result = await retryPromise(flaky, 3)

      expect(result).toBe('success')
      expect(flaky).toHaveBeenCalledTimes(3)
    })

    it('should fail after maximum retries', async () => {
      // Create a function that always fails
      const alwaysFails = jest.fn().mockImplementation(async () => {
        throw new Error('Always fails')
      })

      await expect(retryPromise(alwaysFails, 2)).rejects.toThrow('Always fails')
      expect(alwaysFails).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('timeout', () => {
    it('should resolve with the promise result if within timeout', async () => {
      const promise = Promise.resolve('success')
      const result = await timeout(promise, 1000)
      expect(result).toBe('success')
    })

    it('should reject if the promise takes too long', async () => {
      // Create a promise that takes a long time to resolve
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve('too late'), 100),
      )

      await expect(timeout(slowPromise, 50)).rejects.toThrow('Timeout exceeded')
    })

    it('should handle null or undefined promises', async () => {
      const nullResult = await timeout(null, 100)
      expect(nullResult).toBeNull()

      const undefinedResult = await timeout(undefined, 100)
      expect(undefinedResult).toBeUndefined()
    })
  })

  describe('delay', () => {
    it('should resolve after the specified delay', async () => {
      jest.useFakeTimers()

      const start = Date.now()
      const delayPromise = delay(500)

      // Fast-forward timers
      jest.advanceTimersByTime(500)

      await delayPromise

      jest.useRealTimers()
    })
  })

  describe('unawaited', () => {
    it('should not block execution', async () => {
      let completed = false

      // Create a promise that takes some time to resolve
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => {
          completed = true
          resolve('done')
        }, 50),
      )

      // Call unawaited, which should return immediately
      unawaited(slowPromise)

      // At this point, the promise should not have resolved yet
      expect(completed).toBe(false)

      // Wait for the promise to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Now the promise should have completed
      expect(completed).toBe(true)
    })
  })

  describe('promiseFinally', () => {
    it('should execute block after promise resolves', async () => {
      const finallyFn = jest.fn()
      const promise = Promise.resolve('success')

      const result = await promiseFinally(promise, finallyFn)

      expect(result).toBe('success')
      expect(finallyFn).toHaveBeenCalledTimes(1)
    })

    it('should execute block after promise rejects', async () => {
      const finallyFn = jest.fn()
      const error = new Error('Test error')
      const promise = Promise.reject(error)

      await expect(promiseFinally(promise, finallyFn)).rejects.toThrow(
        'Test error',
      )
      expect(finallyFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('asyncMap', () => {
    it('should map an array of values using an async function', async () => {
      const input = [1, 2, 3, 4, 5]
      const asyncDouble = async (x: number) => x * 2

      const result = await asyncMap(input, asyncDouble)

      // Check the result is a Map with the expected key-value pairs
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(5)
      expect(result.get(1)).toBe(2)
      expect(result.get(2)).toBe(4)
      expect(result.get(3)).toBe(6)
      expect(result.get(4)).toBe(8)
      expect(result.get(5)).toBe(10)
    })

    it('should handle empty arrays', async () => {
      const input: number[] = []
      const asyncDouble = async (x: number) => x * 2

      const result = await asyncMap(input, asyncDouble)

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('should execute mapper function on each input item', async () => {
      const input = [1, 2, 3, 4, 5]
      const mockAsyncFn = jest
        .fn()
        .mockImplementation(async (x: number) => x * 2)

      await asyncMap(input, mockAsyncFn)

      // Verify that the mapper was called for each input item
      expect(mockAsyncFn).toHaveBeenCalledTimes(5)
      expect(mockAsyncFn).toHaveBeenCalledWith(1)
      expect(mockAsyncFn).toHaveBeenCalledWith(2)
      expect(mockAsyncFn).toHaveBeenCalledWith(3)
      expect(mockAsyncFn).toHaveBeenCalledWith(4)
      expect(mockAsyncFn).toHaveBeenCalledWith(5)
    })
  })

  describe('asyncReduce', () => {
    it('should reduce an array using an async function', async () => {
      const input = [1, 2, 3, 4, 5]

      // Sum reducer
      const asyncSum = async (acc: number, x: number) => acc + x

      const result = await asyncReduce(input, asyncSum, 0)

      expect(result).toBe(15) // 1 + 2 + 3 + 4 + 5
    })

    it('should process items in sequence', async () => {
      const input = [1, 2, 3]
      const sequence: number[] = []

      const asyncTrackSequence = async (acc: number[], x: number) => {
        sequence.push(x)
        return [...acc, x]
      }

      await asyncReduce(input, asyncTrackSequence, [] as number[])

      // Check that items were processed in order
      expect(sequence).toEqual([1, 2, 3])
    })

    it('should handle empty arrays', async () => {
      const input: number[] = []
      const asyncSum = async (acc: number, x: number) => acc + x

      const result = await asyncReduce(input, asyncSum, 42)

      // With no items to process, result should be the seed value
      expect(result).toBe(42)
    })
  })
})
