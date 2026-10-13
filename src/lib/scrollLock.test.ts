import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { lockScroll, unlockScroll, setLenisInstance, getLenisInstance, useScrollLock } from './scrollLock'

describe('scrollLock', () => {
  beforeEach(() => {
    // Reset DOM styles and classes
    document.documentElement.className = ''
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    setLenisInstance(null)
    // Unlock any leftover locks
    unlockScroll()
    unlockScroll()
    unlockScroll()
  })

  it('manages lenisInstance getter and setter', () => {
    expect(getLenisInstance()).toBeNull()
    const mockLenis = {
      scroll: 100,
      stop: vi.fn(),
      start: vi.fn(),
      scrollTo: vi.fn(),
    }
    setLenisInstance(mockLenis)
    expect(getLenisInstance()).toBe(mockLenis)
  })

  it('locks scroll by applying classes and overflow styles to document', () => {
    lockScroll()

    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')

    unlockScroll()

    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('')
  })

  it('handles nested lockScroll and unlockScroll counts correctly', () => {
    lockScroll()
    lockScroll() // Nested second modal open

    expect(document.documentElement.style.overflow).toBe('hidden')

    unlockScroll() // First modal closed
    expect(document.documentElement.style.overflow).toBe('hidden') // Still locked

    unlockScroll() // Second modal closed
    expect(document.documentElement.style.overflow).toBe('') // Now unlocked
  })

  it('calls lenis stop and start/scrollTo if lenisInstance is active', () => {
    const mockLenis = {
      scroll: 250,
      stop: vi.fn(),
      start: vi.fn(),
      scrollTo: vi.fn(),
    }
    setLenisInstance(mockLenis)

    lockScroll()
    expect(mockLenis.stop).toHaveBeenCalledTimes(1)

    unlockScroll()
    expect(mockLenis.start).toHaveBeenCalledTimes(1)
    expect(mockLenis.scrollTo).toHaveBeenCalledWith(250, { immediate: true, force: true })
  })

  it('gracefully handles lenis errors during lock and unlock', () => {
    const buggyLenis = {
      scroll: 50,
      stop: () => { throw new Error('stop failed') },
      start: () => { throw new Error('start failed') },
      scrollTo: () => { throw new Error('scrollTo failed') },
    }
    setLenisInstance(buggyLenis)

    expect(() => lockScroll()).not.toThrow()
    expect(() => unlockScroll()).not.toThrow()
  })

  it('useScrollLock locks when true and unlocks on false or unmount', () => {
    const { rerender, unmount } = renderHook(({ isLocked }) => useScrollLock(isLocked), {
      initialProps: { isLocked: false },
    })

    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(false)

    rerender({ isLocked: true })
    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(true)

    rerender({ isLocked: false })
    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(false)

    rerender({ isLocked: true })
    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(true)

    unmount()
    expect(document.documentElement.classList.contains('lenis-stopped')).toBe(false)
  })
})
