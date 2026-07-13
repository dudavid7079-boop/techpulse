import fs from "node:fs";

function copyIfMissing(source, target) {
  if (fs.existsSync(target)) return;
  fs.copyFileSync(source, target);
  console.log(`Initialized ${target} from ${source}`);
}

function jsonIfMissing(target, value) {
  if (fs.existsSync(target)) return;
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Initialized ${target}`);
}

copyIfMissing("data.js", "data.generated.js");
copyIfMissing("product-data.js", "product-data.generated.js");
copyIfMissing("pipeline/candidates.sample.json", "pipeline/candidates.real.json");
copyIfMissing("pipeline/daily-digest.sample.json", "pipeline/daily-digest.real.json");
jsonIfMissing("pipeline/discovered.real.json", []);
jsonIfMissing("pipeline/channel-tests.json", {
  generatedAt: null,
  recentHours: 168,
  count: 0,
  okCount: 0,
  results: [],
});

jsonIfMissing("pipeline/job-status.json", {
  status: "initialized",
  mode: "demo",
  finishedAt: null,
  topicCount: 0,
});
jsonIfMissing("pipeline/refresh-status.json", {
  status: "initialized",
  stage: "initialization",
  finishedAt: null,
  usingPreviousRelease: false,
});
jsonIfMissing("pipeline/product-signals.real.json", {
  generatedAt: null,
  sources: {},
  products: [],
});
