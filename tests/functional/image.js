define([
  'intern!object',
  'intern/chai!assert',
  'require'
], function (registerSuite, assert, require) {
  registerSuite({
    name: 'index',

    'image service': function () {
      return this.remote
        .get(require.toUrl('image.html'))
        .waitForCondition('loaded', 5000)
        .elementById('show')
          .clickElement()
          .end()
        .elementById('outputJson')
        .text()
        .then(function (text) {
          var webmap = JSON.parse(text),
            layerJson;
          assert.strictEqual(webmap.operationalLayers.length, 1, 'should have exactly 1 operational layer');
          layerJson = webmap.operationalLayers[0];
          assert.strictEqual(layerJson.url, 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Toronto/ImageServer', 'should have same url');
          assert.strictEqual(layerJson.opacity, 0.75);
        });
    }
  });
});