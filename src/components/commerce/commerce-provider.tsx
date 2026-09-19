"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductChannel } from "@/lib/types";

export interface CartLine {
  product: Product;
  quantity: number;
  channel: ProductChannel;
}

interface CommerceContextValue {
  cart: CartLine[];
  favoriteIds: string[];
  cartOpen: boolean;
  cartCount: number;
  favoritesCount: number;
  cartTotal: number;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, channel: ProductChannel, quantity?: number) => void;
  updateQuantity: (productId: string, channel: ProductChannel, quantity: number) => void;
  removeFromCart: (productId: string, channel: ProductChannel) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearCart: () => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  postalCode: string;
  setPostalCode: (code: string) => void;
  shippingCost: number;
}

const CommerceContext = createContext<CommerceContextValue | null>(null);
const cartKey = "mm-cart";
const favoritesKey = "mm-favorites";

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedCart = window.localStorage.getItem(cartKey);
        const storedFavorites = window.localStorage.getItem(favoritesKey);

        if (storedCart) {
          setCart(JSON.parse(storedCart) as CartLine[]);
        }

        if (storedFavorites) {
          setFavoriteIds(JSON.parse(storedFavorites) as string[]);
        }
      } finally {
        hydrated.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }

    window.localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }

    window.localStorage.setItem(favoritesKey, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const addToCart = useCallback(
    (product: Product, channel: ProductChannel, quantity = 1) => {
      setCart((current) => {
        const existing = current.find(
          (line) => line.product.id === product.id && line.channel === channel,
        );

        if (existing) {
          return current.map((line) =>
            line.product.id === product.id && line.channel === channel
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          );
        }

        return [...current, { product, quantity, channel }];
      });
      setCartOpen(true);
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, channel: ProductChannel, quantity: number) => {
      setCart((current) =>
        current
          .map((line) =>
            line.product.id === productId && line.channel === channel
              ? { ...line, quantity }
              : line,
          )
          .filter((line) => line.quantity > 0),
      );
    },
    [],
  );

  const removeFromCart = useCallback((productId: string, channel: ProductChannel) => {
    setCart((current) =>
      current.filter(
        (line) => !(line.product.id === productId && line.channel === channel),
      ),
    );
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }, []);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds],
  );

  const cartCount = cart.reduce((count, line) => count + line.quantity, 0);
  const favoritesCount = favoriteIds.length;
  const cartTotal = cart.reduce((sum, line) => {
    const price =
      line.channel === "wholesale"
        ? line.product.wholesalePrice
        : line.product.retailPrice;
    return sum + price * line.quantity;
  }, 0);

  // Dynamic shipping calculation based on postalCode and cartTotal
  useEffect(() => {
    if (!postalCode) {
      setShippingCost(0);
      return;
    }
    if (cartTotal > 120000 || cart.length === 0) {
      setShippingCost(0);
      return;
    }
    const cleanCode = postalCode.trim().toUpperCase();
    if (/^[1BC]/i.test(cleanCode)) {
      setShippingCost(4500);
    } else {
      setShippingCost(8500);
    }
  }, [postalCode, cartTotal, cart.length]);

  const value = useMemo(
    () => ({
      cart,
      favoriteIds,
      cartOpen,
      cartCount,
      favoritesCount,
      cartTotal,
      setCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      toggleFavorite,
      isFavorite,
      clearCart: () => setCart([]),
      selectedProduct,
      setSelectedProduct,
      postalCode,
      setPostalCode,
      shippingCost,
    }),
    [
      addToCart,
      cart,
      cartCount,
      cartOpen,
      cartTotal,
      favoriteIds,
      favoritesCount,
      isFavorite,
      removeFromCart,
      toggleFavorite,
      updateQuantity,
      selectedProduct,
      setSelectedProduct,
      postalCode,
      setPostalCode,
      shippingCost,
    ],
  );

  return (
    <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>
  );
}

export function useCommerce() {
  const context = useContext(CommerceContext);

  if (!context) {
    throw new Error("useCommerce debe usarse dentro de CommerceProvider.");
  }

  return context;
}
