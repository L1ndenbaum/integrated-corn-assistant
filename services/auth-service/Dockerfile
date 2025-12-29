FROM golang:1.24-alpine AS build

WORKDIR /src
COPY auth-service/go.mod auth-service/go.sum ./auth-service/
WORKDIR /src/auth-service
RUN go mod download
WORKDIR /src
COPY . .
WORKDIR /src/auth-service

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/auth-service ./cmd/server

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /
COPY --from=build /out/auth-service /auth-service
USER app
EXPOSE 8082
ENTRYPOINT ["/auth-service"]
