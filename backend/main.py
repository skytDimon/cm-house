import html
import os
from datetime import datetime
import httpx
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_IDS = os.getenv("TELEGRAM_CHAT_IDS", "")
TELEGRAM_PROXY = os.getenv("TELEGRAM_PROXY")
TELEGRAM_API_URL = os.getenv("TELEGRAM_API_URL", "https://api.telegram.org")
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "cmhouse2005@mail.ru")

app = FastAPI(
    title="CM-HOUSE API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContactForm(BaseModel):
    name: str
    phone: str
    interest: str = ""
    comment: str = ""


async def send_telegram_notification(form: ContactForm):
    print(f"DEBUG: Starting telegram sending for {form.name}...")
    if not TELEGRAM_BOT_TOKEN:
        print("DEBUG: NO TELEGRAM_BOT_TOKEN configured")
        return

    chat_ids = [chat_id.strip() for chat_id in TELEGRAM_CHAT_IDS.split(",") if chat_id.strip()]
    print(f"DEBUG: Found chat_ids: {chat_ids}")
    if not chat_ids:
        print("DEBUG: NO TELEGRAM_CHAT_IDS configured")
        return

    now_str = datetime.now().strftime("%d.%m.%Y %H:%M")
    text = (
        "🏡 <b>Новая заявка с сайта CM-HOUSE!</b>\n\n"
        f"👤 <b>Имя:</b> {html.escape(form.name)}\n"
        f"📞 <b>Телефон:</b> {html.escape(form.phone)}\n"
        f"🎯 <b>Интересует:</b> {html.escape(form.interest or 'Не указано')}\n"
        f"💬 <b>Комментарий:</b> {html.escape(form.comment or '—')}\n\n"
        f"⏱ <i>{now_str} (Екб)</i>"
    )

    url = f"{TELEGRAM_API_URL}/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    client_options = {"timeout": 15.0}
    if TELEGRAM_PROXY:
        client_options["proxy"] = TELEGRAM_PROXY
        print(f"DEBUG: Using telegram proxy {TELEGRAM_PROXY}")

    async with httpx.AsyncClient(**client_options) as client:
        for chat_id in chat_ids:
            try:
                response = await client.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                )
                print(f"Telegram sent to {chat_id}, status: {response.status_code}, response: {response.text}")
            except Exception as e:
                print(f"Failed to send telegram to {chat_id}: {e}")

    print("DEBUG: Finished processing all telegram chat_ids")


async def send_email_notification(form: ContactForm):
    if not NOTIFICATION_EMAIL:
        return

    now_str = datetime.now().strftime("%d.%m.%Y %H:%M")
    email_body = {
        "_subject": f"Новая заявка с сайта CM-HOUSE: {form.name} ({form.phone})",
        "_template": "table",
        "_captcha": "false",
        "Имя": form.name,
        "Телефон": form.phone,
        "Что интересует": form.interest or "Не указано",
        "Комментарий": form.comment or "—",
        "Дата и время": f"{now_str} (Екб)",
    }

    client_options = {"timeout": 15.0}
    if TELEGRAM_PROXY:
        client_options["proxy"] = TELEGRAM_PROXY

    try:
        async with httpx.AsyncClient(**client_options) as client:
            resp = await client.post(
                f"https://formsubmit.co/ajax/{NOTIFICATION_EMAIL}",
                json=email_body,
                headers={"Accept": "application/json", "Referer": "https://cm-house.ru"},
            )
            print(f"Email sent to {NOTIFICATION_EMAIL}, status: {resp.status_code}, response: {resp.text}")
    except Exception as e:
        print(f"Failed to send email to {NOTIFICATION_EMAIL}: {e}")


@app.post("/api/contact")
async def submit_contact(form: ContactForm, background_tasks: BackgroundTasks):
    print(f"[ЗАЯВКА] {form.name} | {form.phone} | {form.interest}")
    background_tasks.add_task(send_telegram_notification, form)
    background_tasks.add_task(send_email_notification, form)
    return {"status": "ok", "message": "Заявка принята. Мы свяжемся с вами в ближайшее время."}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
