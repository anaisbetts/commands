import React from 'react'
import { Observable, Subject, firstValueFrom } from 'rxjs'
import { useObservable, usePromise } from '../promise'

import { act, cleanup, render, screen } from '@testing-library/react'

function PromiseComponent(props: { p: Promise<number> }) {
  const box = usePromise(() => props.p, [props.p])

  if (box.isPending()) {
    return <p>Pending!</p>
  }

  if (box.isErr()) {
    return <p>{box.expectErr().message}</p>
  }

  return <p>{box.expect()}</p>
}

function ObsComponent(props: { o: Observable<number> }) {
  const box = useObservable(() => props.o, [props.o])

  if (box.isPending()) {
    return <p>Pending!</p>
  }

  if (box.isErr()) {
    return <p>{box.expectErr().message}</p>
  }

  return <p>{box.expect()}</p>
}

describe('useObservable', () => {
  it('should work with >1 item', async () => {
    const subj = new Subject<number>()
    render(<ObsComponent o={subj} />)

    expect(await screen.findByText('Pending!')).toBeInTheDocument()

    act(() => subj.next(1))
    expect(await screen.findByText('1')).toBeInTheDocument()

    act(() => subj.next(2))
    expect(await screen.findByText('2')).toBeInTheDocument()

    act(() => subj.next(3))
    expect(await screen.findByText('3')).toBeInTheDocument()
  })

  it('should handle errors', async () => {
    const subj = new Subject<number>()
    render(<ObsComponent o={subj} />)

    expect(await screen.findByText('Pending!')).toBeInTheDocument()

    act(() => subj.next(1))
    expect(await screen.findByText('1')).toBeInTheDocument()

    act(() => subj.error(new Error('die')))
    expect(await screen.findByText('die')).toBeInTheDocument()
  })

  it('should do nothing on complete', async () => {
    const subj = new Subject<number>()
    render(<ObsComponent o={subj} />)

    expect(await screen.findByText('Pending!')).toBeInTheDocument()

    act(() => subj.next(1))
    expect(await screen.findByText('1')).toBeInTheDocument()

    act(() => subj.next(2))
    act(() => subj.complete())
    expect(await screen.findByText('2')).toBeInTheDocument()

    act(() => subj.next(3))
    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('should unsubscribe on prop change', async () => {
    let unsub = 0
    const subj1 = new Subject<number>()
    const subj2 = new Subject<number>()

    const { rerender } = render(
      <ObsComponent
        o={
          new Observable<number>((subj) => {
            const d = subj1.subscribe(subj)
            d.add(() => unsub++)
          })
        }
      />,
    )

    expect(await screen.findByText('Pending!')).toBeInTheDocument()

    act(() => subj1.next(1))
    expect(await screen.findByText('1')).toBeInTheDocument()

    rerender(<ObsComponent o={subj2} />)
    expect(unsub).toBe(1)

    act(() => subj1.next(10))
    expect(await screen.findByText('1')).toBeInTheDocument()
    expect(unsub).toBe(1)

    act(() => subj2.next(2))
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(unsub).toBe(1)
  })
})

describe('usePromise', () => {
  it('should update on item', async () => {
    // NB: A Subject is kind of like a Promise that we can control by-hand
    // i.e. we can make it complete whenever we want, by calling 'next'
    const subj = new Subject<number>()
    render(<PromiseComponent p={firstValueFrom(subj)} />)
    expect(await screen.findByText('Pending!')).toBeInTheDocument()

    // Pretend the promise completed
    subj.next(1)

    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  it('should update on error', async () => {
    const subj = new Subject<number>()

    render(<PromiseComponent p={firstValueFrom(subj)} />)

    expect(await screen.findByText('Pending!')).toBeInTheDocument()

    // Pretend the promise rejected
    subj.error(new Error('die'))

    expect(await screen.findByText('die')).toBeInTheDocument()
  })

  it('should cancel on deps change', async () => {
    let cancelCount = 0

    const CancelComponent: React.FC<{ gate: Promise<boolean> }> = ({
      gate,
    }) => {
      const box = usePromise(
        async (c) => {
          await gate
          if (c.cancelled) {
            cancelCount++
          }

          return 'completed'
        },
        [gate],
      )

      if (box.isPending()) {
        return <p>Pending!</p>
      }

      if (box.isErr()) {
        return <p>{box.expectErr().message}</p>
      }

      return <p>{box.expect()}</p>
    }

    const gate1 = new Subject<boolean>()
    const gate2 = new Subject<boolean>()

    const { rerender } = render(
      <CancelComponent gate={firstValueFrom(gate1)} />,
    )

    expect(cancelCount).toBe(0)
    rerender(<CancelComponent gate={firstValueFrom(gate2)} />)

    // Changing the props should've changed the cancellation token
    // on the first Promise to true
    gate1.next(true)
    gate1.complete()
    expect(await screen.findByText('Pending!')).toBeInTheDocument()
    expect(cancelCount).toBe(1)

    // This time, we didn't cancel the in-flight promise, so the
    // cancel count should still be 1
    gate2.next(true)
    gate2.complete()
    expect(await screen.findByText('completed')).toBeInTheDocument()
    expect(cancelCount).toBe(1)
  })

  it('should update when deps change', async () => {
    const subj1 = new Subject<number>()
    const subj2 = new Subject<number>()
    let callCount = 0

    const Component: React.FC<{ p: Promise<number> }> = ({ p }) => {
      const box = usePromise(() => {
        callCount++
        return p
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [p])

      if (box.isPending()) {
        return <p>Pending!</p>
      }

      if (box.isErr()) {
        return <p>{box.expectErr().message}</p>
      }

      return <p>{box.expect()}</p>
    }

    const { rerender } = render(<Component p={firstValueFrom(subj1)} />)

    expect(await screen.findByText('Pending!')).toBeInTheDocument()
    expect(callCount).toBe(1)

    // Changing a dep should result in a new subscription
    rerender(<Component p={firstValueFrom(subj2)} />)
    expect(await screen.findByText('Pending!')).toBeInTheDocument()
    expect(callCount).toBe(2)

    subj1.error(new Error('die!!'))
    expect(await screen.findByText('Pending!')).toBeInTheDocument()
    expect(callCount).toBe(2)

    subj2.next(10)
    expect(await screen.findByText('10')).toBeInTheDocument()
    expect(callCount).toBe(2)

    cleanup()
  })
})
