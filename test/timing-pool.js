import QUnit from "steal-qunit"
import TimingPool from "../src/timing-pool.js"

const { test } = QUnit

QUnit.module("TimingPool", function (hooks) {
  test("import should work", t => {
    t.ok(TimingPool, "exists")
  })
})
