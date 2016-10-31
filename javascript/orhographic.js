/**
 * Created by peterh on 11.10.2016.
 */

/**
 * Optimized version of the othographic projection in order to speed up the rendering of the globe through the D3 library
 */
var ortho = function () {
    var π = Math.PI, τ = 2 * π, DEG = 360 / τ, RAD = τ / 360;

    /**
     * @param {number} R radius of the sphere (i.e., scale)
     * @param {number} λ0 longitude of projection center (degrees)
     * @param {number} φ0 latitude of projection center (degrees)
     * @param {number} x0 translation along x axis
     * @param {number} y0 translation along y axis
     * @returns {Function} projection function f([λ, φ]) and f.invert([x, y]), just like D3.
     */
    function orthographic(R, λ0, φ0, x0, y0) {

        // Check if φ0 is rotated far enough that the globe is upside down. If so, adjust the projection center and
        // flip the x,y space. For example, rotation of +100 is actually lat of 80 deg with lon on other side.

        var φnorm = SintefAnimationMapUtility.floorMod(φ0 + 90, 360);  // now on range [0, 360). Anything on range (180, 360) is flipped.
        var flip = 180 < φnorm ? -1 : 1;
        if (flip < 0) {
            φ0 = 270 - φnorm;
            λ0 += 180;
        } else {
            φ0 = φnorm - 90;
        }
        φ0 *= RAD;
        λ0 = (SintefAnimationMapUtility.floorMod(λ0 + 180, 360) - 180) * RAD;  // normalize to [-180, 180)

        var R2 = R * R;
        var sinφ0 = Math.sin(φ0);
        var cosφ0 = Math.cos(φ0);
        var Rcosφ0 = R * cosφ0;
        var cosφ0dR = cosφ0 / R;

        /**
         * @param {number[]} coord [λ, φ] in degrees
         * @returns {number[]} resulting [x, y] or [NaN, NaN] if the coordinates are not defined for the projection.
         */
        function project(coord) {
            var lon = coord[0];
            var lat = coord[1];
            if (lon !== lon || lat !== lat) {
                return [NaN, NaN];
            }
            var λ = lon * RAD;
            var φ = lat * RAD;
            var Δλ = λ - λ0;
            var sinΔλ = Math.sin(Δλ);
            var cosΔλ = Math.cos(Δλ);
            var sinφ = Math.sin(φ);
            var cosφ = Math.cos(φ);
            var Rcosφ = R * cosφ;
            //var cosc = sinφ0 * sinφ + cosφ0 * cosφ * cosΔλ;  // test if clip angle > 90°
            //if (cosc < 0) return [NaN, NaN];
            var x = Rcosφ * sinΔλ;
            var y = Rcosφ * cosΔλ * sinφ0 - Rcosφ0 * sinφ;  // negates y because it grows downward
            var px = x * flip + x0;
            var py = y * flip + y0;
            return [px, py];
        }

        /**
         * @param {number[]} point [x, y]
         * @returns {number[]} resulting [λ, φ] in degrees or [NaN, NaN] if the point is not defined for the projection.
         */
        function invert(point) {
            var px = point[0];
            var py = point[1];
            var x = (px - x0) * flip;
            var y = (y0 - py) * flip;  // negate y because it grows downward

            // var ρ = Math.sqrt(x * x + y * y);   // positive number
            // var c = Math.asin(ρ / R);           // [0, π/2] or NaN when ρ > R (meaning the point is outside the globe)
            // var sinc = Math.sin(c);             // [0, 1] because c in range [0, π/2]
            // var cosc = Math.cos(c);             // [0, 1] because c in range [0, π/2]
            // var ysinc = y * sinc;
            // var λ = λ0 + Math.atan2(x * sinc, ρ * cosc * cosφ0 - ysinc * sinφ0);
            // var φ = ρ === 0 ? φ0 : Math.asin(cosc * sinφ0 + ysinc * cosφ0 / ρ);

            var ρ2 = x * x + y * y;
            var d = 1 - ρ2 / R2;
            if (d >= 0) {
                var cosc = Math.sqrt(d);  // cos(asin(x)) == sqrt(1 - x*x)
                var λ = λ0 + Math.atan2(x, cosc * Rcosφ0 - y * sinφ0);
                var φ = Math.asin(cosc * sinφ0 + y * cosφ0dR);
                return [λ * DEG, φ * DEG];
            }
            return [NaN, NaN];  // outside of projection
        }

        project.invert = invert;

        return project;
    }

    /**
     * @param p d3 version of orthographic projection.
     * @returns {Function} projection function f([λ, φ]) and f.invert([x, y]), just like D3.
     */
    function fromD3(p) {
        var t = p.translate(), r = p.rotate();
        if (r[2] !== 0) {
            throw new Error("γ rotation not supported");
        }
        return orthographic(p.scale(), -r[0], -r[1], t[0], t[1]);
    }

    return {
        fromD3: fromD3
    }

}();