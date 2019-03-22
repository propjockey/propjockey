import QUnit from "steal-qunit"
import { tickAnimationOnObject, tickAllAnimationsOnObject } from "../src/tick-animations.js"

const { test } = QUnit

QUnit.module("tick-animations", function (hooks) {
  test("imports should work", t => {
    t.ok(tickAnimationOnObject, "tickAnimationOnObject exists")
    t.ok(tickAllAnimationsOnObject, "tickAllAnimationsOnObject exists")
  })
})
