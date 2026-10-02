# Mercado Pago y transferencia — MYA Importaciones



## Integración



- Aplicación: **MYA Importaciones**, ID `1135579291229708`.

- Producto: **Checkout Pro**, Argentina, tienda de desarrollo propio.

- Panel: https://www.mercadopago.com.ar/developers/panel/app/1135579291229708

- Webhook productivo: `https://myaimportaciones.vercel.app/api/mercadopago/webhook`.

- Evento configurado: `payment`.

- El MCP oficial quedó registrado como `mercadopago` y autorizado por OAuth.



El checkout acepta transferencia y Mercado Pago. MP abre su página para ingresar tarjeta o usar dinero en cuenta. Transferencia muestra los datos bancarios y permite enviar el comprobante por WhatsApp; un comprobante no acredita automáticamente el pedido.



## Credenciales y activación



Las claves privadas se guardan únicamente en variables de servidor. No pegarlas en chats ni guardarlas en Git. La Public Key y el Client Secret no son necesarios para el flujo actual de redirección de Checkout Pro.



Variables requeridas:



```dotenv

NEXT_PUBLIC_SITE_URL=https://myaimportaciones.vercel.app

SUPABASE_SERVICE_ROLE_KEY=<credencial privada del proyecto MYA>

MERCADOPAGO_ACCESS_TOKEN=<token productivo vigente de esta aplicación>

MERCADOPAGO_COLLECTOR_ID=<ID verificado de la cuenta receptora>

MERCADOPAGO_WEBHOOK_SECRET=<firma completa de Webhooks>

COMMERCE_CHECKOUT_ENABLED=false

NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY=quote_separately

COMMERCE_SHIPPING_ENABLED=false

NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON={}

TRANSFER_DISCOUNT_PERCENT=3

```



No reutilizar el token OAuth del MCP como Access Token de la tienda. Si se expone un Access Token o Client Secret, renovarlo en **Credenciales de producción → Más opciones → Renovar**. Verificar que realmente cambió antes de cargarlo en el servidor.



Antes de habilitar cobros:



1. Verificar credenciales vigentes y cuenta receptora.

2. Configurar las variables privadas en el alojamiento y verificar que las RPC de pedidos y conciliación existen en el proyecto Supabase de MYA.

3. Confirmar costos de productos, disponibilidad y tarifa de entrega. Para envíos, registrar peso y configurar tarifas confirmadas; las zonas sin tarifa siguen a cotizar.

4. Validar el entorno de prueba, el pago aprobado/rechazado y la entrega del webhook firmado. La creación automática del entorno de prueba de MP falló con `MP_API_DOWN`; crear cuentas de prueba por separado o resolver ese fallo sin duplicar la aplicación principal.

5. Publicar los cambios y realizar una compra real controlada por el titular. Confirmar importe, referencia del pedido, acreditación y seguimiento antes de declarar la pasarela operativa.



## Conciliación



El retorno de Mercado Pago siempre lleva al seguimiento y no marca el pedido como pagado. El webhook valida firma, consulta el pago en MP, comprueba cuenta receptora, moneda ARS y modo productivo, y ejecuta `reconcile_retail_payment_v2`. La base comprueba el importe y maneja eventos repetidos y pagos tardíos.



El servidor rechaza importes inválidos y reservas vencidas antes de crear la preferencia. Solo acepta enlaces HTTPS del checkout argentino de Mercado Pago. Una preferencia inválida conserva el pedido reservado y comunica el error al comprador.



## Validación local del 2 de octubre de 2026



- TypeScript: aprobado.

- Pruebas: 42 aprobadas, incluyendo firma, conciliación transaccional, importes y enlaces de MP.

- Lint: 0 errores, 111 advertencias en el repositorio.

- Build: aprobado, 32 rutas.

- Estas validaciones no prueban un cobro real ni un despliegue de estos cambios.

- Access Token productivo, firma del webhook y credencial privada de pedidos cargados en `.env.local`; cuenta receptora argentina verificada contra la API de MP.

- Credencial privada del proyecto Supabase MYA obtenida desde su panel y guardada localmente.
- Configuración productiva habilitada en Vercel después de la autorización del usuario; `COMMERCE_CHECKOUT_ENABLED=true`.
- Verificación en navegador local: producto disponible, cotización de productos por el servidor, MP y transferencia habilitados, domicilio en Patagonia y aviso de envío separado con aceptación obligatoria. No se confirmó un pedido ni se ejecutó un cobro real durante esa verificación.
- La renovación de claves fue recomendada por su exposición en el chat y el titular decidió conservar las actuales. No se registra ninguna clave en este documento.



## Publicación del 2 de octubre de 2026

- Producción READY: `dpl_HfYM5tQvmVam6AzUe3V3oVkvDLvW`, alias https://myaimportaciones.vercel.app.
- Publicado desde una copia de HEAD con únicamente los archivos de esta integración; se excluyeron los cambios concurrentes de revisión de precios.
- Checkout público con transferencia y Mercado Pago habilitados; cotización de productos y entrega nacional a cotizar y abonar por separado.
- Verificación pública del total con Mercado Pago y transferencia en CP 9410; webhook sin firma devuelve 401. Sin errores de runtime registrados durante la revisión.
- Sin cobros reales ni pedidos de prueba confirmados, por instrucción del usuario. La acreditación real permanece sin comprobar.
