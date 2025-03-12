import { Result, ok, err, pending } from '../result'

describe('Result class', () => {
  describe('static methods', () => {
    it('should create ok result', () => {
      const result = Result.ok(42)
      expect(result.isOk()).toBe(true)
      expect(result.isErr()).toBe(false)
      expect(result.isPending()).toBe(false)
      expect(result.ok()).toBe(42)
      expect(result.err()).toBeUndefined()
    })

    it('should create error result', () => {
      const error = new Error('test error')
      const result = Result.err<number>(error)
      expect(result.isOk()).toBe(false)
      expect(result.isErr()).toBe(true)
      expect(result.isPending()).toBe(false)
      expect(result.ok()).toBeUndefined()
      expect(result.err()).toBe(error)
    })

    it('should create pending result', () => {
      const result = Result.pending<number>()
      expect(result.isOk()).toBe(false)
      expect(result.isErr()).toBe(false)
      expect(result.isPending()).toBe(true)
      expect(result.ok()).toBeUndefined()
      expect(result.err()).toBeUndefined()
    })

    it('should convert promise to result', async () => {
      const successPromise = Promise.resolve(42)
      const successResult = await Result.fromPromise(successPromise)
      expect(successResult.isOk()).toBe(true)
      expect(successResult.ok()).toBe(42)

      const error = new Error('test error')
      const errorPromise = Promise.reject(error)
      const errorResult = await Result.fromPromise(errorPromise)
      expect(errorResult.isErr()).toBe(true)
      expect(errorResult.err()).toBe(error)
    })
  })

  describe('helper functions', () => {
    it('should create ok result with ok()', () => {
      const result = ok(42)
      expect(result.isOk()).toBe(true)
      expect(result.ok()).toBe(42)
    })

    it('should create error result with err()', () => {
      const error = new Error('test error')
      const result = err<number>(error)
      expect(result.isErr()).toBe(true)
      expect(result.err()).toBe(error)
    })

    it('should create pending result with pending()', () => {
      const result = pending<number>()
      expect(result.isPending()).toBe(true)
    })
  })

  describe('instance methods', () => {
    it('should check if result is undefined', () => {
      expect(ok(undefined).isUndefined()).toBe(true)
      expect(ok(null).isUndefined()).toBe(false)
      expect(ok(42).isUndefined()).toBe(false)
      expect(err<number>(new Error()).isUndefined()).toBe(false)
      expect(pending<number>().isUndefined()).toBe(false)
    })

    it('should get ok value or default with okOr', () => {
      expect(ok(42).okOr(100)).toBe(42)
      expect(err<number>(new Error()).okOr(100)).toBe(100)
      expect(pending<number>().okOr(100)).toBe(100)

      // Test filterNullish
      expect(ok(null).okOr(100, true)).toBe(100)
      expect(ok(undefined).okOr(100, true)).toBe(100)
      expect(ok(0).okOr(100, true)).toBe(100)
      expect(ok('').okOr(100, true)).toBe(100)
      expect(ok(42).okOr(100, true)).toBe(42)
    })

    it('should throw when calling expect on non-ok result', () => {
      expect(() => err<number>(new Error()).expect()).toThrow(
        'Value is not an Ok',
      )
      expect(() => pending<number>().expect()).toThrow('Value is not an Ok')
      expect(() => ok(42).expect()).not.toThrow()
      expect(ok(42).expect()).toBe(42)
    })

    it('should throw when calling expectErr on non-error result', () => {
      expect(() => ok(42).expectErr()).toThrow('Value is not an Error')
      expect(() => pending<number>().expectErr()).toThrow(
        'Value is not an Error',
      )

      const error = new Error('test error')
      expect(() => err<number>(error).expectErr()).not.toThrow()
      expect(err<number>(error).expectErr()).toBe(error)
    })

    it('should map ok values', () => {
      const double = (x: number) => x * 2

      const okResult = ok(21).map(double)
      expect(okResult.isOk()).toBe(true)
      expect(okResult.ok()).toBe(42)

      const errResult = err<number>(new Error()).map(double)
      expect(errResult.isErr()).toBe(true)

      const pendingResult = pending<number>().map(double)
      expect(pendingResult.isPending()).toBe(true)
    })

    it('should map error values', () => {
      const addPrefix = (e: any) => new Error(`Prefix: ${e.message}`)
      const originalError = new Error('Original error')

      const okResult = ok(42).mapErr(addPrefix)
      expect(okResult.isOk()).toBe(true)
      expect(okResult.ok()).toBe(42)

      const errResult = err<number>(originalError).mapErr(addPrefix)
      expect(errResult.isErr()).toBe(true)
      expect(errResult.err().message).toBe('Prefix: Original error')

      const pendingResult = pending<number>().mapErr(addPrefix)
      expect(pendingResult.isPending()).toBe(true)
    })

    it('should handle mapOrElse correctly', () => {
      // With ok value
      const okResult = ok(42).mapOrElse({
        ok: (n) => `Value is ${n}`,
        err: (e) => `Error: ${e.message}`,
        pending: () => 'Pending...',
      })
      expect(okResult).toBe('Value is 42')

      // With null ok value and null handler
      const nullResult = ok(null).mapOrElse({
        ok: (v) => 'This should not be called',
        null: () => 'Null value',
        err: () => 'Error',
        pending: () => 'Pending',
      })
      expect(nullResult).toBe('Null value')

      // With error value
      const error = new Error('test error')
      const errResult = err<number>(error).mapOrElse({
        ok: (n) => `Value is ${n}`,
        err: (e) => `Error: ${e.message}`,
        pending: () => 'Pending...',
      })
      expect(errResult).toBe('Error: test error')

      // With pending value
      const pendingResult = pending<number>().mapOrElse({
        ok: (n) => `Value is ${n}`,
        err: (e) => `Error: ${e.message}`,
        pending: () => 'Pending...',
      })
      expect(pendingResult).toBe('Pending...')

      // With missing handlers
      const missingHandlersResult = ok(42).mapOrElse({})
      expect(missingHandlersResult).toBeUndefined()
    })
  })
})
