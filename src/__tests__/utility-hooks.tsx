import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { useMounted, useExplicitRender } from '../utility-hooks'

describe('useMounted', () => {
  it('should return true when component is mounted', () => {
    // Create a component that exposes the mounted status
    let mountedStatus: React.MutableRefObject<boolean> | null = null

    const TestComponent = () => {
      const mounted = useMounted()
      mountedStatus = mounted
      return <div>Test Component</div>
    }

    render(<TestComponent />)

    // Check that mounted is true when component is rendered
    expect(mountedStatus).not.toBeNull()
    expect(mountedStatus!.current).toBe(true)
  })

  it('should update to false when component is unmounted', () => {
    // Create a component that exposes the mounted status
    let mountedStatus: React.MutableRefObject<boolean> | null = null

    const TestComponent = () => {
      const mounted = useMounted()
      mountedStatus = mounted
      return <div>Test Component</div>
    }

    const { unmount } = render(<TestComponent />)

    // Check that mounted is true initially
    expect(mountedStatus).not.toBeNull()
    expect(mountedStatus!.current).toBe(true)

    // Unmount the component
    unmount()

    // Check that mounted is now false
    expect(mountedStatus!.current).toBe(false)
  })
})

describe('useExplicitRender', () => {
  it('should provide a dependency value and rerender function', () => {
    // Track render count
    let renderCount = 0
    let depValue = -1
    let rerenderFn: (() => void) | null = null

    const TestComponent = () => {
      renderCount++
      const { dep, rerender } = useExplicitRender()
      depValue = dep
      rerenderFn = rerender
      return <div>Render count: {renderCount}</div>
    }

    render(<TestComponent />)

    // First render
    expect(renderCount).toBe(1)
    expect(depValue).toBe(0)
    expect(rerenderFn).not.toBeNull()

    // Call rerender
    act(() => rerenderFn!())

    // Second render
    expect(renderCount).toBe(2)
    expect(depValue).toBe(1)

    // Call rerender again
    act(() => rerenderFn!())

    // Third render
    expect(renderCount).toBe(3)
    expect(depValue).toBe(2)
  })

  it('should update dep value on each rerender call', () => {
    let deps: number[] = []
    let rerenderFn: (() => void) | null = null

    const TestComponent = () => {
      const { dep, rerender } = useExplicitRender()
      deps.push(dep)
      rerenderFn = rerender
      return <div>Dep: {dep}</div>
    }

    render(<TestComponent />)

    // Call rerender multiple times
    act(() => rerenderFn!())
    act(() => rerenderFn!())
    act(() => rerenderFn!())

    // Check that deps were updated properly
    expect(deps).toEqual([0, 1, 2, 3])
  })
})
