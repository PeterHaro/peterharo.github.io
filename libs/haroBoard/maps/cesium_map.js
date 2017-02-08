var cesiumWidget = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: false,
    baseLayerPicker: false
});
var baselayerInjector = new CesiumBaseLayerInjection();
baselayerInjector.init();
var layers = cesiumWidget.scene.imageryLayers;

var now = Cesium.JulianDate.now();
var clock = new Cesium.Clock({
    currentTime: now
});

var baseLayerPicker = new Cesium.BaseLayerPicker("baseLayerPickerContainer", {
    globe: cesiumWidget.scene,
    imageryProviderViewModels: baselayerInjector.getImageryViewModels(),
    terrainProviderViewModels: baselayerInjector.getTerrainProviders()
});

var activeLayers = {};
var layerEnabled = {}; // whether the label is in some way enabled
var me = new Self();
nobjectsIn(default_layer_configuration, function (x) {
    console.log(x);
}, function (s, p, o) {
    me.addEdge(s, p, o);
});


$('.cesium-baseLayerPicker-item').each(function () {
    var label = $(this).find($('.cesium-baseLayerPicker-itemLabel'));
    var baseLayerId = encodeURIComponent(label.html());
    $(this).prop('id', baseLayerId);
});

var initialLayers = (getURLParameter("layersOn") || '').split(',');
var disabledLayers = (getURLParameter("layersOff") || '').split(",");
if (initialLayers[0] === '') initialLayers = [];
if (disabledLayers[0] === '') disabledLayers = [];
var allLayers = initialLayers.concat(disabledLayers);
var baseLayer = (getURLParameter("baseLayer") || '');
if (baseLayer.length > 0) {
    console.log('yes + ' + baseLayer);
    var baseLayerId = encodeURIComponent(baseLayer);
    console.log(baseLayerId);
    $("div[id='" + baseLayerId + "']").trigger('click');
}


if (allLayers.length > 0) {
    // LOAD LAYERS FROM URL
    var latView = (getURLParameter("lat") || '-78.176832746519');
    var lonView = (getURLParameter("lon") || '31.300283760032368');
    var zoomView = (getURLParameter("zoom") || '26596280.257583864');
    var dateView = (getURLParameter("date") || time);

    if (dateView !== time) {
        picker.set('select', dateView, {
            format: 'yyyy-mm-dd'
        });
    }

    if (latView !== '-78.176832746519') {
        var includeOnly = true;
        initLayers(includeOnly);
        cesiumWidget.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(latView, lonView, zoomView)
        });
    } else {
        initLayers();
    }

    var modeView = (getURLParameter("mode") || '2D');
    if (modeView !== '2D') {
        console.log('.mode-' + modeView);
        $('#mode-' + modeView).click();
    }

    var shared = $('<div class="folder" style="display: block;"></div>').prependTo('#map-layers');
    $('<h2 class="toggle active">Shared Layers</h2>').prependTo('#map-layers').show();

    // Load Layers
    for (var i = 0; i < allLayers.length; i++) {
        $('#' + allLayers[i]).detach().appendTo(shared).show();
    }
    for (var i = 0; i < initialLayers.length; i++) {
        $('.' + initialLayers[i] + '-load').click();
    }

} else {
    initLayers();
}


// __UI_ELEMENTS_
function toggleSidebar() {
    var clientHeight = $(window).height(),
        clientWidth = $(window).width(),
        tiny = 420;
    if (!$('.control-sidebar').hasClass('control-sidebar-open')) {
        $('.control-sidebar, #cesiumContainer').addClass('control-sidebar-open');
        $('#open-menu').addClass('active');

        $('.control-sidebar').height(clientHeight);
        if (clientWidth < tiny) {
            $('#cesiumContainer, .cesium-viewer, .control-sidebar').height(clientHeight).width(clientWidth);
            $('#cesiumContainer, .cesium-viewer, .control-sidebar').height(clientHeight).width(clientWidth);
        } else {
            $('#cesiumContainer, .cesium-viewer').height(clientHeight).width(clientWidth - 420);
        }

        /*
         $('#cesiumContainer').one('click', function () {
         $('.control-sidebar').removeClass('control-sidebar-open');
         $('#open-menu').removeClass('active');
         });
         */
    } else {
        $('.control-sidebar, #cesiumContainer').removeClass('control-sidebar-open');
        $('#open-menu').removeClass('active');
        $('#cesiumContainer').height(clientHeight).width(clientWidth);
        $('.cesium-viewer').height(clientHeight).width(clientWidth);
    }
}

