/** Only explicitly safe messages may cross the production Server Action boundary. */
export class AdminFormError extends Error {}

export type AdminActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function runAdminFormAction<T>(operation: () => Promise<T>): Promise<AdminActionResult<T>> {
  try {
    return { success: true, data: await operation() };
  } catch (error) {
    if (error instanceof AdminFormError) return { success: false, error: error.message };
    console.error("[admin-product] Unexpected save failure", error);
    return { success: false, error: "No se pudo guardar el producto. Revisá tu conexión y probá nuevamente." };
  }
}
