import QUnit from "steal-qunit"
import hydrationStore from "../src/hydration-store.js"

const { test } = QUnit

QUnit.module("hydrationStore", function (hooks) {
  test("import should work", t => {
    t.ok(hydrationStore, "exists")
  })

  test("hydrationStore timingPools not initiated unless used", t => {
    let desc = Object.getOwnPropertyDescriptor(hydrationStore, "timing.requestAnimationFrame")
    t.ok(desc.get, "timing.requestAnimationFrame getter hasn't ran")
    desc = Object.getOwnPropertyDescriptor(hydrationStore, "timing.setTimeout.60fps")
    t.ok(desc.get, "timing.setTimeout.60fps getter hasn't ran")
    desc = Object.getOwnPropertyDescriptor(hydrationStore, "timing.setTimeout.30fps")
    t.ok(desc.get, "timing.setTimeout.30fps getter hasn't ran")
    desc = Object.getOwnPropertyDescriptor(hydrationStore, "timing.manual")
    t.ok(desc.get, "timing.manual getter hasn't ran")

    desc = Object.getOwnPropertyDescriptor(hydrationStore, "timing.requestAnimationFrame")
    t.ok(desc.get, "timing.requestAnimationFrame getter hasn't ran")
    t.equal(typeof hydrationStore["timing.requestAnimationFrame"], "object", "getters run")
    t.equal(
      Object.getOwnPropertyDescriptor(hydrationStore, "timing.requestAnimationFrame").get,
      undefined,
      "getter replaces itslef, store has direct value"
    )
    delete hydrationStore["timing.requestAnimationFrame"]
    Object.defineProperty(hydrationStore, "timing.requestAnimationFrame", desc)

    desc = Object.getOwnPropertyDescriptor(hydrationStore, "timing.requestAnimationFrame")
    t.ok(desc.get, "timing.requestAnimationFrame returned to original state")
  })
})
