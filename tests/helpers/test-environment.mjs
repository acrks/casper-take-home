import { readFileSync } from "node:fs";
import { parse } from "dotenv";

export function testDatabaseEnvironment() {
  const testEnv = parse(readFileSync(new URL("../../.env.evter-test", import.meta.url)));
  const current = parse(readFileSync(new URL("../../.env", import.meta.url)));
  const url = new URL(testEnv.EVTER_TEST_DATABASE_URL);
  const direct = new URL(testEnv.EVTER_TEST_DIRECT_URL);
  const endpoint = testEnv.EVTER_TEST_ENDPOINT;
  const endpointOf = (hostname) => hostname.split(".")[0].replace(/-pooler$/, "");

  if (
    testEnv.EVTER_TEST_ALLOW_DATABASE !== "1" ||
    !testEnv.EVTER_TEST_BRANCH_ID?.startsWith("br-") ||
    !endpoint?.startsWith("ep-") ||
    !url.hostname.endsWith(".neon.tech") ||
    !direct.hostname.endsWith(".neon.tech") ||
    endpointOf(url.hostname) !== endpoint ||
    endpointOf(direct.hostname) !== endpoint ||
    [current.DATABASE_URL, current.DIRECT_URL].filter(Boolean).some(
      (value) => endpointOf(new URL(value).hostname) === endpoint,
    )
  ) {
    throw new Error("Refusing database tests: configure a verified, separate Neon branch in .env.evter-test.");
  }

  return { DATABASE_URL: url.href, DIRECT_URL: direct.href };
}