function addTree(parent /* nodes  */, lb /*target */, includeOnly) {
    var layers = me.successors(parent);
    _.each(layers, function (l) {
        var h = me.node(l),
            content,
            layerId = h.I,
            layerType = h.T;

        var child = $('<div class="folder" />').html(h);
        if (!h.T) {
            var ic = h.icon;
            //Folder Label
            content = newFolderLabel(h, child, ic);
        } else { // not a folder
            var present = true;
            if (present) {
                var geoDataSrc = h.G,
                    source = h.S,
                    sourceUrl = h.U,
                    largeLayer = h.H,
                    newLayer = h.NL,
                    timeline = h.C,
                    format = h.F,
                    zoomLevel = h.Fz,
                    noList = h.Y,
                    layerButton, details, loadIcon, optIcon, treeIcon, sliderIcon, label;

                if (noList !== true) noList = false;

                if (zoomLevel) {
                    zoomLevel = zoomLevel;
                } else {
                    zoomLevel = "9";
                }

                if (format === "jpg") {
                    format = "image/jpeg";
                } else {
                    format = "image/png";
                }

                //console.log(noList);
                if (format) {
                    content = $('<div>').data('l', h).attr({
                        'id': h.I,
                        'data-format': format,
                        'data-zoom': zoomLevel
                    }).addClass('lbw ' + h.T); //layer button wrapper
                } else {
                    content = $('<div>').data('l', h).attr('id', h.I).addClass('lbw ' + h.T); //layer button wrapper
                }
                layerButton = $('<div>').addClass('lb').appendTo(content); // layer button
                //expand layer options
                optIcon = $('<i>').addClass('fa fa-fw fa-folder-o').toggle(
                    function () {
                        if (details.children().length === 0) {
                            initDetails(layerId, layerType, details, source, sourceUrl, geoDataSrc);
                        }
                        details.show();
                        details.focus();
                        optIcon.removeClass('fa-folder-o').addClass('fa-folder-open-o active');
                    },
                    function () {
                        details.hide();
                        optIcon.removeClass('fa-folder-open-o active').addClass('fa-folder-o');
                    }
                ).appendTo(layerButton);

                if ((h.T === ('geojson')) && (noList === false)) {
                    treeIcon = $('<i title="Expand Marker Tree" class="fa fa-fw fa-sitemap toggle-list ' + layerId + '-tree"></i>');
                    treeIcon.click(function () {
                        setTimeout(function () {
                            if ($('.' + layerId + '-list').is(":visible")) {
                                $('.' + layerId + '-list').hide();
                                treeIcon.removeClass('active');
                            } else {
                                $('.' + layerId + '-list').show();
                                treeIcon.addClass('active');
                            }
                        });
                    }).appendTo(layerButton);
                }

                if (h.T === ("nasa-gibs") || h.T === ("cartodb-layer") || h.T === ("wmts") || h.T === ("wms") || h.T === ("base-layer") || h.T === ("arcgis-layer") || h.T === ("arcgis-base-layer") || h.T === ("bing")) {
                    sliderIcon = $('<i title="Expand Marker Tree" class="fa fa-fw fa-sliders toggle-list ' + layerId + '-tree"></i>');
                    sliderIcon.click(function () {
                        setTimeout(function () {
                            if ($('.' + layerId + '-sliders').is(":visible")) {
                                $('.' + layerId + '-sliders').hide();
                                sliderIcon.removeClass('show-sliders');
                            } else {
                                $('.' + layerId + '-sliders').show();
                                sliderIcon.addClass('show-sliders');
                            }
                        });
                    }).appendTo(layerButton);
                }

                loadIcon = $('<i class="fa fa-fw fa-play ' + layerId + '-load"></i>');
                if (largeLayer) loadIcon.addClass('large-layer');
                if (newLayer) loadIcon.addClass('new-layer');

                loadIcon.toggle(
                    function () {
                        setTimeout(function () {
                            if (loadIcon.hasClass('fa-play')) {
                                if (includeOnly) {
                                    updateLayer(layerId, includeOnly);
                                } else {
                                    updateLayer(layerId);
                                }
                                if (!label.hasClass('active')) label.addClass('active');
                                if (!content.hasClass('active')) content.addClass('active');
                                if (timeline) toggleTimeline(true);
                                if ((h.T === ('geojson')) && (noList === false)) treeIcon.show();
                                if (h.T === ("nasa-gibs") || h.T === ("cartodb-layer") || h.T === ("wmts") || h.T === ("wms") || h.T === ("base-layer") || h.T === ("arcgis-layer") || h.T === ("arcgis-base-layer") || h.T === ("bing")) {
                                    sliderIcon.show();
                                }
                            }
                        });
                    },
                    function () {
                        setTimeout(function () {
                            if (loadIcon.hasClass('fa-check')) {
                                disableLayer(h);
                                loadIcon.removeClass('fa-check active').addClass('fa-play');
                                if (label.hasClass('active')) label.removeClass('active');
                                if (content.hasClass('active')) content.removeClass('active');
                                if (optIcon.hasClass('fa-folder-open-o')) optIcon.trigger('click');
                                if ((h.T === ('geojson')) && (noList === false)) treeIcon.hide();
                                if (h.T === ("nasa-gibs") || h.T === ("cartodb-layer") || h.T === ("wmts") || h.T === ("wms") || h.T === ("base-layer") || h.T === ("arcgis-layer") || h.T === ("arcgis-base-layer") || h.T === ("bing")) {
                                    sliderIcon.hide();
                                    sliderIcon.removeClass('show-sliders');
                                }
                            }
                        });
                    }
                ).appendTo(layerButton);

                label = $('<span>').html(h.N).addClass('label');
                label.toggle(
                    function () {
                        if (!label.hasClass('fail')) {
                            if (!label.hasClass('active'))
                                label.addClass('active');
                            loadIcon.trigger('click');
                        }
                    },
                    function () {
                        if (!label.hasClass('fail')) {
                            if (label.hasClass('active'))
                                label.removeClass('active');
                            loadIcon.trigger('click');
                        }
                    }
                ).appendTo(layerButton);

                details = $('<div class="' + layerId + '-details layer-details" />').appendTo(content);
                details.hide(); //begin hidden
            } // end present
        }

        if (content !== null) {
            lb.append(content);

            var ll = addTree(h.I, child, includeOnly);
            if (ll.length) {
                lb.append(child);
            }
        }

    });
    return layers;
}

