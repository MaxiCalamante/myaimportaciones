"use client";
import { useFavorites } from "./use-favorites";
import { WHOLESALE_ENABLED, isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";

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
  isProductImmediateStock,
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
  isAllImmediateStock: boolean;
  selectedShippingOptionId: string;
  setSelectedShippingOptionId: (id: string) => void;
  selectedShippingOption: ShippingOption | null;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  retailUnitsCount: number;
}

const CommerceContext = createContext<CommerceContextValue | null>(null);
const cartKey = "mm-cart";

const postalCodeKey = "mya_postal_code";
const shippingOptionKey = "mya_shipping_option";

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const { favoriteIds, toggleFavorite, favoriteError } = useFavorites();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [postalCode, setPostalCodeState] = useState("");
  const [selectedShippingOptionId, setSelectedShippingOptionIdState] = useState("correo_domicilio");
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedCart = window.localStorage.getItem(cartKey);

        const storedPostalCode = window.localStorage.getItem(postalCodeKey);
        const storedShippingOption = window.localStorage.getItem(shippingOptionKey);

        if (storedCart) {
          const parsed: unknown = JSON.parse(storedCart);
          if (Array.isArray(parsed)) setCart(parsed.filter((l: CartLine) => l?.product?.id && typeof l.product.title === "string" && Number.isFinite(l.product.retailPrice) && l.product.retailPrice > 0 && Number.isFinite(l.product.stock) && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 100 && (WHOLESALE_ENABLED || l.channel === "retail")));
        }

        if (storedPostalCode) {
          setPostalCodeState(storedPostalCode);
        }

        if (storedShippingOption) {
          setSelectedShippingOptionIdState(storedShippingOption);
        }
      } catch { /* Ignore malformed or unavailable browser storage. */ } finally {
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

    try { window.localStorage.setItem(cartKey, JSON.stringify(cart)); } catch {}
  }, [cart]);

  const addToCart = useCallback(
    (product: Product, channel: ProductChannel, quantity = 1) => {
      if ((!WHOLESALE_ENABLED && channel === "wholesale") || !isVerifiedStock(product) || !Number.isInteger(quantity) || quantity < 1) return;
      setCart((current) => {
        const existing = current.find(
          (line) => line.product.id === product.id && line.channel === channel,
        );

        if (existing) {
          return current.map((line) =>
            line.product.id === product.id && line.channel === channel
              ? { ...line, quantity: Math.min(purchasableQuantity(product), line.quantity + quantity) }
              : line,
          );
        }

        return [...current, { product, quantity: Math.min(purchasableQuantity(product), quantity), channel }];
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
              ? { ...line, quantity: Number.isInteger(quantity) ? Math.min(purchasableQuantity(line.product), Math.max(0, quantity)) : line.quantity }
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

  // Check if all items in cart are in physical immediate stock in Tandil
  const isAllImmediateStock = useMemo(() => {
    return cart.length > 0 && cart.every((line) => isProductImmediateStock(line.product));
  }, [cart]);

  // Dynamic shipping calculation based on postalCode, cartTotal, and isAllImmediateStock
  const shippingCalculation = useMemo(() => {
    return calculateShipping(postalCode, cartTotal, isAllImmediateStock, cart.some(line => line.product.fulfillmentMode === "supplier"));
  }, [postalCode, cartTotal, isAllImmediateStock, cart]);

  const selectedShippingOption = useMemo(() => {
    if (!shippingCalculation.isValid || shippingCalculation.options.length === 0) return null;
    return (
      shippingCalculation.options.find((opt) => opt.id === selectedShippingOptionId) ||
      shippingCalculation.options[0]
    );
  }, [shippingCalculation, selectedShippingOptionId]);

  const shippingCost = selectedShippingOption ? selectedShippingOption.price : 0;

  // Progressive volume discount:
  // 2 units: 5% OFF
  // 3+ units: 8% OFF
  const retailUnitsCount = useMemo(() => {
    return cart
      .filter((l) => l.channel === "retail")
      .reduce((sum, l) => sum + l.quantity, 0);
  }, [cart]);

  const volumeDiscountPercentage = 0; // Final eligible promotion is quoted on the server.
  const volumeDiscountAmount = useMemo(() => {
    const retailSubtotal = cart
      .filter((l) => l.channel === "retail")
      .reduce((sum, l) => sum + l.product.retailPrice * l.quantity, 0);
    return Math.round(retailSubtotal * (volumeDiscountPercentage / 100));
  }, [cart, volumeDiscountPercentage]);

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
      isAllImmediateStock,
      selectedShippingOptionId,
      setSelectedShippingOptionId,
      selectedShippingOption,
      volumeDiscountPercentage,
      volumeDiscountAmount,
      retailUnitsCount,
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
      isAllImmediateStock,
      selectedShippingOptionId,
      setSelectedShippingOptionId,
      selectedShippingOption,
      volumeDiscountPercentage,
      volumeDiscountAmount,
      retailUnitsCount,
    ],
  );

  return (
    <CommerceContext.Provider value={value}>{favoriteError && <div role="alert" className="fixed bottom-20 left-4 right-4 z-[100] rounded-xl bg-amber-100 p-3 text-sm">{favoriteError}</div>}{children}</CommerceContext.Provider>
  );
}

export function useCommerce() {
  const context = useContext(CommerceContext);

  if (!context) {
    throw new Error("useCommerce debe usarse dentro de CommerceProvider.");
  }

  return context;
}
