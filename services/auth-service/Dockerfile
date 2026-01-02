FROM golang:1.24-alpine AS build
ARG GOPROXY
ARG GOSUMDB
ENV GOPROXY=${GOPROXY}
ENV GOSUMDB=${GOSUMDB}
WORKDIR /src
COPY go.work ./
COPY services/auth-service/go.mod services/auth-service/go.sum ./services/auth-service/
COPY common/go.mod common/go.sum ./common/
WORKDIR /src/services/auth-service
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
WORKDIR /src
COPY services/auth-service ./services/auth-service
COPY common ./common
WORKDIR /src/services/auth-service

RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/auth-service ./cmd/server

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /
COPY --from=build /out/auth-service /auth-service
USER app
EXPOSE 8082
ENTRYPOINT ["/auth-service"]
