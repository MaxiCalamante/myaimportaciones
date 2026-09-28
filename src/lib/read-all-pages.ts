/** Read bounded database pages; never silently return an incomplete export on failure. */
export async function readAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  size = 1000
): Promise<T[]> {
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new Error("Invalid page size");
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error || !data) throw new Error("No se pudo completar la lectura del catálogo.");
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

/** Parallel paginated reader for high-performance admin views where total count is known or estimated. */
export async function readAllPagesParallel<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  totalCount: number,
  size = 1000
): Promise<T[]> {
  if (totalCount <= 0) return [];
  const numPages = Math.ceil(totalCount / size);
  const promises: PromiseLike<{ data: T[] | null; error: unknown }>[] = [];
  for (let page = 0; page < numPages; page++) {
    const from = page * size;
    const to = from + size - 1;
    promises.push(fetchPage(from, to));
  }
  const results = await Promise.all(promises);
  const rows: T[] = [];
  for (const { data, error } of results) {
    if (error || !data) throw new Error("No se pudo completar la lectura paralela del catálogo.");
    rows.push(...data);
  }
  // Check if there are any trailing rows inserted concurrently
  let lastBatch = results[results.length - 1]?.data ?? [];
  let from = numPages * size;
  while (lastBatch.length === size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    lastBatch = data;
    from += size;
  }
  return rows;
}
