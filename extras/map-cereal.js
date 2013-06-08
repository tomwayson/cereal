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
// public docs...go read all of it
// http://resources.arcgis.com/en/help/arcgis-web-map-json/#/Web_map_format_overview/02qt00000007000000/
// 
// web maps with various layers types:
// http://resources.arcgis.com/en/help/arcgis-web-map-json/#/Single_basemap_layer/02qt00000016000000/
//
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
    toJSON: function() {
      var def = new Deferred();
      if ( !this.loaded ) {
        var c = connect.connect(this, "load", lang.hitch(this, function() {
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
      // TODO:  support graphics layers
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
      // TODO:  when looping through layers, need to add appropriate info in 
      // layerDefinition.fields, currently only an object id field is included
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
      // update feature collection id and title
      fc.id = layer.id;
      fc.title = layer.name || layer.id;
      // console.log("fc ", fc);
      // TODO:  handle info templates, which means update popupInfo for each 
      // feature layer
      return fc;
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