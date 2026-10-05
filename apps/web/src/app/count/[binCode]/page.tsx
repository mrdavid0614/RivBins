import type { CountSheetResponse } from '@rivbins/shared';
import Link from 'next/link';
import { CountForm } from '@/components/count/CountForm';
import { ApiError, apiFetch } from '@/lib/api';

type SheetData =
  | { status: 'ok'; sheet: CountSheetResponse }
  | { status: 'not-found' }
  | { status: 'error' };

async function loadSheet(code: string): Promise<SheetData> {
  try {
    const sheet = await apiFetch<CountSheetResponse>(
      `/bins/${encodeURIComponent(code)}/count-sheet`,
    );
    return { status: 'ok', sheet };
  } catch (error) {
    return { status: error instanceof ApiError && error.status === 404 ? 'not-found' : 'error' };
  }
}

/** The segment may still be percent-encoded; a malformed one is used as is. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Remounts the form when the sheet changes (e.g. after reloading a stale sheet, D-075). */
const sheetKey = (sheet: CountSheetResponse): string =>
  sheet.pallets
    .flatMap((pallet) => pallet.lines.map((line) => `${line.palletItemId}:${line.expectedQty}`))
    .join(',');

/** Count flow, steps 2–4: expected lines, counted quantities, outcome, save. */
export default async function CountBinPage(props: PageProps<'/count/[binCode]'>) {
  const { binCode } = await props.params;
  const code = decodeSegment(binCode).trim().toUpperCase();
  const data = await loadSheet(code);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-6">
      <Link href="/count" className="text-sm text-zinc-500 underline-offset-2 hover:underline">
        ← All bins
      </Link>
      {data.status === 'ok' ? (
        <CountForm key={sheetKey(data.sheet)} sheet={data.sheet} />
      ) : (
        <p role="alert" className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          {data.status === 'not-found'
            ? `There is no bin with code ${code}. Check the code and try again.`
            : 'Could not load this bin. Check that the API is running.'}
        </p>
      )}
    </main>
  );
}
