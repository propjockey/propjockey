import QUnit from "steal-qunit"
import { instance, module } from "../src/easing.transpiled.wasm.js"

const { test } = QUnit

QUnit.module("Transpiled WebAssembly Easing", function (hooks) {
  test("import should work and instance export functions should be available", t => {
    t.ok(instance, "exists")
    t.ok(instance.exports, "exists")
    t.equal(typeof instance.exports.slide, "function", "exists")
    t.equal(typeof instance.exports.amount, "function", "exists")
    t.equal(typeof instance.exports.cachedEasing, "function", "exists")
    t.equal(typeof instance.exports.setCachedEasingFrame, "function", "exists")
    t.equal(typeof instance.exports.allocateCachedEasing, "function", "exists")
    t.equal(typeof instance.exports.cacheCubicBezier, "function", "exists")
    t.ok(module, "exists")
  })
})
