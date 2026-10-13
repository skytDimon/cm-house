import pytest
from httpx import ASGITransport, AsyncClient
from backend.main import app, ContactForm


@pytest.fixture
def sample_form_data():
    """Фикстура с валидными данными заявки."""
    return {
        "name": "Иван Иванов",
        "phone": "+7 (999) 123-45-67",
        "interest": "Модульные бани",
        "comment": "Интересует баня 6х2.5 с доставкой",
    }


@pytest.fixture
def sample_contact_form(sample_form_data):
    """Фикстура Pydantic модели ContactForm."""
    return ContactForm(**sample_form_data)


@pytest.fixture
async def async_client():
    """Фикстура асинхронного HTTP-клиента для тестирования эндпоинтов FastAPI."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
