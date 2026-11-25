const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });

const mockDir = path.resolve(backendDir, '..', 'mock-insurer-api');
const mockPort = String(process.env.MOCK_INSURER_PORT || 4001);
const mockUrl = `http://127.0.0.1:${mockPort}`;
const env = {
  ...process.env,
  DB_CLIENT: 'sqlite',
  DEMO_MODE: 'true',
  INSURER_API_URL: mockUrl
};
const children = [];
let stopping = false;

function stopChildren() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
}

process.on('SIGINT', stopChildren);
process.on('SIGTERM', stopChildren);

function spawnService(command, args, options, name) {
  const child = spawn(command, args, options);
  children.push(child);
  child.on('error', (error) => {
    if (stopping) return;
    console.error(`${name} failed to start:`, error.message);
    process.exitCode = 1;
    stopChildren();
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${name} exited unexpectedly (code ${code}, signal ${signal}).`);
    process.exitCode = code || 1;
    stopChildren();
  });
  return child;
}

async function waitForMockApi(child) {
  const deadline = Date.now() + 20000;
  while (!stopping && Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Mock insurer API exited before becoming ready.');
    try {
      const response = await fetch(`${mockUrl}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!stopping) throw new Error('Mock insurer API did not become ready within 20 seconds.');
}

async function startDemo() {
  if (process.env.DEMO_MODE === 'false') throw new Error('The combined demo service cannot run with DEMO_MODE=false.');
  if (process.env.DB_CLIENT && process.env.DB_CLIENT !== 'sqlite') throw new Error('The combined demo service requires DB_CLIENT=sqlite.');

  const mock = spawnService(process.execPath, ['src/server.js'], {
    cwd: mockDir,
    env: { ...env, PORT: mockPort },
    stdio: 'inherit'
  }, 'Mock insurer API');
  await waitForMockApi(mock);
  if (stopping) return;

  const seed = spawnSync(process.execPath, ['scripts/seed-demo.js'], {
    cwd: backendDir,
    env,
    stdio: 'inherit'
  });
  if (seed.error) throw seed.error;
  if (seed.status !== 0) throw new Error(`Demo seeding failed with exit code ${seed.status}.`);
  if (stopping) return;

  spawnService(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    env,
    stdio: 'inherit'
  }, 'SureTrace backend');
}

startDemo().catch((error) => {
  if (!stopping) {
    console.error('Demo startup failed:', error.message);
    process.exitCode = 1;
  }
  stopChildren();
});
