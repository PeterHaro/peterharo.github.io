/**
 * Created by peterh on 13.10.2016.
 */

//THSI IS CORRECT FOR COsc
function ppbPalette() {
    var bounds = [40, 2500];  // units: ppb
    var stops = [
        {color: [  0,  38,  40], mode: "lab", p: bounds[0]},
        {color: [255, 255, 224], mode: "lch", p: 400},  // background is ~100 ppb https://en.wikipedia.org/wiki/MOPITT
        {color: [  0,   0, 154], mode: "lab", p: 1800},
        {color: [  0,   0,   0], mode: "lab", p: bounds[1]}
    ];

    var scales = palette.scalesFrom(stops);
    scales = palette.smooth(scales, 0, [360, 440]);
    scales = palette.smooth(scales, 2, [1700, 1900]);
    var gradient = palette.quantize(scales, bounds, 2000);

    return {bounds: bounds, gradient: gradient};

}