/* BUILD SIDEBAR */
function initLayers(includeOnly) {
    var lb = $('#map-layers');
    lb.addClass('ui');
    if (includeOnly) {
        _.each(me.sources(), function (s) {
            addTree(s, lb, includeOnly);
        });
    } else {
        _.each(me.sources(), function (s) {
            addTree(s, lb);
        });
    }
}


// LAYER MENU TOGGLE BUTTON
$('#open-menu').click(function () {
    toggleSidebar();
});

// UTILITY
// GET URL
function getURLParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}

function loading(layerId) {
    $('.' + layerId + '-load').removeClass('fa-play').addClass('fa-spinner fa-spin loading active');
}

function loaded(layerId) {
    $('.' + layerId + '-load').removeClass('fa-spinner fa-spin loading').addClass('fa-check');
}

function loadError(layerId, geoDataSrc, error) {
    // console.log('loading ' + layerId + ' failed: ' + error);
    var target = $('#' + layerId);
    $('<div class="details"><div class="header"><i class="fa fa-fw fa-exclamation-circle"></i> Load Failed</div>Please use <a href="mailto:crono142@gmail.com?subject=CesiumMapClient broken link - ' + layerId + '&amp;body=Unfortunately this ( ' + geoDataSrc + ' ) URL is not working properly, please look into it.  Bug report sent from" target="_self">this link</a> to report this error.<br><div class="darkwell"><strong>ERROR:</strong> ' + error + '</div></div>').appendTo(target);
    var icon = $('.' + layerId + '-load');
    var span = $('#' + layerId + ' span');
    icon.removeClass('fa-spinner fa-spin active loading').addClass('fa-exclamation-triangle fail');
    span.removeClass('active').addClass('fail');
}

function NSlider(opt) {
    var src = opt.src;
    var mod = opt.mod;
    opt = opt || {};

    if (!opt.element) opt.element = $('<div class="item slider"></div>');
    if (!opt.min) opt.min = 0;
    if (!opt.max) opt.max = 1;
    if (!opt.start) opt.start = 1;
    if (!opt.label) opt.label = '';

    $('<div class="label">' + opt.label + '</div>').appendTo(opt.element);
    var slider = $('<input class="' + opt.label + '" type="range">').appendTo(opt.element);
    var begin = (opt.start / opt.max) * 100;

    slider.attr('min', 0);
    slider.attr('max', 100);
    slider.attr('step', 1);
    slider.attr('value', begin);

    slider.on("change", function () {
        var newValue = slider.val();
        var percent = (newValue / 100).toFixed(2);
        var sum = (opt.max * percent);
        if (mod) {
            var entities = src.entities.values;
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var color = entity.billboard.color;
                if (mod == 'alpha') {
                    entity.billboard.color = new Cesium.Color.fromAlpha(color, sum);
                    // console.log('markermod alpha ' + sum);
                }
            }
        } else {
            if (opt.label == 'opacity') src.alpha = sum;
            if (opt.label == 'contrast') src.contrast = sum;
            if (opt.label == 'saturation') src.saturation = sum;
            if (opt.label == 'brightness') src.brightness = sum;
            if (opt.label == 'gamma') src.gamma = sum;
        }
    });

    return opt.element;
}

