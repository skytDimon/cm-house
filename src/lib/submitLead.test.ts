import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitLead } from './submitLead'

describe('submitLead', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('successfully sends lead to /api/contact without triggering fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })
    globalThis.fetch = fetchMock

    await submitLead({
      name: 'Иван',
      phone: '+7 999 123-45-67',
      interest: 'Модульные дома',
      comment: 'Хочу дом 6х8',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Иван',
        phone: '+7 999 123-45-67',
        interest: 'Модульные дома',
        comment: 'Хочу дом 6х8',
      }),
    })
  })

  it('falls back to Telegram bot direct API when /api/contact returns server error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
      })
    globalThis.fetch = fetchMock

    await submitLead({
      name: 'Ольга',
      phone: '+7 912 345-67-89',
      interest: 'Бани',
      comment: 'С доставкой',
    })

    // First call is /api/contact, following calls are to Telegram sendMessage for configured chat IDs
    expect(fetchMock).toHaveBeenCalledWith('/api/contact', expect.any(Object))
    const telegramCalls = fetchMock.mock.calls.filter(call => String(call[0]).includes('api.telegram.org'))
    expect(telegramCalls.length).toBeGreaterThan(0)

    const payload = JSON.parse(telegramCalls[0][1].body)
    expect(payload.text).toContain('Ольга')
    expect(payload.text).toContain('+7 912 345-67-89')
    expect(payload.text).toContain('Бани')
    expect(payload.text).toContain('С доставкой')
  })

  it('falls back to Telegram bot when /api/contact throws network error', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({
        ok: true,
        status: 200,
      })
    globalThis.fetch = fetchMock

    await submitLead({
      name: 'Петр',
      phone: '+7 900 111-22-33',
      interest: '',
      comment: '',
    })

    const telegramCalls = fetchMock.mock.calls.filter(call => String(call[0]).includes('api.telegram.org'))
    expect(telegramCalls.length).toBeGreaterThan(0)

    const payload = JSON.parse(telegramCalls[0][1].body)
    expect(payload.text).toContain('Не указано')
    expect(payload.text).toContain('—')
  })

  it('handles errors inside Telegram fallback gracefully without throwing', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Complete offline'))
    globalThis.fetch = fetchMock

    await expect(submitLead({
      name: 'Тест',
      phone: '+7 000 000-00-00',
      interest: '',
      comment: '',
    })).resolves.not.toThrow()
  })
})
