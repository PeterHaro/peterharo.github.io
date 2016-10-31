/**
 * Created by peterh on 13.10.2016.
 */

function getDuexPalette() {
    var bounds = [0.0001, 3.0000], logBounds = bounds.map(Math.log);  // units: τ
    var gradient = palette.gradient(Kindleman, logBounds);

    return {
        bounds: bounds,
        gradient: function(v, a) { return gradient(Math.log(v), a); },
        spread: function(p) { return Math.exp(µ.spread(p, logBounds[0], logBounds[1])); },
    };
}