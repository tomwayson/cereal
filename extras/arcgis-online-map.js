define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/json",
  "esri/arcgis/utils"
], function(declare, lang, arrayUtils, json, arcgisUtils) {
  // AgoMap is a class to interact with maps from arcgis.com.
  //
  // options:
  //   id:  identifier for item in arcgis.com to be used to create an esri/map
  //   elem:  DOM node where map will be created
  // 
  // TODO:  support other option supported by esri/arcgis/utils.createMap
  // contributing? follow these guidelines:
  // http://mediawikidev.esri.com/index.php/JSAPI/AppDevGuidelines

  var AgoMap = declare(null, {
    
    map: null,
    version: null,

    constructor: function(options) {
      // console.log("ctor of ago map, options:  ", options);
      this.options = lang.mixin(this, options);

      // current web map version is 1.8 so default to that
      // depending on the web map loaded, this could be changed in this._saveMapReference
      // http://mediawikidev.esri.com/index.php/ArcGIS.com/home#ArcGIS_Web_Map_Specification
      this.version = "1.8";

      // ensure methods called after a deferred is resolved have proper context
      // if hitch isn't used, this will be window instead of the instance of this class
      // alternatively could use the (ugly) var this = that; trick
      // yes, ugliness is subjective.
      this._error = lang.hitch(this, this._error);
      this._saveMapReference = lang.hitch(this, this._saveMapReference);

      if ( this.id && this.elem ) {
        // use createMap...no need to re-invent
        // http://developers.arcgis.com/en/javascript/jsapi/namespace_esri.arcgis.utils.html#createmap
        arcgisUtils.createMap(options.id, options.elem).then(this._saveMapReference, this._error);
      } else {
        console.log("brittle API...webmap ID and elem ID are required, dummy.");
      }
    },

    // this is the useful part...
    // take the map and serialize such that the JSON returned could be pushed up to arcgis.com
    // 
    // only support for a base map and operational layers
    // no support for widgets, tasks, tables, bookmarks or popups...yet!
    toJson: function() {
      var mapObject = this._createShell();
      mapObject.baseMap = this._createBaseMap();
      mapObject.operationalLayers = this._createOperationalLayers();

      console.log("stubby...", mapObject);
    },

    // bunch of helper methods
    _createShell: function() {
      var shell = {};
      shell.baseMap = {};
      shell.operationalLayers = [];
      shell.version = this.version;

      return shell;
    },

    _createOperataionalLayers: function() {
      var opLayers = [];
      
      return opLayers;
    },

    _createBaseMap: function() {
      var baseMap = {};
      baseMap.baseMapLayers = [];

      var baseLayers = arrayUtils.map(this.map.layerIds, function(lid) {
        return this.map.getLayer(lid).type === "base";
      });

      return baseMap;
    },

    _error: function(error) {
      console.log("_error::failed to get info from arcgis.com", error);
    },

    _saveMapReference: function(result) {
      // console.log("_saveMapReference:  ", result, result.map.loaded);
      if ( result.map ) {
        this.map = result.map;
        if ( result.itemInfo ) {
          this.version = result.itemInfo.itemData.version;
          // console.log("\tset version to:  ", result.itemInfo.itemData.version);
        }
      } else {
        console.log("_saveMapRefernce::no map!", result);
      }
    }

  });

  return AgoMap;
});