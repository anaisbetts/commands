export function ok<T>(val: T): Result<T> {
  return Result.ok(val)
}

export function err<T>(err: any): Result<T> {
  return Result.err(err)
}

export function pending<T>(): Result<T> {
  return Result.pending()
}

export abstract class Result<T> {
  abstract isOk(): boolean
  abstract isErr(): boolean
  abstract isPending(): boolean
  abstract ok(): T | undefined
  abstract err(): any

  static ok<T>(val: T): Result<T> {
    return new OkValue<T>(val)
  }

  static err<T>(err: any): Result<T> {
    return new ErrorValue<T>(err)
  }

  static pending<T>(): Result<T> {
    return new PendingValue<T>()
  }

  static fromPromise<T>(val: Promise<T>): Promise<Result<T>> {
    return val.then(
      (x) => Result.ok(x),
      (ex) => Result.err(ex),
    )
  }

  isUndefined() {
    return this.mapOrElse({
      err: () => false,
      pending: () => false,
      ok: (x) => x === undefined,
    })
  }

  okOr(val: T, filterNullish: boolean = false) {
    return this.mapOrElse({
      err: () => val,
      pending: () => val,
      ok: (x) => (filterNullish && !x ? val : x),
    })
  }

  expect(): T {
    if (!this.isOk()) {
      throw new Error('Value is not an Ok')
    }

    return this.ok()!
  }

  expectErr(): any {
    if (!this.isErr()) {
      throw new Error('Value is not an Error')
    }

    return this.err()!
  }

  map<N>(fn: (val: T) => N): Result<N> {
    if (this.isErr()) {
      return Result.err<N>(this.expectErr())
    }

    if (this.isPending()) {
      return Result.pending()
    }

    return Result.ok(fn(this.expect()))
  }

  mapOrElse<N>(ops: {
    err?: (err: any) => N,
    pending?: () => N,
    ok?: (val: T) => N,
    null?: (val: T) => N,
  }): N | undefined {
    if (this.isPending()) {
      return ops.pending ? ops.pending() : undefined
    }

    if (this.isErr()) {
      return ops.err ? ops.err(this.expectErr()) : undefined
    }

    const ret = this.expect()
    const fn = ret ? ops.ok : (ops.null ?? ops.ok)

    return fn ? fn(ret) : undefined
  }

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
