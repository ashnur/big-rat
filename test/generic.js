'use strict'
Error.stackTraceLimit = Infinity

var jsv = require('jsverify')
var tape = require('tape')
var bn = require('bn.js')
var rat = require('../index.js')
var toString = require('../to-string.js')
var isRat = require('../is-rat.js')
var isBN = require('../lib/is-bn')
var _ = require('ramda')
var one = new bn(1)
var zero = new bn(2)
var signum = require('signum')

// possible inputs
// bn
// string
// natural number
// float
// rational
// falsy values
function decimalPlaces(num) {
  // http://stackoverflow.com/a/10454560/565303
  // if there is a better way to shrink floats, replace/remove this
  var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/)
  if (!match) {
    return 0
  }
  // Number of digits right of decimal point. // Adjust for scientific notation.
  return Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0))
}

function shrinkBN(bigint){
  return bigint.bitLength() > 1 ? bigint.shrn(bigint.bitLength() - 1)
       :                          one
}

function shrinkNum(n){
  return n / Math.log(Math.abs(n))
}

function shrinkString(bigint){
  return bigint.slice(0, bigint.length - 1)
}

function shrinkInt(num){
  return signum(num) * Math.abs(shrinkNum(num))
}

function shrinkFloat(num){
  var dp = decimalPlaces(num)
  return (signum(num) * (Math.abs(shrinkNum(num)))).toFixed(dp - 1)
}

var arbInput = function(a){
  return {
    generator: jsv.generator.bless(function(){
                 var sw = jsv.random(0, 5)
                 return sw === 0 ? new bn(123)
                      : sw === 1 ? '21394761'
                      : sw === 2 ? 123444
                      : sw === 3 ? 123.45
                      : sw === 4 ? rat(1,2)
                      :            jsv.generator.falsy
               })
  , shrink: jsv.shrink.bless(function(input){
              return isBN(input)              ? [input, shrinkBN(input)]
                   : typeof input == 'string' ? [input, shrinkString(input)]
                   : typeof input == 'number' ? input === Math.floor(input) ? [input, shrinkInt(input)]
                                              :                               [input, shrinkFloat(input)]
                   : isRat(input)             ? [input, rat(shrinkBN(rat[0] || one), shrinkBN(rat[1] || one))]
                   :                            [input, undefined]
            })
  , show: function(rat){
      return toString(rat)
    }
  }
}

var set = function (arb) {
  // Good to have this only once!
  var arrayArb = jsv.array(arb)
  return {
    generator: arrayArb.generator.map(_.uniq),
    shrink: arrayArb.shrink.smap(_.uniq, _.identity), // _.id is 'forgets' uniqueness: 'set → array'
    show: arrayArb.show,
  }
}

tape('construct', function(t) {

  var r = jsv.check(jsv.forall(arbInput(jsv.nat), arbInput(jsv.nat), function (a, b) {
                      var r = rat(a, b)
                      return isRat(r)
                    }), {quiet: true})

  if ( r === true ) {
    t.pass()
  } else {
    var msg = 'Failed after ' + r.tests +
      ' tests with counterexample: ' + r.counterexamplestr
    t.fail(msg)
  }

  t.end()
})
