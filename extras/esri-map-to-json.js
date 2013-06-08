// take an instance of esri/Map
// create a JSON object representing it that can be pushed to arcgis.com
//
// basemap: 
//   look for tiled layers that are visible
//   var visibleTiled = arrayUtils.filter(map.layerIds, function(lid) {
//     return (lid instanceof TiledLayer || WebTiledLayer) && lid.visible;
//   });
//   if more than one, use the last one as it is on top
// 
// operational layers:
//   ...look for dynamic, kml, georss, graphics, feature layers
//
// image service layer?