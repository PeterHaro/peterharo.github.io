var products = function () {
    "use strict";

    var geosUrl = function (path, date) {
        return ("/data/geos/" + path);
    };
    var gfsUrl = function (path, date) {
        return ("/data/gfs/" + path);
    };
    var oscarUrl = function (path) {
        return ("/data/oscar/" + path);
    };
    var rtgsstUrl = function (path, date) {
        return "/data/rtgsst/" + path;
    };
    var ww3Url = function (path, date) {
        return ("data/ww3/" + path);
    };
    var argoUrl = function (path) {
        return ("/data/argo/" + path);
    };

    var τ = 2 * Math.PI;

    function gaia(path) {
        var host = SintefAnimationMapUtility.isDevMode() ? "" : "", url = host + path, instance = SintefAnimationMapUtility.siteInstance();
        return instance ? url + "?" + instance : url;
    }

    var catalogs = {
        oscar: SintefAnimationMapUtility.loadJson("public" + oscarUrl("oscar-catalog.json"))
    };

    /**
     * @param {Object} date either the date parts or the string "current"
     * @param {Object?} offset the time offset from the normal GFS time (e.g., {minute: 90} for 3hr time avg)
     * @returns {Object} the best matching date parts.
     */
    function gfsDate(date, offset) {
        var parts = date === "current" ?
            _.pick(utc.parts(clock.now()), "year", "month", "day", "hour") :  // use current time
            _.clone(date);
        // round down to the nearest three-hour block
        parts.hour = Math.floor(parts.hour / 3) * 3;
        parts.minute = 0;
        if (offset) {
            parts = utc.normalize(utc.add(parts, offset));
        }
        return parts;
    }

    /**
     * Returns date parts for the chronologically next or previous GFS data layer. How far forward or backward in time
     * to jump is determined by the step. Steps of ±1 move in 3-hour jumps, and steps of ±10 move in 24-hour jumps.
     *
     * @param {Object} date the starting date parts.
     * @param {number} step the number of steps.
     * @returns {Object} the resulting date parts.
     */
    function gfsStep(date, step) {
        var offset = (step > 1 ? 8 : step < -1 ? -8 : step) * 3;
        return utc.add(date, { hour: offset });
    }

    function gfsPathParts(attr, offset) {
        if (attr.date === "current") {
            return { dir: "current", stamp: "current", date: gfsDate(attr.date, offset) };
        }
        var date = gfsDate(attr.date, offset);
        return { dir: utc.print(date, "{yyyy}/{MM}/{dd}"), stamp: utc.print(date, "{hh}{mm}"), date: date };
    }

    /**
     * @param attr
     * @param {String} type
     * @param {String?} surface
     * @param {String?} level
     * @returns {String}
     */
    function gfsPath(attr, type, surface, level) {
        var parts = gfsPathParts(attr), date = utc.date(parts.date);
        var format = date >= new Date("2014/11/24") ? ".epak" : ".json";
        var res = date < new Date("2015/03/11") || (SintefAnimationMapUtility.isEmbeddedInIFrame() && !SintefAnimationMapUtility.isKioskMode()) ? "1.0" : "0.5";
        var file = [parts.stamp, type, surface, level, "gfs", res].filter(SintefAnimationMapUtility.isValue).join("-") + format;
        return gfsUrl(parts.dir + "/" + file, date);
    }

    function geosPath(attr, type, offset) {
        var parts = gfsPathParts(attr, offset), date = utc.date(parts.date);
        var file = [parts.stamp, type, "geos.epak"].join("-");
        return geosUrl(parts.dir + "/" + file, date);
    }

    function wave30mPath(attr, type, surface, level) {
        var parts = gfsPathParts(attr), date = utc.date(parts.date);
        var file = [parts.stamp, type, surface, level, "wave", "30m"].filter(SintefAnimationMapUtility.isValue).join("-") + ".epak";
        return ww3Url(parts.dir + "/" + file, date);
    }

    /**
     * Returns the file name for the most recent OSCAR data layer to the specified date. If offset is non-zero,
     * the file name that many entries from the most recent is returned.
     *
     * The result is undefined if there is no entry for the specified date and offset can be found.
     *
     * UNDONE: the catalog object itself should encapsulate this logic. GFS can also be a "virtual" catalog, and
     *         provide a mechanism for eliminating the need for /data/weather/current/* files.
     *
     * @param {Array} catalog array of file names, sorted and prefixed with yyyyMMdd. Last item is most recent.
     * @param {Object} date parts or "current"
     * @param {Number?} offset
     * @returns {String} file name
     */
    function lookupOscar(catalog, date, offset) {
        offset = +offset || 0;
        if (date === "current") {
            return catalog[catalog.length - 1 + offset];
        }
        var prefix = utc.print(date, "{yyyy}{MM}{dd}"), i = _.sortedIndex(catalog, prefix);
        i = (catalog[i] || "").indexOf(prefix) === 0 ? i : i - 1;
        return catalog[i + offset];
    }

    /**
     * @param catalog
     * @param date the date parts
     * @returns {Object} date parts
     */
    function oscarDate(catalog, date) {
        var file = lookupOscar(catalog, date);
        return file ? utc.parse(file, /(\d{4})(\d\d)(\d\d)/) : null;
    }

    /**
     * @param {Array} catalog array of file names, sorted and prefixed with yyyyMMdd. Last item is most recent.
     * @param {Object} date parts or the string "current".
     * @param {number} step
     * @returns {Object} the chronologically next or previous OSCAR data layer. How far forward or backward in
     * time to jump is determined by the step and the catalog of available layers. A step of ±1 moves to the
     * next/previous entry in the catalog (about 5 days), and a step of ±10 moves to the entry six positions away
     * (about 30 days).
     */
    function oscarStep(catalog, date, step) {
        var file = lookupOscar(catalog, date, step > 1 ? 6 : step < -1 ? -6 : step);
        return file ? utc.parse(file, /(\d{4})(\d\d)(\d\d)/) : null;
    }

    function oscarPath(catalog, attr) {
        var file = lookupOscar(catalog, attr.date);
        return file ? oscarUrl(file) : null;
    }

    function rtgDate(date) {
        var parts;
        if (date === "current") {
            // Each day, SST data for the previous day is made available. So "current" means yesterday.
            var now = _.pick(utc.parts(clock.now()), "year", "month", "day");
            parts = utc.add(now, { day: -1 });
        } else {
            parts = _.clone(date);
        }
        return parts;
    }

    /**
     * Returns a date for the chronologically next or previous RTG SST data layer. How far forward or backward in time
     * to jump is determined by the step. Steps of ±1 move in 1 day jumps, and steps of ±10 move in 5-day jumps.
     */
    function rtgStep(date, step) {
        var offset = step > 1 ? 5 : step < -1 ? -5 : step;
        return utc.add(date, { day: offset });
    }

    /**
     * @param attr
     * @param {String} type
     * @param {String?} surface
     * @param {String?} level
     * @returns {String}
     */
    function rtgPath(attr, type, surface, level) {
        var date = utc.date(rtgDate(attr.date));
        var dir = attr.date === "current" ? "current" : utc.print(attr.date, "{yyyy}/{MM}");
        var stamp = dir === "current" ? "current" : utc.print(attr.date, "{yyyy}{MM}{dd}");
        var file = [stamp, type, surface, level, "rtg", "0.5"].filter(SintefAnimationMapUtility.isValue).join("-") + ".epak";
        return rtgsstUrl(dir + "/" + file, date);
    }

    function netcdfHeader(time, lat, lon, center, process) {
        return {
            lo1: lon.sequence.start,
            la1: lat.sequence.start,
            dx: lon.sequence.delta,
            dy: -lat.sequence.delta,
            nx: lon.sequence.size,
            ny: lat.sequence.size,
            refTime: time.data[0],
            forecastTime: 0,
            centerName: center,
            process: process
        };
    }

    function buildProduct(overrides) {
        return _.extend({
            descriptionHTML: "",
            paths: [],
            /** @returns {Object} the product's date parts. */
            date: function () {
                return null;
            },
            /**
             * @param {number} step the number of steps away: ±1 or ±10
             * @returns {Object} the date parts for the specified number of steps away from this product's date.
             */
            navigate: function (step) {
                return gfsStep(this.date(), step);
            },
            /**
             * @param {Object} date the desired date parts or the string "current".
             * @returns {Object} the actual date parts.
             */
            navigateTo: function (date) {
                return gfsDate(date);
            },
            load: function (cancel) {
                var me = this;
                function loader(path) {
                    return /\.epak([/?#]|$)/.test(path) ? SintefAnimationMapUtility.loadEpak(path) : SintefAnimationMapUtility.loadJson(path);
                }
                return when.map(this.paths, loader).then(function (files) {
                    return cancel.requested ? null : _.extend(me, buildGrid(me.builder.apply(me, files)));
                });
            },
            alpha: { single: 160, animated: 112 },
        }, overrides);
    }

    function describeSurface(attr) {
        return attr.surface === "surface" ? "Surface" : SintefAnimationMapUtility.capitalize(attr.level);
    }

    function describeSurfaceJa(attr) {
        return attr.surface === "surface" ? "地上" : SintefAnimationMapUtility.capitalize(attr.level);
    }

    /**
     * Returns a function f(langCode) that, given table:
     *     {foo: {en: "A", ja: "あ"}, bar: {en: "I", ja: "い"}}
     * will return the following when called with "en":
     *     {foo: "A", bar: "I"}
     * or when called with "ja":
     *     {foo: "あ", bar: "い"}
     */
    function localize(table) {
        return function (langCode) {
            var result = {};
            _.each(table, function (value, key) {
                result[key] = value[langCode] || value.en || value;
            });
            return result;
        }
    }

    function localizeString(table) {
        var langCode = d3.select("body").attr("data-lang") || "en";
        return table[langCode] || table.en;
    }

    var FACTORIES = {

        "wind": {
            matchesPrimary: function () { return true; },  // HACK: default matcher, must comes first.
            matchesOverlay: _.matches({ overlayType: "wind" }),
            create: function (attr) {
                return buildProduct({
                    field: "vector",
                    type: "wind",
                    descriptionHTML: localize({
                        name: { en: "Wind", ja: "風速" },
                        qualifier: { en: " @ " + describeSurface(attr), ja: " @ " + describeSurfaceJa(attr) }
                    }),
                    paths: [gfsPath(attr, "wind", attr.surface, attr.level)],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        if (!file.blocks) {
                            var uData = file[0].data, vData = file[1].data; //U,V vectors decomposed
                            return {
                                header: file[0].header,
                                interpolate: bilinearInterpolateVector,
                                triangleInterpolate: barycentricInterpolateVector,
                                data: function (i) {
                                    return [uData[i], vData[i]];
                                }
                            }
                        }
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var u = vars["u-component_of_wind_isobaric"] || vars["u-component_of_wind_height_above_ground"];
                        var v = vars["v-component_of_wind_isobaric"] || vars["v-component_of_wind_height_above_ground"];
                        var time = u.dimensions[0];
                        var uData = epak.blocks[u.data.block];
                        var vData = epak.blocks[v.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateVector,
                            triangleInterpolate: barycentricInterpolateVector,
                            data: function (i) {
                                var u = uData[i], v = vData[i];
                                return u === u && v === v ? [u, v] : null;
                            }
                        };
                    },
                    units: [
                        { label: "km/h", conversion: function (x) { return x * 3.6; }, precision: 0 },
                        { label: "m/s", conversion: function (x) { return x; }, precision: 1 },
                        { label: "kn", conversion: function (x) { return x * 1.943844; }, precision: 0 },
                        { label: "mph", conversion: function (x) { return x * 2.236936; }, precision: 0 }
                    ],
                    scale: {
                        bounds: [0, 100],
                        gradient: function (v, a) {
                            return SintefAnimationMapUtility.extendedSinebowColor(Math.min(v, 100) / 100, a);
                        }
                    },
                    particles: { velocityScale: 1 / 100, maxIntensity: 15 }
                });
            }
        },

        "temp": {
            matchesOverlay: _.matches({ overlayType: "temp" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "temp",
                    descriptionHTML: localize({
                        name: { en: "Temp", ja: "気温" },
                        qualifier: { en: " @ " + describeSurface(attr), ja: " @ " + describeSurfaceJa(attr) }
                    }),
                    paths: [gfsPath(attr, "temp", attr.surface, attr.level)],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        if (!file.blocks) {
                            var record = file[0], data = record.data;
                            return {
                                header: record.header,
                                interpolate: bilinearInterpolateScalar,
                                triangleInterpolate: barycentricInterpolateScalar,
                                data: function (i) {
                                    return data[i];
                                }
                            }
                        }
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var temp = vars.Temperature_isobaric || vars.Temperature_height_above_ground;
                        var time = temp.dimensions[0];
                        var data = epak.blocks[temp.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "°C", conversion: function (x) { return x - 273.15; }, precision: 1 },
                        { label: "°F", conversion: function (x) { return x * 9 / 5 - 459.67; }, precision: 1 },
                        { label: "K", conversion: function (x) { return x; }, precision: 1 }
                    ],
                    scale: {
                        bounds: [193, 328],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [193, [37, 4, 42]],
                            [206, [41, 10, 130]],
                            [219, [81, 40, 40]],
                            [233.15, [192, 37, 149]],  // -40 C/F
                            [255.372, [70, 215, 215]],  // 0 F
                            [273.15, [21, 84, 187]],   // 0 C
                            [275.15, [24, 132, 14]],   // just above 0 C
                            [291, [247, 251, 59]],
                            [298, [235, 167, 21]],
                            [311, [230, 71, 39]],
                            [328, [88, 27, 67]]
                        ])
                    }
                });
            }
        },

        "relative_humidity": {
            matchesOverlay: _.matches({ overlayType: "relative_humidity" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "relative_humidity",
                    descriptionHTML: localize({
                        name: { en: "Relative Humidity", ja: "相対湿度" },
                        qualifier: { en: " @ " + describeSurface(attr), ja: " @ " + describeSurfaceJa(attr) }
                    }),
                    paths: [gfsPath(attr, "relative_humidity", attr.surface, attr.level)],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var isEpak = !!file.blocks;
                        var header = isEpak ? file.header : file;
                        var vars = header.variables;
                        var rh = vars.Relative_humidity_isobaric || vars.Relative_humidity_height_above_ground;
                        var time = rh.dimensions[0];
                        var data = isEpak ? file.blocks[rh.data.block] : rh.data;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, header.Originating_or_generating_Center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "%", conversion: function (x) { return x; }, precision: 0 }
                    ],
                    scale: {
                        bounds: [0, 100],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [0, [230, 165, 30]],
                            [25, [120, 100, 95]],
                            [60, [40, 44, 92]],
                            [75, [21, 13, 193]],
                            [90, [75, 63, 235]],
                            [100, [25, 255, 255]]
                        ])
                    }
                });
            }
        },

        "air_density": {
            matchesOverlay: _.matches({ overlayType: "air_density" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "air_density",
                    descriptionHTML: localize({
                        name: { en: "Air Density", ja: "空気密度" },
                        qualifier: { en: " @ " + describeSurface(attr), ja: " @ " + describeSurfaceJa(attr) }
                    }),
                    paths: [gfsPath(attr, "air_density", attr.surface, attr.level)],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var isEpak = !!file.blocks;
                        var header = isEpak ? file.header : file;
                        var vars = header.variables;
                        var air_density = vars.air_density;
                        var time = air_density.dimensions[0];
                        var data = isEpak ? file.blocks[air_density.data.block] : air_density.data;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, header.Originating_or_generating_Center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "kg/m³", conversion: function (x) { return x; }, precision: 2 }
                    ],
                    scale: {
                        bounds: [0, 1.5],
                        gradient: function (v, a) {
                            return SintefAnimationMapUtility.sinebowColor(Math.min(v, 1.5) / 1.5, a);
                        }
                    }
                });
            }
        },

        "wind_power_density": {
            matchesOverlay: _.matches({ overlayType: "wind_power_density" }),
            create: function (attr) {
                var windProduct = FACTORIES.wind.create(attr);
                var airdensProduct = FACTORIES.air_density.create(attr);
                return buildProduct({
                    field: "scalar",
                    type: "wind_power_density",
                    descriptionHTML: localize({
                        name: { en: "Instant Wind Power Density", ja: "風力エネルギー密度" },
                        qualifier: { en: " @ " + describeSurface(attr), ja: " @ " + describeSurfaceJa(attr) }
                    }),
                    paths: [windProduct.paths[0], airdensProduct.paths[0]],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (windFile, airdensFile) {
                        var windBuilder = windProduct.builder(windFile);
                        var airdensBuilder = airdensProduct.builder(airdensFile);
                        var windData = windBuilder.data, windInterpolate = windBuilder.interpolate;
                        var airdensData = airdensBuilder.data, airdensInterpolate = airdensBuilder.interpolate;
                        return {
                            header: _.clone(airdensBuilder.header),
                            interpolate: function (x, y, g00, g10, g01, g11) {
                                var m = windInterpolate(x, y, g00[0], g10[0], g01[0], g11[0])[2];
                                var ρ = airdensInterpolate(x, y, g00[1], g10[1], g01[1], g11[1]);
                                return 0.5 * ρ * m * m * m;
                            },
                            data: function (i) {
                                return [windData(i), airdensData(i)];
                            }
                        };
                    },
                    units: [
                        { label: "kW/m<sup>2</sup>", tooltip: "kW/m²", conversion: function (x) { return x / 1000; }, precision: 1 },
                        { label: "W/m<sup>2</sup>", tooltip: "W/m²", conversion: function (x) { return x; }, precision: 0 }
                    ],
                    scale: {
                        bounds: [0, 80000],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [0, [15, 4, 96]],
                            [250, [30, 8, 180]],
                            [1000, [121, 102, 2]],
                            [2000, [118, 161, 66]],
                            [4000, [50, 102, 219]],
                            [8000, [19, 131, 193]],
                            [16000, [59, 204, 227]],
                            [64000, [241, 1, 45]],
                            [80000, [243, 0, 241]]
                        ])
                    }
                });
            }
        },

        "misery_index": {
            matchesOverlay: _.matches({ overlayType: "misery_index" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "misery_index",
                    descriptionHTML: localize({
                        name: { en: "Misery (Wind Chill & Heat Index)", ja: "体感温度" },
                        qualifier: { en: " @ " + describeSurface(attr), ja: " @ " + describeSurfaceJa(attr) }
                    }),
                    paths: [gfsPath(attr, "misery_index")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var isEpak = !!file.blocks;
                        var header = isEpak ? file.header : file;
                        var vars = header.variables;
                        var misery = vars.misery_index;
                        var time = misery.dimensions[0];
                        var data = isEpak ? file.blocks[misery.data.block] : misery.data;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, header.Originating_or_generating_Center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: function () {
                        var perceived = localizeString({ en: " (feels like)", ja: "（体感温度）" });
                        return [
                            { label: "°C" + perceived, conversion: function (x) { return x - 273.15; }, precision: 1 },
                            { label: "°F" + perceived, conversion: function (x) { return x * 9 / 5 - 459.67; }, precision: 1 },
                            { label: "K" + perceived, conversion: function (x) { return x; }, precision: 1 }
                        ];
                    }(),
                    scale: {
                        bounds: [236, 332],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [241, [255, 255, 255]],  // -32 C, -25 F extreme frostbite
                            [245.5, [6, 82, 255]],
                            [250, [6, 82, 255]],     // -23 C, -10 F frostbite
                            [258, [46, 131, 255]],
                            [266, [46, 131, 255]],   // -7 C, 20 F hypothermia
                            [280, [0, 0, 0]],        // 7 C, 45 F begin suckage (cold)
                            [300, [0, 0, 0]],        // 27 C, 80 F begin caution (heat)
                            [305, [247, 20, 35]],    // 32 C, 90 F extreme caution
                            [309.5, [247, 20, 35]],
                            [314, [245, 210, 5]],    // 41 C, 105 F danger
                            [320.5, [245, 210, 5]],
                            [327, [255, 255, 255]]   // 54 C, 130 F extreme danger
                        ])
                    }
                });
            }
        },

        "total_cloud_water": {
            matchesOverlay: _.matches({ overlayType: "total_cloud_water" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "total_cloud_water",
                    descriptionHTML: localize({
                        name: { en: "Total Cloud Water", ja: "雲水量" },
                        qualifier: ""
                    }),
                    paths: [gfsPath(attr, "total_cloud_water")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        if (!file.blocks) {
                            var record = file[0], data = record.data;
                            return {
                                header: record.header,
                                interpolate: bilinearInterpolateScalar,
                                data: function (i) {
                                    return data[i];
                                }
                            }
                        }
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var cloud = vars.Cloud_water_entire_atmosphere || vars.Cloud_water_entire_atmosphere_single_layer;
                        var time = cloud.dimensions[0];
                        var data = epak.blocks[cloud.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "kg/m<sup>2</sup>", tooltip: "kg/m²", conversion: function (x) { return x; }, precision: 3 }
                    ],
                    scale: {
                        bounds: [0, 1],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [0.0, [5, 5, 89]],
                            [0.2, [170, 170, 230]],
                            [1.0, [255, 255, 255]]
                        ])
                    }
                });
            }
        },

        "total_precipitable_water": {
            matchesOverlay: _.matches({ overlayType: "total_precipitable_water" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "total_precipitable_water",
                    descriptionHTML: localize({
                        name: { en: "Total Precipitable Water", ja: "可降水量" },
                        qualifier: ""
                    }),
                    paths: [gfsPath(attr, "total_precipitable_water")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        if (!file.blocks) {
                            var record = file[0], data = record.data;
                            return {
                                header: record.header,
                                interpolate: bilinearInterpolateScalar,
                                data: function (i) {
                                    return data[i];
                                }
                            }
                        }
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var pwat = vars.Precipitable_water_entire_atmosphere || vars.Precipitable_water_entire_atmosphere_single_layer;
                        var time = pwat.dimensions[0];
                        var data = epak.blocks[pwat.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "kg/m<sup>2</sup>", tooltip: "kg/m²", conversion: function (x) { return x; }, precision: 3 }
                    ],
                    scale: {
                        bounds: [0, 70],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [0, [230, 165, 30]],
                            [10, [120, 100, 95]],
                            [20, [40, 44, 92]],
                            [30, [21, 13, 193]],
                            [40, [75, 63, 235]],
                            [60, [25, 255, 255]],
                            [70, [150, 255, 255]]
                        ])
                    }
                });
            }
        },

        "mean_sea_level_pressure": {
            matchesOverlay: _.matches({ overlayType: "mean_sea_level_pressure" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "mean_sea_level_pressure",
                    descriptionHTML: localize({
                        name: { en: "Mean Sea Level Pressure", ja: "海面更正気圧" },
                        qualifier: ""
                    }),
                    paths: [gfsPath(attr, "mean_sea_level_pressure")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        if (!file.blocks) {
                            var record = file[0], data = record.data;
                            return {
                                header: record.header,
                                interpolate: bilinearInterpolateScalar,
                                data: function (i) {
                                    return data[i];
                                }
                            }
                        }
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var mslp = vars.Pressure_reduced_to_MSL_msl;
                        var time = mslp.dimensions[0];
                        var data = epak.blocks[mslp.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "hPa", conversion: function (x) { return x / 100; }, precision: 0 },
                        { label: "mmHg", conversion: function (x) { return x / 133.322387415; }, precision: 0 },
                        { label: "inHg", conversion: function (x) { return x / 3386.389; }, precision: 1 }
                    ],
                    scale: {
                        bounds: [92000, 105000],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [92000, [40, 0, 0]],
                            [95000, [187, 60, 31]],
                            [96500, [137, 32, 30]],
                            [98000, [16, 1, 43]],
                            [100500, [36, 1, 93]],
                            [101300, [241, 254, 18]],
                            [103000, [228, 246, 223]],
                            [105000, [255, 255, 255]]
                        ])
                    }
                });
            }
        },

        "precip_3hr": {
            matchesOverlay: _.matches({ overlayType: "precip_3hr" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "precip_3hr",
                    descriptionHTML: localize({
                        name: { en: "Next 3-hr Precip Accumulation", ja: "3時間の降水量" },
                        qualifier: "",
                    }),
                    paths: [gfsPath(attr, "precip_3hr")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var precip = vars["precip_accumulation_3hr"];
                        var time = precip.dimensions[0];
                        var data = epak.blocks[precip.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "mm", tooltip: "mm", conversion: function (x) { return x; }, precision: 1 },
                        { label: "in", tooltip: "in", conversion: function (x) { return x / 25.4; }, precision: 2 },
                        { label: "kg/m<sup>2</sup>", tooltip: "kg/m²", conversion: function (x) { return x; }, precision: 1 }
                    ],
                    alpha: { single: 160, animated: 160 },
                    scale: getRainPalette()
                });
            }
        },

        "cape": {
            matchesOverlay: _.matches({ overlayType: "cape" }),
            create: function (attr) {
                return buildProduct({
                    type: "cape",
                    descriptionHTML: localize({
                        name: { en: "CAPE (Surface)", ja: "対流有効位置エネルギー（地上）" },
                        qualifier: ""
                    }),
                    paths: [gfsPath(attr, "cape")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (epak) {
                        var header = epak.header;
                        var vars = header.variables;
                        var temp = vars.Convective_available_potential_energy_surface;
                        var time = temp.dimensions[0];
                        var data = epak.blocks[temp.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "GFS"),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "J/kg", tooltip: "J/kg", conversion: function (x) { return x; }, precision: 0 }
                    ],
                    alpha: { single: 160, animated: 140 },
                    scale: getCapePalette()
                });
            }
        },

        "co2": {
            matchesOverlay: _.matches({ overlayType: "co2" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "co2",
                    descriptionHTML: localize({
                        name: { en: "Carbon Dioxide Mixing Ratio", ja: "二酸化炭素混合比" },
                        qualifier: ""
                    }),
                    paths: [geosPath(attr, "co2")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var co2 = vars.CO2CL;
                        var time = co2.dimensions[0];
                        var data = epak.blocks[co2.data.block];
                        var center = header.Institution;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "co2"),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [  // CO2 Bulk Mixing Ratio (Column Mass/ps), units: mol/mol
                        // {label: "ppmv", conversion: function(x) { return x * 1e6; }, precision: 1},
                        { label: "µmol/mol", conversion: function (x) { return x * 1e6; }, precision: 1 }
                    ],
                    alpha: { single: 160, animated: 160 },
                    scale: co2palette()
                });
            }
        },

        "cosc": {
            matchesOverlay: _.matches({ overlayType: "cosc" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "cosc",
                    descriptionHTML: localize({
                        name: { en: "Carbon Monoxide Conc.", ja: "一酸化炭素濃度" },
                        qualifier: { en: " @ Surface", ja: " @ 地上" }
                    }),
                    paths: [geosPath(attr, "cosc")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var cosc = vars.COSC;
                        var time = cosc.dimensions[0];
                        var data = epak.blocks[cosc.data.block];
                        var center = header.Institution;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [  // CO Surface Concentration in ppbv, units: 1e-9
                        { label: "ppbv", conversion: function (x) { return x; }, precision: 0 },
                        { label: "ppmv", conversion: function (x) { return x / 1000; }, precision: 2 }
                    ],
                    alpha: { single: 160, animated: 140 },
                    scale: ppbPalette()
                });
            }
        },

        "so2smass": {
            matchesOverlay: _.matches({ overlayType: "so2smass" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "so2smass",
                    descriptionHTML: localize({
                        name: { en: "Sulfur Dioxide Mass", ja: "二酸化硫黄質量" },
                        qualifier: { en: " @ Surface", ja: " @ 地上" }
                    }),
                    paths: [geosPath(attr, "so2smass")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var so2smass = vars.SO2SMASS;
                        var time = so2smass.dimensions[0];
                        var data = epak.blocks[so2smass.data.block];
                        var center = header.Institution;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [  // SO2 Surface Mass Concentration, units: kg/m3
                        //{label: "ppb", conversion: function(x) { return x * 1000 * 1000 * 1000 / 2.86; }, precision: 3},
                        //{label: "ppm", conversion: function(x) { return x * 1000 * 1000 / 2.86; }, precision: 3},
                        { label: "µg/m<sup>3</sup>", tooltip: "µg/m³", conversion: function (x) { return x * 1000 * 1000000; }, precision: 2 }
                        //{label: "mg/m<sup>3</sup>", tooltip: "mg/m³", conversion: function(x) { return x * 1000 * 1000; }, precision: 3}
                        //{label: "kg/m<sup>3</sup>", conversion: function(x) { return x; }, precision: 14}
                    ],
                    alpha: { single: 160, animated: 140 },
                    scale: getSulfurDioxidePalette() //Kindleman
                });
            }
        },

        "duexttau": {
            matchesOverlay: _.matches({ overlayType: "duexttau" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "duexttau",
                    descriptionHTML: localize({
                        name: { en: "Dust Extinction " + aotLink, ja: "粒子消散係数 " + aotLink },
                        qualifier: ""
                    }),
                    paths: [geosPath(attr, "duexttau")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var duexttau = vars.DUEXTTAU;
                        var time = duexttau.dimensions[0];
                        var data = epak.blocks[duexttau.data.block];
                        var center = header.Institution;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [  // Dust Extinction AOT (aerosol optical thickness) [550 nm], units: τ
                        { label: "τ", conversion: function (x) { return x; }, precision: 4 }
                    ],
                    alpha: { single: 160, animated: 140 },
                    scale: getDuexPalette()
                });
            }
        },

        "suexttau": {
            matchesOverlay: _.matches({ overlayType: "suexttau" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "suexttau",
                    descriptionHTML: localize({
                        name: { en: "Sulfate Extinction " + aotLink, ja: "硫酸塩消散係数 " + aotLink },
                        qualifier: ""
                    }),
                    paths: [geosPath(attr, "suexttau")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var suexttau = vars.SUEXTTAU;
                        var time = suexttau.dimensions[0];
                        var data = epak.blocks[suexttau.data.block];
                        var center = header.Institution;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [  // SO4 Extinction AOT (aerosol optical thickness) [550 nm], units: τ
                        { label: "τ", conversion: function (x) { return x; }, precision: 3 }
                    ],
                    alpha: { single: 160, animated: 140 },
                    scale: getSulfateExPalette()
                });
            }
        },

        "co2sc": {
            matchesOverlay: _.matches({ overlayType: "co2sc" }),
            create: function (attr) {
                var Δ = 32;
                return buildProduct({
                    field: "scalar",
                    type: "co2sc",
                    descriptionHTML: localize({
                        name: { en: "Carbon Dioxide Concentration", ja: "二酸化炭素濃度" },
                        qualifier: { en: " @ Surface", ja: " @ 地上" }
                    }),
                    paths: [geosPath(attr, "co2sc", { minute: 90 })],
                    date: function () {
                        return gfsDate(attr.date, { minute: 90 });
                    },
                    navigate: function (step) {
                        return gfsStep(this.date(), step);
                    },
                    navigateTo: function (date) {
                        return gfsDate(date, { minute: 90 });
                    },
                    builder: function (file) {
                        var epak = file;
                        var header = epak.header;
                        var vars = header.variables;
                        var co2sc = vars.CO2SC;
                        var time = co2sc.dimensions[0];
                        var data = epak.blocks[co2sc.data.block];
                        var center = header.Institution;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "co2sc"),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i] + Δ;
                            }
                        };
                    },
                    units: [  // CO2 Surface Concentration, units: ppmv
                        { label: "ppmv", conversion: function (x) { return x; }, precision: 0 }
                    ],
                    alpha: { single: 200, animated: 150 },
                    scale: mTest(Δ),
                });
            }
        },

        "currents": {
            matchesPrimary: _.matches({ surface: "surface", level: "currents" }),
            matchesOverlay: _.matches({ overlayType: "currents" }),
            create: function (attr) {
                return when(catalogs.oscar).then(function (catalog) {
                    return buildProduct({
                        field: "vector",
                        type: "currents",
                        descriptionHTML: localize({
                            name: { en: "Ocean Currents", ja: "海流" },
                            qualifier: { en: " @ Surface", ja: " @ 地上" }
                        }),
                        paths: [oscarPath(catalog, attr)],
                        date: function () {
                            return oscarDate(catalog, attr.date);
                        },
                        navigate: function (step) {
                            return oscarStep(catalog, this.date(), step);
                        },
                        navigateTo: function (date) {
                            return oscarStep(catalog, date, 0);
                        },
                        builder: function (epak) {
                            var header = epak.header;

                            var vars = header.variables;
                            var u = vars.u;
                            var v = vars.v;
                            var time = u.dimensions[0];
                            var uData = epak.blocks[u.data.block];
                            var vData = epak.blocks[v.data.block];
                            var center = "OSCAR";

                            return {
                                header: netcdfHeader(vars[time], vars.latitude, vars.longitude, center),
                                interpolate: bilinearInterpolateVector,
                                triangleInterpolate: barycentricInterpolateVector,
                                data: function (i) {
                                    var u = uData[i], v = vData[i];
                                    return u === u && v === v ? [u, v] : null;
                                }
                            };
                        },
                        units: [
                            { label: "m/s", conversion: function (x) { return x; }, precision: 2 },
                            { label: "km/h", conversion: function (x) { return x * 3.6; }, precision: 1 },
                            { label: "kn", conversion: function (x) { return x * 1.943844; }, precision: 1 },
                            { label: "mph", conversion: function (x) { return x * 2.236936; }, precision: 1 }
                        ],
                        scale: {
                            bounds: [0, 1.5],
                            gradient: SintefAnimationMapUtility.segmentedColorScale([
                                [0, [10, 25, 68]],
                                [0.15, [10, 25, 250]],
                                [0.4, [24, 255, 93]],
                                [0.65, [255, 233, 102]],
                                [1.0, [255, 233, 15]],
                                [1.5, [255, 15, 15]]
                            ])
                        },
                        particles: { velocityScale: 1 / 7, maxIntensity: 0.7 }
                    });
                });
            }
        },

        "primary_waves": {
            matchesPrimary: _.matches({ param: "ocean", surface: "primary", level: "waves" }),
            matchesOverlay: _.matches({ overlayType: "primary_waves" }),
            create: function (attr) {
                return buildProduct({
                    field: "vector",
                    type: "primary_waves",
                    descriptionHTML: localize({
                        name: { en: "Peak Wave Period", ja: "ピーク波周期" },
                        qualifier: ""
                    }),
                    paths: [wave30mPath(attr, "primary")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (epak) {
                        var header = epak.header;
                        var vars = header.variables;
                        var direction = vars.Primary_wave_direction_surface;
                        var period = vars.Primary_wave_mean_period_surface;
                        var time = direction.dimensions[0];
                        var dirData = epak.blocks[direction.data.block];
                        var perData = epak.blocks[period.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "WW3"),
                            interpolate: bilinearInterpolateVector,
                            triangleInterpolate: barycentricInterpolateVector,
                            data: function (i) {
                                var φ = dirData[i] / 360 * τ;  // wave direction in radians
                                var m = perData[i];  // wave period (treated as velocity)
                                var u = -m * Math.sin(φ);
                                var v = -m * Math.cos(φ);
                                return u === u && v === v ? [u, v] : null;
                            }
                        };
                    },
                    units: [
                        { label: "sec", conversion: function (x) { return x; }, precision: 1 }
                    ],
                    scale: {
                        bounds: [0, 25],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [0, [0, 0, 0]],
                            [25, [21, 255, 255]]
                        ])
                    },
                    particles: { velocityScale: 1 / 612, maxIntensity: 12, waves: true }
                });
            }
        },

        "sea_surface_temp": {
            matchesOverlay: _.matches({ overlayType: "sea_surface_temp" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "sea_surface_temp",
                    descriptionHTML: localize({
                        name: { en: "Sea Surface Temp", ja: "海面水温" },
                        qualifier: ""
                    }),
                    paths: [rtgPath(attr, "sea_surface_temp")],
                    date: function () {
                        return rtgDate(attr.date);
                    },
                    navigate: function (step) {
                        return rtgStep(this.date(), step);
                    },
                    navigateTo: function (date) {
                        return rtgStep(date, 0);
                    },
                    builder: function (epak) {
                        var header = epak.header;
                        var vars = header.variables;
                        var temp = vars.Temperature_surface_sparse;
                        var time = temp.dimensions[0];
                        var data = epak.blocks[temp.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "RTGSST"),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "°C", conversion: function (x) { return x - 273.15; }, precision: 1 },
                        { label: "°F", conversion: function (x) { return x * 9 / 5 - 459.67; }, precision: 1 },
                        { label: "K", conversion: function (x) { return x; }, precision: 1 }
                    ],
                    scale: {
                        bounds: [270, 304.65],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [270, [255, 255, 255]],
                            [271.25, [255, 255, 255]], // -1.9 C sea water freeze
                            [271.30, [15, 4, 168]],
                            [273.15, [15, 54, 208]],   // 0 C fresh water freeze
                            [273.25, [15, 54, 188]],
                            [275.65, [15, 4, 168]],    // lower boundary for cool currents
                            [281.65, [24, 132, 14]],   // upper boundary for cool currents
                            [291.15, [247, 251, 59]],  // lower boundary for warm currents
                            [295, [235, 167, 0]],
                            [299.65, [245, 0, 39]],    // minimum needed for tropical cyclone formation
                            [303, [87, 17, 0]],
                            [304.65, [238, 0, 242]]
                        ])
                    }
                });
            }
        },

        "sea_surface_temp_anomaly": {
            matchesOverlay: _.matches({ overlayType: "sea_surface_temp_anomaly" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "sea_surface_temp_anomaly",
                    descriptionHTML: localize({
                        name: { en: "SST Anomaly", ja: "海面水温異常" },
                        qualifier: ""
                    }),
                    paths: [rtgPath(attr, "sea_surface_temp_anomaly")],
                    date: function () {
                        return rtgDate(attr.date);
                    },
                    navigate: function (step) {
                        return rtgStep(this.date(), step);
                    },
                    navigateTo: function (date) {
                        return rtgStep(date, 0);
                    },
                    builder: function (epak) {
                        var header = epak.header;
                        var vars = header.variables;
                        var temp = vars.Temperature_surface_anomaly_sparse;
                        var time = temp.dimensions[0];
                        var data = epak.blocks[temp.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "RTGSST"),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "°C", conversion: function (x) { return x; }, precision: 1 },
                        { label: "°F", conversion: function (x) { return x * 9 / 5; }, precision: 1 },
                        { label: "K", conversion: function (x) { return x; }, precision: 1 }
                    ],
                    scale: {
                        bounds: [-6, 6],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [-6.0, [255, 255, 255]],
                            [-3, [7, 252, 254]],
                            [-1.5, [66, 42, 253]],
                            [-0.75, [34, 55, 134]],
                            [0, [0, 0, 6]],
                            [0.75, [134, 55, 34]],
                            [1.5, [253, 14, 16]],
                            [3.0, [254, 252, 0]],
                            [6.0, [255, 255, 255]]
                        ])
                    }
                });
            }
        },

        "significant_wave_height": {
            matchesOverlay: _.matches({ overlayType: "significant_wave_height" }),
            create: function (attr) {
                return buildProduct({
                    field: "scalar",
                    type: "significant_wave_height",
                    descriptionHTML: localize({
                        name: { en: "Significant Wave Height", ja: "有義波高" },
                        qualifier: ""
                    }),
                    paths: [wave30mPath(attr, "sig_height")],
                    date: function () {
                        return gfsDate(attr.date);
                    },
                    builder: function (epak) {
                        var header = epak.header;
                        var vars = header.variables;
                        var height = vars.Significant_height_of_combined_wind_waves_and_swell_surface;
                        var time = height.dimensions[0];
                        var data = epak.blocks[height.data.block];
                        var center = header.Originating_or_generating_Center;
                        return {
                            header: netcdfHeader(vars[time], vars.lat, vars.lon, center, "WW3"),
                            interpolate: bilinearInterpolateScalar,
                            triangleInterpolate: barycentricInterpolateScalar,
                            data: function (i) {
                                return data[i];
                            }
                        };
                    },
                    units: [
                        { label: "m", conversion: function (x) { return x; }, precision: 2 },
                        { label: "ft", conversion: function (x) { return x * 100 / 2.54 / 12; }, precision: 1 }
                    ],
                    scale: {
                        bounds: [0, 15],
                        gradient: SintefAnimationMapUtility.segmentedColorScale([
                            [0, [8, 29, 88]],
                            [1, [37, 52, 148]],
                            [2, [34, 94, 168]],
                            [3, [29, 145, 192]],
                            [4, [65, 182, 196]],
                            [5, [127, 205, 187]],
                            [6, [199, 233, 180]],
                            [7, [237, 248, 177]],
                            [8, [254, 204, 92]],
                            [10, [253, 141, 60]],
                            [12, [240, 59, 32]],
                            [14, [189, 0, 38]]
                        ])
                    }
                });
            }
        },

        "off": {
            matchesOverlay: _.matches({ overlayType: "off" }),
            create: function () {
                return null;
            }
        }
    };

    function dataSourceHTML(header) {
        switch (header.center || header.centerName) {
            case -3:
            case "OSCAR":
                return "OSCAR / Earth & Space Research";
            case 7:
            case "US National Weather Service, National Centres for Environmental Prediction (NCEP)":
                switch (header.process) {
                    case "RTGSST":
                        return "RTG-SST / NCEP / US National Weather Service";
                    case "WW3":
                        return "WAVEWATCH III / NCEP / NWS";
                    default:
                        return "GFS / NCEP / US National Weather Service";
                }
            case "NASA Global Modeling and Assimilation Office":
                switch (header.process) {
                    case "co2":
                    case "co2sc":
                        return "GEOS-5 / GMAO / NASA " + co2Link;
                    default:
                        return "GEOS-5 / GMAO / NASA";
                }
        }
        return encodeURIComponent(header.centerName);
    }

    function bilinearInterpolateScalar(x, y, g00, g10, g01, g11) {
        var rx = (1 - x);
        var ry = (1 - y);
        return g00 * rx * ry + g10 * x * ry + g01 * rx * y + g11 * x * y;
    }

    function someSortOfInterpolater(file) {
        var epak = file, header = epak.header, vars = header.variables;
        var u = vars["u"];
        var v = vars["v"];

        // dims are: time,depth,lat,lon
        var time = vars[u.dimensions[0]];
        var lat = vars[u.dimensions[2]];
        var lon = vars[u.dimensions[3]];
        var uData = epak.blocks[u.data.block];
        var vData = epak.blocks[v.data.block];

        var grid = rectangularGrid(lon.sequence, lat.sequence);
        var defaultInterpolator = bilinear.vector(grid, uData, vData);

        return {
            sourceHTML: strings.oscar,
            date: function () {
                return utc.parts(time.data[0]);
            },
            grid: function () {
                return grid;
            },
            field: function () {
                return {
                    valueAt: function (i) {
                        var u = uData[i];
                        var v = vData[i];
                        return [u, v, Math.sqrt(u * u + v * v)];
                    },
                    nearest: nearest.vector(grid, uData, vData),
                    bilinear: bilinear.vector(grid, uData, vData),
                }
            },
            interpolate: function (coord) {
                return defaultInterpolator(coord);
            },
        };
    }

    function barycentricInterpolateScalar(x, y, p0, p1, p2) {
        return p0 + x * (p2 - p0) + y * (p1 - p0);
    }

    function bilinearInterpolateVector(x, y, g00, g10, g01, g11) {
        var rx = (1 - x);
        var ry = (1 - y);
        var a = rx * ry, b = x * ry, c = rx * y, d = x * y;
        var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
        var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
        return [u, v, Math.sqrt(u * u + v * v)];
    }

    function barycentricInterpolateVector(x, y, p0, p1, p2) {
        var u = barycentricInterpolateScalar(x, y, p0[0], p1[0], p2[0]);
        var v = barycentricInterpolateScalar(x, y, p0[1], p1[1], p2[1]);
        return [u, v, Math.sqrt(u * u + v * v)];
    }

    function isValid(x) {
        return x === x && x !== null && x !== undefined;
    }

    /**
     * Builds an interpolator for the specified data in the form of JSON-ified GRIB files. Example:
     *
     *     [
     *       {
     *         "header": {
     *           "refTime": "2013-11-30T18:00:00.000Z",
     *           "parameterCategory": 2,
     *           "parameterNumber": 2,
     *           "surface1Type": 100,
     *           "surface1Value": 100000.0,
     *           "forecastTime": 6,
     *           "scanMode": 0,
     *           "nx": 360,
     *           "ny": 181,
     *           "lo1": 0,
     *           "la1": 90,
     *           "lo2": 359,
     *           "la2": -90,
     *           "dx": 1,
     *           "dy": 1
     *         },
     *         "data": [3.42, 3.31, 3.19, 3.08, 2.96, 2.84, 2.72, 2.6, 2.47, ...]
     *       }
     *     ]
     *
     */
    function buildGrid(builder) {
        var header = builder.header;
        var λ0 = header.lo1, φ0 = header.la1;  // the grid's origin (e.g., 0.0E, 90.0N)
        var Δλ = header.dx, Δφ = header.dy;    // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)
        var ni = header.nx, nj = header.ny;    // number of grid points W-E and N-S (e.g., 144 x 73)
        var date = utc.add(utc.parts(header.refTime), { hour: header.forecastTime });

        // Scan mode 0 assumed. Longitude increases from λ0, and latitude decreases from φ0.
        // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
        var grid = [], p = 0;
        var isContinuous = Math.floor(ni * Δλ) >= 360;
        for (var j = 0; j < nj; j++) {
            var row = [];
            for (var i = 0; i < ni; i++, p++) {
                row[i] = builder.data(p);
            }
            if (isContinuous) {
                // For wrapped grids, duplicate first column as last column to simplify interpolation logic
                row.push(row[0]);
            }
            grid[j] = row;
        }

        function interpolate(λ, φ) {
            var i = SintefAnimationMapUtility.floorMod(λ - λ0, 360) / Δλ;  // calculate longitude index in wrapped range [0, 360)
            var j = (φ0 - φ) / Δφ;                 // calculate latitude index in direction +90 to -90

            //         1      2           After converting λ and φ to fractional grid indexes i and j, we find the
            //        fi  i   ci          four points "G" that enclose point (i, j). These points are at the four
            //         | =1.4 |           corners specified by the floor and ceiling of i and j. For example, given
            //      --G00-|--G10-- fj 8   i = 1.4 and j = 8.3, the four surrounding grid points are (1, 8), (2, 8),
            //    j ___|_ .   |           (1, 9) and (2, 9).
            //  =8.3   |      |
            //      --G01----G11-- cj 9   Note that for wrapped grids, the first column is duplicated as the last
            //         |      |           column, so the index ci can be used without taking a modulo.

            var fi = Math.floor(i), ci = fi + 1;
            var fj = Math.floor(j), cj = fj + 1;

            var row0 = grid[fj] || [], row1 = grid[cj] || [];
            var g00 = row0[fi];
            var g10 = row0[ci];
            var g01 = row1[fi];
            var g11 = row1[ci];
            var x = i - fi, y = j - fj;

            if (isValid(g00)) {
                if (isValid(g10) && isValid(g01) && isValid(g11)) {
                    // All four points found, so interpolate the value.
                    return builder.interpolate(x, y, g00, g10, g01, g11);
                } else if (isValid(g11) && isValid(g10) && x >= y) {
                    return builder.triangleInterpolate(1 - x, y, g10, g11, g00);
                } else if (isValid(g01) && isValid(g11) && x < y) {
                    return builder.triangleInterpolate(x, 1 - y, g01, g00, g11);
                } else if (isValid(g01) && isValid(g10) && x <= (1 - y)) {
                    return builder.triangleInterpolate(x, y, g00, g01, g10);
                }
            } else if (isValid(g11) && isValid(g01) && isValid(g10) && x > (1 - y)) {
                return builder.triangleInterpolate(1 - x, 1 - y, g11, g10, g01);
            }

            //if (isValid(g00) && isValid(g10) && isValid(g01) && isValid(g11)) {
            //    // All four points found, so interpolate the value.
            //    return builder.interpolate(x, y, g00, g10, g01, g11);
            //} else if (x >= y && isValid(g00) && isValid(g11) && isValid(g10)) {
            //    return builder.triangleInterpolate(1-x, y, g10, g11, g00);
            //} else if (x < y && isValid(g00) && isValid(g01) && isValid(g11)) {
            //    return builder.triangleInterpolate(x, 1-y, g01, g00, g11);
            //} else if (x <= (1 - y) && isValid(g00) && isValid(g01) && isValid(g10)) {
            //    return builder.triangleInterpolate(x, y, g00, g01, g10);
            //} else if (x > (1 - y) && isValid(g11) && isValid(g01) && isValid(g10)) {
            //    return builder.triangleInterpolate(1-x, 1-y, g11, g10, g01);
            //}
            // console.log("cannot interpolate: " + λ + "," + φ + ": " + fi + " " + ci + " " + fj + " " + cj);
            return NaN;
        }

        return {
            sourceHTML: dataSourceHTML(header),
            date: function () {
                return date;
            },
            interpolate: interpolate,
            dimensions: function () {
                return [ni, nj];
            },
            forEachPoint: function (cb, rows) {  // rows: [start row, end row)
                rows = rows || [];
                var start = Math.max(rows[0] || 0, 0), end = Math.min(rows[1] || nj, nj);
                for (var j = start; j < end; j++) {
                    var row = grid[j] || [];
                    for (var i = 0; i < ni; i++) {
                        cb(SintefAnimationMapUtility.floorMod(180 + λ0 + i * Δλ, 360) - 180, φ0 - j * Δφ, row[i]);
                    }
                }
            }
        };
    }

    function productsFor(attributes) {
        var attr = _.clone(attributes), primary = null, overlay = null;
        _.values(FACTORIES).forEach(function (factory) {
            if (_.isFunction(factory.matchesPrimary) && factory.matchesPrimary(attr)) {
                primary = factory;
            }
            if (_.isFunction(factory.matchesOverlay) && factory.matchesOverlay(attr) && factory !== primary) {
                overlay = factory;
            }
        });
        var results = [];
        if (primary) results.push(primary.create(attr));
        if (overlay) results.push(overlay.create(attr));
        return results.filter(SintefAnimationMapUtility.isTruthy);
    }

    return {
        overlayTypes: d3.set(_.keys(FACTORIES)),
        productsFor: productsFor,
        argoUrl: argoUrl,
        gaia: gaia
    };

    return products;

}();
