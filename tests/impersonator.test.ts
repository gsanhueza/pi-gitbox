import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { Impersonator } from "../src/core/impersonator";
import { Detector } from "../src/core/detector";
import { Settings } from "../src/settings";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

describe("Impersonator", () => {
  let imp: Impersonator;
  let mockDetector: Detector;

  let mockSettings: Settings;

  beforeEach(() => {
    vi.resetAllMocks();
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
      expect(result).toEqual(["ls", "dist"]);
    });

    it("returns no path for bare *", async () => {
      const result = await imp.extractFromCommand("ls *");
      expect(result).toEqual(["ls"]);
    });

    it("returns unchanged path without glob", async () => {
      const result = await imp.extractFromCommand("ls file.txt");
      expect(result).toEqual(["ls", "file.txt"]);
    });

    it("strips path before last / in nested glob", async () => {
      const result = await imp.extractFromCommand("ls src/**/*");
      expect(result).toEqual(["ls", "src"]);
    });

    it("returns no path for glob starting with *", async () => {
      const result = await imp.extractFromCommand("ls *file");
      expect(result).toEqual(["ls"]);
    });

    it("returns value unchanged when pattern has no *", () => {
      expect((imp as any).stripGlobPattern("file.txt")).toBe("file.txt");
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

  describe("createDirectory", () => {
    it("creates and returns impersonated path when it doesn't exist", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await (imp as any).createDirectory(
        "node_modules",
        "/gitbox/project",
      );
      expect(result).toBe("/gitbox/project/node_modules");
      expect(mkdir).toHaveBeenCalledWith("/gitbox/project/node_modules", {
        recursive: true,
      });
    });

    it("returns relative path when mkdir throws", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      vi.mocked(mkdir).mockRejectedValue(new Error("EACCES"));
      const result = await (imp as any).createDirectory(
        "node_modules",
        "/gitbox/project",
      );
      expect(result).toBe("node_modules");
    });

    it("returns impersonated path when it already exists", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(true);
      const result = await (imp as any).createDirectory(
        "node_modules",
        "/gitbox/project",
      );
      expect(result).toBe("/gitbox/project/node_modules");
      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe("createFile", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("creates and returns impersonated path for .json files", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await (imp as any).createFile(
        "launch.json",
        "/gitbox/project",
      );
      expect(result).toBe("/gitbox/project/launch.json");
      expect(writeFile).toHaveBeenCalledWith(
        "/gitbox/project/launch.json",
        "{}",
      );
    });

    it("creates and returns impersonated path for non-json files", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await (imp as any).createFile(
        "file.txt",
        "/gitbox/project",
      );
      expect(result).toBe("/gitbox/project/file.txt");
      expect(writeFile).toHaveBeenCalledWith("/gitbox/project/file.txt", " ");
    });

    it("creates parent directories before writing", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      await (imp as any).createFile("sub/dir/file.txt", "/gitbox/project");
      expect(mkdir).toHaveBeenCalledWith("/gitbox/project/sub/dir", {
        recursive: true,
      });
    });

    it("returns relative path when writeFile throws", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      vi.mocked(writeFile).mockRejectedValue(new Error("EACCES"));
      const result = await (imp as any).createFile(
        "file.txt",
        "/gitbox/project",
      );
      expect(result).toBe("file.txt");
    });

    it("returns impersonated path when file already exists", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(true);
      const result = await (imp as any).createFile(
        "file.txt",
        "/gitbox/project",
      );
      expect(result).toBe("/gitbox/project/file.txt");
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe("resolvePath", () => {
    it("returns impersonated path from file mapper", async () => {
      (imp as any).fileMapper = { "/project/src": "/gitbox/project/src" };
      const result = await imp.resolvePath("src", "/project");
      expect(result).toBe("/gitbox/project/src");
    });

    it("returns impersonated path from dir mapper", async () => {
      (imp as any).dirMapper = {
        "/project/node_modules": "/gitbox/project/node_modules",
      };
      const result = await imp.resolvePath("node_modules", "/project");
      expect(result).toBe("/gitbox/project/node_modules");
    });

    it("returns original path when impersonateDirs is false", async () => {
      (mockSettings.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        config: { impersonateDirs: false, baseDir: "/gitbox" },
        errors: [],
      });
      const result = await imp.resolvePath("node_modules", "/project");
      expect(result).toBe("node_modules");
    });

    it("returns original path when dynamicCheck returns false", async () => {
      vi.spyOn(mockDetector, "dynamicCheck").mockReturnValue(false);
      const result = await imp.resolvePath("unknown", "/project");
      expect(result).toBe("unknown");
    });

    it("creates and returns file when dynamicCheck is true and not a directory", async () => {
      vi.spyOn(mockDetector, "dynamicCheck").mockReturnValue(true);
      vi.spyOn(mockDetector, "isDirectory").mockReturnValue(false);
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await imp.resolvePath("/project/launch.json", "/project");
      expect(result).toBe("/gitbox/project/launch.json");
    });

    it("creates and returns directory when dynamicCheck is true and is a directory", async () => {
      vi.spyOn(mockDetector, "dynamicCheck").mockReturnValue(true);
      vi.spyOn(mockDetector, "isDirectory").mockReturnValue(true);
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await imp.resolvePath("/project/node_modules", "/project");
      expect(result).toBe("/gitbox/project/node_modules");
    });
  });

  describe("resolveCommand", () => {
    it("replaces file paths with impersonated ones", async () => {
      vi.spyOn(imp, "resolvePath").mockImplementation((path) => {
        if (path === "src") return Promise.resolve("/gitbox/project/src");
        return Promise.resolve(path);
      });
      const result = await imp.resolveCommand("cat src", "/project");
      expect(result).toBe("cat /gitbox/project/src");
    });

    it("replaces multiple paths", async () => {
      vi.spyOn(imp, "resolvePath").mockImplementation((path) => {
        if (path === "src") return Promise.resolve("/gitbox/project/src");
        if (path === "dist") return Promise.resolve("/gitbox/project/dist");
        return Promise.resolve(path);
      });
      const result = await imp.resolveCommand("cp src dist", "/project");
      expect(result).toBe("cp /gitbox/project/src /gitbox/project/dist");
    });

    it("returns original command when paths are not impersonated", async () => {
      vi.spyOn(imp, "resolvePath").mockImplementation((path: string) =>
        Promise.resolve(path),
      );
      const result = await imp.resolveCommand("cat file", "/project");
      expect(result).toBe("cat file");
    });

    it("handles empty command", async () => {
      const result = await imp.resolveCommand("", "/project");
      expect(result).toBe("");
    });
  });

  describe("initialize", () => {
    beforeEach(() => {
      vi.resetAllMocks();
      (mockSettings.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        config: { impersonateDirs: true, baseDir: "/gitbox" },
        errors: [],
      });
    });

    it("initializes file mapper with gitignored files", async () => {
      vi.spyOn(mockDetector, "getGitignoredFiles").mockReturnValue([
        ".gitignore",
        "README.md",
      ]);
      vi.spyOn(mockDetector, "getGitignoredDirectories").mockReturnValue([]);
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);

      await imp.initialize({ cwd: "/project" } as any);

      expect((imp as any).fileMapper).toEqual({
        "/project/.gitignore": "/gitbox/project/.gitignore",
        "/project/README.md": "/gitbox/project/README.md",
      });
    });

    it("initializes directory mapper when impersonateDirs is true", async () => {
      vi.spyOn(mockDetector, "getGitignoredFiles").mockReturnValue([]);
      vi.spyOn(mockDetector, "getGitignoredDirectories").mockReturnValue([
        "node_modules",
      ]);
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);

      await imp.initialize({ cwd: "/project" } as any);

      expect((imp as any).dirMapper).toEqual({
        "/project/node_modules": "/gitbox/project/node_modules",
      });
    });

    it("skips directory initialization when impersonateDirs is false", async () => {
      (mockSettings.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        config: { impersonateDirs: false, baseDir: "/gitbox" },
        errors: [],
      });
      vi.spyOn(mockDetector, "getGitignoredFiles").mockReturnValue([]);
      vi.spyOn(mockDetector, "getGitignoredDirectories").mockReturnValue([
        "node_modules",
      ]);

      await imp.initialize({ cwd: "/project" } as any);

      expect((imp as any).dirMapper).toEqual({});
    });

    it("resets mappers before initializing", async () => {
      (imp as any).fileMapper = { "/old": "/old-target" };
      (imp as any).dirMapper = { "/old-dir": "/old-dir-target" };
      vi.spyOn(mockDetector, "getGitignoredFiles").mockReturnValue([]);
      vi.spyOn(mockDetector, "getGitignoredDirectories").mockReturnValue([]);

      await imp.initialize({ cwd: "/project" } as any);

      expect((imp as any).fileMapper).toEqual({});
      expect((imp as any).dirMapper).toEqual({});
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
