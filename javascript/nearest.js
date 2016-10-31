/**
 * Created by peterh on 14.10.2016.
 */
/**
 * Created by peterh on 14.10.2016.
 */

var nearest = function() {

    /**
    * @param grid a grid that supports the "closest" function.
    * @param {Float32Array|number[]} data backing data, the same length as the grid.
        * @returns {Function} a nearest neighbor interpolation function f([λ, φ]) -> v
    */
    function scalar(grid, data) {

        /**
         * @param {number[]} coord [λ, φ] in degrees.
         * @returns {number} the nearest neighbor value or NaN if none.
         */
        function nearest(coord) {
            var i = grid.closest(coord);
            return i === i ? data[i] : NaN;
        }

        return nearest;
    }

    /**
     * @param grid a grid that supports the "closest" function.
     * @param {Float32Array|number[]} uData backing u data, the same length as the grid.
     * @param {Float32Array|number[]} vData backing v data, the same length as the grid.
     * @returns {Function} a nearest neighbor interpolation function f([λ, φ]) -> [u, v, m]
     */
    function vector(grid, uData, vData) {

        /**
         * @param {number[]} coord [λ, φ] in degrees.
         * @returns {number[]} the nearest neighbor value as a vector [u, v, m] or [NaN, NaN, NaN] if none.
         */
        function nearest(coord) {
            var i = grid.closest(coord);
            if (i === i) {
                var u = uData[i], v = vData[i];
                return [u, v, Math.sqrt(u * u + v * v)];
            } else {
                return [NaN, NaN, NaN];
            }
        }

        return nearest;
    }

    return {
        scalar: scalar,
        vector: vector
    }

}();