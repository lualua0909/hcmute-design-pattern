package mq

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Event is the envelope every SportHub service publishes and consumes.
type Event struct {
	EventID       string          `json:"eventId"`
	Type          string          `json:"type"`
	Source        string          `json:"source"`
	OccurredAt    string          `json:"occurredAt"`
	CorrelationID string          `json:"correlationId"`
	Data          json.RawMessage `json:"data"`
}

type Broker struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	exchange string
	source   string
}

func Connect(url, exchange, source string) (*Broker, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("dial rabbitmq: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("open channel: %w", err)
	}
	if err := ch.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		return nil, fmt.Errorf("declare exchange: %w", err)
	}
	if err := ch.Qos(10, 0, false); err != nil {
		return nil, err
	}
	return &Broker{conn: conn, channel: ch, exchange: exchange, source: source}, nil
}

func (b *Broker) Close() {
	if b.channel != nil {
		_ = b.channel.Close()
	}
	if b.conn != nil {
		_ = b.conn.Close()
	}
}

// Publish emits a domain event on the shared topic exchange.
func (b *Broker) Publish(routingKey, correlationID string, data any) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}
	event := Event{
		EventID:       fmt.Sprintf("%s-%d", routingKey, time.Now().UnixNano()),
		Type:          routingKey,
		Source:        b.source,
		OccurredAt:    time.Now().UTC().Format(time.RFC3339),
		CorrelationID: correlationID,
		Data:          payload,
	}
	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = b.channel.PublishWithContext(ctx, b.exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    event.EventID,
		Body:         body,
	})
	if err == nil {
		log.Printf("[mq] published %s %s", routingKey, correlationID)
	}
	return err
}

// Consume binds a durable queue to the given routing keys and dispatches to handler.
// Returning an error from handler nacks the message without requeue (poison-safe).
func (b *Broker) Consume(queue string, keys []string, handler func(Event) error) error {
	q, err := b.channel.QueueDeclare(queue, true, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("declare queue: %w", err)
	}
	for _, key := range keys {
		if err := b.channel.QueueBind(q.Name, key, b.exchange, false, nil); err != nil {
			return fmt.Errorf("bind %s: %w", key, err)
		}
	}

	deliveries, err := b.channel.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	go func() {
		for d := range deliveries {
			var event Event
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("[mq] bad payload: %v", err)
				_ = d.Nack(false, false)
				continue
			}
			if err := handler(event); err != nil {
				log.Printf("[mq] handler %s failed: %v", event.Type, err)
				_ = d.Nack(false, false)
				continue
			}
			_ = d.Ack(false)
		}
		log.Println("[mq] delivery channel closed")
	}()

	log.Printf("[mq] consuming %s keys=%v", q.Name, keys)
	return nil
}

// NotifyClose exposes the underlying connection close notifications.
func (b *Broker) NotifyClose() chan *amqp.Error {
	return b.conn.NotifyClose(make(chan *amqp.Error, 1))
}
