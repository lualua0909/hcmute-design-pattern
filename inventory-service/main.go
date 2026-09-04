package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/pokeshop/inventory-service/internal/db"
	"github.com/pokeshop/inventory-service/internal/handler"
	"github.com/pokeshop/inventory-service/internal/mq"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		log.Fatal("MYSQL_DSN is required")
	}

	conn, err := db.Open(dsn)
	if err != nil {
		log.Fatalf("mysql: %v", err)
	}
	defer conn.Close()
	repo := db.NewRepo(conn)
	log.Println("[db] connected")

	broker, err := mq.Connect(
		os.Getenv("RABBITMQ_URL"),
		env("RABBITMQ_EXCHANGE", "pokeshop.events"),
		"inventory-service",
	)
	if err != nil {
		log.Fatalf("rabbitmq: %v", err)
	}
	defer broker.Close()

	events := &handler.Events{Repo: repo, Broker: broker}
	if err := broker.Consume(env("RABBITMQ_QUEUE", "inventory.commands"), events.Keys(), events.Handle); err != nil {
		log.Fatalf("consume: %v", err)
	}

	// A dropped AMQP connection means missed saga steps - fail fast and let
	// the container restart policy reconnect us.
	go func() {
		if err := <-broker.NotifyClose(); err != nil {
			log.Fatalf("[mq] connection lost: %v", err)
		}
	}()

	server := &http.Server{
		Addr:              ":" + env("PORT", "9000"),
		Handler:           (&handler.HTTP{Repo: repo}).Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("[http] listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	log.Println("[inventory] stopped")
}
