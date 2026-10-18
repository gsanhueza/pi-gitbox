import { describe, expect, it } from "vitest";
import { joinPaths, resolvePaths } from "../../src/utils/compat";

describe("joinPaths", () => {
  it("joins multiple segments", () => {
    expect(joinPaths("/a", "/b", "/c")).toBe("/a/b/c");
  });

  it("handles relative segments", () => {
    expect(joinPaths("a", "b", "c")).toBe("a/b/c");
  });
});

describe("resolvePaths", () => {
  it("resolves relative against cwd", () => {
    expect(resolvePaths("/cwd", "relative")).toBe("/cwd/relative");
  });

  it("resolves multiple relative segments", () => {
    expect(resolvePaths("/base", "a", "b")).toBe("/base/a/b");
  });
});
