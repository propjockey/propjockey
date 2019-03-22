import TimingPool from "./timing-pool"
import { instance } from "../wasm/easing.wasmi.js"

// You can provide custom functions or override default ones before calling `new PropJockey(config)`
// This enables complex (and CUSTOM) config to be serialized/stored as JSON and safely come from users if you first populate the store.
// String values in the config will remain as the string if they are not found in the store.


// config expectations when calling get:
// array -> function
// string -> function || sameString
// number -> sameNumber
// function -> sameFunction

// store expectations when calling get:
// array -> [ string || function, ...params ]
// string -> (find string in store -> function || array) || sameString
// number -> sameNumber
// function -> sameFunction


const hydrationStore = {
  get: function (maybeKey) {
    const val = this[maybeKey]
    if (val) {
      // maybeKey is a matching string, val should be a function or an array
      if (typeof val === "function") {
        return val
      }
      const newVal = this.get(val)
      this[maybeKey] = newVal // replace the store's value for faster future reads if it was a packed array
      return newVal
    }
    if (Array.isArray(maybeKey)) {
      // decompress / unpack
      // first item should be a factory function (which will be called) returning a function
      const firstVal = maybeKey[0]
      if (typeof firstVal === "function") {
        return firstVal.call(...maybeKey)
      }
      // if first item isn't a function, assume it will resolve to one after recursive get
      return this.get(firstVal).call(...maybeKey)
    }
    // numbers, functions, objects, undefined, null, strings that don't match in the store
    return maybeKey
  },
  get "timing.requestAnimationFrame" () {
    delete this["timing.requestAnimationFrame"]
    return this["timing.requestAnimationFrame"] = TimingPool.fromRequestAnimationFrameLike(requestAnimationFrame)
  },
  get "timing.setTimeout.60fps" () {
    delete this["timing.setTimeout.60fps"]
    return this["timing.setTimeout.60fps"] = TimingPool.fromSetTimeoutLike(setTimeout, 1000 / 60)
  },
  get "timing.setTimeout.30fps" () {
    delete this["timing.setTimeout.30fps"]
    return this["timing.setTimeout.30fps"] = TimingPool.fromSetTimeoutLike(setTimeout, 1000 / 30)
  },
  get "timing.manual" () {
    delete this["timing.manual"]
    return this["timing.manual"] = new TimingPool()
  },

  // todo: these are unused. repurpose for transitions-from-dom
  // (animations are static/known, transitions to and from whatever are dynamic, common, and need special care to avoid thrashing)
  "value.from.element.computedCssVar": (obj, propName, animationConfig, kfPos) => parseFloat(getComputedStyle(obj).getProperyValue(propName)),
  "value.from.element.computedCssVar.raw": (obj, propName, animationConfig, kfPos) => getComputedStyle(obj).getProperyValue(propName),
  "value.from.element.cssVar": (obj, propName, animationConfig, kfPos) => parseFloat(obj.style.getProperyValue(propName)),
  "value.from.element.cssVar.raw": (obj, propName, animationConfig, kfPos) => obj.style.getProperyValue(propName),

  "factory.steps": (num, timing) => {
    // todo: finish this, wasm it
    // const holdTime = 1 / num
    let stepsModded = num
    let jumpStart = 0
    // jump-end / end is default behavior
    if (timing === "jump-none") {
      stepsModded--
    }
    if (timing === "jump-both") {
      stepsModded++
      jumpStart = 1
    }
    if (timing === "jump-start" || timing === "start") {
      jumpStart = 1
    }
    const stepSize = 1 / stepsModded

    return t => {
      if (t <= 0) {
        return 0
      }
      if (t >= 1) {
        return 1
      }
      const indexLeft = jumpStart + ~~(t * num)
      return indexLeft * stepSize
    }
  },

  "ease.step-start": t => t <= 0 ? 0 : 1, // ["factory.steps", 1, "jump-start"]
  "ease.step-end": t => t >= 1 ? 1 : 0, // ["factory.steps", 1, "jump-end"]

  "factory.cubic-bezier": (() => {
    const memoized = { "0,0,1,1": timePosition => timePosition }
    return function (xd1, yd1, xd2, yd2) {
      const memoKey = [...arguments].join(",")
      if (memoized[memoKey]) {
        return memoized[memoKey]
      }
      const cacheOffset = instance.exports.cacheCubicBezier(xd1, yd1, xd2, yd2)
      return memoized[memoKey] = instance.exports.cachedEasing.bind(cacheOffset)
    }
  })(),

  "ease.linear": ["factory.cubic-bezier", 0.0, 0.0, 1.0, 1.0],
  "ease.ease": ["factory.cubic-bezier", 0.25, 0.1, 0.25, 1.0],
  "ease.ease-in": ["factory.cubic-bezier", 0.42, 0, 1.0, 1.0],
  "ease.ease-out": ["factory.cubic-bezier", 0, 0, 0.58, 1.0],
  "ease.ease-in-out": ["factory.cubic-bezier", 0.42, 0, 0.58, 1.0],

  "ease.in-sine": ["factory.cubic-bezier", 0.47, 0, 0.75, 0.72],
  "ease.in-quadratic": ["factory.cubic-bezier", 0.55, 0.09, 0.68, 0.53],
  "ease.in-cubic": ["factory.cubic-bezier", 0.55, 0.06, 0.68, 0.19],
  "ease.in-back": ["factory.cubic-bezier", 0.6, -0.28, 0.74, 0.05],
  "ease.fast-out,linear-in": ["factory.cubic-bezier", 0.4, 0, 1, 1],

  "ease.in-out-sine": ["factory.cubic-bezier", 0.45, 0.05, 0.55, 0.95],
  "ease.in-out-quadratic": ["factory.cubic-bezier", 0.46, 0.03, 0.52, 0.96],
  "ease.in-out-cubic": ["factory.cubic-bezier", 0.65, 0.05, 0.36, 1],
  "ease.in-out-back": ["factory.cubic-bezier", 0.68, -0.55, 0.27, 1.55],
  "ease.fast-out,slow-in": ["factory.cubic-bezier", 0.4, 0, 0.2, 1],

  "ease.out-sine": ["factory.cubic-bezier", 0.39, 0.58, 0.57, 1],
  "ease.out-quadratic": ["factory.cubic-bezier", 0.25, 0.46, 0.45, 0.94],
  "ease.out-cubic": ["factory.cubic-bezier", 0.22, 0.61, 0.36, 1],
  "ease.out-back": ["factory.cubic-bezier", 0.18, 0.89, 0.32, 1.28],
  "ease.linear-out,slow-in": ["factory.cubic-bezier", 0, 0, 0.2, 1],

  "setter.element.cssVar": (obj, propName, prop, newVal) => obj.style.setProperty(propName, newVal + (prop.unit || 0)),
  "setter.element.cssVar.raw": (obj, propName, prop, newVal) => obj.style.setProperty(propName, newVal),
  "setter.object.prop.round": (obj, propName, prop, newVal) => obj[propName] = Math.round(newVal) + (prop.unit || 0),

  // TOOD: default text/string animation sliders
  "slide.number": instance.exports.slide,
  "slide.number.js": (from, to, amount) => ((to - from) * amount) + from
}

