export type LeadPayload = {
  name: string
  phone: string
  interest: string
  comment: string
}

/**
 * Заглушка отправки заявки.
 * Сейчас — только имитация задержки и лог в консоль.
 *
 * Как подключить к ТГ-боту и почте (выбери один вариант):
 *
 * A) Vercel / Cloudflare Function (рекомендуется):
 *   1. @BotFather → /newbot → BOT_TOKEN; @userinfobot → CHAT_ID.
 *   2. Создай POST /api/lead: валидация → fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,
 *      { chat_id: CHAT_ID, text }) → nodemailer/Resend на почту.
 *   3. Токены — только в env функции, не в VITE_.
 *   4. Здесь замени тело на: await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
 *
 * B) Без бэкенда: Formspree/Getform + Make (Integromat) — webhook Formspree → Telegram → Email.
 * C) Свой VPS (Express) — тот же код, что в A, как отдельный сервис.
 */
export async function submitLead(payload: LeadPayload): Promise<void> {
  console.log('[lead stub] payload:', payload)
  await new Promise((r) => setTimeout(r, 600))
}
