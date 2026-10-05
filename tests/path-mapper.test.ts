import { describe, expect, it } from "vitest";
import { PathMapper } from "../src/core/impersonator/path-mapper";

describe("PathMapper", () => {
  describe("pathMapper", () => {
    it("combines file and directory mappers", () => {
      const mapper = new PathMapper();
      mapper.setFile("/abs/src", "/gitbox/src");
      mapper.setDir("/abs/node_modules", "/gitbox/node_modules");
      expect(mapper.pathMapper).toEqual({
        "/abs/src": "/gitbox/src",
        "/abs/node_modules": "/gitbox/node_modules",
      });
    });

    it("returns empty object when both mappers are empty", () => {
      const mapper = new PathMapper();
      expect(mapper.pathMapper).toEqual({});
    });
  });

  describe("getFiles", () => {
    it("returns file mapper with relative sources", () => {
      const mapper = new PathMapper();
      mapper.setFile("/home/user/project/src", "/gitbox/project/src");
      const result = mapper.getFiles("/home/user/project");
      expect(result).toEqual({ src: "/gitbox/project/src" });
    });

    it("converts multiple absolute paths to relative", () => {
      const mapper = new PathMapper();
      mapper.setFile("/home/user/project/src", "/gitbox/project/src");
      mapper.setFile("/home/user/project/lib", "/gitbox/project/lib");
      const result = mapper.getFiles("/home/user/project");
      expect(result).toEqual({
        src: "/gitbox/project/src",
        lib: "/gitbox/project/lib",
      });
    });

    it("returns empty object for empty mapper", () => {
      const mapper = new PathMapper();
      expect(mapper.getFiles("/base")).toEqual({});
    });
  });

  describe("getDirs", () => {
    it("returns directory mapper with relative sources", () => {
      const mapper = new PathMapper();
      mapper.setDir(
        "/home/user/project/node_modules",
        "/gitbox/project/node_modules",
      );
      const result = mapper.getDirs("/home/user/project");
      expect(result).toEqual({
        node_modules: "/gitbox/project/node_modules",
      });
    });
  });

  describe("lookups", () => {
    it("returns registered file mapping", () => {
      const mapper = new PathMapper();
      mapper.setFile("/abs/src", "/gitbox/src");
      expect(mapper.getFile("/abs/src")).toBe("/gitbox/src");
      expect(mapper.getDir("/abs/src")).toBeUndefined();
    });

    it("returns registered dir mapping", () => {
      const mapper = new PathMapper();
      mapper.setDir("/abs/node_modules", "/gitbox/node_modules");
      expect(mapper.getDir("/abs/node_modules")).toBe("/gitbox/node_modules");
      expect(mapper.getFile("/abs/node_modules")).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("empties both mappers", () => {
      const mapper = new PathMapper();
      mapper.setFile("/old", "/old-target");
      mapper.setDir("/old-dir", "/old-dir-target");

      mapper.reset();

      expect(mapper.pathMapper).toEqual({});
    });
  });
});
