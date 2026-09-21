/** Read bounded database pages; never silently return an incomplete export on failure. */
export async function readAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, size = 500): Promise<T[]> {
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new Error("Invalid page size");
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error || !data) throw new Error("No se pudo completar la lectura del catálogo.");
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
