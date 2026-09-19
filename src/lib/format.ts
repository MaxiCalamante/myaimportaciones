export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatOrderStatus(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pago confirmado",
    preparing: "En preparacion",
    shipped: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  return labels[status] ?? status;
}

export function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    mercado_pago: "Mercado Pago",
    efectivo: "Efectivo",
    cuenta_corriente: "Cuenta corriente",
  };

  return labels[method] ?? method;
}
