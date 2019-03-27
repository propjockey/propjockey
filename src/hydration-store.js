import TimingPool from "./timing-pool"
import { wasmHydrations, wasmUtils } from "./wasm-hydrations.js"

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

  "setter.object.prop": (obj, propName, newVal, prop) => obj[propName] = newVal,
  "setter.object.prop.unit": (obj, propName, newVal, prop) => obj[propName] = newVal + prop.unit,
  "setter.object.prop.round": (obj, propName, newVal, prop) => obj[propName] = Math.round(newVal),
  "setter.object.prop.round.unit": (obj, propName, newVal, prop) => obj[propName] = Math.round(newVal) + prop.unit,
  "setter.element.cssVar": (obj, propName, newVal, prop) => obj.style.setProperty(propName, newVal),
  "setter.element.cssVar.unit": (obj, propName, newVal, prop) => obj.style.setProperty(propName, newVal + prop.unit),

  // TOOD: default text/string animation sliders
  "slide.number.js": (from, to, amount) => ((to - from) * amount) + from
}

// adds the ease functions, slide functions, and anything else thats sped up with propjockey.wasm
Object.assign(hydrationStore, wasmHydrations)

// utils will all be bound directly to PropJockey
const utils = Object.assign({
  // access to the TimingPool constructor to make custom pools for the store or for one-off use
  TimingPool,
  // mostly for tests; You shouldn't ever _have to_ use this unless deliberately making advanced tooling,
  // or doing advanced preloading of specific/limited sets of ease functions per level/section/spa page/etc
  resetEaseStoreAndAllCaches: function (details) {
    // freeAllMemoizedAndReusableEaseCaches shouldn't be used without this wrapper
    // because the store could be left with ease functions bound to freed memory.
    wasmUtils.freeAllMemoizedAndReusableEaseCaches.call(this, details || {})
    Object.keys(wasmHydrations).forEach(wasmKey => {
      if (wasmKey.startsWith("ease.")) {
        hydrationStore[wasmKey] = wasmHydrations[wasmKey]
      }
    })
  }
}, wasmUtils)

hydrationStore["yodawg.easing"] = function (...easings) {
  const easingFns = easings.map(easing => hydrationStore.get(easing))
  return function (t) {
    return easingFns.reduce((x, easing) => easing(x), t)
  }
}
// TODO: bouncy customs
// TODO: quadratic defaults
// TODO: yodawg -> flicker

export { hydrationStore, utils }
export default hydrationStore
