
function AnimationInstanceState (settings, animationConfig, object) {
  Object.assign(this, {
    batchName: settings.batchName,
    batchIndex: settings.batchIndex || 0,
    props: {},
    currentSpeed: settings.speed || 1,
    repeatCount: (settings.repeatCount || 0) - 1 // will be 0 on first play, increases by 1 at the end of an animation, before repeatDelay plays
  })

  // sets the remainder of the default properties and delay
  this.forceRepeat(animationConfig, object)
}

AnimationInstanceState.prototype = {
  constructor: AnimationInstanceState,

  forceRepeat: function (animationConfig, object) {
    const propList = animationConfig.propList
    for (let i = 0; i < propList.length; i++) {
      this.props[propList[i]] = { currentKeyframe: -1 }
    }
    const repeatCount = this.repeatCount + 1
    const endSpeed = this.currentSpeed
    const currentSpeed = this.ebbing ? endSpeed * -1 : endSpeed
    Object.assign(this, {
      paused: false,
      ebbing: false,
      delayRemaining: 0,
      previousPosition: 0,
      currentPosition: currentSpeed < 0 ? animationConfig.lastKeyframePosition : 0,
      currentTimestampDelta: 0,
      currentSpeed: currentSpeed,
      resumeSpeed: currentSpeed,
      absSpeed: Math.abs(currentSpeed),
      repeatCount: repeatCount
    })

    const delayConfig = repeatCount ? animationConfig.repeatDelay : animationConfig.initialDelay
    const delayRemaining = typeof delayConfig === "function" ? delayConfig(this, object) : delayConfig
    this.delayRemaining = delayRemaining

    return repeatCount
  },

  forceEbb: function (animationConfig, object) {
    // begin reversing current direction and set ebbing true
    this.currentSpeed *= -1
    this.resumeSpeed = this.currentSpeed
    this.ebbing = true

    return this.currentSpeed
  },

  // advance the current position without checking if it's paused, delayed, or running before animationConfig.maxFPS
  forceTick: function (currentTimestampDelta) {
    const currentSpeed = this.currentSpeed
    this.previousPosition = this.currentPosition
    this.currentPosition += currentTimestampDelta * currentSpeed
    this.currentTimestampDelta = 0
    this.paused = currentSpeed === 0

    return this.currentPosition
  },

  repeat: function (animationConfig, object) {
    const repeatConfig = animationConfig.repeat
    const doRepeat = typeof repeatConfig === "function" ? repeatConfig(this, object) : repeatConfig
    if (doRepeat) {
      this.forceRepeat(animationConfig, object)
    }
    return doRepeat
  },

  ebb: function (animationConfig, object) {
    // not already ebbing and ebb option is set
    const ebbConfig = (!this.ebbing) && animationConfig.ebb
    // then check what it's set to
    const doEbb = typeof ebbConfig === "function" ? ebbConfig(this, object) : ebbConfig
    if (doEbb) {
      this.forceEbb(animationConfig, object)
    }

    return doEbb
  },

  // reduces the delay and/or advances currentPosition
  // returns false if paused, still delayed, or if ticking too soon for animationConfig.maxFPS
  // returns true otherwise (true if tick-animation should run the setters)
  tick: function (animationConfig, timestampDelta) {
    const currentSpeed = this.currentSpeed

    // if not paused and speed is 0
    if (this.paused) {
      if (currentSpeed) {
        // if speed was set to non-0, unpause it
        this.paused = false
      } else {
        // still paused, no other action needed
        return false
      }
    }

    this.delayRemaining -= (timestampDelta * this.absSpeed)
    const delayRemaining = this.delayRemaining
    if (delayRemaining > 0) {
      // delay updated but not started, no other action needed
      return false
    }
    const afterDelayTimestampDelta = delayRemaining * -1
    this.delayRemaining = 0

    this.currentTimestampDelta += afterDelayTimestampDelta
    const currentTimestampDelta = this.currentTimestampDelta
    if (animationConfig.maxFPS && currentTimestampDelta < animationConfig.minTimestampDelta) {
      // frame running too soon, wait for next frame, no other action needed
      return false
    }
    this.previousPosition = this.currentPosition
    this.currentPosition += currentTimestampDelta * currentSpeed
    this.currentTimestampDelta = 0
    // if speed is 0, flag as paused so it won't run again next frame
    // (can be manually unpaused while still 0 to force setters to run for next frame)
    // if speed is changed from 0 while paused, it will automatically unpause when tick'd
    this.paused = currentSpeed === 0

    return true
  }
}

export { AnimationInstanceState }
export default AnimationInstanceState
