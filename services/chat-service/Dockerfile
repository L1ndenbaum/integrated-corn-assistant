FROM golang:1.24-alpine AS build

WORKDIR /src
COPY go.work ./
COPY services/chat-service/go.mod services/chat-service/go.sum ./services/chat-service/
COPY common/go.mod common/go.sum ./common/
WORKDIR /src/services/chat-service
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
WORKDIR /src
COPY services/chat-service ./services/chat-service
COPY common ./common
WORKDIR /src/services/chat-service

RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/chat-service ./cmd/server

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /
COPY --from=build /out/chat-service /chat-service
USER app
EXPOSE 8083
ENTRYPOINT ["/chat-service"]
