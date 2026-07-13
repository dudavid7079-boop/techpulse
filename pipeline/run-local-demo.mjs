import { spawnSync } from "node:child_process";

const steps = [
  ["node", ["pipeline/build-digest.mjs", "pipeline/candidates.sample.json", "pipeline/daily-digest.sample.json"]],
  [
    "node",
    [
      "pipeline/export-site-data.mjs",
      "pipeline/daily-digest.sample.json",
      "pipeline/candidates.sample.json",
      "pipeline/channels.sample.json",
      "data.generated.js",
    ],
  ],
  ["node", ["pipeline/push-digest.mjs", "pipeline/daily-digest.sample.json"]],
];

for (const [cmd, args] of steps) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Local demo pipeline complete. Use data.generated.js in HTML to preview generated data.");
