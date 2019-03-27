import { instance } from "./propjockey.transpiled.wasm.js"
const wasmExports = instance.exports

// If a cached easing function (bound to a cacheOffset) is incorrectly easing, chances are the memory was
// freed or reused. If it was freed, this will provide information about why/when for debugging.
// They are weakly held here so it can't cause a leak
const invalid = new WeakMap() // invalidEasingFn -> { valid, ts, from }
const reusable = new WeakMap() // easeFn -> { ts, cacheOffset }
const memoizedCacheInfo = new WeakMap() // easeFn => { ts, cacheOffset }
const memoized = { "0,0,1,1": timePosition => timePosition } // memoKey -> easeFn
const reusableCacheOffsetsInUse = [] // array of reusable cacheOffsets that haven't been freed
const freed = [] // array of cacheOffset values that have been freed
const allocateCachedEasing = () => (freed.pop() || wasmExports.allocateCachedEasing())

const freeReusableCache = function (easeFn, details) {
  const cacheOffset = (reusable.get(easeFn) || {}).cacheOffset
  if (cacheOffset) {
    details = Object.assign({
      valid: false,
      ts: (new Date()).valueOf(),
      from: "free-reusable-cache"
    }, details || {})

    invalid.set(easeFn, details)
    reusable.delete(easeFn)
    if (!freed.includes(cacheOffset)) {
      freed.push(cacheOffset)
    }
  }
  return !!cacheOffset
}

const allFreedDetails = { ts: 0 }
const freeAllReusableCache = details => {
  Object.assign(allFreedDetails, {
    ts: (new Date()).valueOf(),
    from: "free-all-reusable-cache"
  }, details || {})

  reusableCacheOffsetsInUse.push(...freed)
  freed.splice(0, freed.length, ...(new Set(reusableCacheOffsetsInUse)))
  reusableCacheOffsetsInUse.length = 0
}

const memoizedAndReusableResetDetails = { ts: 0 }
const freeAllMemoizedAndReusableEaseCaches = details => {
  Object.assign(memoizedAndReusableResetDetails, {
    ts: (new Date()).valueOf(),
    from: "free-all-memoized-and-reusable-cache"
  }, details || {})

  Object.assign(allFreedDetails, {
    ts: (new Date()).valueOf(),
    from: "free-all-memoized-and-reusable-cache"
  }, details || {})

  wasmExports.resetInternalCacheCounter()

  Object.keys(memoized).forEach(key => {
    if (key !== "0,0,1,1") {
      delete memoized[key]
    }
  })

  freed.length = 0
  reusableCacheOffsetsInUse.length = 0
}

const checkEaseCacheStatus = (easeFn) => {
  const reusableInfo = reusable.get(easeFn)
  if (reusableInfo && reusableInfo.ts < allFreedDetails.ts) {
    freeReusableCache(easeFn, allFreedDetails)
  }
  const invalidInfo = invalid.get(easeFn)
  if (invalidInfo) {
    return invalidInfo
  }
  if (reusableInfo) {
    return Object.assign({ valid: true, from: "reuse-cache" }, reusableInfo)
  }
  const memoizedInfo = memoizedCacheInfo.get(easeFn)
  if (memoizedInfo) {
    if (memoizedInfo.ts < memoizedAndReusableResetDetails.ts) {
      return Object.assign({ valid: false }, memoizedAndReusableResetDetails)
    }
    return Object.assign({ valid: true, from: "memoize" }, memoizedInfo)
  }
  return { valid: true, from: "not-cached" }
}

const wasmUtils = {
  wasmExports,
  checkEaseCacheStatus,
  freeReusableCache,
  freeAllReusableCache,
  freeAllMemoizedAndReusableEaseCaches
}

