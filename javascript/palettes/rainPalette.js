/**
 * Created by peterh on 13.10.2016.
 */

/*
 https://en.wikipedia.org/wiki/Rain#Intensity

 Light rain — when the precipitation rate is < 2.5 mm (0.098 in) per hour
 Moderate rain — when the precipitation rate is between 2.5 mm (0.098 in) - 7.6 mm (0.30 in) or 10 mm (0.39 in) per hour
 Heavy rain — when the precipitation rate is > 7.6 mm (0.30 in) per hour, or between 10 mm (0.39 in) and 50 mm (2.0 in) per hour
 Violent rain — when the precipitation rate is > 50 mm (2.0 in) per hour
 */
function getRainPalette() {
    var bounds = [0, 150];  // units: kg/m3 == mm

    var stops = [
        {color: chroma("#719aa9").darker(30), mode: "lch", p: bounds[0]},
        {color: "aliceblue", mode: "lch", p: 2},
        {color: chroma("#0019BF").darker(1), mode: "lch", p: 15},
        {color: "gold", mode: "lch", p: 100},
        {color: "white", mode: "lch", p: bounds[1]}
    ];

    var scales = palette.scalesFrom(stops);
    scales = palette.smooth(scales, 0, [1, 3]);
    scales = palette.smooth(scales, 2, [13, 17]);
    var gradient = palette.quantize(scales, bounds, 2000);

    return {bounds: bounds, gradient: gradient};
}