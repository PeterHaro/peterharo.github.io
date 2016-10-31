var SintefAnimationMapUtility = function () {
    "use strict";

    var π = Math.PI, τ = 2 * π, /*DEG = 360 / τ,*/ RAD = τ / 360;
    var H = 0.0000360;  // 0.0000360°φ ~= 4m
    var DEFAULT_CONFIG = "current/wind/surface/level/orthographic";

    function topologyFile() {
        return isMobile() ? "/data/earth-topo-mobile.json?v3" : "/data/earth-topo.json?v3";
    }

    /**
     * @returns {boolean} true if the specified value is truthy.
     */
    function isTruthy(x) {
        return !!x;
    }

    function siteLangCode() {
        return d3.select("html").attr("lang") || "en";
    };

    /**
     * @returns {boolean} true if the specified value is not null and not undefined.
     */
    function isValue(x) {
        return x !== null && x !== undefined;
    }

    /**
     * @returns {Object} the first argument if not null and not undefined, otherwise the second argument.
     */
    function coalesce(a, b) {
        return isValue(a) ? a : b;
    };

    /**
     * Converts the argument to a number, including special cases for fractions:
     *     0.25  -> 0.25
     *     "1/4" -> 0.25
     *     [1,4] -> 0.25
     *     ".25" -> 0.25
     *
     * @param x any object. When an array, then interpreted as the fraction: a[0] / a[1]. When a string containing
     *        a slash, the the value is first converted to an array by splitting on "/".
     * @returns {number} the specified argument converted to a number.
     */
    function decimalize(x) {
        if (_.isString(x) && x.indexOf("/") >= 0) {
            x = x.split("/");
        }
        return Array.isArray(x) && x.length === 2 ? (x[0] / x[1]) : +x;
    }

    /**
     * @param {Array|*} x the value to convert to a scalar.
     * @returns {*} the magnitude if x is a vector (i.e., x[2]), otherwise x itself.
     */
    function scalarize(x) {
        return Array.isArray(x) ? x[2] : x;
    }

    /**
     * @returns {number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
     *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
     */
    function floorMod(a, n) {
        var f = a - n * Math.floor(a / n);
        // When a is within an ulp of n, f can be equal to n (because the subtraction has no effect). But the result
        // should be in the range [0, n), so check for this case. Example: floorMod(-1e-16, 10)
        return f === n ? 0 : f;
    }

    /**
     * @returns {number} distance between two points having the form [x, y].
     */
    function distance(a, b) {
        var Δx = b[0] - a[0];
        var Δy = b[1] - a[1];
        return Math.sqrt(Δx * Δx + Δy * Δy);
    }

    /**
     * @returns {number} the value x clamped to the range [low, high].
     */
    function clamp(x, low, high) {
        return Math.max(low, Math.min(x, high));
    }

    /**
     * @returns {number} the fraction of the bounds [low, high] covered by the value x, after clamping x to the
     *          bounds. For example, given bounds=[10, 20], this method returns 1 for x>=20, 0.5 for x=15 and 0
     *          for x<=10.
     */
    function proportion(x, low, high) {
        return (clamp(x, low, high) - low) / (high - low);
    }

    /**
     * @returns {number} the value p within the range [0, 1], scaled to the range [low, high].
     */
    function spread(p, low, high) {
        return p * (high - low) + low;
    }

    /**
     * @returns {string} the specified string with the first letter capitalized.
     */
    function capitalize(s) {
        return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.substr(1);
    }

    /**
     * @returns {boolean} true if agent is probably firefox. Don't really care if this is accurate.
     */
    function isFF() {
        return (/firefox/i).test(navigator.userAgent);
    }

    /**
     * @returns {boolean} true if agent is probably a mobile device. Don't really care if this is accurate.
     */
    function isMobile() {
        return (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);
    }

    function isEmbeddedInIFrame() {
        return self != top;
    }

    /**
     * Finds the method having the specified name on the object thisArg, and returns it as a function bound
     * to thisArg. If no method can be found, or thisArg is not a value, then returns null.
     *
     * @param thisArg the object
     * @param methodName the method name to bind to the object
     * @returns {Function} the method bound to the object, if it exists.
     */
    function bindup(thisArg, methodName) {
        return isValue(thisArg) && thisArg[methodName] ? thisArg[methodName].bind(thisArg) : null;
    }

    /**
     * @returns {{width: number, height: number}} an object that describes the size of the browser's current view.
     */
    function view() {
        var w = window;
        var d = document && document.documentElement;
        var b = document && document.getElementsByTagName("body")[0];
        var x = w.innerWidth || d.clientWidth || b.clientWidth;
        var y = w.innerHeight || d.clientHeight || b.clientHeight;
        return { width: x, height: y };
    }

    /**
     * Removes all children of the specified DOM element.
     */
    function removeChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * @returns {*} a new mouse click event instance
     */
    function newClickEvent() {
        try {
            return new MouseEvent("click", { view: window, bubbles: true, cancelable: true });
        }
        catch (e) {
            // Chrome mobile supports only the old fashioned, deprecated way of constructing events. :(
            var event = document.createEvent("MouseEvents");
            event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
            return event;
        }
    }

    /**
     * @returns {Object} clears and returns the specified Canvas element's 2d context.
     */
    function clearCanvas(canvas) {
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        return canvas;
    };

    function colorInterpolator(start, end) {
        var r = start[0], g = start[1], b = start[2];
        var Δr = end[0] - r, Δg = end[1] - g, Δb = end[2] - b;
        return function (i, a) {
            return [Math.floor(r + i * Δr), Math.floor(g + i * Δg), Math.floor(b + i * Δb), a];
        };
    }

    /**
     * Produces a color style in a rainbow-like trefoil color space. Not quite HSV, but produces a nice
     * spectrum. See http://krazydad.com/tutorials/makecolors.php.
     *
     * @param hue the hue rotation in the range [0, 1]
     * @param a the alpha value in the range [0, 255]
     * @returns {Array} [r, g, b, a]
     */
    function sinebowColor(hue, a) {
        // Map hue [0, 1] to radians [0, 5/6τ]. Don't allow a full rotation because that keeps hue == 0 and
        // hue == 1 from mapping to the same color.
        var rad = hue * τ * 5 / 6;
        rad *= 0.75;  // increase frequency to 2/3 cycle per rad

        var s = Math.sin(rad);
        var c = Math.cos(rad);
        var r = Math.floor(Math.max(0, -c) * 255);
        var g = Math.floor(Math.max(s, 0) * 255);
        var b = Math.floor(Math.max(c, 0, -s) * 255);
        return [r, g, b, a];
    }

    var BOUNDARY = 0.45;
    var fadeToWhite = colorInterpolator(sinebowColor(1.0, 0), [255, 255, 255]);

    /**
     * Interpolates a sinebow color where 0 <= i <= j, then fades to white where j < i <= 1.
     *
     * @param i number in the range [0, 1]
     * @param a alpha value in range [0, 255]
     * @returns {Array} [r, g, b, a]
     */
    function extendedSinebowColor(i, a) {
        return i <= BOUNDARY ?
            sinebowColor(i / BOUNDARY, a) :
            fadeToWhite((i - BOUNDARY) / (1 - BOUNDARY), a);
    }

    /**
     * @returns {Object} an object to perform logging, if/when the browser supports it.
     */
    function log() {
        function format(o) { return o && o.stack ? o + "\n" + o.stack : o; }
        return {
            debug: function (s) { if (console && console.log) console.log(format(s)); },
            info: function (s) { if (console && console.info) console.info(format(s)); },
            error: function (e) { if (console && console.error) console.error(format(e)); },
            time: function (s) { if (console && console.time) console.time(format(s)); },
            timeEnd: function (s) { if (console && console.timeEnd) console.timeEnd(format(s)); }
        };
    }

    function asColorStyle(r, g, b, a) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    }

    /**
     * @returns {Array} of wind colors and a method, indexFor, that maps wind magnitude to an index on the color scale.
     */
    function windIntensityColorScale(step, maxWind) {
        var result = [];
        for (var j = 85; j <= 255; j += step) {
            result.push(asColorStyle(j, j, j, 1.0));
        }
        result.indexFor = function (m) {  // map wind speed to a style
            return Math.floor(Math.min(m, maxWind) / maxWind * (result.length - 1));
        };
        return result;
    }

    /**
     * Creates a color scale composed of the specified segments. Segments is an array of two-element arrays of the
     * form [value, color], where value is the point along the scale and color is the [r, g, b] color at that point.
     * For example, the following creates a scale that smoothly transitions from red to green to blue along the
     * points 0.5, 1.0, and 3.5:
     *
     *     [ [ 0.5, [255, 0, 0] ],
     *       [ 1.0, [0, 255, 0] ],
     *       [ 3.5, [0, 0, 255] ] ]
     *
     * @param segments array of color segments
     * @returns {Function} a function(point, alpha) that returns the color [r, g, b, alpha] for the given point.
     */
    function segmentedColorScale(segments) {
        var points = [], interpolators = [], ranges = [];
        for (var i = 0; i < segments.length - 1; i++) {
            points.push(segments[i + 1][0]);
            interpolators.push(colorInterpolator(segments[i][1], segments[i + 1][1]));
            ranges.push([segments[i][0], segments[i + 1][0]]);
        }

        return function (point, alpha) {
            var i;
            for (i = 0; i < points.length - 1; i++) {
                if (point <= points[i]) {
                    break;
                }
            }
            var range = ranges[i];
            return interpolators[i](proportion(point, range[0], range[1]), alpha);
        };
    }

    /**
     * Returns a human readable string for the provided coordinates.
     */
    function formatCoordinates(λ, φ) {
        return Math.abs(φ).toFixed(2) + "° " + (φ >= 0 ? "N" : "S") + ", " +
            Math.abs(λ).toFixed(2) + "° " + (λ >= 0 ? "E" : "W");
    }

    /**
     * Returns a human readable string for the provided scalar in the given units.
     */
    function formatScalar(value, units) {
        return units.conversion(value).toFixed(units.precision);
    }

    /**
     * Returns a human readable string for the provided rectangular wind vector in the given units.
     * See http://mst.nerc.ac.uk/wind_vect_convs.html.
     */
    function formatVector(wind, units) {
        var d = Math.atan2(-wind[0], -wind[1]) / τ * 360;  // calculate into-the-wind cardinal degrees
        var wd = Math.round((d + 360) % 360 / 5) * 5;  // shift [-180, 180] to [0, 360], and round to nearest 5.
        return wd.toFixed(0) + "° @ " + formatScalar(wind[2], units);
    }

    function xhrResolver(resource, d, error, result) {
        return error ?
            !error.status ?
                d.reject({ status: -1, message: "Cannot load resource: " + resource + ": " + error, resource: resource, error: error }) :
                d.reject({ status: error.status, message: error.statusText, resource: resource, error: error }) :
            d.resolve(result);
    }

    /**
     * Returns a promise for a JSON resource (URL) fetched via XHR. If the load fails, the promise rejects with an
     * object describing the reason: {status: http-status-code, message: http-status-text, resource:}.
     */
    function loadJson(resource) {
        var d = when.defer();
        d3.json(resource, xhrResolver.bind(null, resource, d));
        return d.promise;
    }

    /**
     * Same as loadJson but returns a singleton promise for each URL.
     */
    var loadJsonOnce = _.memoize(loadJson);

    /**
     * Returns a promise for an EPAK resource (URL) fetched via XHR. If the load fails, the promise rejects
     * with an object describing the reason: {status: http-status-code, message: http-status-text, resource:}.
     */
    function loadEpak(resource) {
        var d = when.defer();
        d3.xhr(resource)
            .responseType("arraybuffer")
            .response(function (req) { return decoder.decodeEpak(req.response); })  // UNDONE: promise swallows decoding exceptions
            .get(xhrResolver.bind(null, resource, d));
        return d.promise;
    }

    function interpolate(λ, φ) {
        var i = SintefAnimationMapUtility.floorMod(λ - λ0, 360) / Δλ;  // calculate longitude index in wrapped range [0, 360)
        var j = (φ0 - φ) / Δφ;                 // calculate latitude index in direction +90 to -90

        //         1      2           After converting λ and φ to fractional grid indexes i and j, we find the
        //        fi  i   ci          four points "G" that enclose point (i, j). These points are at the four
        //         | =1.4 |           corners specified by the floor and ceiling of i and j. For example, given
        //      ---G--|---G--- fj 8   i = 1.4 and j = 8.3, the four surrounding grid points are (1, 8), (2, 8),
        //    j ___|_ .   |           (1, 9) and (2, 9).
        //  =8.3   |      |
        //      ---G------G--- cj 9   Note that for wrapped grids, the first column is duplicated as the last
        //         |      |           column, so the index ci can be used without taking a modulo.

        var fi = Math.floor(i), ci = fi + 1;
        var fj = Math.floor(j), cj = fj + 1;

        var row;
        if ((row = grid[fj])) {
            var g00 = row[fi];
            var g10 = row[ci];
            if (SintefAnimationMapUtility.isValue(g00) && SintefAnimationMapUtility.isValue(g10) && (row = grid[cj])) {
                var g01 = row[fi];
                var g11 = row[ci];
                if (SintefAnimationMapUtility.isValue(g01) && SintefAnimationMapUtility.isValue(g11)) {
                    // All four points found, so interpolate the value.
                    return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
                }
            }
        }
        // console.log("cannot interpolate: " + λ + "," + φ + ": " + fi + " " + ci + " " + fj + " " + cj);
        return null;
    }

    /**
     * Returns the distortion introduced by the specified projection at the given point.
     *
     * This method uses finite difference estimates to calculate warping by adding a very small amount (h) to
     * both the longitude and latitude to create two lines. These lines are then projected to pixel space, where
     * they become diagonals of triangles that represent how much the projection warps longitude and latitude at
     * that location.
     *
     * <pre>
     *        (λ, φ+h)                  (xλ, yλ)
     *           .                         .
     *           |               ==>        \
     *           |                           \   __. (xφ, yφ)
     *    (λ, φ) .____. (λ+h, φ)       (x, y) .--
     * </pre>
     *
     * See:
     *     Map Projections: A Working Manual, Snyder, John P: pubs.er.usgs.gov/publication/pp1395
     *     gis.stackexchange.com/questions/5068/how-to-create-an-accurate-tissot-indicatrix
     *     www.jasondavies.com/maps/tissot
     *
     * @returns {Array} array of scaled derivatives [dx/dλ, dy/dλ, dx/dφ, dy/dφ]
     */
    function distortion(projection, λ, φ, x, y) {
        var hλ = λ < 0 ? H : -H;
        var hφ = φ < 0 ? H : -H;
        var pλ = projection([λ + hλ, φ]);
        var pφ = projection([λ, φ + hφ]);

        // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1° λ
        // changes depending on φ. Without this, there is a pinching effect at the poles.
        var k = Math.cos(φ * RAD);
        var hλk = hλ * k;

        return [
            (pλ[0] - x) / hλk,  // dx/dλ
            (pλ[1] - y) / hλk,  // dy/dλ
            (pφ[0] - x) / hφ,   // dx/dφ
            (pφ[1] - y) / hφ    // dy/dφ
        ];
    }

    /**
     * @param query URL search query string, e.g., "?a=1&b=2&c=&d"
     * @returns {Object} an object of terms, e.g., {a: "1", b: "2", c: "", d: null}
     */
    function parseQueryString(query) {
        return _.object(query.split(/[?&]/).filter(isTruthy).map(function (term) {
            return term.split("=").map(decodeURIComponent).concat([null]);  // use null for 2nd element when undefined
        }));
    }

    function siteInstance() {
        var match = window.location.hostname.match(/(.*)\.eSushi\.net$/) || [], name = match[1] || "eSushi";
        return name === "earth" ? "" : name;
    };

    function dateToConfig(date) {
        return { date: utc.normalize(date) };
    }

    return {
        isTruthy: isTruthy,
        siteLangCode: siteLangCode,
        isValue: isValue,
        interpolate: interpolate,
        coalesce: coalesce,
        floorMod: floorMod,
        distance: distance,
        clamp: clamp,
        proportion: proportion,
        spread: spread,
        capitalize: capitalize,
        decimalize: decimalize,
        isFF: isFF,
        loadEpak: loadEpak,
        isMobile: isMobile,
        isEmbeddedInIFrame: isEmbeddedInIFrame,
        dateToConfig: dateToConfig,
        log: log,
        view: view,
        bindup: bindup,
        removeChildren: removeChildren,
        clearCanvas: clearCanvas,
        sinebowColor: sinebowColor,
        extendedSinebowColor: extendedSinebowColor,
        windIntensityColorScale: windIntensityColorScale,
        segmentedColorScale: segmentedColorScale,
        formatCoordinates: formatCoordinates,
        formatScalar: formatScalar,
        formatVector: formatVector,
        loadJson: loadJson,
        loadJsonOnce: loadJsonOnce,
        distortion: distortion
    };
}();
