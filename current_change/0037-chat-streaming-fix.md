# Chat streaming fixes

- Disable proxy buffering for /api/v1/chat/messages in Nginx.
- Add X-Accel-Buffering header in chat-service response.
- Set reverse proxy FlushInterval in api-gateway.
