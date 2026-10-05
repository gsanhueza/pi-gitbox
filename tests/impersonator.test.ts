import { beforeEach, describe, expect, it, vi } from "vitest";
import { Impersonator } from "../src/core/impersonator";
import { Detector } from "../src/core/detector";
import { Settings } from "../src/settings";

describe("Impersonator", () => {
  let imp: Impersonator;
  let mockDetector: Detector;

  let mockSettings: Settings;

  beforeEach(() => {
    mockDetector = new Detector(vi.fn());
    mockSettings = {
      getConfig: vi.fn().mockResolvedValue({
        config: { impersonateDirs: true, baseDir: "/gitbox" },
        errors: [],
      }),
    } as unknown as Settings;
    imp = new Impersonator(mockDetector, mockSettings);
  });

  describe("pathMapper", () => {
    it("combines file and directory mappers", () => {
      // Access private fields via any to set up test state
      (imp as any).fileMapper = { "/abs/src": "/gitbox/src" };
      (imp as any).dirMapper = { "/abs/node_modules": "/gitbox/node_modules" };
      expect(imp.pathMapper).toEqual({
        "/abs/src": "/gitbox/src",
        "/abs/node_modules": "/gitbox/node_modules",
      });
    });

    it("returns empty object when both mappers are empty", () => {
      (imp as any).fileMapper = {};
      (imp as any).dirMapper = {};
      expect(imp.pathMapper).toEqual({});
    });
  });

  describe("stripGlobPattern", () => {
    it("strips trailing * from path", async () => {
      const result = await imp.extractFromCommand("ls dist/*");
      expect(result).toContain("dist");
    });

    it("returns empty string for bare *", async () => {
      const result = await imp.extractFromCommand("ls *");
      expect(result).not.toContain("");
    });

    it("returns unchanged path without glob", async () => {
      const result = await imp.extractFromCommand("ls file.txt");
      expect(result).toContain("file.txt");
    });

    it("strips path before last / in nested glob", async () => {
      const result = await imp.extractFromCommand("ls src/**/*");
      expect(result).toContain("src");
    });
  });

  describe("buildMapper", () => {
    it("converts absolute paths to relative", () => {
      const mapper = {
        "/home/user/project/src": "/gitbox/project/src",
        "/home/user/project/lib": "/gitbox/project/lib",
      };
      const result = (imp as any).buildMapper(mapper, "/home/user/project");
      expect(result).toEqual({
        src: "/gitbox/project/src",
        lib: "/gitbox/project/lib",
      });
    });

    it("returns empty object for empty input", () => {
      const result = (imp as any).buildMapper({}, "/base");
      expect(result).toEqual({});
    });
  });

  describe("getFileMapper", () => {
    it("returns file mapper with relative sources", () => {
      (imp as any).fileMapper = {
        "/home/user/project/src": "/gitbox/project/src",
      };
      const result = imp.getFileMapper("/home/user/project");
      expect(result).toEqual({ src: "/gitbox/project/src" });
    });
  });

  describe("getDirMapper", () => {
    it("returns directory mapper with relative sources", () => {
      (imp as any).dirMapper = {
        "/home/user/project/node_modules": "/gitbox/project/node_modules",
      };
      const result = imp.getDirMapper("/home/user/project");
      expect(result).toEqual({
        node_modules: "/gitbox/project/node_modules",
      });
    });
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
