import type { FontDeclaration, FontSource } from "../types/index.js";

function fontSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "font"
  );
}

function formatFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".woff2")) return "woff2";
  if (lower.includes(".woff")) return "woff";
  if (lower.includes(".ttf")) return "truetype";
  if (lower.includes(".otf")) return "opentype";
  return "woff2";
}

function sourceUrl(src: Extract<FontSource, { type: "asset" | "url" }>): string {
  return src.type === "asset" ? `/assets/${src.fileName}` : src.url;
}

export function buildFontsCss(declarations: FontDeclaration[]): {
  linkUrls: string[];
  fontFaceCss: string;
  cssVars: Record<string, string>;
} {
  const linkUrls: string[] = [];
  const fontFaceBlocks: string[] = [];
  const cssVars: Record<string, string> = {};

  for (const decl of declarations) {
    const slug = fontSlug(decl.name);
    cssVars[`--db-font-${slug}`] = `"${decl.name}"`;

    for (const src of decl.sources) {
      if (src.type === "stylesheet") {
        linkUrls.push(src.url);
      }
    }

    const fileSources = decl.sources.filter(
      (s): s is Extract<FontSource, { type: "asset" | "url" }> =>
        s.type === "asset" || s.type === "url"
    );
    if (fileSources.length > 0) {
      const srcParts = fileSources.map(
        (s) => `url('${sourceUrl(s)}') format('${formatFromUrl(sourceUrl(s))}')`
      );
      fontFaceBlocks.push(
        `@font-face { font-family: "${decl.name}"; src: ${srcParts.join(", ")}; }`
      );
    }
  }

  return { linkUrls, fontFaceCss: fontFaceBlocks.join("\n"), cssVars };
}

export function injectThemeFonts(declarations: FontDeclaration[]): () => void {
  const { linkUrls, fontFaceCss, cssVars } = buildFontsCss(declarations);
  const injected: HTMLElement[] = [];

  for (const url of linkUrls) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.dbFont = "1";
    document.head.appendChild(link);
    injected.push(link);
  }

  if (fontFaceCss) {
    const style = document.createElement("style");
    style.textContent = fontFaceCss;
    style.dataset.dbFont = "1";
    document.head.appendChild(style);
    injected.push(style);
  }

  const root = document.documentElement;
  for (const [prop, value] of Object.entries(cssVars)) {
    root.style.setProperty(prop, value);
  }

  return () => {
    for (const el of injected) el.remove();
    for (const prop of Object.keys(cssVars)) {
      root.style.removeProperty(prop);
    }
  };
}
