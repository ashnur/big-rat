'use strict'

function add(a, b) {
  return rationalize([
    a[0].mul(b[1]).add(b[0].mul(a[1])),
    a[1].mul(b[1])
  ])
}