hydrationStore["yodawg.easing"] = function (...easings) {
  const easingFns = easings.map(easing => hydrationStore.get(easing))
  return function (t) {
    return easingFns.reduce((x, easing) => easing(x), t)
  }
}
// TODO: bouncy customs
// TODO: quadratic factory and defaults
// TODO: yodawg -> flicker

hydrationStore["slide.color.hex"] = (function () {
  const slide = hydrationStore["slide.number"]

  const rxLast6 = /.*(.{6})$/
  const rxSplitRGB = /#?(..)(..)(..)/
  // r, g, and b are integers in range [0, 255]
  const colorString = function (r, g, b) {
    const rgb = "000000" + (r << 16 | g << 8 | b).toString(16)
    return "#" + rgb.replace(rxLast6, "$1")
  }

  return function (color1, color2, amount) {
    var r, g, b, r2, g2, b2
    color2.replace(rxSplitRGB, function (x, rr, gg, bb) {
      r2 = parseInt(rr, 16)
      g2 = parseInt(gg, 16)
      b2 = parseInt(bb, 16)
    })

    color1.replace(rxSplitRGB, function (x, rr, gg, bb) {
      r = slide(parseInt(rr, 16), r2, amount)
      g = slide(parseInt(gg, 16), g2, amount)
      b = slide(parseInt(bb, 16), b2, amount)
    })
    return colorString(r, g, b)
  }
})()

export { hydrationStore }
export default hydrationStore
