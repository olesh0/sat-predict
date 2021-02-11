const moment = require('moment')
const jspredict = require('jspredict');
const tle = `METEOR-M 1\n1 35865U 09049A   21041.93769902  .00000004  00000-0  20419-4 0  9996\n2 35865  98.4653  25.1408 0001811 188.3566 171.7582 14.22264041591677`;
const qth = [48.522034, 25.036870, .1] // Ukraine, Kolomyia

const start = Date.now() - 3600000
const end = Date.now() + 86400000
const minimumElevation = 15

const transits = jspredict.transits(tle, qth, start, end, minimumElevation)
const TIME_FORMAT = "DD/MM/yyyy HH:mm:ss"

if (!transits.length) {
  console.log("No transits found...")
}

transits.forEach((transit) => {
  console.log(`
    ========
    Max elevation: ${transit.maxElevation.toFixed(1)}°
    start: ${moment(transit.start).format(TIME_FORMAT)}
    end: ${moment(transit.end).format(TIME_FORMAT)}
  `)
})

// 48.522034, 25.036870

// { eci:
//    { position:
//       { x: 6780.217861682045,
//         y: -1754.945569075624,
//         z: -382.1001487529574 },
//      velocity:
//       { x: 1.8548312182745958,
//         y: 7.28225574805238,
//         z: -0.6742937006920255 } },
//   gmst: 1.2743405900207918,
//   latitude: -3.141891992384467,
//   longitude: -87.52591692501754,
//   altitude: 635.9975103859342,
//   footprint: 5474.178485006438 }