function loadSliders(src, layerId) {
    var target = $('#' + layerId + ' .lb');
    //var label = $('<div class="slider-group-label ' + layerId + '-sliders"><i class="options icon"></i> Layer Controls</div>').insertAfter(target);
    var sPanel = $('<div class="details ' + layerId + '-sliders layer-sliders" />').insertAfter(target);
    var content = $('<div class="slider-content" />').appendTo(sPanel);
    var list = $('<div class="ui divided list" />').appendTo(content);

    NSlider({
        'label': 'opacity',
        'src': src
    }).appendTo(list);
    NSlider({
        'max': 2,
        'label': 'brightness',
        'src': src
    }).appendTo(list);
    NSlider({
        'max': 2,
        'label': 'contrast',
        'src': src
    }).appendTo(list);
    NSlider({
        'max': 2,
        'label': 'saturation',
        'src': src
    }).appendTo(list);
    //NSlider({ 'max': 2, 'label': 'gamma', 'src': src }).appendTo(list);

    src.alpha = 1;
    src.brightness = 1;
    src.contrast = 1;
    src.saturation = 1;
    //src.gamma = 1;

    loaded(layerId);
}

// __END_UI_ELEMENTS_

function loadGIBS(layerId, selectedDate, format, zoomLevel) {
    removeImagery(layerId);
    /*
     var tileID;
     if (zoomLevel === "6") {
     tileID = 'EPSG4326_2km';
     } else if (zoomLevel === "7") {
     tileID = 'EPSG4326_1km';
     } else if (zoomLevel === "8") {
     tileID = 'EPSG4326_500m';
     } else {
     zoomLevel = "9";
     tileID = 'EPSG4326_250m';
     }
     */
    //console.log(zoomLevel + ' = ' + tileID);

    var src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
        // url: "//map1.vis.earthdata.nasa.gov/wmts-geo/wmts.cgi?TIME=" + selectedDate,
        url: "http://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?TIME=" + selectedDate,
        layer: layerId,
        style: "",
        format: format,
        tileMatrixSetID: 'GoogleMapsCompatible_Level' + zoomLevel,
        minimumLevel: 0,
        maximumLevel: zoomLevel,
        tileWidth: 256,
        tileHeight: 256,
        tilingScheme: new Cesium.WebMercatorTilingScheme()
    }));

    activeLayers[layerId] = src;
    $('.' + layerId + '-sliders').remove();
    loadSliders(src, layerId);
}

function loadWmts(layerId, geoDataSrc, geoLayers) {
    var src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
        url: geoDataSrc,
        layers: geoLayers,
        style: "",
        format: "image/png",
        tileMatrixSetID: "GoogleMapsCompatible_Level9",
        maximumLevel: 9,
        tileWidth: 256,
        tileHeight: 256,
        tilingScheme: new Cesium.WebMercatorTilingScheme()
    }));

    activeLayers[layerId] = src;
    loadSliders(src, layerId);
}

function loadWms(layerId, geoDataSrc, geoLayers, noFeatures) {
    var src;
    if (noFeatures) {
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
            url: geoDataSrc,
            layers: geoLayers,
            sourceUri: geoDataSrc,
            enablePickFeatures: false,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            parameters: {
                transparent: true,
                format: 'image/png'
            }
        }));
    } else {
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
            url: geoDataSrc,
            layers: geoLayers,
            sourceUri: geoDataSrc,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            parameters: {
                transparent: true,
                format: 'image/png'
            }
        }));
    }
    activeLayers[layerId] = src;
    loadSliders(src, layerId);
}

function loadOsmLayer(layerId, geoDataSrc) {
    var src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.createOpenStreetMapImageryProvider({
        url: geoDataSrc
        //credit : source
    }));
    activeLayers[layerId] = src;
    loadSliders(src, layerId);
}

function loadCartoDB(layerId, geoDataSrc) {
    var src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: geoDataSrc
    }));
    activeLayers[layerId] = src;
    loadSliders(src, layerId);
}

