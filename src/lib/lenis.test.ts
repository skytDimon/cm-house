import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initLenis, getLenis, scrollTo, destroyLenis } from './lenis'

describe('lenis smooth scroll', () => {
  beforeEach(() => {
    destroyLenis()
  })

  afterEach(() => {
    destroyLenis()
  })

  it('initializes Lenis as a singleton', () => {
    expect(getLenis()).toBeNull()
    const instance = initLenis()
    expect(instance).toBeDefined()
    expect(getLenis()).toBe(instance)

    // Second call returns existing singleton
    const second = initLenis()
    expect(second).toBe(instance)
  })

  it('destroys Lenis and resets singleton', () => {
    initLenis()
    expect(getLenis()).not.toBeNull()

    destroyLenis()
    expect(getLenis()).toBeNull()
  })

  it('scrollTo calls lenis.scrollTo when instance is active', () => {
    const instance = initLenis()
    const spy = vi.spyOn(instance, 'scrollTo').mockImplementation(() => {})

    scrollTo('#projects', -50)
    expect(spy).toHaveBeenCalledWith(
      '#projects',
      expect.objectContaining({
        offset: -50,
        duration: 1.2,
      })
    )
  })

  it('scrollTo falls back to native scrollIntoView when lenis is not initialized', () => {
    destroyLenis()
    const targetEl = document.createElement('div')
    targetEl.id = 'request'
    targetEl.scrollIntoView = vi.fn()
    document.body.appendChild(targetEl)

    scrollTo('#request')
    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })

    document.body.removeChild(targetEl)
  })

  it('handles anchor clicks for internal hash links', () => {
    const instance = initLenis()
    const scrollSpy = vi.spyOn(instance, 'scrollTo').mockImplementation(() => {})

    const targetEl = document.createElement('div')
    targetEl.id = 'about'
    document.body.appendChild(targetEl)

    const anchor = document.createElement('a')
    anchor.href = '#about'
    document.body.appendChild(anchor)

    anchor.click()

    expect(scrollSpy).toHaveBeenCalledWith('#about', expect.any(Object))

    document.body.removeChild(anchor)
    document.body.removeChild(targetEl)
  })
})
