cereal
======

Attempt at creating classes to serialize and write a JS API map to arcgis.com.

extras/map-cereal.js:  toJSON method returns a JSON object with baseMap and operationalLayers properties. Currently, only feature layers created from a map service or feature service layer as well as graphics layers are supported. Support for additional layer types is...coming...soon. Maybe. 

extras/map-writer.js:  simple class to create an item in arcgis.com from a web map JSON. 

extras/feature-collection-shell.js:  JSON template for creating a feature collection from a graphics layer.

Demos: 
 - usa-hybrid-persist.html:  basemap specified via map.options.basemap and a feature layer from a layer in a map service on sampleserver6.arcgisonline.com/. 
 - watercolor-draw-persist.html:  basemap is a web tiled layer, draw toolbar can be used to add freehand polylines to the map, whatever is drawn on the map is persisted in the webmap stored in arcgis.com.

Tested in Chrome. No IE support as it relies on CORS to do a cross-domain POST to arcgis.com.
