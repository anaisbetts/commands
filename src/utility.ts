export function unawaited<T>(p: Promise<T>) {
  p.then((_) => {})
}

export function cx(...args: (string | null | undefined | false)[]) {
  return args
    .reduce((acc: string[], arg) => {
      const toSplit = arg || ''

      toSplit.split(' ').forEach((x) => {
        if (x && x.length > 1) acc.push(x)
      })

      return acc
    }, [])
    .join(' ')
}

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
