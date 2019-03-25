import hydrationStore from "./hydration-store"

// Config options that can be changed from serialized identifier strings into functions from the store
const configPropList = [
  "initialDelay",
  "repeatDelay",
  "ebb",
  "repeat",
  "onUpdate",
  "onAfterFrame",
  "timingPool",
  "defaultEase",
  "defaultSetter",
  "defaultSlide"
]
const propsConfigPropList = ["setter", "onUpdate", "slide"]
const propsKeyframesConfigPropList = ["value", "ease", "callback"]

const hydrateConfigKeys = function (config, configProps) {
  const len = configProps.length
  for (let c = 0; c < len; c++) {
    const configProp = configProps[ c ]
    const configPropVal = config[ configProp ]
    if (typeof configPropVal !== "function") {
      config[ configProp ] = hydrationStore.get(configPropVal)
    }
  }
}

const hydrateConfig = function (config) {
  config.propList = Object.keys(config.props)
  config.minTimestampDelta = config.maxFPS ? 1000 / config.maxFPS : 0
  // it is only safe to change the timingPool of an animation dynamically IF there are no objects in progress using this animation
  config.timingPool = config.timingPool || "timing.requestAnimationFrame"
  config.defaultEase = config.defaultEase || "ease.linear"
  config.defaultSlide = config.defaultSlide || "slide.number"
  config.defaultSetter = config.defaultSetter || "setter.object.prop"

  hydrateConfigKeys(config, configPropList)

  var lastKeyframePosition = 0

  const props = config.propList
  const propLen = props.length
  for (let p = 0; p < propLen; p++) {
    const propName = props[p]
    const prop = config.props[propName]
    hydrateConfigKeys(prop, propsConfigPropList)
    const keyframes = prop.keyframes
    const numFrames = keyframes.length
    for (let k = 0; k < numFrames; k++) {
      const kf = keyframes[k]
      hydrateConfigKeys(kf, propsKeyframesConfigPropList)
      lastKeyframePosition = Math.max(lastKeyframePosition, kf.position)
    }
  }
  config.lastKeyframePosition = lastKeyframePosition
}

export { hydrateConfig, hydrateConfigKeys }
export default hydrateConfig
