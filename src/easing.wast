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

  ;; todo: quadratic may also be able to use this as-is, maybe; in that case the name should change
  ;; TODO: export this when name is resolved ^ because it's at least useful for manual itterative drawing of cubic bezier curves
  (func $cubicBezierVal
    (param $itterationVal f64) (param $d1 f64) (param $d2 f64)
    (result f64)
    (local $q1 f64)
    
    ;; q0 = d1 * itterationVal
    get_local $d1
    get_local $itterationVal
    f64.mul

    ;; q1 = slide( d1, d2, itterationVal )
    get_local $d1
    get_local $d2
    get_local $itterationVal
    call $slide

    tee_local $q1 ;; save result of q1 slide ^ but keep it on the stack

    ;; r0 = slide( q0, q1, itterationVal )
    get_local $itterationVal
    call $slide ;; stack is just 1 val, r0

    get_local $q1 ;; re-stack our saved q1

    ;; q2 = slide( d2, 1.0, itterationVal )
    get_local $d2
    f64.const 1.0
    get_local $itterationVal ;; stack is 5 deep now
    call $slide ;; stack is 3 deep (r0, q1, q2)

    ;; r1 = slide( q1, q2, itterationVal )
    get_local $itterationVal
    call $slide ;; stack is 2 deep (r0, r1)

    ;; itterationResult = slide( r0, r1, itterationVal )
    get_local $itterationVal
    call $slide ;; stack contains one value, the one we need
  )

  ;; TODO: this could be more effiecint, can probably binary search the x positions pretty effectively
  (func $createCubicBezierFn (export "cacheCubicBezier")
    (param $xd1 f64) (param $yd1 f64) (param $xd2 f64) (param $yd2 f64)
    (result i32)
    (local $cacheOffset i32)
    (local $cacheAddress i32)
    (local $currentTimePos f64)
    (local $timePerIndex f64)
    (local $itterationVal f64)
    (local $prevIttrVal f64)
    (local $leftBezierX f64)
    (local $loopBezierX f64)

    ;; each cache is 32 evenly-spaced-in-time values
    ;; 32 x 8bytes = 256 bytes per cache
    ;; pagesize is 64KiB so there's room for 256 easings / page
    ;; first 256 bytes will be skipped and partially used for other data
    call $allocateCachedEasing
    tee_local $cacheOffset
    set_local $cacheAddress

    f64.const 1.0
    f64.const 31.0
    f64.div
    set_local $timePerIndex

    f64.const 0.0
    tee_local $currentTimePos
    tee_local $itterationVal
    set_local $prevIttrVal

    block
      loop
        get_local $itterationVal
        get_local $xd1
        get_local $xd2
        call $cubicBezierVal

        tee_local $loopBezierX
        get_local $currentTimePos
        f64.gt

        if
          get_local $cacheAddress ;; for the f64.store below

          ;; get y val at $prevIttrVal
          get_local $prevIttrVal
          get_local $yd1
          get_local $yd2
          call $cubicBezierVal

          ;; get y val at $itterationVal
          get_local $itterationVal
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

        get_local $itterationVal
        tee_local $prevIttrVal

        f64.const 0.004
        f64.add
        tee_local $itterationVal

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
)
