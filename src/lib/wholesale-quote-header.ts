/** A display reference for the printable quote, not a persisted order number. */
export function wholesaleQuoteHeader(issuedAt: Date, reference: string) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires",
  });
  return {
    quoteNumber: `MYA-B2B-${reference.slice(0, 8).toUpperCase()}`,
    issueDate: formatter.format(issuedAt),
    expirationDate: formatter.format(new Date(issuedAt.getTime() + 15 * 86_400_000)),
  };
}
