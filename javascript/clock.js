/**
 * Created by peterh on 11.10.2016.
 */

var calibration = {skew: 0}, p = when.resolve(calibration);

function skewClock() { return Date.now() + calibration.skew; }
function fixedClock() { return calibration.fixed; }

var clock = {
    /** @returns {number} unix time */
    now: function() {
        return skewClock();
    },
    /**
     * @param {Object?} c sets the calibration: {server: url} or {fixed: date}. When server specified, an XHR fetches
     *        the server time. The `calibrated` method returns this operation's promise. Example server url: "/"
     * @returns {Object} current calibration {skew: number} or {fixed: number}, or `this` when setting calibration.
     */
    calibration: function(c) {
        if (c === undefined) {
            return calibration;
        }
        if (typeof c.server === "string") {
            p = calibrate(c.server).then(function (c) {
                clock.now = skewClock;
                return calibration = c;
            });
        } else {
            var fixed = +new Date(c.fixed);
            if (fixed === fixed) {
                clock.now = fixedClock;
                p = when.resolve(calibration = {fixed: fixed});
            } else {
                clock.now = skewClock;
                p = when.resolve(calibration = {skew: +c.skew || 0});
            }
        }
        return this;
    },
    /** @returns {Promise} a promise for the most recently set calibration. */
    calibrated: function() {
        return p;
    },
};