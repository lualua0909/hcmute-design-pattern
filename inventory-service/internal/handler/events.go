package handler

import (
	"encoding/json"
	"errors"
	"log"

	"github.com/pokeshop/inventory-service/internal/db"
	"github.com/pokeshop/inventory-service/internal/mq"
)

type orderCreated struct {
	OrderID string    `json:"orderId"`
	UserID  string    `json:"userId"`
	Items   []db.Item `json:"items"`
}

type orderCancelled struct {
	OrderID string `json:"orderId"`
	UserID  string `json:"userId"`
}

type productEvent struct {
	ProductID    int    `json:"productId"`
	SKU          string `json:"sku"`
	InitialStock *int   `json:"initialStock"`
	Stock        *int   `json:"stock"`
	Hard         bool   `json:"hard"`
}

type analyticsRecorded struct {
	OrderID string `json:"orderId"`
	UserID  string `json:"userId"`
}

// Events wires the message handlers to the repository and the broker.
type Events struct {
	Repo   *db.Repo
	Broker *mq.Broker
}

// Keys are the routing keys the Inventory Service subscribes to.
func (h *Events) Keys() []string {
	return []string{
		"order.created",
		"order.cancelled",
		"analytics.recorded",
		"product.created",
		"product.updated",
		"product.deleted",
	}
}

func (h *Events) Handle(event mq.Event) error {
	switch event.Type {
	case "order.created":
		return h.onOrderCreated(event)
	case "order.cancelled":
		return h.onOrderCancelled(event)
	case "analytics.recorded":
		return h.onAnalyticsRecorded(event)
	case "product.created", "product.updated":
		return h.onProductUpsert(event)
	case "product.deleted":
		return h.onProductDeleted(event)
	default:
		log.Printf("[handler] ignoring %s", event.Type)
		return nil
	}
}

// onOrderCreated is saga step 1: hold stock, then tell the world which way it went.
func (h *Events) onOrderCreated(event mq.Event) error {
	var payload orderCreated
	if err := json.Unmarshal(event.Data, &payload); err != nil {
		return err
	}

	err := h.Repo.Reserve(payload.OrderID, payload.Items)
	if err != nil {
		if errors.Is(err, db.ErrInsufficient) {
			// Business rejection - publish and ack, retrying would not help.
			return h.Broker.Publish("inventory.failed", payload.OrderID, map[string]any{
				"orderId": payload.OrderID,
				"userId":  payload.UserID,
				"step":    "inventory",
				"status":  "failed",
				"reason":  err.Error(),
			})
		}
		return err // infrastructure error - nack
	}

	return h.Broker.Publish("inventory.reserved", payload.OrderID, map[string]any{
		"orderId": payload.OrderID,
		"userId":  payload.UserID,
		"step":    "inventory",
		"status":  "committed",
		"items":   payload.Items,
	})
}

// onAnalyticsRecorded is saga step 3: every prior step succeeded, burn the stock.
func (h *Events) onAnalyticsRecorded(event mq.Event) error {
	var payload analyticsRecorded
	if err := json.Unmarshal(event.Data, &payload); err != nil {
		return err
	}
	if err := h.Repo.Commit(payload.OrderID); err != nil {
		return err
	}
	return h.Broker.Publish("inventory.committed", payload.OrderID, map[string]any{
		"orderId": payload.OrderID,
		"userId":  payload.UserID,
		"step":    "inventory-commit",
		"status":  "committed",
	})
}

// onOrderCancelled is the compensating transaction.
func (h *Events) onOrderCancelled(event mq.Event) error {
	var payload orderCancelled
	if err := json.Unmarshal(event.Data, &payload); err != nil {
		return err
	}
	if err := h.Repo.Release(payload.OrderID); err != nil {
		return err
	}
	return h.Broker.Publish("inventory.released", payload.OrderID, map[string]any{
		"orderId": payload.OrderID,
		"userId":  payload.UserID,
		"step":    "inventory-release",
		"status":  "compensated",
	})
}

func (h *Events) onProductUpsert(event mq.Event) error {
	var payload productEvent
	if err := json.Unmarshal(event.Data, &payload); err != nil {
		return err
	}
	switch {
	case payload.InitialStock != nil:
		return h.Repo.EnsureStock(payload.ProductID, payload.SKU, *payload.InitialStock)
	case payload.Stock != nil:
		return h.Repo.SetStock(payload.ProductID, payload.SKU, *payload.Stock)
	default:
		return h.Repo.EnsureStock(payload.ProductID, payload.SKU, 0)
	}
}

func (h *Events) onProductDeleted(event mq.Event) error {
	var payload productEvent
	if err := json.Unmarshal(event.Data, &payload); err != nil {
		return err
	}
	if !payload.Hard {
		return nil // archived products keep their stock row
	}
	return h.Repo.DeleteStock(payload.ProductID)
}
