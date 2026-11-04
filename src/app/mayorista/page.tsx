import { Suspense } from "react";
import LoadingWholesale from "@/components/wholesale/wholesale-loading";
import { WholesaleLanding } from "@/components/wholesale/wholesale-experience";
import { normalizeWholesaleFilters, wholesaleMetadata } from "@/lib/wholesale-content";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props) {
  return wholesaleMetadata(undefined, normalizeWholesaleFilters(await searchParams));
}

export default async function WholesalePage({ searchParams }: Props) {
  const filters = normalizeWholesaleFilters(await searchParams);
  return (
    <Suspense fallback={<LoadingWholesale />}>
      <WholesaleLanding filters={filters} />
    </Suspense>
  );
}
