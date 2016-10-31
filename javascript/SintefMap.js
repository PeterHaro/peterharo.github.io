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