Change log - 0001

Summary:
- Updated architecture doc to use per-service schemas with dedicated DB users.
- Added RabbitMQ as the inter-service async channel.
- Captured the new user table design decisions (UUIDv7 as BINARY(16), password_hash, MFA).

Notes:
- Schema name for user-service will be corn_assistant_user.
- API will expose UUIDv7 as CHAR(36).
