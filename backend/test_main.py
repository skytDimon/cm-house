import pytest
from unittest.mock import patch, AsyncMock
from pydantic import ValidationError
from backend.main import (
    ContactForm,
    send_telegram_notification,
    send_email_notification,
)


# -----------------------------------------------------------------------------
# 1. Pydantic Model Tests (ContactForm)
# -----------------------------------------------------------------------------

def test_contact_form_valid(sample_form_data):
    """Проверка создания ContactForm с валидными данными."""
    form = ContactForm(**sample_form_data)
    assert form.name == "Иван Иванов"
    assert form.phone == "+7 (999) 123-45-67"
    assert form.interest == "Модульные бани"
    assert form.comment == "Интересует баня 6х2.5 с доставкой"


def test_contact_form_defaults():
    """Проверка значений по умолчанию для interest и comment."""
    form = ContactForm(name="Сергей", phone="+79990001122")
    assert form.interest == ""
    assert form.comment == ""


@pytest.mark.parametrize("missing_field", ["name", "phone"])
def test_contact_form_missing_required_fields(missing_field, sample_form_data):
    """Проверка валидации обязательных полей."""
    data = sample_form_data.copy()
    del data[missing_field]
    with pytest.raises(ValidationError):
        ContactForm(**data)


# -----------------------------------------------------------------------------
# 2. FastAPI Endpoints Integration Tests
# -----------------------------------------------------------------------------

async def test_health_endpoint(async_client):
    """Проверка эндпоинта проверки работоспособности /api/health."""
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("backend.main.send_telegram_notification", new_callable=AsyncMock)
@patch("backend.main.send_email_notification", new_callable=AsyncMock)
async def test_submit_contact_success(mock_email, mock_tg, async_client, sample_form_data):
    """Проверка успешной отправки заявки через POST /api/contact."""
    response = await async_client.post("/api/contact", json=sample_form_data)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Заявка принята" in data["message"]


async def test_submit_contact_validation_error(async_client):
    """Проверка ответа 422 при некорректных данных формы."""
    response = await async_client.post("/api/contact", json={"interest": "Баня"})
    assert response.status_code == 422


# -----------------------------------------------------------------------------
# 3. Telegram Notification Service Tests
# -----------------------------------------------------------------------------

@patch("backend.main.TELEGRAM_BOT_TOKEN", None)
async def test_telegram_notification_no_token(sample_contact_form):
    """Если токен бота не задан, отправка не выполняется."""
    with patch("httpx.AsyncClient") as mock_client:
        await send_telegram_notification(sample_contact_form)
        mock_client.assert_not_called()


@patch("backend.main.TELEGRAM_BOT_TOKEN", "123:TOKEN")
@patch("backend.main.TELEGRAM_CHAT_IDS", "")
async def test_telegram_notification_no_chat_ids(sample_contact_form):
    """Если чаты не заданы, отправка не выполняется."""
    with patch("httpx.AsyncClient") as mock_client:
        await send_telegram_notification(sample_contact_form)
        mock_client.assert_not_called()


@patch("backend.main.TELEGRAM_BOT_TOKEN", "123:TOKEN")
@patch("backend.main.TELEGRAM_CHAT_IDS", "1001, 1002")
@patch("backend.main.TELEGRAM_PROXY", None)
async def test_telegram_notification_multiple_recipients():
    """Проверка успешной отправки сообщения нескольким получателям с экранированием HTML."""
    form = ContactForm(
        name="<Script>Alert</Script>",
        phone="+7 999 000-00-00",
        interest="Дом & Баня",
        comment="<test>"
    )

    mock_client = AsyncMock()
    mock_client.post.return_value.status_code = 200
    mock_client.post.return_value.text = '{"ok": true}'

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        await send_telegram_notification(form)

        # Должен быть вызван 2 раза (для чата 1001 и 1002)
        assert mock_client.post.call_count == 2
        first_call = mock_client.post.call_args_list[0]
        json_data = first_call.kwargs["json"]
        assert json_data["chat_id"] == "1001"
        assert json_data["parse_mode"] == "HTML"
        # HTML-символы должны быть безопасно экранированы
        assert "&lt;Script&gt;" in json_data["text"]
        assert "Дом &amp; Баня" in json_data["text"]


@patch("backend.main.TELEGRAM_BOT_TOKEN", "123:TOKEN")
@patch("backend.main.TELEGRAM_CHAT_IDS", "1001")
@patch("backend.main.TELEGRAM_PROXY", "socks5://proxy.example.com:1080")
async def test_telegram_notification_with_proxy(sample_contact_form):
    """Проверка использования прокси при отправке в Telegram."""
    mock_client = AsyncMock()
    mock_client.post.return_value.status_code = 200
    mock_client.post.return_value.text = '{"ok": true}'

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        await send_telegram_notification(sample_contact_form)

        mock_client_cls.assert_called_with(timeout=15.0, proxy="socks5://proxy.example.com:1080")


@patch("backend.main.TELEGRAM_BOT_TOKEN", "123:TOKEN")
@patch("backend.main.TELEGRAM_CHAT_IDS", "1001")
async def test_telegram_notification_error_handled(sample_contact_form):
    """Исключения при сетевых ошибках Telegram должны безопасно перехватываться."""
    mock_client = AsyncMock()
    mock_client.post.side_effect = Exception("Telegram connection timeout")

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        # Не должно вызывать исключений
        await send_telegram_notification(sample_contact_form)


# -----------------------------------------------------------------------------
# 4. Email Notification Service Tests
# -----------------------------------------------------------------------------

@patch("backend.main.NOTIFICATION_EMAIL", "")
async def test_email_notification_no_email(sample_contact_form):
    """Если email не настроен, отправка не выполняется."""
    with patch("httpx.AsyncClient") as mock_client:
        await send_email_notification(sample_contact_form)
        mock_client.assert_not_called()


@patch("backend.main.NOTIFICATION_EMAIL", "cmhouse@example.com")
@patch("backend.main.TELEGRAM_PROXY", "socks5://proxy.example.com:1080")
async def test_email_notification_success(sample_contact_form):
    """Проверка успешной отправки заявки на почту с прокси."""
    mock_client = AsyncMock()
    mock_client.post.return_value.status_code = 200
    mock_client.post.return_value.text = '{"success": "true"}'

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        await send_email_notification(sample_contact_form)

        mock_client_cls.assert_called_with(timeout=15.0, proxy="socks5://proxy.example.com:1080")
        assert mock_client.post.call_count == 1
        call_args = mock_client.post.call_args
        assert "cmhouse@example.com" in call_args.args[0]
        payload = call_args.kwargs["json"]
        assert payload["Имя"] == sample_contact_form.name
        assert payload["Телефон"] == sample_contact_form.phone


@patch("backend.main.NOTIFICATION_EMAIL", "cmhouse@example.com")
async def test_email_notification_error_handled(sample_contact_form):
    """Исключения при отправке email должны безопасно перехватываться."""
    mock_client = AsyncMock()
    mock_client.post.side_effect = Exception("SMTP timeout error")

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        # Не должно вызывать необработанных исключений
        await send_email_notification(sample_contact_form)
