cereal
======

Attempt at creating classes to serialize and write a JS API map to arcgis.com.

extras/map-cereal.js:  toJson method returns a JSON object with baseMap and operationalLayers properties. Currently, only feature layers created from a map service or feature service layer are supported. Support for additional layer types is...coming...soon. Maybe. 

extras/map-writer.js:  simple class to create an item in arcgis.com from a web map JSON. 

Main demo page is usa-hybrid-persist.html. Tested in Chrome. Doubtful that this works in IE as it relies on CORS to do a cross-domain POST to arcgis.com.
