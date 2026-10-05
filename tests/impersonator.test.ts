import { beforeEach, describe, expect, it, vi } from "vitest";
import { Impersonator } from "../src/core/impersonator/impersonator";
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
      (imp as any).mapper.setFile("/abs/src", "/gitbox/src");
      (imp as any).mapper.setDir("/abs/node_modules", "/gitbox/node_modules");
      expect(imp.pathMapper).toEqual({
        "/abs/src": "/gitbox/src",
        "/abs/node_modules": "/gitbox/node_modules",
      });
    });

    it("returns empty object when both mappers are empty", () => {
      expect(imp.pathMapper).toEqual({});
    });
  });

  describe("getFileMapper", () => {
    it("returns file mapper with relative sources", () => {
      (imp as any).mapper.setFile(
        "/home/user/project/src",
        "/gitbox/project/src",
      );
      const result = imp.getFileMapper("/home/user/project");
      expect(result).toEqual({ src: "/gitbox/project/src" });
    });
  });

  describe("getDirMapper", () => {
    it("returns directory mapper with relative sources", () => {
      (imp as any).mapper.setDir(
        "/home/user/project/node_modules",
        "/gitbox/project/node_modules",
      );
      const result = imp.getDirMapper("/home/user/project");
      expect(result).toEqual({
        node_modules: "/gitbox/project/node_modules",
      });
    });
  });

  describe("resolvePath", () => {
    it("returns impersonated path from file mapper", async () => {
      (imp as any).mapper.setFile("/project/src", "/gitbox/project/src");
      const result = await imp.resolvePath("src", "/project");
      expect(result).toBe("/gitbox/project/src");
    });

    it("returns impersonated path from dir mapper", async () => {
      (imp as any).mapper.setDir(
        "/project/node_modules",
        "/gitbox/project/node_modules",
      );
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

      expect(imp.pathMapper).toEqual({
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

      expect(imp.pathMapper).toEqual({
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

      expect(imp.getDirMapper("/project")).toEqual({});
    });

    it("resets mappers before initializing", async () => {
      (imp as any).mapper.setFile("/old", "/old-target");
      (imp as any).mapper.setDir("/old-dir", "/old-dir-target");
      vi.spyOn(mockDetector, "getGitignoredFiles").mockReturnValue([]);
      vi.spyOn(mockDetector, "getGitignoredDirectories").mockReturnValue([]);

      await imp.initialize({ cwd: "/project" } as any);

      expect(imp.pathMapper).toEqual({});
    });
  });

  describe("extractFromCommand", () => {
    it("delegates to the command path extractor", () => {
      const result = imp.extractFromCommand("cat file.txt");
      expect(result).toEqual(["cat", "file.txt"]);
    });

    it("handles empty command", () => {
      const result = imp.extractFromCommand("");
      expect(result).toEqual([]);
    });
  });
});
