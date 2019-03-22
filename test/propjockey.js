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
    t.equal(anim.config.defaultSetter, PropJockey.hydrationStore["setter.element.cssVar"], "Correct default configuration for defaultSetter")

    delete PropJockey.hydrationStore["timing.requestAnimationFrame"]
    Object.defineProperty(PropJockey.hydrationStore, "timing.requestAnimationFrame", originalDesc["timing.requestAnimationFrame"])
  })

  // timing.manual


})


/*

  var poseCharacter = new PropJockey({
    name: "pose character",
    maxFPS: 0,

    initialDelay: 2000,
    ebb: true,
    repeat: function (animationInstanceState, obj) { console.log("repeat", arguments); return animationInstanceState.repeatCount < 3; },
    repeatDelay: 250,

    defaultEase: "ease.linear",

    onAfterFrame: () => { updateLinkedMagnets(document.querySelector(".waist")); },

    props: {
      "--rotation-head": {
        type: "deg",
        // setter: (obj, propName, prop, newVal) => obj.style.setProperty(prop, value),
        keyframes: [
          { position: 0, value: 0 }, // , ease: fn
          { position: 250, value: -15 }, // , callback: fn
          { position: 750, value: 15 },
          { position: 1250, value: -15 },
          { position: 1750, value: 15 },
          { position: 2000, value: 0 }
        ]
      },
      "--rotation-right-upper-arm": {
        type: "deg",
        keyframes: [
          { position: 0, value: 0 },
          { position: 1000, value: -45 },
          { position: 2000, value: 45 }
        ]
      },
      "--rotation-right-forearm": {
        type: "deg",
        keyframes: [
          { position: 0, value: 0 },
          { position: 1000, value: -180 },
          { position: 2000, value: 45 }
        ]
      },
      "--rotation-chest": {
        type: "deg",
        keyframes: [
          { position: 0, value: 15 },
          { position: 1000, value: 0 },
          { position: 2000, value: -15 }
        ]
      },
      "--rotation-waist": {
        type: "deg",
        keyframes: [
          { position: 0, value: -15 },
          { position: 1000, value: 0 },
          { position: 2000, value: 15 }
        ]
      },
      "--color": {
        slide: "slide.color.hex",
        setter: "setter.element.cssVar.raw",
        keyframes: [
          { position: 0, value: "#ff0000" },
          { position: 1000, value: "#00ff00" },
          { position: 2000, value: "#0000ff" }
        ]
      }
    }
  })

  poseCharacter.play(document.querySelector(".character"), { speed: 0.5 })

*/