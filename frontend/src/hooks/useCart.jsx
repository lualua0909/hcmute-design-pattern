import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const CartContext = createContext(null);
const STORAGE_KEY = 'pokeshop.cart';

/** Cart lives in localStorage only - the server is the authority on stock. */
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => ({
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    add(product, quantity = 1) {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i));
        }
        return [...prev, {
          productId: product.id, sku: product.sku, name: product.name,
          price: product.price, imageUrl: product.imageUrl, quantity,
        }];
      });
      toast.success(`${product.name} added to cart`);
    },
    setQuantity(productId, quantity) {
      setItems((prev) => (quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))));
    },
    remove(productId) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    },
    clear() {
      setItems([]);
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
