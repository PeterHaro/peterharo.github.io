/**
 * Created by peterh on 13.10.2016.
 */

var palette = function() {
    "use strict";

    /**
     * Converts an array of N color stops into N-1 chroma scales:
     *
     *    {color: "black", mode: "lch", p: 10},
     *    {color: "grey",  mode: "lab", p: 20},
     *    {color: "white",              p: 30}
     *
     * Result:
     *    scale 0 [black, grey] over domain [10, 20] in lch color space
     *    scale 1 [grey, white] over domain [20, 30] in lab color space
     *
     * @param {Array} stops an array of colors stops to convert into scales.
     * @returns {Array} an array of chroma.js scales.
     */
    function scalesFrom(stops) {
        var scales = [];
        for (var i = 0; i < stops.length - 1; i++) {
            var lo = stops[i], hi = stops[i + 1];
            scales.push(chroma.scale([chroma(lo.color), chroma(hi.color)]).domain([lo.p, hi.p]).mode(lo.mode));
        }
        return scales;
    }

    /**
     * Given a range [a, b] and two adjoining color scales L (i) and R (i+1) sharing domain point p, insert a new
     * bezier-interpolated scale M over the points [a, p, b].
     *
     * @param {Array} scales
     * @param {Number} i
     * @param {Array} range
     * @returns {Array}
     */
    function smooth(scales, i, range) {

        //         p                  p
        //        / \              M _-_
        //       /   \      =>      /   \
        //      /     \            a     b
        //   L /       \ R      K /       \ S
        //    Lx       Ry        Lx       Ry

        var L = scales[i], R = scales[i+1], lx = L.domain()[0], ry = R.domain()[1], p = L.domain()[1];
        var a = range[0], b = range[1];

        var K = chroma.scale([L(lx), L(a)]                    ).domain([lx, a]).mode(L.mode());
        var M = chroma.scale(chroma.bezier([L(a), L(p), R(b)])).domain([a,  b]).mode(L.mode());
        var S = chroma.scale([R(b), R(ry)]                    ).domain([b, ry]).mode(R.mode());

        return [].concat(scales.slice(0, i), [K, M, S], scales.slice(i+2));
    }

    /**
     * Use array A of length n to define a linear scale over domain [x, y] such that [x, y] is mapped onto indices
     * [0, n-1]. The range [a, b] is then mapped to indices [i, j] using this scale, and the elements A[i] to A[j] are
     * filled with the results of f(v) where v iterates over [a, b].
     *
     * @param {Array} array the destination array to fill.
     * @param {Array} domain the values [x, y], inclusive.
     * @param {Array} range the values [a, b], inclusive.
     * @param {Function} f the value function f(v).
     */
    function fillRange(array, domain, range, f) {

        //    |-----------domain------------|
        //    |        |---range---|        |
        //    x        a           b        y
        //    0        i           j      len-1
        // A [0, ..., f(a), ..., f(b), ..., 0]

        var x = domain[0], y = domain[1], Δ = (y - x) / (array.length - 1);
        var a = range[0], b = range[1];
        var start = Math.round((a - x) / Δ), end = Math.round((b - x) / Δ);
        for (var i = start; i < end + 1; i++) {
            array[i] = f(x + i * Δ);
        }
    }

    /**
     * Use array A of length n to define a linear scale over domain [x, y] such that [x, y] is mapped onto indices
     * [0, n-1]. The result is a function f(v) that returns A[i] where v is clamped to [x, y] and mapped to i.
     *
     * @param array the array A.
     * @param domain the values [x, y], inclusive.
     * @returns {Function} f(v) that returns A[v->i].
     */
    function gradient(array, domain) {
        var x = domain[0], y = domain[1], Δ = (y - x) / (array.length - 1);
        return function(v, a) {
            var c = array[Math.round((Math.max(x, Math.min(v, y)) - x) / Δ)];
            c[3] = a;  // UNDONE: gradient function should not pass in alpha
            return c;
        };
    }

    /**
     * Convert a set of chroma.js scales into an accessor function over a computed array of rgba colors.
     *
     * @param {Array} scales the set of scales.
     * @param {Array} domain the values [x, y], inclusive.
     * @param {Number} resolution the number of elements of the computed color array.
     * @returns {Function} the gradient function f(v) over the resulting color array.
     */
    function quantize(scales, domain, resolution) {
        var array = _.range(resolution).map(function() { return null; });  // create null-filled array.
        scales.forEach(function(scale) {
            fillRange(array, domain, scale.domain(), function(v) {
                return scale(v).rgba().map(Math.round);
            });
        });
        return gradient(array, domain);
    }

    return {
        scalesFrom: scalesFrom,
        gradient: gradient,
        fillRange: fillRange,
        smooth: smooth,
        quantize: quantize
    }
}();