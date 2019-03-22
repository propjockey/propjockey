import QUnit from "steal-qunit"
import { hydrateConfig, hydrateConfigKeys } from "../src/hydrate-config.js"

const { test } = QUnit

QUnit.module("hydrate-config", function (hooks) {
  test("imports should work", t => {
    t.ok(hydrateConfig, "hydrateConfig exists")
    t.ok(hydrateConfigKeys, "hydrateConfigKeys exists")
  })

  QUnit.module("hydrateConfigKeys(configPart, configPropsToLookup)", h => {
    test("will replace properties specified with the value found in the hydrationStore if val is a key", t => {
      const customFn = () => {}
      const configPart = {
        foo: "ease.linear",
        bar: "ease.linear",
        num: customFn,
        color: "red",
        narp: "ease.linear"
      }
      // todo: backup the linear definition and restore it (will need to be able to roll back wasm state too)
      const configPropsToLookup = ["foo", "bar", "num", "color"]
      hydrateConfigKeys(configPart, configPropsToLookup)
      t.notEqual(configPart.foo, "ease.linear", "replacement happened")
      t.equal(typeof configPart.bar, "function", "replaced with fn from the store")
      t.equal(configPart.foo, configPart.bar, "replaced properties that match will hydrate to the same shared function")
      t.equal(configPart.num, customFn, "properties that match the list but weren't strings do not get replaced")
      t.equal(configPart.color, "red", "properties that match the list and were strings do not get replaced if the value isn't a key")
      t.equal(configPart.narp, "ease.linear", "replace didn't happen on unlisted parts")
    })
  })

  QUnit.module("hydrateConfig(config)", h => {
    test("will update specific properties of entire config with the value found in the hydrationStore if val is a key", t => {
      const config = {
        narp: "samesies",
        someRandomProp: "ease.linear",
        initialDelay: "ease.linear",
        repeatDelay: "ease.linear",
        ebb: "ease.linear",
        repeat: "ease.linear",
        onUpdate: "ease.linear",
        onAfterFrame: "ease.linear",
        timingPool: "ease.linear",
        defaultEase: "ease.linear",
        defaultSetter: "ease.linear",
        defaultSlide: "ease.linear",
        props: {
          "any": {
            unit: "px",
            setter: "ease.linear",
            onUpdate: "ease.linear",
            slide: "ease.linear",
            keyframes: [
              {
                value: "ease.linear",
                ease: "ease.linear",
                callback: "ease.linear"
              },
              {
                value: "asdf",
                ease: x => x,
                callback: "ease.linear"
              }
            ]
          },
          "--abc_123": {
            setter: "setter.element.cssVar",
            keyframes: []
          }
        }
      }

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

      hydrateConfig(config)

      t.equal(config.narp, "samesies", "didn't change property")
      t.equal(config.someRandomProp, "ease.linear", "didn't change unknown config prop even though key is in store")

      const linearEaseFn = config.defaultEase
      t.equal(typeof linearEaseFn, "function", "serialized ease fn was hydrated")
      t.equal(linearEaseFn(0.5), 0.5, "hydrated linear ease function works as expected")

      for (let i = 0; i < configPropList.length; i++) {
        const configProp = configPropList[i]
        t.equal(config[configProp], linearEaseFn, "config " + configProp + " hydrated from store as expected")
      }

      for (let i = 0; i < propsConfigPropList.length; i++) {
        const configProp = propsConfigPropList[i]
        t.equal(config.props.any[configProp], linearEaseFn, "config.props.any " + configProp + " hydrated from store as expected")
      }

      for (let i = 0; i < propsKeyframesConfigPropList.length; i++) {
        const configProp = propsKeyframesConfigPropList[i]
        t.equal(
          config.props.any.keyframes[0][configProp],
          linearEaseFn,
          "config.props.any.keyframes[*] " + configProp + " hydrated from store as expected"
        )
      }

      t.equal(config.props.any.keyframes[1].value, "asdf", "keyframes[1].value is correct")
      t.equal(typeof config.props.any.keyframes[1].ease, "function", "keyframes[1].ease is correct")
      t.notEqual(typeof config.props.any.keyframes[1].ease, linearEaseFn, "keyframes[1].ease is correct")
      t.equal(config.props.any.keyframes[1].callback, linearEaseFn, "keyframes[1].callback is correct")

      t.equal(typeof config.props["--abc_123"].setter, "function", "config prop setter hydrated")
      t.notEqual(config.props["--abc_123"].setter, linearEaseFn, "config prop setter hydrated as expected")
    })
  })

})
