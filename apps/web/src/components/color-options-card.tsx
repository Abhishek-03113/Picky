import { formatMoney, pluralize, type ColorOption } from "@picky/catalog";
import { useState } from "react";

interface ColorOptionsCardProps {
  options: readonly ColorOption[];
}

/**
 * The colours the product comes in, picked in place: swatches switch a preview of the chosen colour's photo,
 * price and stock, read from each colour's own listing when the product was saved. Picking never leaves the
 * page or opens a tab. Nothing when the product has one colour.
 */
export function ColorOptionsCard({ options }: ColorOptionsCardProps) {
  const initial = options.find((option) => option.selected) ?? options[0];
  const [chosenId, setChosenId] = useState(initial?.externalId);
  const chosen = options.find((option) => option.externalId === chosenId) ?? initial;
  if (chosen === undefined || options.length < 2) return null;
  return (
    <section className="card color-options" aria-labelledby="color-options-title">
      <div className="color-options-head">
        <h2 id="color-options-title">Colours</h2>
        <span className="subtle">{pluralize(options.length, "colour")}</span>
      </div>
      <ColorPreview option={chosen} />
      <div className="color-swatches" role="group" aria-label="Pick a colour">
        {options.map((option) => (
          <ColorSwatch
            key={option.externalId}
            option={option}
            pressed={option.externalId === chosen.externalId}
            onPick={() => setChosenId(option.externalId)}
          />
        ))}
      </div>
    </section>
  );
}

function ColorPreview({ option }: { option: ColorOption }) {
  const photo = option.image ?? option.swatchImage;
  return (
    <div className="color-preview" aria-live="polite">
      <span className="color-preview-photo">{photo !== null && <img src={photo} alt={option.name} />}</span>
      <span className="color-preview-text">
        <span className="color-preview-name">{option.name}</span>
        <span className="color-preview-price">
          {option.price === null ? "Price not shown for this colour" : formatMoney(option.price)}
        </span>
        {option.availability !== null && <span className="color-preview-stock">{option.availability}</span>}
        {option.selected && <span className="chip">The one you saved</span>}
      </span>
    </div>
  );
}

interface ColorSwatchProps {
  option: ColorOption;
  pressed: boolean;
  onPick: () => void;
}

function ColorSwatch({ option, pressed, onPick }: ColorSwatchProps) {
  const picture = option.swatchImage ?? option.image;
  return (
    <button
      type="button"
      className="color-swatch"
      aria-pressed={pressed}
      aria-label={option.name}
      title={option.name}
      onClick={onPick}
    >
      {picture === null ? (
        <span className="color-swatch-name">{option.name}</span>
      ) : (
        <img src={picture} alt="" loading="lazy" />
      )}
    </button>
  );
}
