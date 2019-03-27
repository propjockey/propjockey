import QUnit from "steal-qunit"
import { wasmHydrations, wasmUtils } from "../src/wasm-hydrations.js"

const { test } = QUnit

QUnit.module("wasmHydrations", function (hooks) {
  test("imports should work", t => {
    t.ok(wasmUtils, "exists wasmUtils")
    t.ok(wasmUtils.wasmExports, "exists wasmExports")
    t.ok(wasmUtils.wasmExports.slide, "exists wasmExports.slide")
    t.ok(wasmUtils.checkEaseCacheStatus, "exists checkEaseCacheStatus")
    t.ok(wasmUtils.freeReusableCache, "exists freeReusableCache")
    t.ok(wasmUtils.freeAllReusableCache, "exists freeAllReusableCache")
    t.ok(wasmUtils.freeAllMemoizedAndReusableEaseCaches, "exists freeAllMemoizedAndReusableEaseCaches")

    t.ok(wasmHydrations, "exists wasmHydrations")
    t.equal(typeof wasmHydrations["slide.number"], "function", "wasmHydrations slide.number is a function")
    t.equal(typeof wasmHydrations["slide.byte"], "function", "wasmHydrations slide.byte is a function")
    t.equal(wasmHydrations["slide.number"], wasmUtils.wasmExports.slide, "wasmHydrations slide.number is the wasmExport directly")
    t.equal(wasmHydrations["slide.byte"], wasmUtils.wasmExports.byteSlide, "wasmHydrations slide.byte is the wasmExport directly")
  })
  test("slide.color.hex works", t => {
    const rgbSlide = wasmHydrations["slide.color.hex"]
    t.equal( rgbSlide(  "#596168",  "#0a031b",    0.5 ),  "#323242",  "#1"  )
    t.equal( rgbSlide(  "#616861",  "#0038a7",    0.5 ),  "#305084",  "#2"  )
    t.equal( rgbSlide(  "#212059",  "#734f95",   0.75 ),  "#5e4386",  "#3"  )
    t.equal( rgbSlide(  "#6F7520",  "#d80272",  -0.25 ),  "#55920c",  "#4"  )
    t.equal( rgbSlide(  "#666F75",  "#4d0195",  0.125 ),  "#636179",  "#5"  )
    t.equal( rgbSlide(  "#6E6420",  "#666666",  0.333 ),  "#6b6537",  "#6"  )
    t.equal( rgbSlide(  "#6D6521",  "#000000",      1 ),  "#000000",  "#7"  )
    t.equal( rgbSlide(  "#20F09F",  "#000000",      0 ),  "#20f09f",  "#8"  )
    t.equal( rgbSlide(  "#8CB07D",  "#000000",      9 ),  "#000000",  "#9"  )
    t.equal( rgbSlide(  "#000000",  "#ffffff",   -0.5 ),  "#000000",  "#10" )
    t.equal( rgbSlide(  "#ffffff",  "#000000",  -0.25 ),  "#ffffff",  "#11" )
    t.equal( rgbSlide(  "#000000",  "#ffffff",    0.5 ),  "#808080",  "#12" )
    t.equal( rgbSlide(  "#ffffff",  "#000000",   0.25 ),  "#bfbfbf",  "#13" )
    t.equal( rgbSlide(  "#000000",  "#808080",      2 ),  "#ffffff",  "#14" )
    t.equal( rgbSlide(  "#000000",  "#7f7f7f",      2 ),  "#fefefe",  "#15" )
    t.equal( rgbSlide(  "#000000",  "#808080",      5 ),  "#ffffff",  "#16" )
    t.equal( rgbSlide(  "#0000ff",   "808080",      2 ),  "#ffff01",  "# is optional on color params" )
    t.equal( rgbSlide(   "0000ff",  "#808080",      2 ),   "ffff01",  "color1 determines if # is included in the result" )
    t.equal( rgbSlide(   "0000ff",   "808080",      2 ),   "ffff01",  "# is optional on both color params at the same time" )
  })
  test("slide.color.hexa works", t => {
    const rgbaSlide = wasmHydrations["slide.color.hexa"]
    t.equal( rgbaSlide(  "#5B596168",  "#00590061",    0.5 ),  "#2e593064",  "#1"  )
    t.equal( rgbaSlide(  "#61686121",  "#00680061",    0.5 ),  "#30683041",  "#2"  )
    t.equal( rgbaSlide(  "#20596F75",  "#00680061",   0.75 ),  "#08641c66",  "#3"  )
    t.equal( rgbaSlide(  "#20666F75",  "#00210020",  -0.25 ),  "#28778b8a",  "#4"  )
    t.equal( rgbaSlide(  "#6E64206D",  "#0059006F",  0.125 ),  "#60631c6d",  "#5"  )
    t.equal( rgbaSlide(  "#652120F0",  "#00750020",  0.333 ),  "#433d15ab",  "#6"  )
    t.equal( rgbaSlide(  "#9F8CB05D",  "#0066006F",      1 ),  "#0066006f",  "#7"  )
    t.equal( rgbaSlide(  "#0a031bff",  "#0075006E",      0 ),  "#0a031bff",  "#8"  )
    t.equal( rgbaSlide(  "#0038a7ff",  "#00640020",      9 ),  "#00ff0000",  "#9"  )
    t.equal( rgbaSlide(  "#734f95ff",  "#006D0065",   -0.5 ),  "#ac40e0ff",  "#10" )
    t.equal( rgbaSlide(  "#d80272ff",  "#00210020",  -0.25 ),  "#ff008eff",  "#11" )
    t.equal( rgbaSlide(  "#4d0195ff",  "#D83CDF30",    0.5 ),  "#921eba98",  "#12" )
    t.equal( rgbaSlide(  "#666666ff",  "#000000ff",   0.25 ),  "#4c4c4cff",  "#13" )
    t.equal( rgbaSlide(  "#ff000000",  "#808080cc",      2 ),  "#01ffffff",  "#14" )
    t.equal( rgbaSlide(  "#00ff00cc",  "#7f7f7f88",      2 ),  "#fe00fe44",  "#15" )
    t.equal( rgbaSlide(  "#0000ff57",  "#80808044",      5 ),  "#ffff0000",  "#16" )
    t.equal( rgbaSlide(  "#0000ff57",   "80808044",      2 ),  "#ffff0131",  "# is optional on color params" )
    t.equal( rgbaSlide(   "0000ff57",  "#80808044",      2 ),   "ffff0131",  "color1 determines if # is included in the result" )
    t.equal( rgbaSlide(   "0000ff57",   "80808044",      2 ),   "ffff0131",  "# is optional on both color params at the same time" )
  })
})