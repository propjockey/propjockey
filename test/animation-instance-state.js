import QUnit from "steal-qunit"
import AnimationInstanceState from "../src/animation-instance-state.js"

const { test } = QUnit

QUnit.module("AnimationInstanceState", function (hooks) {
  test("import should work", t => {
    t.ok(AnimationInstanceState, "exists")
  })
})
