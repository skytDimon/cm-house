import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function leadDevPlugin(): Plugin {
  return {
    name: 'lead-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/lead' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { name = '', phone = '', interest = '', comment = '' } = payload;
              const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN || '8601966718:AAGpxp-fdYAkx1sHNHzjtLi7njL_xeqvRro';
              const chatIdRaw = process.env.VITE_TELEGRAM_CHAT_ID || '821740830,1243110789';
              const chatIds = chatIdRaw.split(',').map((s: string) => s.trim()).filter(Boolean);

              const now = new Date().toLocaleString('ru-RU', {
                timeZone: 'Asia/Yekaterinburg',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const text =
                `🏡 <b>Новая заявка с сайта CM-HOUSE!</b>\n\n` +
                `👤 <b>Имя:</b> ${name}\n` +
                `📞 <b>Телефон:</b> <a href="tel:${phone}">${phone}</a>\n` +
                `🎯 <b>Интересует:</b> ${interest || 'Не указано'}\n` +
                `💬 <b>Комментарий:</b> ${comment || '—'}\n\n` +
                `⏱ <i>${now} (Екб)</i>`;

              // Отправка в Telegram
              for (const chatId of chatIds) {
                try {
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text,
                      parse_mode: 'HTML',
                      disable_web_page_preview: true,
                    }),
                  });
                } catch (err) {
                  console.warn('[dev-plugin] Telegram error:', err);
                }
              }

              // Отправка на почту
              try {
                await fetch('https://formsubmit.co/ajax/cmhouse2005@mail.ru', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify({
                    _subject: `Новая заявка CM-HOUSE: ${name} (${phone})`,
                    _template: 'table',
                    _captcha: 'false',
                    Имя: name,
                    Телефон: phone,
                    'Что интересует': interest || 'Не указано',
                    Комментарий: comment || '—',
                    'Дата и время': now,
                  }),
                });
              } catch (err) {
                console.warn('[dev-plugin] Email error:', err);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), leadDevPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
