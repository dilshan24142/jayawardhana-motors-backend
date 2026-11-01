// JM-04 (Member 1): insert reproducible development data here (roles, staff, parties, vehicles).
// Use fake data only. Run with `npm run seed` after `npm run migrate`.
import { closePool } from "../src/config/database";

async function main() {
  console.log("No seed data yet (added in JM-04).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