function loadBingLayer(layerId, geoDataSrc) {
    var src, bingUrl = '//dev.virtualearth.net',
        bingKey = 'AiQDjsWpddVOFEnVY6j4Jb0S0Hoy9QMa30rvbZT1A8qd0it10NkYAgvb5sa3OeLw';
    if (geoDataSrc == 'AERIAL') {
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
            url: bingUrl,
            key: bingKey,
            mapStyle: Cesium.BingMapsStyle.AERIAL
        }));
    } else if (geoDataSrc == 'AERIAL_WITH_LABELS') {
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
            url: bingUrl,
            key: bingKey,
            mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS
        }));
    } else {
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
            url: bingUrl,
            key: bingKey,
            mapStyle: Cesium.BingMapsStyle.ROADS
        }));
    }
    activeLayers[layerId] = src;
    loadSliders(src, layerId);
}

var defaultKMLEyeOffset = new Cesium.Cartesian3(0.0, 5000.0, 0.0);
var defaultScaleByDistance = new Cesium.NearFarScalar(1, 0.5, 1, 0.3);
var defaultTranslucency = new Cesium.NearFarScalar(1.5e2, 1, 3.0e6, 0);

function newMarkerLabel(entity, markerLabel) {
    var label = new Cesium.LabelGraphics();
    if (markerLabel == 'usgs-eq') {
        label.text = 'M' + entity.properties.mag;
    } else if (entity.label.text) {
        label.text = entity.label.text;
    } else {
        label.text = '';
    }
    label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
    label.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
    label.outlineWidth = 5;
    label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
    label.translucencyByDistance = defaultTranslucency;
    label.eyeOffset = defaultKMLEyeOffset;
    return label;
}

function modMarkers(layerId, geoData, markerImg, markerScale, markerLabel, noList) {
    //console.log(noList);
    var items, markerList;
    if (noList === false) {
        var layerTarget = $('.' + layerId + '-details');
        markerList = $('<div class="details ' + layerId + '-list marker-list" />').insertAfter(layerTarget);
        items = [];
    }

    var entities = geoData.entities.values; // entities = all points
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i]; // entity = single point
        console.log(entity);
        // create marker image
        var billboard = new Cesium.BillboardGraphics();

        var image;
        if (markerImg) {
            image = markerImg;
        } else if (entity.billboard.image) {
            image = entity.billboard.image;
        } else {
            image = 'dist/img/icons/cv3d.png';
        }
        billboard.image = image;

        var size;
        if (markerLabel == 'usgs-eq') {
            size = entity.properties.mag;
        } else if (markerScale) {
            size = markerScale;
        } else {
            size = 3;
        }

        var title, details;

        if (entity.properties.title) {
            title = '<h3>' + entity.properties.title + '</h3>';
        } else if (entity.properties.Name) {
            title = '<h3>' + entity.properties.Name + '</h3>';
        } else if (entity.properties.name) {
            title = '<h3>' + entity.properties.name + '</h3>';
        } else if (entity.properties.LICENSEE) {
            title = '<h3>' + entity.properties.LICENSEE + '</h3>';
        } else {
            title = '';
        }

        if (entity.properties.mag) {
            details = '<div>Place: ' + entity.properties.place + '<br>Magnitude: ' + entity.properties.mag + '<br><a href="' + entity.properties.url + '" target="_blank">Click here for more info.</a></div>';
        } else if (entity.properties.Description) {
            details = '<div>' + entity.properties.Description + '</div>';
        } else if (entity.properties.description) {
            details = '<div>' + entity.properties.description + '</div>';
        } else if (entity.properties.desc) {
            details = '<div>' + entity.properties.desc + '</div>';
        } else if (entity.properties.FREQUENCY) {
            details = '<div>FREQUENCY: ' + entity.properties.FREQUENCY + '<br>CALLSIGN: ' + entity.properties.CALLSIGN + '<br>SERVICE: ' + entity.properties.SERVICE + '<br></div>';
        } else {
            details = '';
        }

        entity.title = title;
        entity.description = details;

        billboard.scale = size;

        billboard.width = 32;
        billboard.height = 32;
        billboard.alignedAxis = Cesium.Cartesian3.ZERO;
        billboard.scaleByDistance = defaultScaleByDistance;
        entity.billboard = billboard;
        //var position = entity.position;
        //var x = position.getValue().x;

        //console.log(entity);
        if (noList === false) {
            var v = entity.position.getValue();
            var carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(v);
            var lon = Cesium.Math.toDegrees(carto.longitude);
            var lat = Cesium.Math.toDegrees(carto.latitude);
            //console.log(lon, lat);
            items.push('<li data-lon="' + lon + '"  data-lat="' + lat + '">' + entity.title + '</li>');
        }

        // marker label
        if (markerLabel) {
            entity.label = newMarkerLabel(entity, markerLabel);
        }
    } // end for loop
    if (noList === false) {
        $('<h5><i class="fa fa-fw fa-map-marker"></i> Map Markers</h5>').appendTo(markerList);
        $('<ol/>', {
            'class': 'markers',
            html: items.join('')
        }).appendTo(markerList);
        $('.markers li').click(function () {
            var lon = $(this).attr('data-lon');
            var lat = $(this).attr('data-lat');
            cesiumWidget.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, 3000.0)
            });
        });
    }

}

