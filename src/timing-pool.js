import { tickAllAnimationsOnObject } from "./tick-animations"

function TimingPool (startLoop, stopLoop) {
  this.running = false
  this.deltaTime = 0
  this.objectsInProgress = new Map()
  // objectsInProgress[ objectInProgress ] -> animationStateMaps[ PropJockey instance (w/config) ] -> animationInstanceState
  this.startLoop = startLoop
  this.stopLoop = stopLoop
}

TimingPool.prototype = {
  constructor: TimingPool,
  tick: function (deltaTime) {
    this.deltaTime = deltaTime
    this.objectsInProgress.forEach(tickAllAnimationsOnObject)
  },
  start: function () {
    if (!this.running) {
      this.running = true
      this.startLoop && this.startLoop(this.tick.bind(this))
    }
    return this
  },
  stop: function () {
    if (this.running) {
      this.running = false
      this.stopLoop && this.stopLoop()
    }
    return this
  }
}

TimingPool.fromRequestAnimationFrameLike = function (rafLike) {
  var tick = undefined
  var running = false
  var previousTimestamp = 0
  var currentTimestamp = 0
  var timestampDelta = 0

  const requestAnimationFrameTickDelta = ts => {
    previousTimestamp = currentTimestamp || ts
    currentTimestamp = ts
    timestampDelta = currentTimestamp - previousTimestamp
    tick(timestampDelta)
    running && rafLike(requestAnimationFrameTickDelta)
  }

  const startLoop = tickFn => {
    tick = tickFn
    running = true
    rafLike(requestAnimationFrameTickDelta)
  }

  const stopLoop = () => {
    running = false
  }

  return new TimingPool(startLoop, stopLoop)
}

TimingPool.fromSetTimeoutLike = function (setTimeoutLike, constantDelta) {
  var tick = undefined
  var running = false

  const setTimeoutTickDelta = () => {
    tick(constantDelta)
    running && setTimeoutLike(setTimeoutTickDelta, constantDelta)
  }

  const startLoop = tickFn => {
    tick = tickFn
    running = true
    setTimeoutLike(setTimeoutTickDelta, 0)
  }

  const stopLoop = () => {
    running = false
  }

  return new TimingPool(startLoop, stopLoop)
}

export { TimingPool }
export default TimingPool
