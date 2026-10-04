import type { BinPallet } from '@rivbins/shared';

/** Pallets in the bin and their stocked lines (D-065). */
export function PalletList({ pallets }: { pallets: BinPallet[] }) {
  return (
    <section aria-labelledby="pallets-heading">
      <h3 id="pallets-heading" className="mb-3 text-sm font-semibold">
        Pallets in bin
      </h3>
      {pallets.length === 0 ? (
        <p className="text-sm text-zinc-500">This bin is empty.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pallets.map((pallet) => (
            <li key={pallet.code} className="rounded-md border border-zinc-200 dark:border-zinc-800">
              <p className="border-b border-zinc-200 px-3 py-1.5 font-mono text-xs font-medium dark:border-zinc-800">
                {pallet.code}
              </p>
              {pallet.items.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">No stock on this pallet.</p>
              ) : (
                <table className="w-full table-fixed text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th className="w-24">SKU</th>
                      <th>Product</th>
                      <th className="w-16">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pallet.items.map((item) => (
                      <tr key={item.sku}>
                        <td className="px-3 py-1 font-mono text-xs text-zinc-500">{item.sku}</td>
                        <td className="truncate py-1">{item.name}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
