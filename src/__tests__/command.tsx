import React, { useEffect } from 'react'
import { Subject, firstValueFrom, take } from 'rxjs'

import { act, render, screen } from '@testing-library/react'
import { useCommand } from '../command'
import { unawaited } from '../utility'

import '@testing-library/jest-dom'

describe('useCommand', () => {
  let callCount = 0
  beforeEach(() => (callCount = 0))

  const CommandComponent: React.FC<{
    invoker: Subject<boolean>
    resultGate?: Subject<boolean>
    resetter?: Subject<boolean>
  }> = ({ invoker, resultGate, resetter }) => {
    const [invokeCommand, current, reset] = useCommand(
      async () => {
        callCount++
        if (resultGate) {
          await firstValueFrom(resultGate.pipe(take(1)))
        }

        return callCount.toString()
      },
      [],
      false,
    )

    // This is a Hack to let us call invokeCommand from the test
    useEffect(() => {
      invoker.subscribe(() => unawaited(invokeCommand()))
    }, [invoker, invokeCommand])

    useEffect(() => {
      if (!resetter) return
      resetter.subscribe(() => reset())
    }, [resetter, reset])

    if (current.isPending()) {
      return <p>Pending!</p>
    }

    if (current.isErr()) {
      return <p>Error!</p>
    }

    return <p>{current.expect() ?? 'null!'}</p>
  }

  const expectNullString = async () =>
    expect(await screen.findByText('null!')).toBeInTheDocument()

  const expectCount = async (n: number) =>
    expect(await screen.findByText(`${n}`)).toBeInTheDocument()

  const expectPending = async () =>
    expect(await screen.findByText(`Pending!`)).toBeInTheDocument()

  it('should update on item', async () => {
    const invoke = new Subject<boolean>()

    render(<CommandComponent invoker={invoke} />)

    // Commands shouldn't invoke immediately, only when we call invokeCommand
    await expectNullString()
    expect(callCount).toBe(0)

    // Reach into the Component and fire invokeCommand
    act(() => invoke.next(true))

    expect(callCount).toBe(1)
    await expectCount(1)
  })

  it('should ignore multiple invocations', async () => {
    const invoke = new Subject<boolean>()
    const result = new Subject<boolean>()

    render(<CommandComponent invoker={invoke} resultGate={result} />)

    // Commands shouldn't invoke immediately, only when we call invokeCommand
    expect(await screen.findByText('null!')).toBeInTheDocument()
    expect(callCount).toBe(0)

    // Kick off our first invocation, this one should Work
    act(() => invoke.next(true))
    expect(callCount).toBe(1)
    await expectPending()

    // Try to invoke while one is already in-flight, it should be ignored (i.e.
    // the callCount should not change)
    act(() => invoke.next(true))
    expect(callCount).toBe(1)
    await expectPending()

    // Complete the initial invocation, we expect current to be updated
    act(() => result.next(true))
    await expectCount(1)

    // Kick off an invocation again, this time we expect it to work because
    // we have nothing in-flight
    act(() => invoke.next(true))
    expect(callCount).toBe(2)
    await expectPending()

    // Complete the second invocation, see the result show up
    act(() => result.next(true))
    await expectCount(2)
  })

  it('should reset when we ask it to', async () => {
    const invoke = new Subject<boolean>()
    const resetSubj = new Subject<boolean>()

    render(<CommandComponent invoker={invoke} resetter={resetSubj} />)

    // Commands shouldn't invoke immediately, only when we call invokeCommand
    await expectNullString()
    expect(callCount).toBe(0)

    // Reach into the Component and fire invokeCommand
    act(() => invoke.next(true))
    expect(callCount).toBe(1)

    // We now expect the result to be delivered
    await expectCount(1)

    act(() => resetSubj.next(true))

    // We expect the result to be set back to pending
    expect(callCount).toBe(1)
    await expectNullString()
  })
})
