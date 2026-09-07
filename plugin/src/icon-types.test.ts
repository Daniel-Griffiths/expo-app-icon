import { describe, expect, it } from "vitest";

import { ICON_TYPES_FILE, renderIconTypes } from "./index";

describe("renderIconTypes", () => {
  it("augments the registry module that IconName reads, not the package entry", () => {
    const out = renderIconTypes(["red", "blue"]);
    expect(out).toContain('declare module "expo-app-icon/build/types"');
    expect(out).not.toContain('declare module "expo-app-icon" {');
    expect(out).toContain('    IconName: "red" | "blue";');
    expect(out).toContain('import "expo-app-icon";');
    expect(out.endsWith("\n")).toBe(true);
  });

  it("leaves the registry empty (IconName widens to string) when no icons are configured", () => {
    const out = renderIconTypes([]);
    expect(out).toContain("interface DynamicAppIconRegistry {\n  }");
    expect(out).not.toContain("IconName:");
  });

  it("escapes icon names as JSON strings", () => {
    expect(renderIconTypes(['we"ird'])).toContain('IconName: "we\\"ird";');
  });

  it("names the generated file like expo-env.d.ts", () => {
    expect(ICON_TYPES_FILE).toBe("expo-app-icon-env.d.ts");
  });
});