function modMRM(geoData) {
    //console.log(noList);
    var entities = geoData.entities.values; // entities = all points
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i],
            billboard = new Cesium.BillboardGraphics(),
            image;
        if (entity.billboard.image) {
            image = entity.billboard.image;
        } else {
            image = 'dist/img/icons/cv3d.png';
        }

        billboard.image = image;

        billboard.scale = 4;

        billboard.width = 32;
        billboard.height = 32;
        billboard.alignedAxis = Cesium.Cartesian3.ZERO;
        billboard.scaleByDistance = defaultScaleByDistance;
        entity.billboard = billboard;
    } // end for loop
}

function loadArcGisLayer(layerId, geoDataSrc, geoLayers, noFeatures, format) {
    var src;
    if (noFeatures) {
        //console.log('NO FEATURES FOR YOU!');
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.ArcGisMapServerImageryProvider({
            url: geoDataSrc,
            format: format,
            enablePickFeatures: false,
            layers: geoLayers,
            tilingScheme: new Cesium.WebMercatorTilingScheme()
        }));
    } else {
        src = cesiumWidget.imageryLayers.addImageryProvider(new Cesium.ArcGisMapServerImageryProvider({
            url: geoDataSrc,
            format: format,
            enablePickFeatures: true,
            layers: geoLayers,
            tilingScheme: new Cesium.WebMercatorTilingScheme()
        }));
    }
    activeLayers[layerId] = src;
    loadSliders(src, layerId);
    loaded(layerId);
}

function loadGeoJson(layerId, geoDataSrc, markerLabel, markerScale, markerImg, zoom, noList) {
    // console.log('load geojson');
    new Cesium.GeoJsonDataSource.load(geoDataSrc).then(function (geoData) {
        modMarkers(layerId, geoData, markerImg, markerScale, markerLabel, noList);
        cesiumWidget.dataSources.add(geoData);
        activeLayers[layerId] = geoData;
        if (zoom) {
            if (zoom === true) {
                cesiumWidget.flyTo(geoData);
            } else {
                $('.cesium-home-button').trigger('click');
            }
        }
        loaded(layerId);
    }, function (error) {
        loadError(layerId, geoDataSrc, error);
    });
}

function loadKml(layerId, geoDataSrc, proxy, zoom, markerImg, markerScale, markerLabel, markerMod) {
    if (proxy) {
        new Cesium.KmlDataSource.load(geoDataSrc, {
            proxy: {
                getURL: function (geoDataSrc) {
                    return proxyURL + encodeURIComponent(geoDataSrc);
                }
            },
            sourceUri: geoDataSrc
        }).then(function (geoData) {
            if (markerMod) modMarkers(geoData, markerImg, markerScale, markerLabel);
            //if (layerId.indexOf("mrm-") >= 0) modMRM(geoData);

            cesiumWidget.dataSources.add(geoData); // add to map
            activeLayers[layerId] = geoData; // store for removal
            /* if (zoom) {
             if (zoom === true) {
             cesiumWidget.flyTo(geoData);
             } else {
             $('.cesium-home-button').trigger('click');
             }
             } */
            loaded(layerId);
        }, function (error) {
            loadError(layerId, geoDataSrc, error);
        }); // end then
    } else {
        new Cesium.KmlDataSource.load(geoDataSrc).then(function (geoData) {
            if (markerMod) {
                modMarkers(geoData, markerImg, markerScale, markerLabel);
            } // end markerMod
            cesiumWidget.dataSources.add(geoData);
            activeLayers[layerId] = geoData;
            /* if (zoom) {
             if (zoom === true) {
             cesiumWidget.flyTo(geoData);
             } else {
             $('.cesium-home-button').trigger('click');
             }
             } */
            loaded(layerId);
        }, function (error) {
            loadError(layerId, geoDataSrc, error);
        }); // end then
    } // end proxy
}

// REMOVE IMAGERY LAYERS (WMS, WMTS)
function removeImagery(layerId) {
    var src = activeLayers[layerId];
    delete activeLayers[layerId];
    cesiumWidget.imageryLayers.remove(src, false);
}

