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
import {
  calculateShipping,
  type ShippingCalculation,
  type ShippingOption,
} from "@/lib/shipping";
import { trackAdsEvent } from "@/lib/analytics";

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
  shippingCalculation: ShippingCalculation;
  selectedShippingOptionId: string;
  setSelectedShippingOptionId: (id: string) => void;
  selectedShippingOption: ShippingOption | null;
}

const CommerceContext = createContext<CommerceContextValue | null>(null);
const cartKey = "mm-cart";
const favoritesKey = "mm-favorites";
const postalCodeKey = "mya_postal_code";
const shippingOptionKey = "mya_shipping_option";

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [postalCode, setPostalCodeState] = useState("");
  const [selectedShippingOptionId, setSelectedShippingOptionIdState] = useState("correo_domicilio");
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedCart = window.localStorage.getItem(cartKey);
        const storedFavorites = window.localStorage.getItem(favoritesKey);
        const storedPostalCode = window.localStorage.getItem(postalCodeKey);
        const storedShippingOption = window.localStorage.getItem(shippingOptionKey);

        if (storedCart) {
          setCart(JSON.parse(storedCart) as CartLine[]);
        }

        if (storedFavorites) {
          setFavoriteIds(JSON.parse(storedFavorites) as string[]);
        }

        if (storedPostalCode) {
          setPostalCodeState(storedPostalCode);
        }

        if (storedShippingOption) {
          setSelectedShippingOptionIdState(storedShippingOption);
        }
      } finally {
        hydrated.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setPostalCode = useCallback((code: string) => {
    setPostalCodeState(code);
    try {
      if (code) {
        window.localStorage.setItem(postalCodeKey, code);
      } else {
        window.localStorage.removeItem(postalCodeKey);
      }
    } catch {}
  }, []);

  const setSelectedShippingOptionId = useCallback((id: string) => {
    setSelectedShippingOptionIdState(id);
    try {
      if (id) {
        window.localStorage.setItem(shippingOptionKey, id);
      }
    } catch {}
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

      // Track AddToCart conversion event
      trackAdsEvent("AddToCart", {
        content_name: product.title,
        content_ids: [product.id],
        value: (channel === "wholesale" ? product.wholesalePrice : product.retailPrice) * quantity,
        quantity,
      });
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
  const shippingCalculation = useMemo(() => {
    return calculateShipping(postalCode, cartTotal);
  }, [postalCode, cartTotal]);

  const selectedShippingOption = useMemo(() => {
    if (!shippingCalculation.isValid || shippingCalculation.options.length === 0) return null;
    return (
      shippingCalculation.options.find((opt) => opt.id === selectedShippingOptionId) ||
      shippingCalculation.options[0]
    );
  }, [shippingCalculation, selectedShippingOptionId]);

  const shippingCost = selectedShippingOption ? selectedShippingOption.price : 0;

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
      shippingCalculation,
      selectedShippingOptionId,
      setSelectedShippingOptionId,
      selectedShippingOption,
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
      shippingCalculation,
      selectedShippingOptionId,
      setSelectedShippingOptionId,
      selectedShippingOption,
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
