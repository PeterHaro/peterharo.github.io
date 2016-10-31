/**
 * Created by peterh on 13.10.2016.
 */

function co2palette() {
    var bounds = [0.0003578, 0.0003770];  // units: CO2 Bulk Mixing Ratio (Column Mass/ps) -- or CO2 column load??
    var stops = [
        {color: [  0,   0,   0], mode: "lch", p: bounds[0]},
        {color: [100,   0,   0], mode: "lch", p: 0.0003650},
        {color: [164,  36,   0], mode: "lch", p: 0.0003675},
        {color: [255, 220, 140], mode: "lch", p: 0.0003710},
        {color: [255, 255, 255], mode: "lch", p: bounds[1]}
    ];

    var scales = palette.scalesFrom(stops);
    scales = palette.smooth(scales, 2, [0.0003700, 0.0003720]);
    var gradient =  palette.quantize(scales, bounds, 1000);

    return {bounds: bounds, gradient: gradient};

}