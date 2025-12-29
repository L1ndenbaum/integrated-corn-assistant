FROM golang:1.24-alpine AS build
ARG GOPROXY
ARG GOSUMDB
ENV GOPROXY=${GOPROXY}
ENV GOSUMDB=${GOSUMDB}
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/static-server ./app.go

FROM alpine:3.20
RUN adduser -D -H -u 10001 app && apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /out/static-server /app/static-server
COPY --from=build /src/static /app/static
RUN mkdir -p /app/avatars && chown -R app:app /app/avatars
USER app
EXPOSE 8086
ENTRYPOINT ["/app/static-server"]
