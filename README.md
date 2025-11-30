# Microservice-decomposition-patterns

Учебный пример декомпозиции чата на микросервисы. Репозиторий содержит:

- `docs/` — описание пользовательских сценариев, границ сервисов и контракты взаимодействия.
- `monolith-example/` — исходный монолит, от которого мы отталкиваемся.
- `part-b-chat-extraction/` — промежуточная работа по вынесению функциональности чата.
- `services/` — минимальные реализации сервисов **identity**, **auth**, **chat**, **notification** (Node.js + Express).
- `gateway/` — API Gateway, проксирующий публичные запросы к сервисам.
- `homework_file/` – материалы по домашнему заданию
- `docker-compose.yml` — оркестрация для локального подъёма всех сервисов.

## Быстрый старт (docker-compose)

1. Соберите и запустите стек:

   ```bash
   docker compose up --build
   ```

2. Зарегистрируйте пользователя и получите токен:

   ```bash
   curl -X POST http://localhost:8000/api/v1/user/register \
     -H "Content-Type: application/json" \
     -d '{"name": "alice"}'
   ```

3. Отправьте сообщение с использованием токена:

   ```bash
   TOKEN="user:1"
   curl -X POST http://localhost:8000/api/v1/dialog/2/send \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ${TOKEN}" \
     -d '{"text": "hello from alice"}'
   ```

4. Посмотрите историю диалога:

   ```bash
   curl -X GET "http://localhost:8000/api/v1/dialog/2/list" \
     -H "Authorization: Bearer ${TOKEN}"
   ```

Логи `notification-service` покажут события доставки, что помогает убедиться в корректности декомпозиции и интеграции сервисов.
