FROM golang:1.24-alpine AS build

WORKDIR /src
COPY services/weather-service/go.mod services/weather-service/go.sum ./services/weather-service/
COPY common/go.mod common/go.sum ./common/
WORKDIR /src/services/weather-service
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
WORKDIR /src
COPY services/weather-service ./services/weather-service
COPY common ./common
WORKDIR /src/services/weather-service

RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/weather-service ./cmd/server

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /
COPY --from=build /out/weather-service /weather-service
USER app
EXPOSE 8084
ENTRYPOINT ["/weather-service"]
