import hydrateConfig from "./hydrate-config"
import hydrationStore from "./hydration-store"
import AnimationInstanceState from "./animation-instance-state"

function PropJockey (config) {
  hydrateConfig(config)

  this.config = config
  this.name = config.name || ""
}

/* Constructor Properties */
PropJockey.hydrationStore = hydrationStore

/* Constructor Methods */
// none

PropJockey.prototype = {
  /* Instance Properties */
  constructor: PropJockey,

  /* Instance Methods */

  // get the running animation state tied to the specified object and configured PropJockey Animation
  animationState: function (object) {
    const animationStateMaps = this.config.timingPool.objectsInProgress.get(object) || new Map()
    const animationInstanceState = animationStateMaps.get(this)
    return animationInstanceState
  },

  // play (object, {}), // settings param takes batchName (playBatch calls this with same settings passed into it + a batchIndex setting)
  play: function (object, settings) {
    // todo: settings currently only matter on first play()
    if (!object) {
      throw new Error("must provide an object to play")
    }
    const timingPool = this.config.timingPool
    if (!timingPool.running) {
      timingPool.start()
    }
    const objectsInProgress = timingPool.objectsInProgress
    const animationStateMaps = objectsInProgress.get(object) || new Map()
    const animationInstanceState = animationStateMaps.get(this) || new AnimationInstanceState(settings || {}, this.config, object)

    animationStateMaps.set(this, animationInstanceState)
    objectsInProgress.set(object, animationStateMaps)

    const resumeSpeed = animationInstanceState.resumeSpeed
    if (resumeSpeed && !animationInstanceState.currentSpeed) {
      this.speed(object, resumeSpeed)
    }

    return this
  },
  // playBatch ([object, ...], {batchName}),

  // stop (object),
  stop: function (object) {
    const timingPool = this.config.timingPool
    const objectsInProgress = timingPool.objectsInProgress
    const animationStateMaps = objectsInProgress.get(object)
    if (animationStateMaps) {
      animationStateMaps.delete(this) // remove animationInstanceState
      if (!animationStateMaps.size) {
        objectsInProgress.delete(object)
        if (!objectsInProgress.size) {
          timingPool.stop()
        }
      }
    }
    return this
  },
  // stopBatch (batchName),
  // stopAll (),

  // pause (object) // pause playback
  pause: function (object) {
    this.speed(object, 0)
    // animationInstanceState.paused flag becomes true after the frame renders
    // paused becomes false when the animation renders if speed is non-zero
    return this
  },
  // pauseBatch (batchName),
  // pauseAll (),

  // resume (object) // continue playback at previously set speed
  resume: function (object) {
    const animationInstanceState = this.animationState(object) || {}
    return this.speed(object, animationInstanceState.resumeSpeed || 1)
  },
  // resumeBatch (batchName),
  // resumeAll (),

  // speed (object, speedScale), // get/set currentSpeed
  speed: function (object, scale) {
    const animationInstanceState = this.animationState(object) || {}
    if (typeof scale === "undefined") {
      return animationInstanceState.currentSpeed
    }
    animationInstanceState.resumeSpeed = scale || animationInstanceState.resumeSpeed // stays the same as previous if speed changes to 0
    animationInstanceState.currentSpeed = scale
    animationInstanceState.absSpeed = Math.abs(scale)
    return this
  },

  // delay (object, ms) // get/set delayRemaining - if speed is 0, this will not change. If speed is non-zero, playback will resume after ms
  delay: function (object, ms) {
    const animationInstanceState = this.animationState(object) || {}
    if (typeof ms === "undefined") {
      return animationInstanceState.delayRemaining
    }
    // delay positive amounts only
    ms = Math.max(ms, 0)
    animationInstanceState.delayRemaining = ms
    return this
  },
  // delayBatch (batchName),
  // delayAll (),

  // seek (object, ms), // get/set currentPosition. Note: delay is skipped/set to 0 if seeking is set. 0 <= ms <= lastKeyframePosition.
  // note2: doesn't consider ebbing which may cause the animation to hit any given position twice during one play
  seek: function (object, ms) {
    const animationInstanceState = this.animationState(object) || {}
    if (typeof ms === "undefined") {
      return animationInstanceState.currentPosition
    }
    // seek in bounds only
    ms = Math.max(ms, 0)
    ms = Math.min(ms, this.config.lastKeyframePosition)
    animationInstanceState.delayRemaining = 0
    animationInstanceState.currentPosition = ms
    // this will cause the frame to render at the new position if it's paused but will not resume beyond that
    animationInstanceState.paused = false
    return this
  }
  // seekBatch (batchName),
  // seekAll ()
}

export { PropJockey }
export default PropJockey
