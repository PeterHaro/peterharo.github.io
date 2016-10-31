/**
 * Created by peterh on 13.10.2016.
 */

function mTest(Δ) {

    var bounds = [320 + Δ, 430 + Δ];  // units: CO2 Surface Concentration ppmv
    var stops = [
        {color: [  0,   0,   0], mode: "lch", p: bounds[0]},
        {color: [100,   0,   0], mode: "lch", p: 360 + Δ},
        {color: [164,  36,   0], mode: "lch", p: 365 + Δ},
        {color: [255, 220, 140], mode: "lch", p: 380 + Δ},
        {color: [255, 255, 255], mode: "lch", p: 410 + Δ},
        {color: [  0, 210, 255], mode: "lch", p: bounds[1]}
    ];

    var scales = palette.scalesFrom(stops);
    var x = stops[3].p, y = stops[4].p, z = stops[1].p;
    scales = palette.smooth(scales, 0, [z-2, z+2]);
    scales = palette.smooth(scales, 3, [x-2, x+2]);
    scales = palette.smooth(scales, 5, [y-2, y+2]);
    var gradient =  palette.quantize(scales, bounds, 1000);

    return {bounds: bounds, gradient: gradient};

}

