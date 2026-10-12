export type LeadPayload = {
  name: string;
  phone: string;
  interest: string;
  comment: string;
};

const NOTIFICATION_EMAIL = 'cmhouse2005@mail.ru';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Отправка заявки:
 * 1. На почту cmhouse2005@mail.ru (через FormSubmit AJAX API)
 * 2. В Telegram-бота (через Telegram Bot API)
 * 3. На локальный /api/lead сервер (если он запущен)
 */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const { name, phone, interest, comment } = payload;
  const now = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Yekaterinburg',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Попытка отправить через серверный эндпоинт /api/lead (если развернут backend)
  try {
    const serverRes = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, date: now }),
    });
    if (serverRes.ok) {
      return;
    }
  } catch {
    // Сервер не отвечает, используем прямую отправку
  }

  const tasks: Promise<unknown>[] = [];

  // 1. Отправка на почту cmhouse2005@mail.ru
  const emailPromise = fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: `Новая заявка с сайта CM-HOUSE: ${name} (${phone})`,
      _template: 'table',
      _captcha: 'false',
      Имя: name,
      Телефон: phone,
      'Что интересует': interest || 'Не указано',
      Комментарий: comment || '—',
      'Дата и время': now,
    }),
  }).catch((err) => {
    console.warn('[submitLead] Ошибка отправки на почту:', err);
  });
  tasks.push(emailPromise);

  // 2. Отправка в Telegram-бота (поддерживает один или несколько chat_id через запятую)
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
  const chatIdRaw = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';
  const chatIds = chatIdRaw
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (botToken && chatIds.length > 0) {
    const text =
      `🏡 <b>Новая заявка с сайта CM-HOUSE!</b>\n\n` +
      `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
      `📞 <b>Телефон:</b> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>\n` +
      `🎯 <b>Интересует:</b> ${escapeHtml(interest || 'Не указано')}\n` +
      `💬 <b>Комментарий:</b> ${escapeHtml(comment || '—')}\n\n` +
      `⏱ <i>${now} (Екб)</i>`;

    chatIds.forEach((targetChatId: string) => {
      const tgPromise = fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }).catch((err) => {
        console.warn(`[submitLead] Ошибка отправки в Telegram (chat_id: ${targetChatId}):`, err);
      });
      tasks.push(tgPromise);
    });
  } else {
    console.info(
      '[submitLead] Telegram Bot Token или Chat ID не заданы в .env. Для отправки в Telegram укажите VITE_TELEGRAM_BOT_TOKEN и VITE_TELEGRAM_CHAT_ID',
    );
  }

  // Ожидаем завершения отправки
  await Promise.allSettled(tasks);
}
