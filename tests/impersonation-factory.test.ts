import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { ImpersonationFactory } from "../src/core/impersonator/impersonation-factory";
import { Detector } from "../src/core/detector";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

describe("ImpersonationFactory", () => {
  let factory: ImpersonationFactory;
  let mockDetector: Detector;

  beforeEach(() => {
    vi.resetAllMocks();
    mockDetector = new Detector(vi.fn());
    factory = new ImpersonationFactory(mockDetector);
  });

  describe("createDirectory", () => {
    it("creates and returns impersonated path when it doesn't exist", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await factory.createDirectory(
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
      const result = await factory.createDirectory(
        "node_modules",
        "/gitbox/project",
      );
      expect(result).toBe("node_modules");
    });

    it("returns impersonated path when it already exists", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(true);
      const result = await factory.createDirectory(
        "node_modules",
        "/gitbox/project",
      );
      expect(result).toBe("/gitbox/project/node_modules");
      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe("createFile", () => {
    it("creates and returns impersonated path for .json files", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await factory.createFile("launch.json", "/gitbox/project");
      expect(result).toBe("/gitbox/project/launch.json");
      expect(writeFile).toHaveBeenCalledWith(
        "/gitbox/project/launch.json",
        "{}",
      );
    });

    it("creates and returns impersonated path for non-json files", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      const result = await factory.createFile("file.txt", "/gitbox/project");
      expect(result).toBe("/gitbox/project/file.txt");
      expect(writeFile).toHaveBeenCalledWith("/gitbox/project/file.txt", " ");
    });

    it("creates parent directories before writing", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      await factory.createFile("sub/dir/file.txt", "/gitbox/project");
      expect(mkdir).toHaveBeenCalledWith("/gitbox/project/sub/dir", {
        recursive: true,
      });
    });

    it("returns relative path when writeFile throws", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(false);
      vi.mocked(writeFile).mockRejectedValue(new Error("EACCES"));
      const result = await factory.createFile("file.txt", "/gitbox/project");
      expect(result).toBe("file.txt");
    });

    it("returns impersonated path when file already exists", async () => {
      vi.spyOn(mockDetector, "pathExists").mockResolvedValue(true);
      const result = await factory.createFile("file.txt", "/gitbox/project");
      expect(result).toBe("/gitbox/project/file.txt");
      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});
