import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { prerenderedHtml, publicPageFile, shellHtml, HEAD_MARKER, ROOT_MARKER } from "../prerender-html.ts";
import type { AuthClient } from "../src/api/auth-client.ts";
import { rememberSignedIn, SIGNED_IN_HINT_KEY } from "../src/auth/signed-in-hint.ts";
import { renderPublicPage } from "../src/prerender/render-public-page.tsx";
import { PUBLIC_PAGES, pageHeadTags, publicPage } from "../src/seo/public-pages.ts";

const context = { origin: "https://picky.example", extensionUrl: "https://store.example/picky" };
const built = `<head>${HEAD_MARKER}</head><body>${ROOT_MARKER}</body>`;

describe("search metadata for public pages", () => {
  test("each page has its own title and a description search results show whole", () => {
    const titles = new Set(PUBLIC_PAGES.map((page) => page.name));
    expect(titles.size).toBe(PUBLIC_PAGES.length);
    for (const page of PUBLIC_PAGES) {
      expect(`${page.name} · Picky`.length).toBeLessThanOrEqual(60);
      expect(page.description.length).toBeLessThanOrEqual(160);
    }
  });

  test("the homepage title leads with the two main stores", () => {
    expect(pageHeadTags(publicPage("/"), context)).toContain(
      "<title>Compare Amazon, Flipkart and more, side by side · Picky</title>",
    );
  });

  test("head tags carry the title, canonical URL and link-preview tags", () => {
    const tags = pageHeadTags(publicPage("/extension"), context);
    expect(tags).toContain(`<title>${publicPage("/extension").name} · Picky</title>`);
    expect(tags).toContain('<link rel="canonical" href="https://picky.example/extension" />');
    expect(tags).toContain('<meta property="og:image" content="https://picky.example/mascot.png" />');
    expect(tags).not.toContain("application/ld+json");
  });

  test("the homepage describes Picky as a free browser app in JSON-LD", () => {
    const tags = pageHeadTags(publicPage("/"), context);
    const json = tags.match(/<script type="application\/ld\+json">(.*)<\/script>/)?.[1];
    const graph = JSON.parse(json ?? "null")["@graph"];
    expect(graph[1]).toMatchObject({
      "@type": "SoftwareApplication",
      downloadUrl: context.extensionUrl,
      offers: { price: "0" },
    });
  });

  test("without a known origin, absolute-URL tags are left out", () => {
    const tags = pageHeadTags(publicPage("/"), { ...context, origin: null });
    expect(tags).not.toContain("canonical");
    expect(tags).not.toContain("og:url");
    expect(tags).not.toContain("ld+json");
  });

  test("only public pages have search metadata", () => {
    expect(() => publicPage("/comparisons")).toThrow('No public page at "/comparisons"');
  });
});

describe("prerendered HTML", () => {
  test("every public page renders its content as a signed-out visitor", async () => {
    const headings = {
      "/": "products without opening more tabs.",
      "/extension": "Get the Picky extension",
      "/privacy": "Privacy policy",
    };
    for (const page of PUBLIC_PAGES) {
      const html = await renderPublicPage(page.path, { extensionUrl: context.extensionUrl });
      expect(html).toContain(headings[page.path as keyof typeof headings]);
      expect(html).not.toContain("Sign out");
    }
  });

  test("a public page gets its head and its markup inside the root", () => {
    const html = prerenderedHtml(built, publicPage("/privacy"), "<main>Policy</main>", context);
    expect(html).toContain("<title>Privacy · Picky</title>");
    expect(html).toContain('<div id="root"><div data-prerendered><main>Policy</main></div></div>');
  });

  test("the app shell stays empty and out of search results", () => {
    const html = shellHtml(built);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).toContain(ROOT_MARKER);
  });

  test("vercel.json serves each prerendered page at its path and the shell everywhere else", async () => {
    const vercel = await Bun.file(join(import.meta.dir, "../vercel.json")).json();
    const rewrites: { source: string; destination: string }[] = vercel.rewrites;
    for (const page of PUBLIC_PAGES.filter((candidate) => candidate.path !== "/")) {
      expect(rewrites).toContainEqual({ source: page.path, destination: `/${publicPageFile(page.path)}` });
    }
    expect(publicPageFile("/")).toBe("index.html");
    expect(rewrites.at(-1)?.destination).toBe("/app.html");
  });
});

describe("signed-in hint", () => {
  function setup(user: { id: string } | null) {
    const stored = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    };
    const inner = {
      currentUser: async () => user,
      signIn: async () => ({ id: "u1" }),
      signUp: async () => ({ id: "u1" }),
      signOut: async () => {},
    } as unknown as AuthClient;
    return { stored, client: rememberSignedIn(inner, storage) };
  }

  test("follows every answer about the session", async () => {
    const { stored, client } = setup({ id: "u1" });
    await client.currentUser();
    expect(stored.get(SIGNED_IN_HINT_KEY)).toBe("1");
    await client.signOut();
    expect(stored.has(SIGNED_IN_HINT_KEY)).toBeFalse();
    await client.signIn("me@example.com", "pw");
    expect(stored.get(SIGNED_IN_HINT_KEY)).toBe("1");
  });

  test("a signed-out answer clears it, and blocked storage is ignored", async () => {
    const { stored, client } = setup(null);
    stored.set(SIGNED_IN_HINT_KEY, "1");
    await client.currentUser();
    expect(stored.has(SIGNED_IN_HINT_KEY)).toBeFalse();
    const blocked = rememberSignedIn(client, {
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(await blocked.currentUser()).toBeNull();
  });
});
