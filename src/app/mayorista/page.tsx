import { WholesaleLanding } from "@/components/wholesale/wholesale-experience";
import { normalizeWholesaleFilters, wholesaleMetadata } from "@/lib/wholesale-content";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props) {
  return wholesaleMetadata(undefined, normalizeWholesaleFilters(await searchParams));
}

export default async function WholesalePage({ searchParams }: Props) {
  return <WholesaleLanding filters={normalizeWholesaleFilters(await searchParams)} />;
}
