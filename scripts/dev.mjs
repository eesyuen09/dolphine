import { spawn } from "node:child_process";

const backendPort = process.env.API_PORT || "4000";
const frontendPort = process.env.FRONTEND_PORT || "3000";
const backendTarget = `http://127.0.0.1:${backendPort}`;

const processes = [
  {
    name: "backend",
    command: "npm",
    args: ["--prefix", "backend", "run", "dev"],
    env: {
      HOST: "127.0.0.1",
      PORT: backendPort
    }
  },
  {
    name: "frontend",
    command: "npm",
    args: ["--prefix", "frontend", "run", "dev", "--", "--port", frontendPort],
    env: {
      VITE_API_PROXY_TARGET: backendTarget
    }
  }
].map(startProcess);

let isStopping = false;

console.log(`Dolphine dev app starting.`);
console.log(`Frontend: http://127.0.0.1:${frontendPort}`);
console.log(`Backend:  ${backendTarget}`);

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

function startProcess(processConfig) {
  const child = spawn(processConfig.command, processConfig.args, {
    env: {
      ...process.env,
      ...processConfig.env
    },
    stdio: "inherit"
  });

  child.on("exit", (code, signal) => {
    if (isStopping) return;

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`${processConfig.name} exited with ${reason}. Stopping dev app.`);
    stopAll();
  });

  return child;
}

function stopAll() {
  if (isStopping) return;
  isStopping = true;

  for (const child of processes) {
    if (!child.killed) child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(0), 250);
}
