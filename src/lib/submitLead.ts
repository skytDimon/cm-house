export type LeadPayload = {
  name: string
  phone: string
  interest: string
  comment: string
}

/**
 * Отправка заявки:
 * Отправляется на бэкенд /api/contact (FastAPI), который пересылает
 * заявку в Telegram бота через зарубежный VPS прокси (TELEGRAM_PROXY / TELEGRAM_API_URL)
 * и на почту cmhouse2005@mail.ru.
 */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const { name, phone, interest, comment } = payload

  // Основной канал: отправка на бэкенд /api/contact
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone,
        interest,
        comment,
      }),
    })

    if (res.ok) {
      return
    }
    console.warn(`[submitLead] Сервер вернул код ${res.status}`)
  } catch (err) {
    console.warn('[submitLead] Ошибка запроса к /api/contact:', err)
  }

  // Fallback (на случай локальной разработки без запущенного бэкенда)
  try {
    const botToken =
      import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8601966718:AAGpxp-fdYAkx1sHNHzjtLi7njL_xeqvRro'
    const chatIdRaw =
      import.meta.env.VITE_TELEGRAM_CHAT_ID || '821740830,1243110789'
    const chatIds = chatIdRaw
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    if (botToken && chatIds.length > 0) {
      const now = new Date().toLocaleString('ru-RU', {
        timeZone: 'Asia/Yekaterinburg',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const text =
        `🏡 <b>Новая заявка с сайта CM-HOUSE!</b>\n\n` +
        `👤 <b>Имя:</b> ${name}\n` +
        `📞 <b>Телефон:</b> ${phone}\n` +
        `🎯 <b>Интересует:</b> ${interest || 'Не указано'}\n` +
        `💬 <b>Комментарий:</b> ${comment || '—'}\n\n` +
        `⏱ <i>${now} (Екб)</i>`

      for (const chatId of chatIds) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          }),
        }).catch(() => {})
      }
    }
  } catch {
    // Игнорируем ошибки в fallback
  }
}
