import QUnit from "steal-qunit"
import { instance, module } from "../wasm/easing.wasmi.js"


const { test } = QUnit

QUnit.module("idk", function (hooks) {
  test("import should work", t => {
    t.ok(instance, "exists")
    t.ok(module, "exists")
  })
})

import "./tick-animations.js"
import "./timing-pool.js"
import "./hydration-store.js"
import "./hydrate-config.js"
import "./animation-instance-state.js"
import "./propjockey.js"


