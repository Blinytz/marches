import { spawnSync } from "node:child_process";

for (const args of [
  ["tests/run.mjs"],
  ["--test", "tests/integration.test.mjs", "tests/market-data.test.mjs", "tests/market-detail.test.mjs", "tests/sync-catalogue.test.mjs"]
]) {
  const resultat = spawnSync(process.execPath, args, {
    stdio: "inherit",
    cwd: new URL("../", import.meta.url)
  });
  if (resultat.status !== 0) process.exit(resultat.status ?? 1);
}
