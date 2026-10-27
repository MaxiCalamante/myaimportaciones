"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCommerceService } from "@/lib/supabase/service";
import { getAdminClient } from "@/lib/admin-auth";
import { invalidateAdminStorefrontCache } from "@/lib/storefront";
import { scheduleTransactionalEmails } from "@/lib/email-worker";

export interface WholesaleActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Permite a un cliente registrado postularse para la categoría mayorista.
 */
export async function applyForWholesaleAction(
  prevState: WholesaleActionResult | null,
  formData: FormData
): Promise<WholesaleActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Iniciá sesión para enviar tu postulación mayorista.",
    };
  }

  const businessName = (formData.get("businessName") as string)?.trim() || "";
  const cuit = (formData.get("cuit") as string)?.trim() || "";
  const phone = (formData.get("phone") as string)?.trim() || "";
  const notes = (formData.get("notes") as string)?.trim() || "";

  if (!businessName && !cuit) {
    return {
      success: false,
      error: "Por favor indicá tu Nombre Comercial / Razón Social o tu CUIT / DNI.",
    };
  }

  if (!phone) {
    return {
      success: false,
      error: "Por favor ingresá un teléfono o WhatsApp de contacto.",
    };
  }

  const serviceDb = createCommerceService();
  const { error } = await serviceDb
    .from("profiles")
    .update({
      business_name: businessName || null,
      cuit: cuit || null,
      phone: phone || null,
      wholesale_notes: notes || null,
      wholesale_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: `Error al registrar tu postulación: ${error.message}`,
    };
  }

  // Notificación automática al email de administración (Máximo / Agustina)
  try {
    await serviceDb.rpc("queue_transactional_email_v1", {
      key_input: `wholesale_app/${user.id}/${Date.now()}`,
      event_input: "wholesale_application_received",
      audience_input: "admin",
      order_input: null,
      snapshot_input: {
        profile_id: user.id,
        buyer_name: businessName || user.email,
        customer_email: user.email,
        shipping_phone: phone,
        reference: cuit,
        order_notes: notes || "Sin observaciones",
      },
    });
    scheduleTransactionalEmails();
  } catch {}

  revalidatePath("/mayorista");
  revalidatePath("/cuenta");
  revalidatePath("/admin/mayoristas");

  return {
    success: true,
    message: "¡Postulación enviada con éxito! Revisaremos tu cuenta a la brevedad.",
  };
}

/**
 * Aprueba la postulación mayorista de un cliente desde el panel admin.
 */
export async function approveWholesaleApplicationAction(
  userId: string
): Promise<WholesaleActionResult> {
  await getAdminClient();
  const serviceDb = createCommerceService();

  const { error } = await serviceDb
    .from("profiles")
    .update({
      is_approved_wholesale: true,
      customer_tier: "wholesale",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    scheduleTransactionalEmails();
    invalidateAdminStorefrontCache();
  } catch {}

  revalidatePath("/admin");
  revalidatePath("/admin/mayoristas");
  revalidatePath("/admin/clientes");
  revalidatePath("/mayorista");

  return { success: true, message: "Cuenta mayorista aprobada con éxito." };
}

/**
 * Rechaza o revoca la condición mayorista de un cliente.
 */
export async function rejectWholesaleApplicationAction(
  userId: string,
  reason?: string
): Promise<WholesaleActionResult> {
  await getAdminClient();
  const serviceDb = createCommerceService();

  const { error } = await serviceDb
    .from("profiles")
    .update({
      is_approved_wholesale: false,
      customer_tier: "retail",
      wholesale_requested_at: null,
      wholesale_notes: reason ? `Rechazado: ${reason}` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    scheduleTransactionalEmails();
    invalidateAdminStorefrontCache();
  } catch {}

  revalidatePath("/admin");
  revalidatePath("/admin/mayoristas");
  revalidatePath("/admin/clientes");
  revalidatePath("/mayorista");

  return { success: true, message: "Postulación rechazada / estado mayorista revocado." };
}

/**
 * Permite buscar un usuario por email y otorgar/revocar condición mayorista directamente.
 */
export async function setWholesaleByEmailAction(
  email: string,
  approved: boolean
): Promise<WholesaleActionResult> {
  await getAdminClient();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: "Ingresá un correo electrónico válido." };
  }

  const serviceDb = createCommerceService();
  const { data: profile, error: searchError } = await serviceDb
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (searchError || !profile) {
    return { success: false, error: `No se encontró ningún usuario registrado con el email "${cleanEmail}".` };
  }

  const { error } = await serviceDb
    .from("profiles")
    .update({
      is_approved_wholesale: approved,
      customer_tier: approved ? "wholesale" : "retail",
      wholesale_requested_at: approved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    scheduleTransactionalEmails();
    invalidateAdminStorefrontCache();
  } catch {}

  revalidatePath("/admin");
  revalidatePath("/admin/mayoristas");
  revalidatePath("/admin/clientes");
  revalidatePath("/mayorista");

  return {
    success: true,
    message: approved
      ? `Usuario ${profile.full_name || profile.email} habilitado como mayorista con éxito.`
      : `Condición mayorista revocada para ${profile.full_name || profile.email}.`,
  };
}

/**
 * Actualiza el precio mayorista de un producto individual desde el monitor de márgenes.
 */
export async function updateWholesalePriceAction(
  productId: string,
  newWholesalePrice: number
): Promise<WholesaleActionResult> {
  await getAdminClient();
  if (!productId || newWholesalePrice <= 0) {
    return { success: false, error: "Ingresá un precio mayorista válido mayor a cero." };
  }

  const serviceDb = createCommerceService();
  const { error } = await serviceDb
    .from("products")
    .update({
      wholesale_price: Math.round(newWholesalePrice),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    invalidateAdminStorefrontCache();
  } catch {}

  revalidatePath("/admin/mayoristas");
  revalidatePath("/admin/precios");
  revalidatePath("/mayorista");

  return {
    success: true,
    message: `Precio mayorista actualizado a $${Math.round(newWholesalePrice).toLocaleString("es-AR")}.`,
  };
}
