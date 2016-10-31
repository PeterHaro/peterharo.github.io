/**
 * Created by peterh on 14.10.2016.
 */

function getCapePalette() {

    var bounds = [0, 5000];  // units: J/kg

    // Diverging 11-class RdBu, from colorbrewer2.org:
    var g = µ.segmentedColorScale([
        [   0, [  5, 48, 97]],  // weak
        [ 500, [ 33,102,172]],  // weak
        [1000, [ 67,147,195]],  // weak
        [1500, [146,197,222]],  // moderate
        [2000, [209,229,240]],  // moderate
        [2500, [247,247,247]],  // moderate
        [3000, [253,219,199]],  // strong
        [3500, [244,165,130]],  // strong
        [4000, [214, 96, 77]],  // strong
        [4500, [178, 24, 43]],  // extreme
        [5000, [103,  0, 31]]   // extreme
    ]);

    var array = _.range(1000).map(function() { return null; });  // create null-filled array.
    palette.fillRange(array, bounds, bounds, g);
    var gradient = palette.gradient(array, bounds);

    return {bounds: bounds, gradient: gradient};
}