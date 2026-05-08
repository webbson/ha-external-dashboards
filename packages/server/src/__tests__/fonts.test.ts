import { describe, it, expect } from "vitest";
import { buildFontsCss } from "@ha-external-dashboards/shared";
import type { FontDeclaration } from "@ha-external-dashboards/shared";

describe("buildFontsCss", () => {
  it("generates @font-face for asset source", () => {
    const decls: FontDeclaration[] = [
      {
        id: "1",
        name: "Brand Sans",
        sources: [{ type: "asset", assetId: 1, fileName: "123-brand.woff2" }],
      },
    ];
    const { fontFaceCss, linkUrls, cssVars } = buildFontsCss(decls);
    expect(fontFaceCss).toContain(`font-family: "Brand Sans"`);
    expect(fontFaceCss).toContain(`url('/assets/123-brand.woff2') format('woff2')`);
    expect(linkUrls).toHaveLength(0);
    expect(cssVars["--db-font-brand-sans"]).toBe(`"Brand Sans"`);
  });

  it("generates @font-face for direct url source", () => {
    const decls: FontDeclaration[] = [
      {
        id: "2",
        name: "Inter",
        sources: [{ type: "url", url: "https://cdn.example.com/inter.woff2" }],
      },
    ];
    const { fontFaceCss } = buildFontsCss(decls);
    expect(fontFaceCss).toContain(`url('https://cdn.example.com/inter.woff2') format('woff2')`);
  });

  it("collects stylesheet source as link URL (no @font-face)", () => {
    const decls: FontDeclaration[] = [
      {
        id: "3",
        name: "Roboto",
        sources: [{ type: "stylesheet", url: "https://fonts.googleapis.com/css2?family=Roboto" }],
      },
    ];
    const { fontFaceCss, linkUrls } = buildFontsCss(decls);
    expect(fontFaceCss).toBe("");
    expect(linkUrls).toContain("https://fonts.googleapis.com/css2?family=Roboto");
  });

  it("combines asset + url into single @font-face src stack", () => {
    const decls: FontDeclaration[] = [
      {
        id: "4",
        name: "My Font",
        sources: [
          { type: "asset", assetId: 2, fileName: "456-font.woff2" },
          { type: "url", url: "https://cdn.example.com/font.woff" },
        ],
      },
    ];
    const { fontFaceCss } = buildFontsCss(decls);
    expect(fontFaceCss).toContain(`url('/assets/456-font.woff2') format('woff2')`);
    expect(fontFaceCss).toContain(`url('https://cdn.example.com/font.woff') format('woff')`);
    expect(fontFaceCss.match(/@font-face/g)).toHaveLength(1);
  });

  it("slugifies name with special chars for CSS var", () => {
    const decls: FontDeclaration[] = [
      {
        id: "5",
        name: "My Custom Font!",
        sources: [{ type: "url", url: "https://cdn.example.com/f.woff2" }],
      },
    ];
    const { cssVars } = buildFontsCss(decls);
    expect(cssVars["--db-font-my-custom-font"]).toBe(`"My Custom Font!"`);
  });

  it("returns empty results for empty declarations", () => {
    const { linkUrls, fontFaceCss, cssVars } = buildFontsCss([]);
    expect(linkUrls).toHaveLength(0);
    expect(fontFaceCss).toBe("");
    expect(cssVars).toEqual({});
  });
});
