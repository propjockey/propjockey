
const tickAnimationOnObject = function (animationInstanceState, animation) {
  const objectInProgress = this
  const animationConfig = animation.config
  // PropJockey animations are tied to the timingPool they were configured for/instanciated with.
  // When this tick runs, it will run with the same deltaTime against every animation of every object in the current timingPool.
  // The animation's timingPool cannot be changed safely unless there are no objects running with that animation.
  // The timingPool's delta time won't be changed until the next frame, which cannot run until this frame has completed.
  const timestampDelta = animationConfig.timingPool.deltaTime // smelly, but timingPool is in control of every tick. see comments above

  if (!animationInstanceState.tick(animationConfig, timestampDelta)) {
    return
  }

  const currentSpeed = animationInstanceState.currentSpeed
  const currentPosition = animationInstanceState.currentPosition

  const propList = animationConfig.propList
  const propCount = propList.length
  for (let i = 0; i < propCount; i++) {
    const propName = propList[i]
    const propConfig = animationConfig.props[propName]
    const keyframes = propConfig.keyframes
    const keyframesLength = keyframes.length
    const instancePropState = animationInstanceState.props[propName]
    // get from to keyframes based on position
    let from, to, fromIndex
    for (let k = 0; k < keyframesLength; k++) {
      const kf = keyframes[k]
      if (kf.position <= currentPosition) {
        from = kf
        fromIndex = k
      } else {
        to = kf
        break
      }
    }
    if (from && to) {
      instancePropState.currentKeyframe = fromIndex
    }
    const posFrom = from && from.position
    const posTo = to && to.position
    const valFrom = from && (typeof from.value === "function" ? from.value(objectInProgress, propName, animationConfig, posFrom) : from.value)
    const valTo = to && (typeof to.value === "function" ? to.value(objectInProgress, propName, animationConfig, posTo) : to.value)
    if (valFrom !== undefined && valTo !== undefined) {
      // calc position [0, 1]
      const timePosition = (currentPosition - posFrom) / (posTo - posFrom)
      // ease position to value amount. typically [0, 1] but it can ease out of bounds in the middle
      const easedAmount = (from.ease || animationConfig.defaultEase)(timePosition)
      // slide from to value amount
      const finalValue = (propConfig.slide || animationConfig.defaultSlide)(valFrom, valTo, easedAmount)
      // TODO: pass in animation instance to slide fn ^ so they can cache values while sliding
      // pass the value to the setter
      const setter = propConfig.setter || animationConfig.defaultSetter
      setter(objectInProgress, propName, finalValue, propConfig)
    } else if (valFrom === undefined && valTo !== undefined && currentSpeed < 0 && instancePropState.currentKeyframe > -1) {
      // before the first frame for this prop, moving backwards, and was previously in a frame for this prop
      (propConfig.setter || animationConfig.defaultSetter)(objectInProgress, propName, valTo, propConfig)
      instancePropState.currentKeyframe = -1
    } else if (valTo === undefined && valFrom !== undefined && currentSpeed > 0 && instancePropState.currentKeyframe < keyframesLength) {
      // after the last frame for this prop, moving forwards, and was previously in a frame for this prop
      (propConfig.setter || animationConfig.defaultSetter)(objectInProgress, propName, valFrom, propConfig)
      instancePropState.currentKeyframe = keyframesLength
    }
  }

  animationConfig.onAfterFrame && animationConfig.onAfterFrame(animation, objectInProgress, animationInstanceState)

  const afterReverse = currentSpeed < 0 && currentPosition < 0 // entire animation has reached the front
  const afterEnd = currentSpeed > 0 && currentPosition >= animationConfig.lastKeyframePosition // entire animation has reached the end

  if (afterEnd || afterReverse) {
    if (!animationInstanceState.ebb(animationConfig, objectInProgress)) {
      // it's done ebbing (or not going to) and it's time to repeat (or end)
      if (!animationInstanceState.repeat(animationConfig, objectInProgress)) {
        // it's done repeating (or not going to) so time to end
        animation.stop(objectInProgress)
      }
    }
  }
}

const tickAllAnimationsOnObject = (animationStateMaps, objectInProgress) => {
  animationStateMaps.forEach(tickAnimationOnObject, objectInProgress)
}

export { tickAnimationOnObject, tickAllAnimationsOnObject }
