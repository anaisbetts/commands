/**
 * Creates a Result object with a successful value.
 *
 * @param val - The value to be wrapped in the Result object.
 * @returns A boxed representation of val
 */
export function ok<T>(val: T): Result<T> {
  return Result.ok(val)
}

/**
 * Creates a Result object representing an error.
 *
 * @param err - The error value.
 * @returns A boxed representation of the Error
 */
export function err<T>(err: any): Result<T> {
  return Result.err(err)
}

/**
 * Creates a pending Result.
 *
 * @returns A pending Result.
 */
export function pending<T>(): Result<T> {
  return Result.pending()
}

/**
 * This class represents the current result of a pending asynchronous operation,
 * similar to other languages like Kotlin and Rust's "Result" class, but with an
 * additional "pending" state
 */
export abstract class Result<T> {
  /**
   * Checks if the result is Ok.
   * @returns `true` if the result is Ok, `false` otherwise.
   */
  abstract isOk(): boolean

  /**
   * Checks if the result is an Error
   * @returns `true` if the result is an Error, `false` otherwise.
   */
  abstract isErr(): boolean

  /**
   * Checks if the result is Pending.
   * @returns `true` if the result is Pending, `false` otherwise.
   */
  abstract isPending(): boolean

  /**
   * Gets the value if the Result is a completed value.
   * @returns The value if the result is Ok, `undefined` otherwise.
   */
  abstract ok(): T | undefined

  /**
   * Gets the error if the result is an Error.
   * @returns The error if the result is an Error, `undefined` otherwise.
   */
  abstract err(): any

  /**
   * Creates a Result object with a successful value.
   *
   * @param val - The value to be wrapped in the Result object.
   * @returns A boxed representation of val
   */
  static ok<T>(val: T): Result<T> {
    return new OkValue<T>(val)
  }

  /**
   * Creates a Result object representing an error.
   *
   * @param err - The error value.
   * @returns A boxed representation of the Error
   */
  static err<T>(err: any): Result<T> {
    return new ErrorValue<T>(err)
  }

  /**
   * Creates a new Result instance with a Pending value.
   * @returns A new Result instance with a Pending value.
   */
  static pending<T>(): Result<T> {
    return new PendingValue<T>()
  }

  /**
   * Boxes a Promise into a Result (i.e. captures errors into a Result)
   *
   * @param val - The Promise to be converted.
   * @returns A Promise that resolves to a Result.
   */
  static fromPromise<T>(val: Promise<T>): Promise<Result<T>> {
    return val.then(
      (x) => Result.ok(x),
      (ex) => Result.err(ex),
    )
  }

  /**
   * Checks if the Result is an undefined value.
   * @returns `true` if the result is undefined, `false` otherwise.
   */
  isUndefined() {
    return this.mapOrElse({
      err: () => false,
      pending: () => false,
      ok: (x) => x === undefined,
    })
  }

  /**
   * Gets the Ok value or a default value if the result is not Ok.
   *
   * @param val - The default value to be returned.
   * @param filterNullish - Whether to filter out nullish values. If the Result
   *                        is ok but null, it will be `val`
   * @returns Either the Ok value or the default value.
   */
  okOr(val: T, filterNullish: boolean = false) {
    return this.mapOrElse({
      err: () => val,
      pending: () => val,
      ok: (x) => (filterNullish && !x ? val : x),
    })
  }

  /**
   * Expects the result to be Ok and returns the value. If the Result is not Ok,
   * this method throws.
   *
   * @returns The Ok value.
   */
  expect(): T {
    if (!this.isOk()) {
      throw new Error('Value is not an Ok')
    }

    return this.ok()!
  }

  /**
   * Expects the result to be an Error and returns the error. If the Result is
   * not an Error, this method throws
   *
   * @returns The Error value
   */
  expectErr(): any {
    if (!this.isErr()) {
      throw new Error('Value is not an Error')
    }

    return this.err()!
  }

  /**
   * Transforms the result by applying a function to the Ok value, similar to Array.map
   *
   * @param fn - The function to apply to the Ok value.
   * @returns A new Result instance with the transformed value.
   */
  map<N>(fn: (val: T) => N): Result<N> {
    if (this.isErr()) {
      return Result.err<N>(this.expectErr())
    }

    if (this.isPending()) {
      return Result.pending()
    }

    return Result.ok(fn(this.expect()))
  }

  /**
   * Unboxes the Result by applying different functions based on the Result
   * type. This is an extremely useful method, especially in React!
   *
   * @param ops - an Object with optional transform methods for each type of value:
   *    err - called when Result is an Error
   *    pending - called when Result is Pending
   *    ok - called when Result has a value
   *    null - called when Result is nullish - if both ok and null are provided,
   *           null is preferred if the value is nullish
   *
   * @returns The result of applying the corresponding function based on the Result
   *          type.
   */
  mapOrElse<N>(ops: {
    err?: (err: any) => N
    pending?: () => N
    ok?: (val: T) => N
    null?: (val: T) => N
  }): N | undefined {
    if (this.isPending()) {
      return ops.pending ? ops.pending() : undefined
    }

    if (this.isErr()) {
      return ops.err ? ops.err(this.expectErr()) : undefined
    }

    const ret = this.expect()
    const fn = ret ? ops.ok : ops.null ?? ops.ok

    return fn ? fn(ret) : undefined
  }

  /**
   * Transforms the result by applying a function to the Err value.
   *
   * @param fn - The function to apply to the Error value.
   * @returns A new Result instance with the transformed error. If the Result
   *          isn't an Error, it gets passed through
   */
  mapErr(fn: (error: any) => any): Result<T> {
    if (this.isOk()) return Result.ok<T>(this.expect())
    if (this.isPending()) return Result.pending<T>()

    return Result.err(fn(this.expectErr()))
  }
}

class OkValue<T> extends Result<T> {
  value: T

  constructor(val: T) {
    super()
    this.value = val
  }

  isOk(): boolean {
    return true
  }

  isErr(): boolean {
    return false
  }

  isPending(): boolean {
    return false
  }

  ok(): T | undefined {
    return this.value
  }

  err(): any | undefined {
    return undefined
  }
}

class ErrorValue<T> extends Result<T> {
  value: any

  constructor(val: any) {
    super()
    this.value = val
  }

  isOk(): boolean {
    return false
  }

  isErr(): boolean {
    return true
  }

  isPending(): boolean {
    return false
  }

  ok(): T | undefined {
    return undefined
  }

  err(): any | undefined {
    return this.value
  }
}

class PendingValue<T> extends Result<T> {
  constructor() {
    super()
  }

  isOk(): boolean {
    return false
  }

  isErr(): boolean {
    return false
  }

  isPending(): boolean {
    return true
  }

  ok(): T | undefined {
    return undefined
  }

  err(): any | undefined {
    return undefined
  }
}
