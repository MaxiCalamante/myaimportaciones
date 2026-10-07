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
import { reconcileCart } from "@/lib/cart-reconcile";

export interface CartLine {
  product: Product;
  quantity: number;
  channel: ProductChannel;
}

interface CommerceContextValue {
  cart: CartLine[];
  favoriteIds: string[];
  favoritesReady: boolean;
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
  province: string;
  setProvince: (code: string) => void;
  city: string;
  setCity: (city: string) => void;
  address: string;
  setAddress: (address: string) => void;
  shippingCost: number;
  shippingCalculation: ShippingCalculation;
  isAllImmediateStock: boolean;
  selectedShippingOptionId: string;
  setSelectedShippingOptionId: (id: string) => void;
  selectedShippingOption: ShippingOption | null;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  retailUnitsCount: number;
  whatsappModalOpen: boolean;
  whatsappModalMessage: string;
  openWhatsApp: (message?: string) => void;
  closeWhatsApp: () => void;
}

const CommerceContext = createContext<CommerceContextValue | null>(null);
const cartKey = "mm-cart";

const postalCodeKey = "mya_postal_code";
const provinceKey = "mya_province";
const cityKey = "mya_city";
const addressKey = "mya_address";
const shippingOptionKey = "mya_shipping_option";

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartRef = useRef(cart);
  const [cartNotice, setCartNotice] = useState("");
  useEffect(() => { cartRef.current = cart; }, [cart]);
  const { favoriteIds, favoritesReady, toggleFavorite, favoriteError } = useFavorites();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [postalCode, setPostalCodeState] = useState("");
  const [province, setProvinceState] = useState("");
  const [city, setCityState] = useState("");
  const [address, setAddressState] = useState("");
  const [selectedShippingOptionId, setSelectedShippingOptionIdState] = useState("correo_domicilio");
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappModalMessage, setWhatsappModalMessage] = useState("");
  const hydrated = useRef(false);

  const openWhatsApp = useCallback((msg?: string) => {
    setWhatsappModalMessage(
      msg || "Hola MYA Importaciones! Estuve viendo su tienda online y quería hacer una consulta."
    );
    setWhatsappModalOpen(true);
  }, []);

  const closeWhatsApp = useCallback(() => {
    setWhatsappModalOpen(false);
  }, []);

  useEffect(() => {
    let busy = false;
    let disposed = false;
    const refresh = async () => {
      if (busy || disposed || !hydrated.current || document.visibilityState === "hidden") return;
      const ids = [...new Set(cartRef.current.map(line => line.product.id))];
      if (!ids.length) return;
      busy = true;
      try {
        const products: Product[] = [];
        for (let i = 0; i < ids.length; i += 50) {
          const response = await fetch(`/api/favorites/products?ids=${ids.slice(i, i + 50).join(",")}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
          if (!response.ok) throw new Error("No disponible");
          const batch: unknown = await response.json();
          if (!Array.isArray(batch)) throw new Error("Respuesta inválida");
          products.push(...batch);
        }
        if (!disposed) {
          const reviewed = cartRef.current.filter(line => ids.includes(line.product.id));
          const updated = reconcileCart(reviewed, products);
          if (updated.length !== reviewed.length || updated.some((line, index) => line.quantity !== reviewed[index].quantity || line.product.retailPrice !== reviewed[index].product.retailPrice)) {
            setCartNotice("Actualizamos precios y disponibilidad de tu carrito. Revisá tu selección antes de continuar.");
          }
          // Preserve items and quantities changed while a request was in flight.
          setCart(current => [...reconcileCart(current.filter(line => ids.includes(line.product.id)), products), ...current.filter(line => !ids.includes(line.product.id))]);
        }
      } catch { /* Checkout independently validates prices and stock if this refresh is unavailable. */ }
      finally { busy = false; }
    };
    const timer = window.setTimeout(refresh, 300);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { disposed = true; window.clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedCart = window.localStorage.getItem(cartKey);
        for (const key of [postalCodeKey, provinceKey, cityKey, addressKey, shippingOptionKey]) window.localStorage.removeItem(key);

        const storedPostalCode = window.sessionStorage.getItem(postalCodeKey);
        const storedProvince = window.sessionStorage.getItem(provinceKey);
        const storedCity = window.sessionStorage.getItem(cityKey);
        const storedAddress = window.sessionStorage.getItem(addressKey);
        const storedShippingOption = window.sessionStorage.getItem(shippingOptionKey);

        if (storedCart) {
          const parsed: unknown = JSON.parse(storedCart);
          if (Array.isArray(parsed)) setCart(parsed.filter((l: CartLine) => l?.product?.id && typeof l.product.title === "string" && Number.isFinite(l.product.retailPrice) && l.product.retailPrice > 0 && Number.isFinite(l.product.stock) && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 100 && (WHOLESALE_ENABLED || l.channel === "retail")));
        }

        if (storedPostalCode) {
          setPostalCodeState(storedPostalCode);
        }
        if (storedProvince) {
          setProvinceState(storedProvince);
        }
        if (storedCity) {
          setCityState(storedCity);
        }
        if (storedAddress) {
          setAddressState(storedAddress);
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
        window.sessionStorage.setItem(postalCodeKey, code);
      } else {
        window.sessionStorage.removeItem(postalCodeKey);
      }
    } catch {}
  }, []);

  const setProvince = useCallback((code: string) => {
    setProvinceState(code);
    try {
      if (code) {
        window.sessionStorage.setItem(provinceKey, code);
      } else {
        window.sessionStorage.removeItem(provinceKey);
      }
    } catch {}
  }, []);

  const setCity = useCallback((val: string) => {
    setCityState(val);
    try {
      if (val) {
        window.sessionStorage.setItem(cityKey, val);
      } else {
        window.sessionStorage.removeItem(cityKey);
      }
    } catch {}
  }, []);

  const setAddress = useCallback((val: string) => {
    setAddressState(val);
    try {
      if (val) {
        window.sessionStorage.setItem(addressKey, val);
      } else {
        window.sessionStorage.removeItem(addressKey);
      }
    } catch {}
  }, []);

  const setSelectedShippingOptionId = useCallback((id: string) => {
    setSelectedShippingOptionIdState(id);
    try {
      if (id) {
        window.sessionStorage.setItem(shippingOptionKey, id);
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

  // Dynamic shipping calculation based on postalCode, cartTotal, isAllImmediateStock, province, city, and address
  const shippingCalculation = useMemo(() => {
    return calculateShipping(postalCode, cartTotal, isAllImmediateStock, cart.some(line => line.product.fulfillmentMode === "supplier"), province, city, address);
  }, [postalCode, cartTotal, isAllImmediateStock, cart, province, city, address]);

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
      favoritesReady,
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
      province,
      setProvince,
      city,
      setCity,
      address,
      setAddress,
      shippingCost,
      shippingCalculation,
      isAllImmediateStock,
      selectedShippingOptionId,
      setSelectedShippingOptionId,
      selectedShippingOption,
      volumeDiscountPercentage,
      volumeDiscountAmount,
      retailUnitsCount,
      whatsappModalOpen,
      whatsappModalMessage,
      openWhatsApp,
      closeWhatsApp,
    }),
    [
      addToCart,
      cart,
      cartCount,
      cartOpen,
      cartTotal,
      favoriteIds,
      favoritesReady,
      favoritesCount,
      isFavorite,
      removeFromCart,
      toggleFavorite,
      updateQuantity,
      selectedProduct,
      postalCode,
      setPostalCode,
      province,
      setProvince,
      city,
      setCity,
      address,
      setAddress,
      shippingCost,
      shippingCalculation,
      isAllImmediateStock,
      selectedShippingOptionId,
      setSelectedShippingOptionId,
      selectedShippingOption,
      volumeDiscountPercentage,
      volumeDiscountAmount,
      retailUnitsCount,
      whatsappModalOpen,
      whatsappModalMessage,
      openWhatsApp,
      closeWhatsApp,
    ],
  );

  return (
    <CommerceContext.Provider value={value}>{(favoriteError || cartNotice) && <div role="status" className="fixed bottom-20 left-4 right-4 z-[100] sm:left-auto sm:max-w-xl flex items-center gap-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-950"><span className="flex-1">{favoriteError || cartNotice}</span>{cartNotice && <button type="button" onClick={() => setCartNotice("")} className="min-h-11 px-3 font-semibold underline">Entendido</button>}</div>}{children}</CommerceContext.Provider>
  );
}

export function useCommerce() {
  const context = useContext(CommerceContext);

  if (!context) {
    throw new Error("useCommerce debe usarse dentro de CommerceProvider.");
  }

  return context;
}
