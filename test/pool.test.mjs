import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "../src/utils/Pool.ts";

test("Pool reuses released items and respects capacity", () => {
  const pool = new Pool(2, () => ({ active: false, value: 0 }));
  const first = pool.acquire();
  const second = pool.acquire();
  assert.ok(first);
  assert.ok(second);
  assert.equal(pool.acquire(), undefined);
  first.active = false;
  assert.equal(pool.acquire(), first);
  assert.equal(pool.activeCount, 2);
});

test("Pool clears all items", () => {
  const pool = new Pool(3, () => ({ active: false }));
  pool.acquire();
  pool.acquire();
  pool.clear();
  assert.equal(pool.activeCount, 0);
});
