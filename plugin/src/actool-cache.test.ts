import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(__dirname, "../../scripts/actool-cache/actool");

/**
 * Stand-in for actool: counts its runs, writes one file into the `--compile`
 * folder and the partial Info.plist, and prints them the way actool does.
 */
const FAKE_ACTOOL = `#!/bin/bash
echo run >> "$FAKE_ACTOOL_RUNS"
[ -n "\${FAKE_ACTOOL_FAIL:-}" ] && exit 3
while [ $# -gt 0 ]; do
  case "$1" in
    --compile) compile="$2" ;;
    --output-partial-info-plist) plist="$2" ;;
  esac
  shift
done
[ -z "\${compile:-}" ] && { echo "version"; exit 0; }
mkdir -p "$compile"
date +%s%N > "$compile/Assets.car"
echo plist > "$plist"
echo "/* com.apple.actool.compilation-results */"
echo "$plist"
echo "$compile/Assets.car"
`;

describe.skipIf(process.platform !== "darwin")("scripts/actool-cache/actool", () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;
  let args: string[];

  /** Runs the script and returns its exit status and output. */
  const run = (extraEnv: NodeJS.ProcessEnv = {}, callArgs = args) =>
    spawnSync(SCRIPT, callArgs, { cwd: dir, env: { ...env, ...extraEnv }, encoding: "utf8" });

  /** How many times the stand-in actool has run. */
  const runs = () =>
    fs.existsSync(env.FAKE_ACTOOL_RUNS!)
      ? fs.readFileSync(env.FAKE_ACTOOL_RUNS!, "utf8").trim().split("\n").length
      : 0;

  /** Deletes what a build would have produced, as a clean build does. */
  const cleanOutputs = () => fs.rmSync(path.join(dir, "out"), { recursive: true, force: true });

  beforeEach(() => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "actool-cache-")));
    const actool = path.join(dir, "actool");
    fs.writeFileSync(actool, FAKE_ACTOOL, { mode: 0o755 });
    fs.mkdirSync(path.join(dir, "red.icon"));
    fs.writeFileSync(path.join(dir, "red.icon", "icon.json"), "{}");
    env = {
      PATH: process.env.PATH,
      HOME: dir,
      EXPO_APP_ICON_ACTOOL: actool,
      EXPO_APP_ICON_ACTOOL_CACHE_DIR: path.join(dir, "cache"),
      FAKE_ACTOOL_RUNS: path.join(dir, "runs"),
    };
    args = [
      path.join(dir, "red.icon"),
      "--compile",
      path.join(dir, "out", "thinned"),
      "--output-format",
      "human-readable-text",
      "--output-partial-info-plist",
      path.join(dir, "out", "partial.plist"),
      "--app-icon",
      "red",
    ];
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("replays an identical compile without running actool again", () => {
    const first = run();
    const car = fs.readFileSync(path.join(dir, "out", "thinned", "Assets.car"), "utf8");
    cleanOutputs();
    const second = run();

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(runs()).toBe(1);
    expect(second.stdout).toBe(first.stdout);
    expect(fs.readFileSync(path.join(dir, "out", "thinned", "Assets.car"), "utf8")).toBe(car);
    expect(fs.readFileSync(path.join(dir, "out", "partial.plist"), "utf8")).toBe("plist\n");
  });

  it("compiles again when an icon file changes", () => {
    run();
    fs.writeFileSync(path.join(dir, "red.icon", "icon.json"), '{"changed":true}');
    cleanOutputs();
    run();

    expect(runs()).toBe(2);
  });

  it("compiles again when an option changes", () => {
    run();
    cleanOutputs();
    run({}, [...args.slice(0, -1), "blue"]);

    expect(runs()).toBe(2);
  });

  it("never caches when switched off", () => {
    run({ EXPO_APP_ICON_ACTOOL_CACHE: "0" });
    cleanOutputs();
    run({ EXPO_APP_ICON_ACTOOL_CACHE: "0" });

    expect(runs()).toBe(2);
    expect(fs.existsSync(path.join(dir, "cache"))).toBe(false);
  });

  it("passes calls that are not a compile straight through", () => {
    const result = run({}, ["--version"]);

    expect(result.stdout).toBe("version\n");
    expect(fs.existsSync(path.join(dir, "cache"))).toBe(false);
  });

  it("returns a failure as it is and stores nothing", () => {
    const failed = run({ FAKE_ACTOOL_FAIL: "1" });
    const retried = run();

    expect(failed.status).toBe(3);
    expect(retried.status).toBe(0);
    expect(runs()).toBe(2);
  });

  it("is executable", () => {
    expect(() => execFileSync("test", ["-x", SCRIPT])).not.toThrow();
  });
});
