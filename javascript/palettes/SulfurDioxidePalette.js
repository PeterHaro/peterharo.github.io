/**
 * Created by peterh on 13.10.2016.
 */

function getSulfurDioxidePalette() {

    //      v*1e-14
    //             1
    //         3,000  boat trail start
    //        20,000
    //       115,000  boat trail peak
    //       262,000     1 ppb
    //    19,650,000    75 ppb, EPA 1hr std limit
    //    65,500,000   250 ppb, Amer Conf of Gvt Indus Hygen short term exposure limit
    //   163,226,000   623 ppb, largest seen in 2 weeks of geos-driver
    //   484,962,000  1851 ppb, top of log scale
    // 1,310,000,000  5000 ppb, OSHA PEL

    var bounds = [10e-14, 88800000e-14], logBounds = bounds.map(Math.log);  // units: kg/m3
    var stops = [
        {color: [134, 134, 107], mode: "lch", p: logBounds[0]},
        {color: [144, 144, 117], mode: "lch", p: Math.log(100e-14)},
        {color: [255, 255, 224], mode: "lch", p: Math.log(7000e-14)},
        {color: [  0,   0, 128], mode: "lab", p: Math.log(19000000e-14)},
        {color: [ 23,  20,  18], mode: "lab", p: logBounds[1]}
    ];

    var scales = palette.scalesFrom(stops);
    scales = palette.smooth(scales, 1, [Math.log(5000e-14), Math.log(9000e-14)]);
    scales = palette.smooth(scales, 3, [Math.log(10000000e-14), Math.log(30000000e-14)]);
    var gradient = palette.quantize(scales, logBounds, 400);

    return {
        bounds: bounds,
        gradient: function(v, a) { return gradient(Math.log(v), a); },
        spread: function(p) { return Math.exp(µ.spread(p, logBounds[0], logBounds[1])); },
    };
}