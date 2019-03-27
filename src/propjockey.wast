(module
  (memory 1) ;; (memory (export "memory") 1)
  (func $slide (export "slide")
    (param $from f64) (param $to f64) (param $amount f64)
    (result f64)

    get_local $to
    get_local $from
    f64.sub
    get_local $amount
    f64.mul
    get_local $from
    f64.add
  )

  (func $amount (export "amount")
    (param $from f64) (param $to f64) (param $value f64)
    (result f64)

    get_local $value
    get_local $from
    f64.sub
    get_local $to
    get_local $from
    f64.sub
    f64.div
  )

  (func $cachedEasing (export "cachedEasing")
    (param $cacheOffset i32)
    (param $timeX f64)
    (result f64)
    (local $timeIndexExact f64)
    (local $timeIndexLeft i32)
    (local $valLeft f64)
    (local $cacheAddress i32)

    get_local $timeX
    f64.const 0.0
    f64.le

    if
      f64.const 0.0
      return
    end

    get_local $timeX
    f64.const 1.0
    f64.ge

    if
      f64.const 1.0
      return
    end

    get_local $timeX
    f64.const 31.0
    f64.mul
    tee_local $timeIndexExact

    get_local $timeIndexExact
    i32.trunc_f64_u ;; Math.floor( f64 ) -> i32
    tee_local $timeIndexLeft

    f64.convert_i32_u

    f64.sub ;; valSlideAmount

    get_local $timeIndexLeft
    i32.const 3
    i32.shl ;; same as if `i32.const 8` `i32.mul`

    get_local $cacheOffset
    i32.add
    tee_local $cacheAddress

    f64.load offset=8 ;; valRight

    get_local $cacheAddress
    f64.load
    tee_local $valLeft

    f64.sub ;; valDiff
    f64.mul ;; valSlideAmount * valDiff

    get_local $valLeft
    f64.add
  )

  (func $setCachedEasingFrame (export "setCachedEasingFrame")
    (param $cacheOffset i32)
    (param $frameIndex i32)
    (param $value f64)
    ;; no result

    get_local $frameIndex
    i32.const 3
    i32.shl ;; same as if `i32.const 8` `i32.mul`

    get_local $cacheOffset
    i32.add

    get_local $value
    f64.store
  )

  (func $allocateCachedEasing (export "allocateCachedEasing")
    (result i32) ;; returns cacheOffset
    (local $cacheIndex i32)

    ;; each cache is 32 evenly-spaced-in-time values
    ;; 32 x 8bytes = 256 bytes per cache
    ;; pagesize is 64KiB so there's room for 256 easings / page
    ;; first 256 bytes will be skipped and partially used for other data

    i32.const 0 ;; for the i32.store
    i32.const 0
    i32.load
    i32.const 1
    i32.add
    tee_local $cacheIndex
    i32.store ;; if this becomes > 0xFF, then a second memory page is required
    get_local $cacheIndex
    i32.const 8
    i32.shl ;; same as if `i32.const 256` `i32.mul`
  )

  (func $cubicBezierVal (export "cubicBezierVal")
    (param $itterationAmount f64) (param $d1 f64) (param $d2 f64)
    (result f64)
    (local $q1 f64)
    
    ;; q0 = d1 * itterationAmount
    get_local $d1
    get_local $itterationAmount
    f64.mul

    ;; q1 = slide( d1, d2, itterationAmount )
    get_local $d1
    get_local $d2
    get_local $itterationAmount
    call $slide

    tee_local $q1 ;; save result of q1 slide ^ but keep it on the stack

    ;; r0 = slide( q0, q1, itterationAmount )
    get_local $itterationAmount
    call $slide ;; stack is just 1 val, r0

    get_local $q1 ;; re-stack our saved q1

    ;; q2 = slide( d2, 1.0, itterationAmount )
    get_local $d2
    f64.const 1.0
    get_local $itterationAmount ;; stack is 5 deep now
    call $slide ;; stack is 3 deep (r0, q1, q2)

    ;; r1 = slide( q1, q2, itterationAmount )
    get_local $itterationAmount
    call $slide ;; stack is 2 deep (r0, r1)

    ;; itterationResult = slide( r0, r1, itterationAmount )
    get_local $itterationAmount
    call $slide ;; stack contains one value, the one we need
  )

  (func $cacheCubicBezier (export "cacheCubicBezier")
    (param $cacheOffset i32)
    (param $xd1 f64) (param $yd1 f64) (param $xd2 f64) (param $yd2 f64)
    (result i32)
    (local $cacheAddress i32)
    (local $currentTimePos f64)
    (local $timePerIndex f64)
    (local $itterationAmount f64)
    (local $prevItterationAmount f64)
    (local $leftBezierX f64)
    (local $loopBezierX f64)

    get_local $cacheOffset
    set_local $cacheAddress

    f64.const 1.0
    f64.const 31.0
    f64.div
    set_local $timePerIndex

    f64.const 0.0
    tee_local $currentTimePos
    tee_local $itterationAmount
    set_local $prevItterationAmount

    block
      loop
        get_local $itterationAmount
        get_local $xd1
        get_local $xd2
        call $cubicBezierVal

        tee_local $loopBezierX
        get_local $currentTimePos
        f64.gt

        if
          get_local $cacheAddress ;; for the f64.store below

          ;; get y val at $prevItterationAmount
          get_local $prevItterationAmount
          get_local $yd1
          get_local $yd2
          call $cubicBezierVal

          ;; get y val at $itterationAmount
          get_local $itterationAmount
          get_local $yd1
          get_local $yd2
          call $cubicBezierVal

          get_local $leftBezierX
          get_local $loopBezierX
          get_local $currentTimePos
          call $amount

          call $slide ;; cubic bezier Y value at curTimePos
          f64.store ;; save that ^ to memory
          
          get_local $cacheAddress
          i32.const 8
          i32.add
          set_local $cacheAddress ;; advance address to next float spot

          get_local $timePerIndex
          get_local $currentTimePos
          f64.add
          set_local $currentTimePos
        end

        get_local $loopBezierX
        set_local $leftBezierX

        get_local $itterationAmount
        tee_local $prevItterationAmount

        f64.const 0.004
        f64.add
        tee_local $itterationAmount

        f64.const 1.0
        f64.lt
        br_if 0
        br 1
      end
    end

    ;; save const 1.0 to memory as last value of the easing
    get_local $cacheAddress
    f64.const 1.0
    f64.store

    ;; return $cacheOffset
    ;; - $cacheOffset indicates where in linear memory this set of vals was saved
    ;; - $cacheOffset is first param of cachedEasing, for O(1) t->value lookup
    get_local $cacheOffset
  )

  (func $quadraticBezierVal (export "quadraticBezierVal")
    (param $itterationAmount f64) (param $d f64)
    (result f64)

    ;; q0 = itterationAmount * d
    get_local $itterationAmount
    get_local $d
    f64.mul

    ;; q1 = slide( d, 1, itterationAmount )
    get_local $d
    f64.const 1.0
    get_local $itterationAmount
    call $slide

    get_local $itterationAmount
    call $slide
  )

  (func $cacheQuadraticBezier (export "cacheQuadraticBezier")
    (param $cacheOffset i32)
    (param $x f64) (param $y f64)
    (result i32)
    (local $cacheAddress i32)
    (local $timePerIndex f64)
    (local $currentTimePos f64)
    (local $itterationAmount f64)
    (local $prevItterationAmount f64)
    (local $leftBezierX f64)
    (local $loopBezierX f64)

    get_local $cacheOffset
    set_local $cacheAddress

    f64.const 1.0
    f64.const 31.0
    f64.div
    set_local $timePerIndex

    f64.const 0.0
    tee_local $currentTimePos
    tee_local $itterationAmount
    set_local $prevItterationAmount

    block
      loop
        get_local $itterationAmount
        get_local $x
        call $quadraticBezierVal

        tee_local $loopBezierX
        get_local $currentTimePos
        f64.gt

        if
          get_local $cacheAddress ;; for the f64.store below

          ;; get y val at $prevItterationAmount
          get_local $prevItterationAmount
          get_local $y
          call $quadraticBezierVal

          ;; get y val at $itterationAmount
          get_local $itterationAmount
          get_local $y
          call $quadraticBezierVal

          get_local $leftBezierX
          get_local $loopBezierX
          get_local $currentTimePos
          call $amount

          call $slide ;; quadratic bezier Y value at curTimePos
          f64.store ;; save that ^ to memory

          get_local $cacheAddress
          i32.const 8
          i32.add
          set_local $cacheAddress ;; advance address to next float spot

          get_local $timePerIndex
          get_local $currentTimePos
          f64.add
          set_local $currentTimePos
        end

        get_local $loopBezierX
        set_local $leftBezierX

        get_local $itterationAmount
        tee_local $prevItterationAmount

        f64.const 0.004
        f64.add
        tee_local $itterationAmount

        f64.const 1.0
        f64.lt
        br_if 0
        br 1
      end
    end

    ;; save const 1.0 to memory as last value of the easing
    get_local $cacheAddress
    f64.const 1.0
    f64.store
    
    ;; return $cacheOffset
    ;; - $cacheOffset indicates where in linear memory this set of vals was saved
    ;; - $cacheOffset is first param of cachedEasing, for O(1) t->value lookup
    get_local $cacheOffset
  )

  ;; for testing but also useful if a game or tool choses to preload
  ;; their most common eases by area, map, scene etc.
  ;; Anything bound to a specific offset in js land should be tossed if this is called.
  ;; The bound ones will still work as normal until the cache range is overwritten (but shouldn't be used).
  (func $resetInternalCacheCounter (export "resetInternalCacheCounter")
    i32.const 0
    i32.const 0
    i32.store
  )

  (func $byteSlide (export "byteSlide")
    (param $byte1 i32)
    (param $byte2 i32)
    (param $amount f64)
    (result i32)
    (local $slidByte f64)

    get_local $byte1
    i32.const 0xff
    i32.and
    f64.convert_i32_u

    get_local $byte2
    i32.const 0xff
    i32.and
    f64.convert_i32_u

    get_local $amount

    call $slide
    tee_local $slidByte

    f64.const 0xff
    f64.gt

    if
      i32.const 0xff
      return
    end

    get_local $slidByte
    f64.const 0
    f64.lt

    if
      i32.const 0
      return
    end

    get_local $slidByte
    f64.nearest ;; rounds x.5 to the even number (js rounds x.5 up)
    i32.trunc_f64_u
  )

  (func $rgbSlide (export "rgbSlide")
    (param $color1 i32)
    (param $color2 i32)
    (param $amount f64)
    (result i32)

    get_local $color1
    get_local $color2
    get_local $amount
    call $byteSlide ;; __b

    get_local $color1
    i32.const 8
    i32.shr_u

    get_local $color2
    i32.const 8
    i32.shr_u

    get_local $amount

    call $byteSlide
    i32.const 8
    i32.shl ;; _g_
    i32.or ;; _gb

    get_local $color1
    i32.const 16
    i32.shr_u

    get_local $color2
    i32.const 16
    i32.shr_u

    get_local $amount

    call $byteSlide
    i32.const 16
    i32.shl ;; r__
    i32.or ;; rgb
  )

  (func $rgbaSlide (export "rgbaSlide")
    (param $color1 i32)
    (param $color2 i32)
    (param $amount f64)
    (result i32)

    get_local $color1
    get_local $color2
    get_local $amount
    call $byteSlide ;; ___a

    get_local $color1
    i32.const 8
    i32.shr_u

    get_local $color2
    i32.const 8
    i32.shr_u

    get_local $amount

    call $rgbSlide
    i32.const 8
    i32.shl ;; rgb_
    i32.or ;; rgba
  )
)
