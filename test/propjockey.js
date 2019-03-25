import QUnit from "steal-qunit"
import PropJockey from "../src/propjockey.js"

const { test } = QUnit

QUnit.module("PropJockey", function (hooks) {
  const originalDesc = {
    "timing.requestAnimationFrame": Object.getOwnPropertyDescriptor(PropJockey.hydrationStore, "timing.requestAnimationFrame")
  }

  test("import should work", t => {
    t.ok(PropJockey, "exists")
    t.ok(PropJockey.hydrationStore, "hydrationStore attached")
    t.ok(PropJockey.hydrationStore.TimingPool, "hydrationStore has reference to TimingPool constructor")
  })

  test("Minimum instance, defaults and expectations", t => {
    const anim = new PropJockey({
      props: {
        someProp: {
          keyframes: [
            { position: 0, value: 0 },
            { position: 10, value: 100 }
          ]
        }
      }
    })
    t.ok(anim instanceof PropJockey, "animation is an instance of PropJockey")
    t.equal(typeof anim.play, "function", "has play function")
    t.equal(typeof anim.stop, "function", "has stop function")
    t.equal(typeof anim.pause, "function", "has pause function")
    t.equal(typeof anim.resume, "function", "has resume function")
    t.equal(typeof anim.speed, "function", "has speed function")
    t.equal(typeof anim.delay, "function", "has delay function")
    t.equal(typeof anim.seek, "function", "has seek function")

    t.ok(anim.config, "has config")
    t.equal(typeof anim.config.timingPool, "object", "config belongs to a timingPool")
    t.equal(anim.config.timingPool.running, false, "animation's timingPool isn't running because none in pool have played")

    const hsTimingRAFDesc = Object.getOwnPropertyDescriptor(PropJockey.hydrationStore, "timing.requestAnimationFrame")
    t.equal(hsTimingRAFDesc.get, undefined, "getter ran, hydrationStore holds the pool directly so it would be shared")

    t.equal(anim.config.timingPool, PropJockey.hydrationStore["timing.requestAnimationFrame"], "Correct default configuration for timingPool")
    t.equal(anim.config.defaultEase, PropJockey.hydrationStore["ease.linear"], "Correct default configuration for defaultEase")
    t.equal(anim.config.defaultSlide, PropJockey.hydrationStore["slide.number"], "Correct default configuration for defaultSlide")
    t.equal(anim.config.defaultSetter, PropJockey.hydrationStore["setter.object.prop"], "Correct default configuration for defaultSetter")

    delete PropJockey.hydrationStore["timing.requestAnimationFrame"]
    Object.defineProperty(PropJockey.hydrationStore, "timing.requestAnimationFrame", originalDesc["timing.requestAnimationFrame"])
  })

  test("animations work", t => {
    const jockeyMyProps = { thisprophere: 10, andthisonetoo: "1verypx", andadashofcolor: "#000000" }
    const timingPool = new PropJockey.hydrationStore.TimingPool()
    const anim = new PropJockey({
      name: "hello world",
      timingPool,
      props: {
        thisprophere: {
          keyframes: [
            { position: 0, value: 50 },
            { position: 2000, value: 100 }
          ]
        },
        andthisonetoo: {
          setter: "setter.object.prop.unit",
          unit: "verypx",
          keyframes: [
            { position: 0, value: 100 },
            { position: 1000, value: 50 },
            { position: 2000, value: 200 }
          ]
        },
        andadashofcolor: {
          slide: "slide.color.hex",
          keyframes: [
            { position: 0, value: "#ff00ff" },
            { position: 2000, value: "#00ffff" },
            { position: 2500, value: "#ffffff" }
          ]
        }
      }
    })
    t.equal(anim.name, "hello world", "animation name works")
    t.equal(anim.animationState(), undefined, "animationState returns nothing unless an object is specified and playing")
    t.equal(anim.animationState(jockeyMyProps), undefined, "animationState returns nothing unless the object is playing")

    anim.play(jockeyMyProps)

    const animationInstanceState = anim.animationState(jockeyMyProps)
    t.ok(animationInstanceState, "animationState returns the internal state of an object in progress against the animation")

    timingPool.tick(0)
    t.strictEqual(jockeyMyProps.thisprophere, 50, "prop jumped to position 0's value")
    t.strictEqual(jockeyMyProps.andthisonetoo, "100verypx", "prop jumped to position 0's value+unit")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#ff00ff", "prop jumped to position 0's color value")

    timingPool.tick(500) // 500 ms passed
    t.strictEqual(jockeyMyProps.thisprophere, 50 + 50/4, "prop became the correct value at 500ms")
    t.strictEqual(jockeyMyProps.andthisonetoo, "75verypx", "prop became the correct value+unit at 500ms")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#bf40ff", "prop became the correct color value at 500ms")

    t.equal(animationInstanceState.currentSpeed, 1, "default playback rate is 1.0")
    anim.speed(jockeyMyProps, 2.0)
    t.equal(animationInstanceState.currentSpeed, 2.0, "speed changed to playback rate of 2.0")
    t.equal(animationInstanceState.currentSpeed, anim.speed(jockeyMyProps), "speed returns the speed if one isn't specified")
    t.equal(animationInstanceState.resumeSpeed, 2.0, "updated resumeSpeed so if paused it will return to this speed when unpaused")

    anim.pause(jockeyMyProps)
    t.equal(animationInstanceState.currentSpeed, 0, "paused playback rate is 0")
    t.equal(animationInstanceState.resumeSpeed, 2.0, "internal state records the speed before pausing")

    timingPool.tick(500) // 500 ms passed but no progress should be made because it's paused
    t.strictEqual(jockeyMyProps.thisprophere, 50 + 50/4, "prop stayed the correct value at 500ms")
    t.strictEqual(jockeyMyProps.andthisonetoo, "75verypx", "prop stayed the correct value+unit at 500ms")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#bf40ff", "prop stayed the correct color value at 500ms")

    anim.resume()
    t.equal(animationInstanceState.currentSpeed, 0, "still paused because animation resume needs to know which object")
    anim.resume(jockeyMyProps)
    t.equal(animationInstanceState.currentSpeed, 2.0, "resume sets it back to the speed before pausing")
    t.equal(animationInstanceState.currentPosition, 500, "is positioned correctly")

    timingPool.tick(250) // 250 ms passed but it should update as if 500 did because playback is 2x speed
    t.equal(animationInstanceState.currentPosition, 1000, "updated position correctly")
    t.strictEqual(jockeyMyProps.thisprophere, 75, "prop became the correct value at 1s")
    t.strictEqual(jockeyMyProps.andthisonetoo, "50verypx", "prop became the correct value+unit at 1s")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#8080ff", "prop became the correct color value at 1s")

    anim.speed(jockeyMyProps, 0)
    t.equal(animationInstanceState.resumeSpeed, 2.0, "resumeSpeed remains 2.0 so it won't 'resume' to 0 speed")

    anim.speed(jockeyMyProps, 1)
    t.equal(animationInstanceState.currentSpeed, 1, "currentSpeed set to 1")
    t.equal(animationInstanceState.resumeSpeed, 1, "resumeSpeed set to 1")

    timingPool.tick(500) // 500 ms passed
    t.strictEqual(jockeyMyProps.thisprophere, 87.5, "prop became the correct value at 1.5s")
    t.strictEqual(jockeyMyProps.andthisonetoo, "125verypx", "prop became the correct value+unit at 1.5s")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#40bfff", "prop became the correct color value at 1.5s")

    timingPool.tick(500) // 500 ms passed
    t.strictEqual(jockeyMyProps.thisprophere, 100, "prop became the correct value at 2s")
    t.strictEqual(jockeyMyProps.andthisonetoo, "200verypx", "prop became the correct value+unit at 2s")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#00ffff", "prop became the correct color value at 2s")

    t.equal(timingPool.objectsInProgress.size, 1, "2 of 3 properties reached the end of their timeline so jockeyMyProps is still in the pool")
    t.ok(timingPool.running, "the animation and pool are still running")

    timingPool.tick(250) // 250 ms passed
    t.strictEqual(jockeyMyProps.thisprophere, 100, "value was not changed past its timeline")
    t.strictEqual(jockeyMyProps.andthisonetoo, "200verypx", "value+unit was not changed past its timeline")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#80ffff", "prop became the correct color value at 2.25s")

    timingPool.tick(250) // 250 ms passed
    t.strictEqual(jockeyMyProps.thisprophere, 100, "value was not changed past its timeline")
    t.strictEqual(jockeyMyProps.andthisonetoo, "200verypx", "value+unit was not changed past its timeline")
    t.strictEqual(jockeyMyProps.andadashofcolor, "#ffffff", "prop became the correct color value at 2.5s")

    t.equal(timingPool.objectsInProgress.size, 0, "3 of 3 properties reached the end of their timeline so jockeyMyProps has left the pool, the animation has stopped")
    t.ok(!timingPool.running, "the timingPool became empty so it was stopped too")
  })

})
