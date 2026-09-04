package db

import (
	"database/sql"
	"errors"
	"fmt"
)

// ErrInsufficient is returned when a reservation cannot be satisfied.
var ErrInsufficient = errors.New("insufficient stock")

type Item struct {
	ProductID int     `json:"productId"`
	SKU       string  `json:"sku"`
	Name      string  `json:"name"`
	UnitPrice float64 `json:"unitPrice"`
	Quantity  int     `json:"quantity"`
}

type Stock struct {
	ProductID int    `json:"productId"`
	SKU       string `json:"sku"`
	OnHand    int    `json:"onHand"`
	Reserved  int    `json:"reserved"`
	Available int    `json:"available"`
	UpdatedAt string `json:"updatedAt"`
}

type Movement struct {
	ID        int64  `json:"id"`
	ProductID int    `json:"productId"`
	OrderID   string `json:"orderId"`
	Kind      string `json:"kind"`
	Quantity  int    `json:"quantity"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
}

type Repo struct{ DB *sql.DB }

func NewRepo(conn *sql.DB) *Repo { return &Repo{DB: conn} }

// Reserve holds stock for a whole order atomically: either every line is held
// or the transaction rolls back. Re-delivered messages are absorbed by the
// (order_id, product_id) primary key on inv_reservations.
func (r *Repo) Reserve(orderID string, items []Item) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed

	for _, it := range items {
		var already int
		err := tx.QueryRow(
			`SELECT COUNT(*) FROM inv_reservations WHERE order_id = ? AND product_id = ?`,
			orderID, it.ProductID,
		).Scan(&already)
		if err != nil {
			return err
		}
		if already > 0 {
			continue // idempotent replay
		}

		var onHand, reserved int
		err = tx.QueryRow(
			`SELECT on_hand, reserved FROM inv_stock WHERE product_id = ? FOR UPDATE`,
			it.ProductID,
		).Scan(&onHand, &reserved)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: product %d has no stock record", ErrInsufficient, it.ProductID)
		}
		if err != nil {
			return err
		}

		if onHand-reserved < it.Quantity {
			return fmt.Errorf("%w: product %d wants %d, available %d",
				ErrInsufficient, it.ProductID, it.Quantity, onHand-reserved)
		}

		if _, err := tx.Exec(
			`UPDATE inv_stock SET reserved = reserved + ? WHERE product_id = ?`,
			it.Quantity, it.ProductID,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO inv_reservations (order_id, product_id, quantity, state) VALUES (?, ?, ?, 'held')`,
			orderID, it.ProductID, it.Quantity,
		); err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO inv_movements (product_id, order_id, kind, quantity, note)
			 VALUES (?, ?, 'reserve', ?, 'saga reserve')`,
			it.ProductID, orderID, it.Quantity,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// Commit converts held reservations into a real stock decrement.
func (r *Repo) Commit(orderID string) error {
	return r.finish(orderID, "committed")
}

// Release is the compensating action for a cancelled or failed order.
func (r *Repo) Release(orderID string) error {
	return r.finish(orderID, "released")
}

func (r *Repo) finish(orderID, target string) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	rows, err := tx.Query(
		`SELECT product_id, quantity FROM inv_reservations WHERE order_id = ? AND state = 'held'`,
		orderID,
	)
	if err != nil {
		return err
	}
	type held struct {
		productID int
		quantity  int
	}
	var list []held
	for rows.Next() {
		var h held
		if err := rows.Scan(&h.productID, &h.quantity); err != nil {
			rows.Close()
			return err
		}
		list = append(list, h)
	}
	rows.Close()

	for _, h := range list {
		if target == "committed" {
			if _, err := tx.Exec(
				`UPDATE inv_stock SET on_hand = on_hand - ?, reserved = reserved - ? WHERE product_id = ?`,
				h.quantity, h.quantity, h.productID,
			); err != nil {
				return err
			}
		} else {
			if _, err := tx.Exec(
				`UPDATE inv_stock SET reserved = reserved - ? WHERE product_id = ?`,
				h.quantity, h.productID,
			); err != nil {
				return err
			}
		}

		kind := "commit"
		if target == "released" {
			kind = "release"
		}
		if _, err := tx.Exec(
			`INSERT INTO inv_movements (product_id, order_id, kind, quantity, note)
			 VALUES (?, ?, ?, ?, 'saga finish')`,
			h.productID, orderID, kind, h.quantity,
		); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(
		`UPDATE inv_reservations SET state = ? WHERE order_id = ? AND state = 'held'`,
		target, orderID,
	); err != nil {
		return err
	}
	return tx.Commit()
}

// EnsureStock creates or tops up the stock row for a product (CMS driven).
func (r *Repo) EnsureStock(productID int, sku string, quantity int) error {
	_, err := r.DB.Exec(
		`INSERT INTO inv_stock (product_id, sku, on_hand, reserved) VALUES (?, ?, ?, 0)
		 ON DUPLICATE KEY UPDATE sku = VALUES(sku), on_hand = on_hand + VALUES(on_hand)`,
		productID, sku, quantity,
	)
	if err != nil {
		return err
	}
	if quantity != 0 {
		_, err = r.DB.Exec(
			`INSERT INTO inv_movements (product_id, kind, quantity, note) VALUES (?, 'restock', ?, 'cms')`,
			productID, quantity,
		)
	}
	return err
}

// SetStock overwrites the absolute on-hand quantity.
func (r *Repo) SetStock(productID int, sku string, quantity int) error {
	_, err := r.DB.Exec(
		`INSERT INTO inv_stock (product_id, sku, on_hand, reserved) VALUES (?, ?, ?, 0)
		 ON DUPLICATE KEY UPDATE sku = VALUES(sku), on_hand = VALUES(on_hand)`,
		productID, sku, quantity,
	)
	if err != nil {
		return err
	}
	_, err = r.DB.Exec(
		`INSERT INTO inv_movements (product_id, kind, quantity, note) VALUES (?, 'adjust', ?, 'cms set')`,
		productID, quantity,
	)
	return err
}

func (r *Repo) DeleteStock(productID int) error {
	_, err := r.DB.Exec(`DELETE FROM inv_stock WHERE product_id = ?`, productID)
	return err
}

func (r *Repo) GetStock(productID int) (*Stock, error) {
	var s Stock
	err := r.DB.QueryRow(
		`SELECT product_id, sku, on_hand, reserved, updated_at FROM inv_stock WHERE product_id = ?`,
		productID,
	).Scan(&s.ProductID, &s.SKU, &s.OnHand, &s.Reserved, &s.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return &Stock{ProductID: productID}, nil
	}
	if err != nil {
		return nil, err
	}
	s.Available = s.OnHand - s.Reserved
	return &s, nil
}

func (r *Repo) ListStock() ([]Stock, error) {
	rows, err := r.DB.Query(
		`SELECT product_id, sku, on_hand, reserved, updated_at FROM inv_stock ORDER BY product_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Stock{}
	for rows.Next() {
		var s Stock
		if err := rows.Scan(&s.ProductID, &s.SKU, &s.OnHand, &s.Reserved, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.Available = s.OnHand - s.Reserved
		list = append(list, s)
	}
	return list, rows.Err()
}

func (r *Repo) ListMovements(limit int) ([]Movement, error) {
	rows, err := r.DB.Query(
		`SELECT id, product_id, COALESCE(order_id, ''), kind, quantity, COALESCE(note, ''), created_at
		   FROM inv_movements ORDER BY id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Movement{}
	for rows.Next() {
		var m Movement
		if err := rows.Scan(&m.ID, &m.ProductID, &m.OrderID, &m.Kind, &m.Quantity, &m.Note, &m.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}
