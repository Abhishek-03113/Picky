import { availabilityTone, type ProductSnapshot, formatCaptureTime } from "@picky/catalog";
import { PriceBlock } from "./price-block.tsx";

type PriceCardSnapshot = Pick<ProductSnapshot, "price" | "listPrice" | "availability" | "capturedAt">;

/** Price, stock state and the capture-time caveat; every part tolerates missing data. */
export function PriceCard({ snapshot }: { snapshot: PriceCardSnapshot }) {
  return (
    <div className="card price-card">
      <PriceBlock price={snapshot.price} listPrice={snapshot.listPrice} />
      {snapshot.availability !== null && (
        <span className="availability">
          <span className={`availability-dot ${availabilityTone(snapshot.availability)}`} aria-hidden="true" />
          <strong>{snapshot.availability}</strong>
        </span>
      )}
      <span className="price-card-note">
        {`Price as of ${formatCaptureTime(snapshot.capturedAt)} · Prices change often, so save it again from the store to update.`}
      </span>
    </div>
  );
}
