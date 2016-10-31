//DEPENDS Statens_Kartverk

function CreateMap(mapDivId, layers, controls, renderer, view) {
    var map = new ol.Map({
        controls: controls,
        layers: layers,
        renderer: renderer,
        target: mapDivId,
        view: view
    });
    return map;
}

function CreateDefaultMap(mapDivId, layers, controls, renderer) {
    var map = new ol.Map({
        controls: controls,
        layers: layers,
        renderer: renderer,
        target: mapDivId,
        view: CreateEsushiDefaultView()
    });
    return map;
}

function CreateEmptyOpenlayersGroup(title) {
    return new ol.layer.Group({
        title: title,
        layers: [
        ]
    });
}

function CreateDefaultLayerGroups() {
    var tileLayerWMTS = statensKartverk.CreateTileLayerWTMSFromSource(statensKartverk.CreateSourceWmts("sjo_hovedkart2"), "base", "Norges grunnkart");
    return new ol.layer.Group({
        title: 'Grunnkart',
        layers: [
            new ol.layer.Tile({
                title: 'Satelitt',
                type: 'base',
                source: new ol.source.BingMaps({
                    key: bingKey,
                    imagerySet: "Aerial"
                    // use maxZoom 19 to see stretched tiles instead of the BingMaps
                    // "no photos at this zoom level" tiles
                    // maxZoom: 19
                })
            }),
            tileLayerWMTS,
            new ol.layer.Tile({ title: "OSM", type: "base", source: new ol.source.OSM() })
        ]
    });
}

function CreateDefaultView() {
    return new ol.View({
        center: ol.proj.transform([20, 70], 'EPSG:4326', 'EPSG:3857'),
        zoom: 6
    });
}

function CreateEsushiDefaultView() {
    return new ol.View({
        center: ol.proj.transform([20, 70], 'EPSG:4326', 'EPSG:3857'),
        zoom: 6
    });
}

function createLegend(colorScale, maximumValue) {
    var x = d3.scale.linear()
        .domain([0, 100000])
        .range([0, 340]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickSize(14)
        .tickValues(colorScale.domain());

    var svg = d3.select('svg.legend');

    svg.selectAll('rect')
        .data(colorScale.range().map(function (color) {
            var d = colorScale.invertExtent(color);
            if (d[0] == null) d[0] = x.domain()[0];
            if (d[1] == null) d[1] = x.domain()[1];
            return d;
        }))
        .enter().append('rect')
        .attr('height', 10)
        .attr("x", function (d) { return x(d[0]); })
        .attr('width', function (d) {
            return x(d[1]) - x(d[0]);
        })
        .style('fill', function (d) { return colorScale(d[0]); });

    svg.call(xAxis);
}

function createDefaultControls() {
    return ol.control.defaults().extend([
        new ol.control.FullScreen(),
        new ol.control.Attribution(),
        new ol.control.Zoom()
    ]);
}

function CreateVectorLayerFromGeojson(geojson) {
    return new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(geojson),
        attributions: [new ol.Attribution({
            html: '<a href="http://esushi.no/">eSushi</a>'
        })]
    });
}



function pointInPolygon(point, vs) {
    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        // ReSharper disable once CoercedEqualsUsing Raycasting should have the != in this particular case
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

var numberFormat = function (n) { // Thousand seperator
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};