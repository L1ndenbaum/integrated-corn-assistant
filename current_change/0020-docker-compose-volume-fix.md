# docker-compose volume fix

- Move `auth-service` back under `services` (it was mistakenly nested under `volumes`).
- Keep `avatars_data` as a named volume for avatar persistence.
