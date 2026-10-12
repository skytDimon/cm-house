import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Загрузка .env файла (если есть)
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '8601966718:AAGpxp-fdYAkx1sHNHzjtLi7njL_xeqvRro';
const CHAT_IDS_RAW = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '821740830,1243110789';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || process.env.VITE_NOTIFICATION_EMAIL || 'cmhouse2005@mail.ru';

const CHAT_IDS = CHAT_IDS_RAW.split(',').map((s) => s.trim()).filter(Boolean);

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegram(text) {
  if (!BOT_TOKEN || CHAT_IDS.length === 0) {
    console.warn('[server] Telegram токен или chat_id не настроены');
    return false;
  }

  const endpoints = [
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
  ];

  let success = false;
  for (const chatId of CHAT_IDS) {
    let sentForChat = false;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        if (data.ok) {
          console.log(`[server] Заявка успешно отправлена в Telegram (chat_id: ${chatId})`);
          sentForChat = true;
          break;
        } else {
          console.warn(`[server] Telegram ответил ошибкой для ${chatId}:`, data);
        }
      } catch (err) {
        console.warn(`[server] Ошибка подключения к ${url}:`, err.message);
      }
    }
    if (sentForChat) success = true;
  }
  return success;
}

async function sendEmail(payload, now) {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: `Новая заявка CM-HOUSE: ${payload.name} (${payload.phone})`,
        _template: 'table',
        _captcha: 'false',
        'Имя': payload.name,
        'Телефон': payload.phone,
        'Что интересует': payload.interest || 'Не указано',
        'Комментарий': payload.comment || '—',
        'Дата и время': now,
      }),
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json().catch(() => ({}));
    console.log('[server] Статус отправки почты FormSubmit:', data);
    return true;
  } catch (err) {
    console.warn('[server] Ошибка отправки почты:', err.message);
    return false;
  }
}

// MIME types для статики
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const distDir = path.join(rootDir, 'dist');

const server = http.createServer(async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Эндпоинт отправки заявки
  if (req.url === '/api/lead' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { name = '', phone = '', interest = '', comment = '' } = payload;

        if (!name.trim() || !phone.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Имя и телефон обязательны' }));
          return;
        }

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
          `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
          `📞 <b>Телефон:</b> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>\n` +
          `🎯 <b>Интересует:</b> ${escapeHtml(interest || 'Не указано')}\n` +
          `💬 <b>Комментарий:</b> ${escapeHtml(comment || '—')}\n\n` +
          `⏱ <i>${now} (Екб)</i>`;

        // Отправка в Telegram и на почту параллельно
        const [tgOk, emailOk] = await Promise.all([
          sendTelegram(text),
          sendEmail({ name, phone, interest, comment }, now),
        ]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, telegram: tgOk, email: emailOk }));
      } catch (err) {
        console.error('[server] Ошибка обработки /api/lead:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Внутренняя ошибка сервера' }));
      }
    });
    return;
  }

  // Healthcheck
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // Если dist существует, раздаем статические файлы сайта (SPA fallback)
  if (fs.existsSync(distDir)) {
    let filePath = path.join(distDir, req.url.split('?')[0]);
    if (filePath.endsWith(path.sep) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        ...(ext !== '.html' ? { 'Cache-Control': 'public, max-age=2592000' } : {}),
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CM-HOUSE Lead Server запущен на порту ${PORT}`);
  console.log(`📬 Telegram получатели: ${CHAT_IDS.join(', ')}`);
  console.log(`✉️ Email: ${NOTIFICATION_EMAIL}`);
});
