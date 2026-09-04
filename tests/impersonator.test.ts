import { beforeEach, describe, expect, it } from "vitest";
import { Impersonator } from "../src/impersonator";

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

    it("does not extract command flags", async () => {
      const result = await imp.extractFromCommand("ls -la -R");
      expect(result).toEqual(["ls"]);
    });

    it("does not extract URLs", async () => {
      const result = await imp.extractFromCommand(
        "curl https://example.com/file.txt",
      );
      expect(result).toContain("curl");
      expect(result).not.toContain("https://example.com/file.txt");
    });

    it("does not extract environment variable assignments", async () => {
      const result = await imp.extractFromCommand(
        "NODE_ENV=production node app.js",
      );
      expect(result).toContain("node");
      expect(result).toContain("app.js");
      expect(result).not.toContain("NODE_ENV=production");
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

    it("rejects shell reserved words", async () => {
      const result = await imp.extractFromCommand("if true then else fi");
      expect(result).not.toContain("true");
      expect(result).not.toContain("then");
      expect(result).not.toContain("else");
      expect(result).not.toContain("fi");
    });
  });

  describe("isReadOnlyCommand", () => {
    it("accepts a simple read-only command", () => {
      expect(imp.isReadOnlyCommand("cat file.txt")).toBe(true);
    });

    it("accepts piped read-only commands", () => {
      expect(imp.isReadOnlyCommand("ls | grep pattern")).toBe(true);
    });

    it("accepts chained read-only commands", () => {
      expect(imp.isReadOnlyCommand("ls && cat file.txt")).toBe(true);
    });

    it("accepts read-only commands with globs", () => {
      expect(imp.isReadOnlyCommand("ls *.ts")).toBe(true);
    });

    it("rejects output redirection", () => {
      expect(imp.isReadOnlyCommand("cat file.txt > /tmp/output")).toBe(false);
    });

    it("rejects stderr redirection", () => {
      expect(imp.isReadOnlyCommand("cat file.txt 2>/dev/null")).toBe(false);
    });

    it("rejects command substitution", () => {
      expect(imp.isReadOnlyCommand("echo $(whoami)")).toBe(false);
    });

    it("rejects sudo prefix", () => {
      expect(imp.isReadOnlyCommand("sudo cat /etc/shadow")).toBe(false);
    });

    it("rejects non-read-only programs", () => {
      expect(imp.isReadOnlyCommand("bash -c 'cat /etc/shadow'")).toBe(false);
    });

    it("rejects subshells", () => {
      expect(imp.isReadOnlyCommand("(cat file.txt)")).toBe(false);
    });

    it("rejects relative program paths", () => {
      expect(imp.isReadOnlyCommand("./cat file.txt")).toBe(false);
    });

    it("rejects absolute program paths", () => {
      expect(imp.isReadOnlyCommand("/usr/bin/cat file.txt")).toBe(false);
    });

    it("rejects mixed read-only and write commands", () => {
      expect(imp.isReadOnlyCommand("cat file.txt; rm -rf /")).toBe(false);
    });

    it("rejects empty command", () => {
      expect(imp.isReadOnlyCommand("")).toBe(false);
    });

    it("rejects environment variable assignments", () => {
      expect(imp.isReadOnlyCommand("FOO=1 cat file.txt")).toBe(false);
    });
  });
});
