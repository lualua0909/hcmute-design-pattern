# ---- Inventory Service (Go 1.23) ----
FROM golang:1.23-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod ./
COPY main.go ./
COPY internal ./internal
# go.sum is generated here so the repo stays lock-file free for the course project.
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/inventory .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/inventory ./inventory
USER app
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:9000/health || exit 1
ENTRYPOINT ["./inventory"]
