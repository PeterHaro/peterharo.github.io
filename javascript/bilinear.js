/**
 * Created by peterh on 14.10.2016.
 */

var bilinear = function() {

    /**
     * @param grid a grid that supports the "closest4" function.
     * @param {Float32Array|number[]} data backing data, the same length as the grid.
     * @returns {Function} a bilinear interpolation function f([λ, φ]) -> v
     */
    function scalar(grid, data) {

        /**
         * @param {number[]} coord [λ, φ] in degrees.
         * @returns {number} the bilinear interpolated value or NaN if none.
         */
        function bilinear(coord) {
            var indices = grid.closest4(coord);

            var i00 = indices[0];
            if (i00 === i00) {
                var i10 = indices[1];
                var i01 = indices[2];
                var i11 = indices[3];
                var x = indices[4];
                var y = indices[5];
                var rx = 1 - x;
                var ry = 1 - y;

                var v00 = data[i00];
                var v10 = data[i10];
                var v01 = data[i01];
                var v11 = data[i11];

                if (v00 === v00) {
                    if (v10 === v10 && v01 === v01 && v11 === v11) {
                        var a = rx * ry,  b = x * ry,  c = rx * y,  d = x * y;
                        return v00 * a + v10 * b + v01 * c + v11 * d;  // 4 points found.

                    } else if (v11 === v11 && v10 === v10 && x >= y) {
                        return v10 + rx * (v00 - v10) + y * (v11 - v10);  // 3 points found, triangle interpolate.

                    } else if (v01 === v01 && v11 === v11 && x < y) {
                        return v01 + x * (v11 - v01) + ry * (v00 - v01);  // 3 points found, triangle interpolate.

                    } else if (v01 === v01 && v10 === v10 && x <= ry) {
                        return v00 + x * (v10 - v00) + y * (v01 - v00);  // 3 points found, triangle interpolate.
                    }
                } else if (v11 === v11 && v01 === v01 && v10 === v10 && x > ry) {
                    return v11 + rx * (v01 - v11) + ry * (v10 - v11);  // 3 points found, triangle interpolate.
                }
            }
            return NaN;
        }

        return bilinear;
    }

    /**
     * @param grid a grid that supports the "closest4" function.
     * @param {Float32Array|number[]} uData backing u data, the same length as the grid.
     * @param {Float32Array|number[]} vData backing v data, the same length as the grid.
     * @returns {Function} a bilinear interpolation function f([λ, φ]) -> [u, v, m]
     */
    function vector(grid, uData, vData) {

        function triangleInterpolateVector(x, y, u0, v0, u1, v1, u2, v2) {
            var u = u0 + x * (u2 - u0) + y * (u1 - u0);
            var v = v0 + x * (v2 - v0) + y * (v1 - v0);
            return [u, v, Math.sqrt(u * u + v * v)];
        }

        /**
         * @param {number[]} coord [λ, φ] in degrees.
         * @returns {number[]} the bilinear interpolated value as a vector [u, v, m] or [NaN, NaN, NaN] if none.
         */
        function bilinear(coord) {
            var indices = grid.closest4(coord);

            var i00 = indices[0];
            if (i00 === i00) {
                var i10 = indices[1];
                var i01 = indices[2];
                var i11 = indices[3];
                var x = indices[4];
                var y = indices[5];
                var rx = 1 - x;
                var ry = 1 - y;

                var u00 = uData[i00];
                var u10 = uData[i10];
                var u01 = uData[i01];
                var u11 = uData[i11];

                var v00 = vData[i00];
                var v10 = vData[i10];
                var v01 = vData[i01];
                var v11 = vData[i11];

                if (v00 === v00) {
                    if (v10 === v10 && v01 === v01 && v11 === v11) {
                        var a = rx * ry,  b = x * ry,  c = rx * y,  d = x * y;
                        var u = u00 * a + u10 * b + u01 * c + u11 * d;
                        var v = v00 * a + v10 * b + v01 * c + v11 * d;
                        return [u, v, Math.sqrt(u * u + v * v)];  // 4 points found.

                    } else if (v11 === v11 && v10 === v10 && x >= y) {
                        return triangleInterpolateVector(rx, y, u10, v10, u11, v11, u00, v00);

                    } else if (v01 === v01 && v11 === v11 && x < y) {
                        return triangleInterpolateVector(x, ry, u01, v01, u00, v00, u11, v11);

                    } else if (v01 === v01 && v10 === v10 && x <= ry) {
                        return triangleInterpolateVector(x, y, u00, v00, u01, v01, u10, v10);
                    }
                } else if (v11 === v11 && v01 === v01 && v10 === v10 && x > ry) {
                    return triangleInterpolateVector(rx, ry, u11, v11, u10, v10, u01, v01);
                }
            }
            return [NaN, NaN, NaN];
        }

        return bilinear;
    }

    return {
        scalar: scalar,
        vector: vector
    }

}();