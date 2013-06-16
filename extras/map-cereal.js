// Take an instance of esri/Map and create a JSON string that can be 
// pushed to arcgis.com and stored as an item
//
// Public docs...go read all of it:
// http://resources.arcgis.com/en/help/arcgis-web-map-json/#/Web_map_format_overview/02qt00000007000000/
// 
// Web maps with various layers types:
// http://resources.arcgis.com/en/help/arcgis-web-map-json/#/Single_basemap_layer/02qt00000016000000/
//
// Key properties of webmap json are baseMap and an operationalLayers.
//
// baseMap is an object, operationalLayers is an array.
//
// baseMap has a property called basemapLayers which is an array.
// basemapLayers are tiled services and are optionally reference layers.
// Reference layers sit on top of other non-vector layers.
// 
// Each object in operationalLayers represents a layer on to of the basemap.
// Vector features are supported as feature collecitons
// Dynamic (ArcGISDynamicMapServiceLayer) as well as WMS and Image Service 
// layers
//
// This class knows how to serialize the following layer types:
// –ArcGISTiledMapServiceLayer
// –WebTiledLayer
// –FeatureLayer (created from URL, no support for feature layers from feature collections yet)
// –GraphicsLayer (partial, no support for info templates or renderers)
//
// Need to support the following:
// –ArcGISDynamicMapServiceLayer
// –ArcGISImageServiceLayer
// –GeoRSSLayer
// –KMLLayer
// –MapImageLayer
// –WMSLayer
// –WMTSLayer
// –CSV's?

