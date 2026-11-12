import type { Dom } from "../popup/dom.ts";
import { clampBottom, pillLabel, type PillState } from "./save-pill-model.ts";

export interface SavePillActions {
  /** The main button: save, add to cart or open the cart, by state. */
  activate(state: PillState): void;
  hideOnStore(): void;
  hideEverywhere(): void;
  /** Dragged to a new spot, in px from the bottom of the window. */
  moved(bottom: number): void;
}

/** Movement under this many px is a click, not a drag. */
const DRAG_THRESHOLD_PX = 4;

/**
 * The Save pill inside its closed shadow root: the main button, a "⋯" menu with "Hide on <Store>" and
 * "Hide everywhere", and an optional note above it. Built with Dom only (page-controlled text never meets
 * innerHTML). Dragging moves it up and down the right edge; a drag never counts as a click.
 *
 * @example new SavePillView(dom, host, root, "Walmart", actions).render({ kind: "save" }, 24, null)
 */
export class SavePillView {
  private readonly main: HTMLButtonElement;
  private readonly menuButton: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly note: HTMLElement;
  private state: PillState = { kind: "save" };
  private dragged = false;

  constructor(
    private readonly dom: Dom,
    private readonly host: HTMLElement,
    root: ShadowRoot,
    storeLabel: string,
    private readonly actions: SavePillActions,
  ) {
    this.main = dom.el("button", { className: "pill-main", attrs: { type: "button" } });
    this.menuButton = dom.el("button", {
      className: "pill-more",
      text: "⋯",
      attrs: { type: "button", "aria-label": "Save button options", "aria-haspopup": "menu", "aria-expanded": "false" },
    });
    this.menu = dom.el("div", { className: "pill-menu", attrs: { role: "menu", hidden: "" } }, [
      this.menuItem(`Hide on ${storeLabel}`, () => actions.hideOnStore()),
      this.menuItem("Hide everywhere", () => actions.hideEverywhere()),
    ]);
    this.note = dom.el("p", { className: "pill-note", attrs: { role: "status", hidden: "" } });
    const pill = dom.el("div", { className: "pill" }, [this.main, this.menuButton]);
    root.append(this.note, this.menu, pill);
    this.main.addEventListener("click", () => this.onMainClick());
    this.menuButton.addEventListener("click", () => {
      if (!this.dragged) this.toggleMenu(this.menu.hidden);
    });
    root.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Escape") this.toggleMenu(false);
    });
    this.enableDrag(pill);
  }

  render(state: PillState, bottom: number, note: string | null): void {
    this.state = state;
    this.main.replaceChildren(
      this.dom.icon(state.kind === "reading" ? "spinner" : state.kind === "save" ? "plus" : "check", "pill-icon"),
      this.dom.el("span", { text: pillLabel(state) }),
    );
    this.main.className = `pill-main pill-${state.kind}`;
    this.main.disabled = state.kind === "reading";
    this.host.style.bottom = `${bottom}px`;
    this.note.hidden = note === null;
    this.note.textContent = note ?? "";
  }

  /** Closes the menu when the shopper clicks elsewhere on the page. */
  closeMenu(): void {
    this.toggleMenu(false);
  }

  private onMainClick(): void {
    if (!this.dragged) this.actions.activate(this.state);
  }

  private menuItem(label: string, onClick: () => void): HTMLButtonElement {
    const item = this.dom.el("button", { className: "pill-menu-item", text: label, attrs: { type: "button", role: "menuitem" } });
    item.addEventListener("click", () => {
      this.toggleMenu(false);
      onClick();
    });
    return item;
  }

  private toggleMenu(open: boolean): void {
    this.menu.hidden = !open;
    this.menuButton.setAttribute("aria-expanded", String(open));
  }

  private enableDrag(handle: HTMLElement): void {
    handle.addEventListener("pointerdown", (down: PointerEvent) => {
      if (down.button !== 0) return;
      const startY = down.clientY;
      const startBottom = Number.parseFloat(this.host.style.bottom) || 0;
      let bottom = startBottom;
      const move = (event: PointerEvent): void => {
        const deltaY = event.clientY - startY;
        if (!this.dragged && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return;
        if (!this.dragged) handle.setPointerCapture(down.pointerId);
        this.dragged = true;
        bottom = clampBottom(startBottom - deltaY, window.innerHeight);
        this.host.style.bottom = `${bottom}px`;
      };
      const up = (): void => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        if (!this.dragged) return;
        this.actions.moved(bottom);
        // The click that follows a drag's pointerup is dropped, then clicks count again.
        setTimeout(() => {
          this.dragged = false;
        }, 0);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }
}
