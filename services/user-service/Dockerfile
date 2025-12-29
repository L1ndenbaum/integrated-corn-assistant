FROM golang:1.22-alpine AS build

WORKDIR /src
COPY user-service/go.mod user-service/go.sum ./user-service/
COPY common/go.mod common/go.sum ./common/
WORKDIR /src/user-service
RUN go mod download
WORKDIR /src
COPY . .
WORKDIR /src/user-service

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/user-service ./cmd/server

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /
COPY --from=build /out/user-service /user-service
USER app
EXPOSE 8081
ENTRYPOINT ["/user-service"]
