import { describe, expect, it } from "vitest";
import { CommandPathExtractor } from "../src/core/impersonator/command-path-extractor";

describe("CommandPathExtractor", () => {
  const extractor = new CommandPathExtractor();

  describe("extract", () => {
    it("extracts paths from a simple command", () => {
      const result = extractor.extract("cat file.txt");
      expect(result).toEqual(["cat", "file.txt"]);
    });

    it("extracts paths from glob patterns", () => {
      const result = extractor.extract("file dist/*");
      expect(result).toContain("file");
      expect(result).toContain("dist");
    });

    it("handles bare glob by excluding it", () => {
      const result = extractor.extract("ls *");
      expect(result).toEqual(["ls"]);
    });

    it("extracts paths from multiple globs", () => {
      const result = extractor.extract("src/*.ts test/*.test.ts");
      expect(result).toContain("src");
      expect(result).toContain("test");
    });

    it("does not extract shell operators", () => {
      const result = extractor.extract("cat a.txt && cat b.txt");
      expect(result).toContain("cat");
      expect(result).toContain("a.txt");
      expect(result).toContain("b.txt");
      expect(result).not.toContain("&&");
    });

    it("extracts command flags as tokens", () => {
      const result = extractor.extract("ls -la -R");
      expect(result).toContain("-la");
      expect(result).toContain("-R");
    });

    it("extracts URLs as tokens", () => {
      const result = extractor.extract("curl https://example.com/file.txt");
      expect(result).toContain("curl");
      expect(result).toContain("https://example.com/file.txt");
    });

    it("extracts environment variable assignments as tokens", () => {
      const result = extractor.extract("NODE_ENV=production node app.js");
      expect(result).toContain("node");
      expect(result).toContain("app.js");
      expect(result).toContain("NODE_ENV=production");
    });

    it("handles mixed paths and globs", () => {
      const result = extractor.extract("cp src/main.ts dist/main.ts");
      expect(result).toContain("cp");
      expect(result).toContain("src/main.ts");
      expect(result).toContain("dist/main.ts");
    });

    it("handles nested glob paths", () => {
      const result = extractor.extract("build src/**/*");
      expect(result).toContain("build");
      expect(result).toContain("src");
    });

    it("handles empty command", () => {
      const result = extractor.extract("");
      expect(result).toEqual([]);
    });

    it("extracts shell reserved words as tokens", () => {
      const result = extractor.extract("if true then else fi");
      expect(result).toContain("if");
      expect(result).toContain("true");
      expect(result).toContain("then");
      expect(result).toContain("else");
      expect(result).toContain("fi");
    });
  });

  describe("stripGlobPattern", () => {
    it("strips trailing * from path", () => {
      const result = extractor.extract("ls dist/*");
      expect(result).toEqual(["ls", "dist"]);
    });

    it("returns no path for bare *", () => {
      const result = extractor.extract("ls *");
      expect(result).toEqual(["ls"]);
    });

    it("returns unchanged path without glob", () => {
      const result = extractor.extract("ls file.txt");
      expect(result).toEqual(["ls", "file.txt"]);
    });

    it("strips path before last / in nested glob", () => {
      const result = extractor.extract("ls src/**/*");
      expect(result).toEqual(["ls", "src"]);
    });

    it("returns no path for glob starting with *", () => {
      const result = extractor.extract("ls *file");
      expect(result).toEqual(["ls"]);
    });
  });
});
