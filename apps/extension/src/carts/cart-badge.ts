import type { BadgeText } from "../link-capture/badge-counter.ts";

/**
 * Shares the toolbar badge between the in-flight save count (BadgeCounter writes it through `set`) and the
 * selected cart's item count: a save in progress shows its count, and when it ends the cart count comes back
 * instead of a blank badge. The cart count is only known once a cart call ran since the worker started.
 *
 * @example const badge = new CartBadge(new ChromeBadgeText()); await badge.showCartCount(3)
 */
export class CartBadge implements BadgeText {
  private savingText = "";
  private cartCount = 0;

  constructor(private readonly badge: BadgeText) {}

  /** The in-flight save count; "" when no save is running. */
  set(text: string): Promise<void> {
    this.savingText = text;
    return this.show();
  }

  showCartCount(count: number): Promise<void> {
    this.cartCount = count;
    return this.show();
  }

  private show(): Promise<void> {
    if (this.savingText !== "") return this.badge.set(this.savingText);
    return this.badge.set(this.cartCount === 0 ? "" : String(this.cartCount));
  }
}
