import type { ReactElement } from "react";

interface Principle {
  readonly title: string;
  readonly body: string;
}

const PRINCIPLES: readonly Principle[] = [
  { title: "Neutral", body: "Picky works for the buyer. It never nudges you toward a product." },
  { title: "Honest", body: "If a page doesn't say, Picky doesn't guess. Missing stays missing." },
  {
    title: "Yours to keep",
    body: "Your research doesn't vanish when a tab closes. Search any detail, and save a product again to update it.",
  },
  {
    title: "Look without an account",
    body: "The extension shows any product's details without signing in. An account lets you keep them.",
  },
];

/** What Picky promises, in the product's own principles. */
export function Features(): ReactElement {
  return (
    <section className="section features" aria-labelledby="features-title">
      <h2 id="features-title" className="h2">
        Built to help you choose, not to sell.
      </h2>
      <dl className="principles">
        {PRINCIPLES.map((item) => (
          <div key={item.title}>
            <dt>{item.title}</dt>
            <dd>{item.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
