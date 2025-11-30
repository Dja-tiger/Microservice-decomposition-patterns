# Part B: Выделение сервиса диалогов

Этот практика продолжает Часть A. Но теперь монолит превратился в фасад, а логика диалогов живёт в chat-service.

Запуск

$ docker compose up --build
# монолит доступен: http://127.0.0.1:8080
# chat-service (внутренний): http://chat-service:8081 (но только внутри сети compose)

Проверка (Postman)
1) Используйте ту же коллекцию из Части A
2) Прогоните сценарий через монолит (legacy):
   - GET '/health'
   - POST '/user/register' (Alice)
   - POST '/user/register' (Bob) - скопируйте токены в env ('token_alice', 'token_bob')
   - POST '/dialog/{bob_id}/send' (от Alice, через монолит)
   - GET  '/dialog/{alice_id}/list' (от Bob, через монолит)
3) Посмотрите логи в двух контейнерах - 'x-request-id' должен быть одинаковый:

$ docker logs monolith-facade --tail=50
$ docker logs chat-service --tail=50


Что изменилось?:
- Монолит больше не хранит сообщения и не реализует диалоговую логику
- Роуты '/dialog/*' в монолите - это прокси в 'chat-service' (заголовок 'x-user-id' передаётся внутрь)
- 'chat-service' не проверяет токены - он доверяет монолиту (принимает 'x-user-id')

Полезно:
- можно сделать прямые вызовы в chat-service: задайте 'baseUrl' отдельно (внутри сети compose), но по умолчанию используйте монолит - это и будет проверкой обратной совместимости
- Если хотите еще более усложнить себе задание: добавьте в 'chat-service' поддержку 'Idempotency-Key' для 'POST /dialog/*/send'