// REMOVE LAYERS
function disableLayer(l) {

    var layerId = l.I;
    var mlt = l.T;

    if (layerEnabled[l.I] === undefined) return;

    // Update Globe
    if (mlt === ("nasa-gibs") || mlt === ("cartodb-layer") || mlt === ("wmts") || mlt === ("wms") || mlt === ("base-layer") || mlt === ("arcgis-layer") || mlt === ("arcgis-base-layer") || mlt === ("bing")) {
        removeImagery(layerId);
        $('.' + layerId + '-sliders').remove();
    } else {
        var src = activeLayers[layerId];
        delete activeLayers[layerId];
        cesiumWidget.dataSources.remove(src);
    }
    if (mlt === ("geojson") || mlt === ("kml")) {
        $('.' + layerId + '-tree').removeClass('active');
        $('.' + layerId + '-list').remove();
    }
    delete layerEnabled[layerId];
}

// LOAD LAYERS
function updateLayer(layerId, includeOnly) {
    loading(layerId);
    var l = me.node(layerId);
    if (!l) {
        console.error('missing layer', layerId);
        //return false;
    }
    var geoDataSrc = l.G,
        geoLayers = l.L,
        //source = l.S,
        //height = l.HT,
        //width = l.W,
        markerMod = l.M,
        markerImg = l.MI,
        markerScale = l.MS,
        markerLabel = l.ML,
        timeline = l.C,
        noList = l.Y,
        format = l.F,
        zoomLevel = l.Fz,
        proxy = l.P,
        noFeatures = l.X,
        zoom;
    var selectedDate = picker.get('select', 'yyyy-mm-dd');

    if (!includeOnly) zoom = l.Z;

    if (geoLayers) {
        geoLayers = geoLayers;
    } else {
        geoLayers = "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,";
    }


    if (zoomLevel) {
        zoomLevel = zoomLevel;
    } else {
        zoomLevel = "9";
    }

    if (format === "jpg") {
        format = "image/jpeg";
    } else {
        format = "image/png";
    }

    if (noList) {
        noList = true;
    } else {
        noList = false;
    }

    if (layerEnabled[layerId] === undefined) {
        //put it in a temporary state to disallow loading while loading
        layerEnabled[layerId] = false;
        // Load layers by Type
        if (l.T === ("wms")) {
            loadWms(layerId, geoDataSrc, geoLayers, noFeatures);
        } else if (l.T === ("nasa-gibs")) {
            loadGIBS(layerId, selectedDate, format, zoomLevel);
        } else if (l.T === ("wmts")) {
            loadWmts(layerId, geoDataSrc, geoLayers);
        } else if (l.T === ("cartodb-layer")) {
            loadCartoDB(layerId, geoDataSrc);
        } else if (l.T === ("base-layer")) {
            loadOsmLayer(layerId, geoDataSrc);
        } else if (l.T === ("arcgis-layer") || l.T === ("arcgis-base-layer")) {
            loadArcGisLayer(layerId, geoDataSrc, geoLayers, noFeatures, format);
        } else if (l.T === ("geojson")) {
            loadGeoJson(layerId, geoDataSrc, markerLabel, markerScale, markerImg, zoom, noList);
        } else if (l.T === ('kml')) {
            loadKml(layerId, geoDataSrc, proxy, zoom, markerImg, markerScale, markerLabel, markerMod);
        } else if (l.T === ('bing')) {
            loadBingLayer(layerId, geoDataSrc);
        } else {
            console.log(layerId + ' failed to load map type: ' + l.T);
        }
        if (timeline) toggleTimeline(true);
    }
}

function newFolderLabel(l, child, ic) {
    var icon;
    if (ic) {
        icon = '<i class="fa fa-fw ' + ic + '"></i>';
    } else {
        icon = '';
    }
    var menuToggle = $('<h2>').addClass('toggle').html(icon + l.N).click(function () {
        if (child.is(':visible')) {
            child.hide();
            menuToggle.removeClass('active');
        } else {
            child.show();
            menuToggle.addClass('active');
        }
    });
    return menuToggle;
}

