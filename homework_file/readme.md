## Проверка реализации микросервисной декомпозиции

Для подтверждения работоспособности выбранной архитектуры был реализован прототип из пяти сервисов,
поднимаемых через `docker compose`:

- `api-gateway` — единая точка входа для клиента;
- `identity-service` — управление пользователями;
- `auth-service` — выдача и валидация bearer-токенов;
- `chat-service` — хранение и выдача сообщений;
- `notification-service` — обработка событий о новых сообщениях.

Запуск:

```bash
docker compose up --build



Регистрация пользователя и получение токена:

```
curl -X POST http://localhost:8000/api/v1/user/register \
  -H "Content-Type: application/json" \
  -d '{"name": "alice"}'
```

Отправка сообщения через api-gateway с авторизацией:

```
TOKEN="user:1"
curl -X POST http://localhost:8000/api/v1/dialog/2/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"text": "hello from alice"}'
```

Чтение истории диалога:

```
curl -X GET "http://localhost:8000/api/v1/dialog/2/list" \
  -H "Authorization: Bearer ${TOKEN}"
```
