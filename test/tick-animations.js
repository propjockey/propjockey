import QUnit from "steal-qunit"
import { tickAnimationOnObject, tickAllAnimationsOnObject } from "../src/tick-animations.js"

const { test } = QUnit

QUnit.module("tick-animations", function (hooks) {
  test("imports should work", t => {
    t.ok(tickAnimationOnObject, "tickAnimationOnObject exists")
    t.ok(tickAllAnimationsOnObject, "tickAllAnimationsOnObject exists")
  })
  // objectsInProgress[ objectInProgress ] -> animationStateMaps[ PropJockey instance (w/config) ] -> animationInstanceState
  test("tickAllAnimationsOnObject loops first param and calls tickAnimationOnObject with second param as context", t => {
    t.expect(2)
    const objectInProgress = {}
    const fakeAnimationStateMaps = new Map()
    const fakePropJockeyInstance = {
      config: {
        timingPool: { deltaTime: 1 }
      }
    }
    const fakeAnimationState = {
      tick: (pji, deltaTime) => {
        t.equal(deltaTime, 1, "looping as expected")
        return false
      }
    }
    const fakePropJockeyInstance2 = {
      config: {
        timingPool: { deltaTime: 2 }
      }
    }
    const fakeAnimationState2 = {
      tick: (pji, deltaTime) => {
        t.equal(deltaTime, 2, "looping as expected")
        return false
      }
    }
    fakeAnimationStateMaps.set(fakePropJockeyInstance, fakeAnimationState)
    fakeAnimationStateMaps.set(fakePropJockeyInstance2, fakeAnimationState2)
    tickAllAnimationsOnObject(fakeAnimationStateMaps, objectInProgress)
  })
})
