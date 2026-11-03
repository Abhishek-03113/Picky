import { QUICK_LOOK_SHORTCUT, shortcutKeyLabels, type OperatingSystem } from "@picky/catalog";
import type { ReactElement, ReactNode } from "react";

interface Step {
  readonly title: string;
  readonly body: ReactNode;
}

/** The Quick Look shortcut as key caps, labelled for the visitor's keyboard. */
function Shortcut({ os }: { readonly os: OperatingSystem }): ReactElement {
  return (
    <>
      {shortcutKeyLabels(QUICK_LOOK_SHORTCUT, os).map((key, index) => (
        <span key={key}>
          {index > 0 && " "}
          <kbd>{key}</kbd>
        </span>
      ))}
    </>
  );
}

function steps(os: OperatingSystem): readonly Step[] {
  return [
    {
      title: "Save",
      body: (
        <>
          Click Picky on any product page, or press <Shortcut os={os} />, to read its specs. Right-click → Add to Picky
          keeps it. Nothing to copy, and you never leave the page.
        </>
      ),
    },
    {
      title: "Understand",
      body: "Every product opens as the same grouped spec sheet, free of store layouts and promotional noise.",
    },
    {
      title: "Compare",
      body: "Put your shortlist side by side. See what they share, where they differ and where one clearly wins.",
    },
    { title: "Decide", body: "You make the call. Your research stays in your library for whenever you come back." },
  ];
}

/** The save, understand, compare, decide sequence as a plain ordered list; the shortcut is labelled for `os`. */
export function HowItWorks({ os }: { readonly os: OperatingSystem }): ReactElement {
  return (
    <section id="how" className="section how" aria-labelledby="how-title">
      <h2 id="how-title" className="h2">
        Between finding a product and buying it.
      </h2>
      <ol className="how-steps">
        {steps(os).map((step, index) => (
          <li className="how-step" key={step.title}>
            <span className="how-step-count" aria-hidden="true">
              {index + 1}
            </span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