const wasmHydrations = {
  "memoize.cubic-bezier": function (xd1, yd1, xd2, yd2) {
    const memoKey = (xd1 === yd1 && xd2 === yd2) ? "0,0,1,1" : [xd1, yd1, xd2, yd2].join(",")
    if (memoized[memoKey]) {
      return memoized[memoKey]
    }
    const cacheOffset = allocateCachedEasing()
    wasmExports.cacheCubicBezier(cacheOffset, xd1, yd1, xd2, yd2)
    const easeFn = memoized[memoKey] = wasmExports.cachedEasing.bind(undefined, cacheOffset)
    memoizedCacheInfo.set(easeFn, { ts: (new Date()).valueOf(), cacheOffset })
    return easeFn
  },
  "reuse-cache.cubic-bezier": function (xd1, yd1, xd2, yd2, easeFn) {
    freeReusableCache(easeFn, { from: "reuse-cache.cubic-bezier", xd1, yd1, xd2, yd2 })
    const memoKey = (xd1 === yd1 && xd2 === yd2) ? "0,0,1,1" : [xd1, yd1, xd2, yd2].join(",")
    if (memoized[memoKey]) {
      // memoized ease functions won't have their cache freed when passed
      // to freeReusableCache in a reuse-cache call so this is win-win
      return memoized[memoKey]
    }
    const cacheOffset = allocateCachedEasing()
    reusableCacheOffsetsInUse.push(cacheOffset)
    easeFn = wasmExports.cachedEasing.bind(undefined, cacheOffset)
    reusable.set(easeFn, { ts: (new Date()).valueOf(), cacheOffset })
    wasmExports.cacheCubicBezier(cacheOffset, xd1, yd1, xd2, yd2)
    return easeFn
  },

  "memoize.quadratic-bezier": function (x, y) {
    const memoKey = x === y ? "0,0,1,1" : x + "," + y
    if (memoized[memoKey]) {
      return memoized[memoKey]
    }
    const cacheOffset = allocateCachedEasing()
    wasmExports.cacheQuadraticBezier(cacheOffset, x, y)
    const easeFn = memoized[memoKey] = wasmExports.cachedEasing.bind(undefined, cacheOffset)
    memoizedCacheInfo.set(easeFn, { ts: (new Date()).valueOf(), cacheOffset })
    return easeFn
  },
  "reuse-cache.quadratic-bezier": function (x, y, easeFn) {
    freeReusableCache(easeFn, { from: "reuse-cache.quadratic-bezier", x, y })
    const memoKey = x === y ? "0,0,1,1" : x + "," + y
    if (memoized[memoKey]) {
      return memoized[memoKey]
    }
    const cacheOffset = allocateCachedEasing()
    reusableCacheOffsetsInUse.push(cacheOffset)
    easeFn = wasmExports.cachedEasing.bind(undefined, cacheOffset)
    reusable.set(easeFn, { ts: (new Date()).valueOf(), cacheOffset })
    wasmExports.cacheQuadraticBezier(cacheOffset, x, y)
    return easeFn
  },

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

  "ease.linear": memoized["0,0,1,1"], // set directly
  "ease.ease": ["memoize.cubic-bezier", 0.25, 0.1, 0.25, 1.0],
  "ease.ease-in": ["memoize.cubic-bezier", 0.42, 0, 1.0, 1.0],
  "ease.ease-out": ["memoize.cubic-bezier", 0, 0, 0.58, 1.0],
  "ease.ease-in-out": ["memoize.cubic-bezier", 0.42, 0, 0.58, 1.0],

  "ease.in-sine": ["memoize.cubic-bezier", 0.47, 0, 0.75, 0.72],
  "ease.in-quadratic": ["memoize.cubic-bezier", 0.55, 0.09, 0.68, 0.53],
  "ease.in-cubic": ["memoize.cubic-bezier", 0.55, 0.06, 0.68, 0.19],
  "ease.in-back": ["memoize.cubic-bezier", 0.6, -0.28, 0.74, 0.05],
  "ease.fast-out,linear-in": ["memoize.cubic-bezier", 0.4, 0, 1, 1],

  "ease.in-out-sine": ["memoize.cubic-bezier", 0.45, 0.05, 0.55, 0.95],
  "ease.in-out-quadratic": ["memoize.cubic-bezier", 0.46, 0.03, 0.52, 0.96],
  "ease.in-out-cubic": ["memoize.cubic-bezier", 0.65, 0.05, 0.36, 1],
  "ease.in-out-back": ["memoize.cubic-bezier", 0.68, -0.55, 0.27, 1.55],
  "ease.fast-out,slow-in": ["memoize.cubic-bezier", 0.4, 0, 0.2, 1],

  "ease.out-sine": ["memoize.cubic-bezier", 0.39, 0.58, 0.57, 1],
  "ease.out-quadratic": ["memoize.cubic-bezier", 0.25, 0.46, 0.45, 0.94],
  "ease.out-cubic": ["memoize.cubic-bezier", 0.22, 0.61, 0.36, 1],
  "ease.out-back": ["memoize.cubic-bezier", 0.18, 0.89, 0.32, 1.28],
  "ease.linear-out,slow-in": ["memoize.cubic-bezier", 0, 0, 0.2, 1],

  "slide.number": wasmExports.slide,
  "slide.byte": wasmExports.byteSlide,
  "slide.color.hex": (color1, color2, amount) => {
    const slid = wasmExports.rgbSlide(
      parseInt(color1.replace("#", ""), 16),
      parseInt(color2.replace("#", ""), 16),
      amount
    ).toString(16).padStart(6, "0")

    return (color1.length === 7 ? "#" : "") + slid
  },
  "slide.color.hexa": (color1, color2, amount) => {
    const slid = (wasmExports.rgbaSlide(
      parseInt(color1.replace("#", ""), 16),
      parseInt(color2.replace("#", ""), 16),
      amount
    ) >>> 0).toString(16).padStart(8, "0")

    return (color1.length === 9 ? "#" : "") + slid
  }
}

export { wasmHydrations, wasmUtils }
export default wasmHydrations
