FROM golang:1.24-alpine AS build
ARG GOPROXY
ARG GOSUMDB
ENV GOPROXY=${GOPROXY}
ENV GOSUMDB=${GOSUMDB}
WORKDIR /src
COPY go.work ./
COPY services/user-service/go.mod services/user-service/go.sum ./services/user-service/
COPY common/go.mod common/go.sum ./common/
WORKDIR /src/services/user-service
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
WORKDIR /src
COPY services/user-service ./services/user-service
COPY common ./common
WORKDIR /src/services/user-service

RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/user-service ./cmd/server

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /
COPY --from=build /out/user-service /user-service
USER app
EXPOSE 8081
ENTRYPOINT ["/user-service"]
