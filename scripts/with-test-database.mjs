import { spawn } from "node:child_process";
import { testDatabaseEnvironment } from "../tests/helpers/test-environment.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("Usage: node scripts/with-test-database.mjs <command> [args...]");
const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, ...testDatabaseEnvironment() },
});
child.on("error", () => { process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