// –layer defs on feature layer
// –custom renderers

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/connect",
  "dojo/Deferred",
  "dojo/json",

  "esri/map",
  "./feature-collection-shell"
], function(
  declare, lang, arrayUtils, connect, Deferred, JSON,
  Map, FeatureCollectionShell
) {
  var Cereal = declare(null, {

    loaded: false,
    loadEvents: {},
    loadedWaiting: 0, 
    map: null, 
    version: null, 

    constructor: function(options) {
      if ( !options.map || !options.map instanceof Map ) {
        console.log("cereal::a map is required, none provided.");
        return;
      }
      // console.log("cereal ctor:  ", options);
      this.map = options.map;

      // current web map version is 1.8 so default to that
      // http://mediawikidev.esri.com/index.php/ArcGIS.com/home#ArcGIS_Web_Map_Specification
      this.version = "1.8";

      this._checkLoaded();
    },

    // fired when the map and all of its layers have loaded
    // should be done using evented (on and emit) but...I don't know how
    load: function() {
      this.loaded = true;
    },

    // main method to call
    // returns a deferred which is resolved once map and all layers are loaded
    //
    // Maybe this should return an object and it should be up to the app to 
    // stringify? That's how toJson methods currently work in the JS API
    toJSON: function() {
      var def = new Deferred();
      if ( !this.loaded ) {
        var c = connect.connect(this, "load", lang.hitch(this, function() {
          console.log("map-cereal::on load fired");
          connect.disconnect(c);
          def.resolve(this._toJSON())
        }));
      } else {
        def.resolve(this._toJSON());
      }
      return def;
    },

    _toJSON: function() {
      var mapJSON = this._serialize();
      return JSON.stringify(mapJSON);
    },

    // bunch of helper methods
    _serialize: function() {
      var m = {};
      m.baseMap = this._serializeBase();
      m.operationalLayers = this._serializeOperataional();
      m.version = this.version;

      return m;
    },

    _serializeOperataional: function() {
      // currently only supports graphics and feature 
      // layers explicitly added to the map
      //
      // TODO:  support graphics layer renderer and info templates
      // TODO:  serialize graphics stored in map.graphics
      // TODO:  support dynamic map service layers
      // TODO:  support image service layers
      // TODO:  support kml and georss layers
      var opLayers = [];

      arrayUtils.forEach(this.map.graphicsLayerIds, function(gid) {
        var layer = this.map.getLayer(gid);
        if ( layer.declaredClass === "esri.layers.GraphicsLayer") {
          // console.log("cereal::graphics layer", layer.declaredClass);
          opLayers.push(this._serializeGraphics(layer));
        }
        if ( layer.declaredClass === "esri.layers.FeatureLayer") {
          // console.log("cereal::feature layer", layer, layer.loaded);
          opLayers.push(this._serializeFeatures(layer));
        }
      }, this);
      
      return opLayers;
    },

    // find the basemap, generate JSON
    _serializeBase: function() {
      var baseMap = {};
      baseMap.baseMapLayers = [];

      // check for basemap specified via map.options.basemap
      if ( this.map._basemap ) {
        arrayUtils.forEach(this.map.basemapLayerIds, function(bid) {
          var layer = this.map.getLayer(bid);
          var layerObj = this._serializeTiled(layer);
          baseMap.baseMapLayers.push(layerObj);
        }, this);
        baseMap.title = this.map._basemap;
        return baseMap;
      }

      // no basemap via map.options.basemap
      // look for a visible tiled layer(s)
      var vb = arrayUtils.filter(this.map.layerIds, function(lid) {
        var layer = this.map.getLayer(lid);
        return ( layer.declaredClass === "esri.layers.ArcGISTiledMapServiceLayer" ||
          layer.declaredClass === "esri.layers.WebTiledLayer" ) && 
          layer.visible;
      }, this);
      if ( vb.length ) {
        // use the last visible tiled layer as it is on top
        var layer = this.map.getLayer(vb[vb.length - 1]);
        layerObj = this._serializeTiled(layer);
        if ( layer.declaredClass === "esri.layers.WebTiledLayer" ) {
          layerObj = this._serializeWebTiled(layer, layerObj) 
        }
        baseMap.baseMapLayers.push(layerObj);
        // baseMap.title = layer.name || layer.id;
        return baseMap;
      }
      console.log("cereal::didn't find a basemap");
      return baseMap;
    },

    // turn graphics layer into a feature collection
    // return JSON for the feature collection
    _serializeGraphics: function(layer) {
      // console.log("graphics", layer);
      // have to turn this into a feature collection...
      var fc = lang.clone(FeatureCollectionShell);
      // get references to each point, line and polygon feature collection
      // use an object so that graphic.geometry.type can be used to reference the 
      // proper feature layer in the feature collection
      var geoms = {
        point: null,
        polyline: null,
        polygon: null
      };
      // TODO:  support renderers on graphics layers
      // currently the code below creates a unique value renderer and
      // adds a symbol for each object id...works, but causes duplication
      // of symbol defs
      arrayUtils.forEach(fc.featureCollection.layers, function(l) {
        if ( l.layerDefinition.geometryType === "esriGeometryPolygon" ) {
          geoms.polygon = l;
        }
        if ( l.layerDefinition.geometryType === "esriGeometryPolyline" ) {
          geoms.polyline = l;
        }
        if ( l.layerDefinition.geometryType === "esriGeometryPoint" ) {
          geoms.point = l;
        }
        // handle info template
        // note that only looking for info template at the layer level, 
        // info template on individual graphics are ignored
        if ( layer.infoTemplate ) {
          l.popupInfo.title = layer.infoTemplate.title.replace(/\$/g, "");
          l.popupInfo.description = layer.infoTemplate.content.replace(/\$/g, "");
          console.log("set layer info template", layer.infoTemplate, l.popupInfo);
        }
        l.nextObjectId = layer.graphics.length;
      });

      // loop through graphics, serialize geometry, attributes and symbols
      arrayUtils.forEach(layer.graphics, function(g, idx) {
        var gObj = g.toJson();
        // check for attributes, popuplate OBJECTID, at minimum
        // TODO:  don't hard code "OBJECTID" as the object id field name
        if ( !gObj.hasOwnProperty("attributes") ) {
          gObj.attributes = { OBJECTID: idx };
        }
        // add OBJECTID if it doesn't already exist in the graphic's attributes
        if ( !gObj.attributes.hasOwnProperty("OBJECTID") ) {
          gObj.attributes.OBJECTID = idx;
        }
        // add the geometry and attributes to the proper feature collection
        geoms[g.geometry.type].featureSet.features.push({
          attributes: gObj.attributes,
          geometry: gObj.geometry
        });
        // add a symbol def for to the renderer
        geoms[g.geometry.type].layerDefinition.drawingInfo.renderer.uniqueValueInfos.push({
          symbol: gObj.symbol,
          description: "",
          value: "" + gObj.attributes.OBJECTID,
          label: ""
        });
      });
      
      // add field definitions
      if ( geoms.point && geoms.point.featureSet.features.length ) {
        var fields = geoms.point.featureSet.features[0].attributes;
        geoms.point.layerDefinition.fields = this._serializeFieldsDefs(fields);
      }
      if ( geoms.polyline && geoms.polyline.featureSet.features.length ) {
        var fields = geoms.polyline.featureSet.features[0].attributes;
        geoms.polyline.layerDefinition.fields = this._serializeFieldsDefs(fields);
      }
      if ( geoms.polygon && geoms.polygon.featureSet.features.length ) {
        var fields = geoms.polygon.featureSet.features[0].attributes;
        geoms.polygon.layerDefinition.fields = this._serializeFieldsDefs(fields);
      }

      // update feature collection id and title
      fc.id = layer.id;
      fc.title = layer.name || layer.id;
      // console.log("fc ", fc);
      // TODO:  handle info templates, which means update popupInfo for each 
      // feature layer
      return fc;
    },

    // always returns editable: false for all fields
    _serializeFieldsDefs: function(fields) {
      // generate array of field defintions
      // structure:
      // {
      //   "alias": "<string>",
      //   "name": "<string>",
      //   "type": "<string>", 
      //   "editable": false
      // }
      // supported values for type: esriFieldTypeOID, esriFieldTypeString, 
      // esriFieldTypeInteger, esriFieldTypeDouble, esriFieldTypeDate
      // editable is a boolean
      var fieldObjects = [];
      var fieldStructure = {
        "alias": null,
        "name": null,
        "type": null,
        "editable": false
      };
      for ( field in fields ) {
        var f = lang.clone(fieldStructure);
        // set name and alias to the name of the attribute
        f.alias = f.name = field;
        var v = fields[field];
        // figure out the type
        var t = Object.prototype.toString.call(v);
        // hard coded for "objectid" to be objectid field...
        // brittle ... need another solution
        if ( field.toLowerCase() === "objectid" ) {
          f.type = "esriFieldTypeOID";
        } else if ( t === "[object String]" ) {
          f.type = "esriFieldTypeString";
        } else if ( t === "[object Number]") {
          if ( v % 1 === 0 ) {
            f.type = "esriFieldTypeInteger";
          } else {
            f.type = "esriFieldTypeDouble";
          }
        } else if ( t === "[object Date]" ) {
          f.type = "esriFieldTypeDate";
        }
        fieldObjects.push(f);
      }
      console.log("serialized field objects", fieldObjects);
      return fieldObjects;
    },

    // return JSON for a feature layer
    _serializeFeatures: function(layer) {
      // TODO:  support feature collections
      // TODO:  support popupInfo
      //
      // mode is snapshot, on demand or selection
      // corresponding integers are 0, 1, 2, repsectively
      return {
        id: layer.id,
        mode: layer.mode, 
        opacity: layer.opacity,
        title: layer.name || layer.id,
        url: layer.url,
        visibility: layer.visible,
      }
    },

    // return JSON for an ArcGISTiledMapServiceLayer
    _serializeTiled: function(layer) {
      var tiled = {
        id: layer.id,
        opacity: layer.opacity,
        visibility: layer.visible,
        url: layer.url
      };
      if ( layer._isRefLayer ) {
        tiled.isReference = true;
      }
      return tiled;
    },

    // web tiled layers require more info than ArcGISTiledMapServiceLayers
    _serializeWebTiled: function(layer, layerObj) {
      layerObj.copyright = layer.copyright;
      layerObj.subDomains = layer.subDomains;
      layerObj.templateUrl = layer.urlTemplate;
      layerObj.type = "WebTiledLayer";
      layerObj.title = layer.id;
      delete layerObj.url;
      return layerObj;
    },

    // Couple of methods to check/manage whether or not the map
    // and all of its layers are loaded (loaded means map.graphics and layer 
    // metadata are available). It's extra work here but this simplifies 
    // usage in an app since the developer doesn't need to manage onload
    // events before hooking up an instance of this class...just new it up,
    // pass a map and you're good.
    _checkLoaded: function() {
      if ( !this.map.loaded ) {
        this.loadEvents.map = this.map.on("load", lang.hitch(this, function() {
          this.loadEvents.map.remove();
          delete this.loadEvents.map;
          this._decrementWaitCount();
        }));
        this._incrementWaitCount();
      }

      // build a list of all layer ids
      var layerIds = [];
      if ( this.map.basemapLayerIds ) {
        layerIds = layerIds.concat(this.map.basemapLayerIds);
      }
      // map.basemapLayerIds and map.layerIds can contain the same IDs
      // no need to duplicate those
      arrayUtils.forEach(this.map.layerIds, function(id) {
        if ( arrayUtils.indexOf(layerIds, id) === -1 ) {
          layerIds.push(id);
        }
      }, this);
      layerIds = layerIds.concat(this.map.graphicsLayerIds);
      //  console.log("cereal::layerIds", layerIds);
      
      // loop through all layers, check if they're loaded
      arrayUtils.forEach(layerIds, function(id) {
        var layer = this.map.getLayer(id);
        if ( !layer.loaded ) {
          this.loadEvents[id] = layer.on("load", lang.hitch(this, function() {
            this.loadEvents[id].remove();
            delete this.loadEvents[id];
            this._decrementWaitCount();
          }));
          this._incrementWaitCount();
        }
      }, this);

      // on the off chance that everything is already loaded, fire load
      if ( this.loadedWaiting === 0 ) {
        this.load();
      }
    },

    _decrementWaitCount: function() {
      this.loadedWaiting = this.loadedWaiting - 1;
      if ( this.loadedWaiting === 0 ) {
        this.load();
      }
    },

    _incrementWaitCount: function() {
      this.loadedWaiting = this.loadedWaiting + 1;
    }

  });

  return Cereal;
});