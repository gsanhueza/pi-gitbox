import { beforeEach, describe, expect, it } from "vitest";
import { Impersonator } from "../src/core/impersonator";

describe("Impersonator", () => {
  let imp: Impersonator;

  beforeEach(() => {
    imp = new Impersonator();
  });

  describe("extractFromCommand", () => {
    it("extracts paths from a simple command", async () => {
      const result = await imp.extractFromCommand("cat file.txt");
      expect(result).toEqual(["cat", "file.txt"]);
    });

    it("extracts paths from glob patterns", async () => {
      const result = await imp.extractFromCommand("file dist/*");
      expect(result).toContain("file");
      expect(result).toContain("dist");
    });

    it("handles bare glob by excluding it", async () => {
      const result = await imp.extractFromCommand("ls *");
      expect(result).toEqual(["ls"]);
    });

    it("extracts paths from multiple globs", async () => {
      const result = await imp.extractFromCommand("src/*.ts test/*.test.ts");
      expect(result).toContain("src");
      expect(result).toContain("test");
    });

    it("does not extract shell operators", async () => {
      const result = await imp.extractFromCommand("cat a.txt && cat b.txt");
      expect(result).toContain("cat");
      expect(result).toContain("a.txt");
      expect(result).toContain("b.txt");
      expect(result).not.toContain("&&");
    });

    it("extracts command flags as tokens", async () => {
      const result = await imp.extractFromCommand("ls -la -R");
      expect(result).toContain("-la");
      expect(result).toContain("-R");
    });

    it("extracts URLs as tokens", async () => {
      const result = await imp.extractFromCommand(
        "curl https://example.com/file.txt",
      );
      expect(result).toContain("curl");
      expect(result).toContain("https://example.com/file.txt");
    });

    it("extracts environment variable assignments as tokens", async () => {
      const result = await imp.extractFromCommand(
        "NODE_ENV=production node app.js",
      );
      expect(result).toContain("node");
      expect(result).toContain("app.js");
      expect(result).toContain("NODE_ENV=production");
    });

    it("handles mixed paths and globs", async () => {
      const result = await imp.extractFromCommand(
        "cp src/main.ts dist/main.ts",
      );
      expect(result).toContain("cp");
      expect(result).toContain("src/main.ts");
      expect(result).toContain("dist/main.ts");
    });

    it("handles nested glob paths", async () => {
      const result = await imp.extractFromCommand("build src/**/*");
      expect(result).toContain("build");
      expect(result).toContain("src");
    });

    it("handles empty command", async () => {
      const result = await imp.extractFromCommand("");
      expect(result).toEqual([]);
    });

    it("extracts shell reserved words as tokens", async () => {
      const result = await imp.extractFromCommand("if true then else fi");
      expect(result).toContain("if");
      expect(result).toContain("true");
      expect(result).toContain("then");
      expect(result).toContain("else");
      expect(result).toContain("fi");
    });
  });
});