function initDetails(layerId, layerType, details, source, sourceUrl, geoDataSrc) {
    var list = $('<div class="details ' + layerId + '-content" />').appendTo(details);
    $('<div class="header"><i class="fa fa-fw fa-info-circle"></i> Layer Details</div><span>' + source + ' &bull; <a href="' + sourceUrl + '" target="_blank" rel="nofollow">More Info</a></span>').appendTo(list);
    if (layerType == ('kml')) {
        $('<div class="header"><i class="fa fa-fw fa-download"></i> Data Source</div><span>Keyhole Markup Language (KML) &bull; <a href="' + geoDataSrc + '">Download</a></span>').appendTo(list);
    }
    if (layerType == ('geojson')) {
        $('<div class="header"><i class="fa fa-fw fa-download"></i> Data Source</div><span>GeoJSON &bull; <a href="' + geoDataSrc + '">Download</a></span>').appendTo(list);
    }
    if (layerType == ('nasa-gibs')) {
        $('<div class="header"><i class="fa fa-fw fa-file-o"></i> Data Source</div><span>Web Map Tile Service (WMTS)</span>').appendTo(list);
    }
    if (layerType == ('wms')) {
        $('<div class="header"><i class="fa fa-fw fa-file-o"></i> Data Source</div><span>Web Mapping Service (WMS)<br><a target="_blank" rel="nofollow" href="' + geoDataSrc + '?request=GetCapabilities&service=WMS">Get Capabilities</a></span>').appendTo(list);
    }
    if (layerType == ('base-layer')) {
        $('<div class="header"><i class="fa fa-fw fa-file-o"></i> Data Source</div><span>OpenStreetMap (OSM) Base Map</span>').appendTo(list);
    }
    if (layerType == ('arcgis-layer') || layerType == ('arcgis-base-layer')) {
        $('<div class="header"><i class="fa fa-fw fa-file-o"></i> Data Source</div><span>ArcGIS MapServer<br><a target="_blank" rel="nofollow" href="' + geoDataSrc + '/legend">Map Legend</a> &bull; <a target="_blank" rel="nofollow" href="' + geoDataSrc + '">MapServer Information</a></span>>').appendTo(list);
    }

}

$('#active-layers-toggle').toggle(
    function () {
        $('.lbw.active').each(function () {
            var layerId = $(this).prop('id');
            $('<span id="' + layerId + '-holder" style="display: none;" />').insertAfter($(this));
            $(this).detach().appendTo('#active-layers');
        });
        $(this).html('<i class="fa fa-2x fa-eye-slash"></i> All');
        if (isEmpty($('#active-layers'))) {
            $('#active-layers').html('<div class="cv-learn"><h3><i style="color:#F00" class="fa fa-fw fa-exclamation-triangle"></i> NO ACTIVE LAYERS SELECTED</h3><p style="text-align:left;">Try turning on a map layer by clicking the <i class="fa fa-fw fa-play"></i> icon.</p></div>');
        }
        $('.active-layers-label').show();
        $('#active-layers').show();
        $('.all-layers-label').hide();
        $('#map-layers').hide();
    },
    function () {
        $('#active-layers .lbw.active').each(function () {
            var layerId = $(this).prop('id');
            $(this).detach().insertBefore($('#' + layerId + '-holder'));
            $('#' + layerId + '-holder').remove();
        });
        $('#active-layers').html('');
        $(this).html('<i class="fa fa-2x fa-eye"></i> Active');
        $('.active-layers-label').hide();
        $('#active-layers').hide();
        $('.all-layers-label').show();
        $('#map-layers').show();
    }
);

//TIME PICKER REMOVE ME SOON

// DATE PICKER
var date = new Date();
date.setDate(date.getDate() - 1);
var yesterday = Cesium.JulianDate.fromDate(date);
var startdate = Cesium.JulianDate.toDate(yesterday);

var $input = $('#datepicker').pickadate({
    format: 'mmmm d, yyyy',
    formatSubmit: 'yyyy-mm-dd',
    min: [2002, 6, 1],
    max: Cesium.JulianDate.now(),
    container: '#datepicker-container',
    // editable: true,
    closeOnSelect: true,
    closeOnClear: false,
    selectYears: true,
    selectMonths: true
});

var picker = $input.pickadate('picker');
picker.set('select', startdate);
picker.on({
    set: function () {
        var selectedDate = picker.get('select', 'yyyy-mm-dd');
        //console.log(selectedDate);
        $('.nasa-gibs.active').each(function () {
            loadGIBS($(this).attr('id'), selectedDate, $(this).attr('data-format'), $(this).attr('data-zoom'));
        });
    }
});
var start = picker.get('select', 'yyyy-mm-dd');

// SET PICKER DATE WHEN YOU SLIDE TIMELINE
var previousTime = null;
var isoDate = function (isoDateTime) {
    return isoDateTime.split("T")[0];
};
var isoDateTime = clock.currentTime.toString();
var time = "TIME=" + isoDate(isoDateTime);
var onClockUpdate = _.throttle(function () {
    isoDateTime = clock.currentTime.toString();
    time = isoDate(isoDateTime);
    if (time !== previousTime) {
        previousTime = time;
        picker.set('select', time, {
            format: 'yyyy-mm-dd'
        });
    }
}, 250, {
    leading: true,
    trailing: true
});

cesiumWidget.clock.onTick.addEventListener(onClockUpdate);
onClockUpdate();