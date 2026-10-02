/**
 * Correo Argentino - Plataforma de Integración - API 2.0 (Paq.ar REST)
 * Basado en el Manual de Usuario oficial v1.2 (Abril 2023).
 */

export interface CorreoArgentinoConfig {
  apiKey: string;
  agreement: string;
  environment: "test" | "production";
}

export interface CorreoAgency {
  agency_id: string;
  agency_name: string;
  email?: string;
  phone?: string;
  schedule?: string;
  package_reception?: boolean;
  pickup_availability?: boolean;
  location: {
    country_name: string;
    state_name: string;
    city_name: string;
    city_id?: string;
    neighborhood_name?: string;
    street_name: string;
    street_number: string;
    zip_code: string;
    geolocation?: {
      latitude: string;
      longitude: string;
    };
  };
}

export interface CorreoCreateOrderPayload {
  sellerId?: string;
  trackingNumber?: string;
  order: {
    senderData: {
      id?: string;
      businessName: string;
      areaCodePhone?: string;
      phoneNumber?: string;
      areaCodeCellphone?: string;
      cellphoneNumber?: string;
      email?: string;
      observation?: string;
      address: {
        streetName: string;
        streetNumber: string;
        cityName: string;
        floor?: string;
        department?: string;
        state: string; // Código ISO provincial (A-Z)
        zipCode: string;
      };
    };
    shippingData: {
      name: string;
      areaCodePhone?: string;
      phoneNumber?: string;
      areaCodeCellphone?: string;
      cellphoneNumber?: string;
      email?: string;
      observation?: string;
      address: {
        streetName: string;
        streetNumber: string;
        cityName: string;
        floor?: string;
        department?: string;
        state: string; // Código ISO provincial (A-Z)
        zipCode: string;
      };
    };
    parcels: Array<{
      dimensions: {
        height: string; // cm
        width: string; // cm
        depth: string; // cm
      };
      productWeight: string; // Gramos (máx 5 dígitos)
      productCategory?: string;
      declaredValue: string; // Pesos ARS
    }>;
    deliveryType: "homeDelivery" | "agency" | "locker";
    agencyId?: string;
    saleDate: string; // Formato: YYYY-MM-DDTHH:mm:ss-03:00
    serviceType: "CP" | "EP" | string; // CP = Clásico Paq.ar
    shipmentClientId?: string;
  };
}

export interface CorreoLabelResponse {
  trackingNumber: string;
  fileBase64: string;
  fileName: string;
  result: "OK" | string;
}

export interface CorreoTrackingEvent {
  facilityId?: string;
  facility?: string;
  statusId?: string;
  status?: string;
  date?: string;
  sign?: string;
}

export interface CorreoTrackingItem {
  trackingNumber: string;
  serviceType?: string;
  event: CorreoTrackingEvent[];
}

export class CorreoArgentinoClient {
  private apiKey: string;
  private agreement: string;
  private baseUrl: string;

  constructor(config?: Partial<CorreoArgentinoConfig>) {
    this.apiKey = config?.apiKey || process.env.CORREO_ARGENTINO_API_KEY || "";
    this.agreement = config?.agreement || process.env.CORREO_ARGENTINO_AGREEMENT || "";
    const env = config?.environment || (process.env.CORREO_ARGENTINO_ENV === "production" ? "production" : "test");
    this.baseUrl =
      env === "production"
        ? "https://api.correoargentino.com.ar/paqar/v1"
        : "https://apitest.correoargentino.com.ar/paqar/v1";
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.agreement);
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Apikey ${this.apiKey}`,
      agreement: this.agreement,
    };
  }

  /**
   * Validar credenciales de acceso al gateway (GET /v1/auth)
   * Retorna true si responde status 204 OK.
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth`, {
        method: "GET",
        headers: this.getHeaders(),
        next: { revalidate: 0 },
      });
      return res.status === 204 || res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Consulta las sucursales de Correo Argentino habilitadas para retiro (GET /v1/agencies)
   */
  async getAgencies(stateId?: string, pickupAvailability = true): Promise<CorreoAgency[]> {
    if (!this.isConfigured()) return [];
    try {
      const url = new URL(`${this.baseUrl}/agencies`);
      if (stateId) url.searchParams.set("stateId", stateId.toUpperCase());
      if (pickupAvailability) url.searchParams.set("pickup_availability", "true");

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
        next: { revalidate: 3600 }, // Cache 1 hora
      });

      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Da de alta una orden/envío en Correo Argentino (POST /v1/orders)
   * Devuelve el trackingNumber asignado.
   */
  async createOrder(payload: CorreoCreateOrderPayload): Promise<{ success: boolean; trackingNumber?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "Credenciales de Correo Argentino no configuradas." };
    }

    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.message || data?.error || `Error ${res.status} al crear orden en Correo Argentino`,
        };
      }

      return {
        success: true,
        trackingNumber: data?.trackingNumber || data?.order?.trackingNumber,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error al conectar con Correo Argentino",
      };
    }
  }

  /**
   * Obtener rótulo oficial en PDF en base64 para imprimir (POST /v1/labels)
   */
  async getLabel(trackingNumber: string, labelFormat: "10x15" | "label" = "10x15"): Promise<CorreoLabelResponse | null> {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetch(`${this.baseUrl}/labels`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify([{ sellerId: "", trackingNumber }]),
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        return data[0] as CorreoLabelResponse;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Consulta el historial de movimientos de uno o varios tracking numbers (GET /v1/tracking)
   */
  async getTracking(trackingNumbers: string[]): Promise<CorreoTrackingItem[]> {
    if (!this.isConfigured() || !trackingNumbers.length) return [];
    try {
      const body = trackingNumbers.map((tn) => ({ trackingNumber: tn }));
      const res = await fetch(`${this.baseUrl}/tracking`, {
        method: "GET",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Cancela una orden / preimposición (PATCH /v1/orders/{trackingNumber}/cancel)
   */
  async cancelOrder(trackingNumber: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(trackingNumber)}/cancel`, {
        method: "PATCH",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const correoArgentinoClient = new CorreoArgentinoClient();
