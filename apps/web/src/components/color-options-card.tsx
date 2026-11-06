import { formatMoney, pluralize, type ColorOption } from "@picky/catalog";

interface ColorOptionsCardProps {
  options: readonly ColorOption[];
}

/**
 * The colours the product comes in, each linking to its own listing, with the price and stock read
 * from that listing's page. Nothing when the product has one colour.
 */
export function ColorOptionsCard({ options }: ColorOptionsCardProps) {
  if (options.length === 0) return null;
  return (
    <section className="card color-options" aria-labelledby="color-options-title">
      <div className="color-options-head">
        <h2 id="color-options-title">Colours</h2>
        <span className="subtle">{pluralize(options.length, "colour")}</span>
      </div>
      <ul className="color-option-list">
        {options.map((option) => (
          <li key={option.externalId}>
            <ColorOptionTile option={option} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ColorOptionTile({ option }: { option: ColorOption }) {
  const photo = option.image ?? option.swatchImage;
  return (
    <a
      className="color-option"
      href={option.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-current={option.selected ? "page" : undefined}
    >
      <span className="color-option-photo">{photo !== null && <img src={photo} alt="" loading="lazy" />}</span>
      <span className="color-option-text">
        <span className="color-option-name">{option.name}</span>
        <span className="color-option-price">
          {option.price === null ? "Open to see price" : formatMoney(option.price)}
        </span>
        {option.availability !== null && <span className="color-option-stock">{option.availability}</span>}
        {option.selected && <span className="chip">This page</span>}
      </span>
    </a>
  );
}
