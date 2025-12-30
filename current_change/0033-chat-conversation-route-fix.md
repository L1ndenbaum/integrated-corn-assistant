# Chat conversation route fix

- Avoid Gin wildcard conflict by moving conversation list to /api/v1/chat/conversations/user/:username.
- Update frontend chat list calls to new route.
- Force Gin release mode in chat-service.
