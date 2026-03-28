import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const mode = process.argv[2] ?? "start";
const packageTargets = [
  { name: "root", dir: ".", packageFile: "package.json" },
  { name: "frontend", dir: "frontend", packageFile: "frontend/package.json" },
  { name: "backend", dir: "backend", packageFile: "backend/package.json" },
  { name: "etl", dir: "etl", packageFile: "etl/package.json" },
  { name: "infra", dir: "infra", packageFile: "infra/package.json" }
];
const stateDir = join(rootDir, ".cache");
const stateFile = join(stateDir, "install-state.json");

const envFiles = [
  ["frontend/.env.local.example", "frontend/.env.local"],
  ["backend/.env.local.example", "backend/.env.local"],
  ["etl/.env.local.example", "etl/.env.local"]
];

for (const [source, target] of envFiles) {
  const sourcePath = join(rootDir, source);
  const targetPath = join(rootDir, target);

  if (!existsSync(targetPath) && existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    console.log(`Created ${target}`);
  }
}

function run(command, args, cwd = rootDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

function runCapture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      shell: process.platform === "win32"
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeInstallFingerprint(packageFile) {
  const hash = createHash("sha256");
  hash.update(packageFile);
  hash.update(readFileSync(join(rootDir, packageFile), "utf8"));
  return hash.digest("hex");
}

function readSavedFingerprint() {
  if (!existsSync(stateFile)) {
    return {};
  }

  try {
    const content = JSON.parse(readFileSync(stateFile, "utf8"));
    return content?.fingerprints && typeof content.fingerprints === "object" ? content.fingerprints : {};
  } catch {
    return {};
  }
}

function saveFingerprints(fingerprints) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ fingerprints }, null, 2));
}

function getInstallPlan() {
  const savedFingerprints = readSavedFingerprint();

  return packageTargets.map((target) => {
    const nodeModulesPath = join(rootDir, target.dir, "node_modules");
    const fingerprint = computeInstallFingerprint(target.packageFile);
    const savedFingerprint = savedFingerprints[target.name] ?? null;

    return {
      ...target,
      fingerprint,
      needsInstall: !existsSync(nodeModulesPath) || savedFingerprint !== fingerprint
    };
  });
}

async function ensureDependencies() {
  const installPlan = getInstallPlan();
  const changedTargets = installPlan.filter((target) => target.needsInstall);

  if (changedTargets.length === 0) {
    console.log("Dependencies unchanged. Skipping installs.");
    return;
  }

  console.log(
    `Installing dependencies concurrently for: ${changedTargets.map((target) => target.name).join(", ")}`
  );

  await Promise.all(
    changedTargets.map((target) =>
      run("npm", ["install", "--prefer-offline"], join(rootDir, target.dir))
    )
  );

  const nextFingerprints = Object.fromEntries(
    installPlan.map((target) => [target.name, target.fingerprint])
  );

  saveFingerprints(nextFingerprints);
}

async function ensureDatabase() {
  console.log("Starting PostgreSQL container...");
  await run("npm", ["run", "local:db"]);

  console.log("Waiting for PostgreSQL to become healthy...");
  const maxAttempts = 24;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const status = await runCapture("docker", ["inspect", "--format={{.State.Health.Status}}", "searport-postgres"]);

      if (status === "healthy") {
        return;
      }
    } catch {
      if (attempt === maxAttempts) {
        throw new Error("PostgreSQL did not become healthy within the expected time.");
      }
    }

    await sleep(5000);
  }
}

async function ensurePrismaClient() {
  console.log("Generating Prisma client for backend...");
  await run("npm", ["run", "prisma:generate"], join(rootDir, "backend"));
}

async function setup() {
  await Promise.all([ensureDependencies(), ensureDatabase()]);
  await ensurePrismaClient();
}

async function start() {
  await setup();
  await run("npm", ["run", "dev"]);
}

if (mode === "setup") {
  await setup();
} else if (mode === "start") {
  await start();
} else {
  throw new Error(`Unsupported mode: ${mode}`);
}
