import { syncOrders } from "../src/lib/server/sync";

const limit = Number.parseInt(process.argv[2] ?? "20", 10);

const result = await syncOrders(
  Number.isFinite(limit) && limit > 0 ? limit : 20,
);

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
