package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/pokeshop/inventory-service/internal/db"
)

// HTTP exposes the read model plus a manual restock hook, called only by the gateway.
type HTTP struct {
	Repo *db.Repo
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func (h *HTTP) Routes() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		status := "ok"
		if err := h.Repo.DB.Ping(); err != nil {
			status = "degraded"
		}
		code := http.StatusOK
		if status != "ok" {
			code = http.StatusServiceUnavailable
		}
		writeJSON(w, code, map[string]string{"service": "inventory-service", "status": status})
	})

	mux.HandleFunc("GET /stock", func(w http.ResponseWriter, r *http.Request) {
		list, err := h.Repo.ListStock()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, list)
	})

	mux.HandleFunc("GET /stock/{productId}", func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.Atoi(r.PathValue("productId"))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "productId must be numeric"})
			return
		}
		stock, err := h.Repo.GetStock(id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, stock)
	})

	mux.HandleFunc("POST /restock", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			ProductID int    `json:"productId"`
			SKU       string `json:"sku"`
			Quantity  int    `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
			return
		}
		if body.ProductID <= 0 || body.Quantity == 0 || strings.TrimSpace(body.SKU) == "" {
			writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"message": "productId, sku and quantity are required"})
			return
		}
		if err := h.Repo.EnsureStock(body.ProductID, body.SKU, body.Quantity); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		stock, _ := h.Repo.GetStock(body.ProductID)
		writeJSON(w, http.StatusOK, stock)
	})

	mux.HandleFunc("GET /movements", func(w http.ResponseWriter, r *http.Request) {
		limit := 50
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
				limit = n
			}
		}
		list, err := h.Repo.ListMovements(limit)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, list)
	})

	return mux
}
