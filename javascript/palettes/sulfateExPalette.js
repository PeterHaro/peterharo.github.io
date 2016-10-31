/**
 * Created by peterh on 13.10.2016.
 */

function getSulfateExPalette() {
    var bounds = [0.002, 2.500], logBounds = bounds.map(Math.log);  // units: τ
    var scale = chroma.scale(chroma.cubehelix()).domain(logBounds);
    var gradient = palette.quantize([scale], logBounds, 500);

    return {
        bounds: bounds,
        gradient: function(v, a) { return gradient(Math.log(v), a); },
        spread: function(p) { return Math.exp(µ.spread(p, logBounds[0], logBounds[1])); },
    };

}