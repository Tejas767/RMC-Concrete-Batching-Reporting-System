"use client";

import { DeliveryChallan } from "./DeliveryChallan";
import { TaxInvoice } from "./TaxInvoice";

/**
 * BillingTabSection — Modularized Billing Tab view (Challan + Tax Invoice) for the Operator Dashboard.
 */
export function BillingTabSection({ entry, lastBatch }) {
  const currentBatch = entry.grade ? entry : lastBatch || entry;

  return (
    <div className="md:mx-auto md:max-w-5xl space-y-8">
      <DeliveryChallan batch={currentBatch} />
      <div className="print:hidden">
        <TaxInvoice />
      </div>
    </div>
  );
}
