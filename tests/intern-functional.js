// Learn more about configuring this file at <https://github.com/theintern/intern/wiki/Configuring-Intern>.
// These default settings work OK for most people. The options that *must* be changed below are the
// packages, suites, excludeInstrumentation, and (if you want functional tests) functionalSuites.
define({
	// The port on which the instrumenting proxy will listen
	proxyPort: 9000,

	// A fully qualified URL to the Intern proxy
	proxyUrl: 'http://localhost:9000/',

	// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
	// specified browser environments in the `environments` array below as well. See
	// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
	// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
	// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
	// automatically
  capabilities: {
    'selenium-version': '2.39.0',
    'idle-timeout': 30
  },

  // Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
  // OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
  // capabilities options specified for an environment will be copied as-is
  environments: [
    { browserName: 'firefox' },
    { browserName: 'safari' },
    { browserName: 'chrome' }
  ],

	// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
	maxConcurrency: 3,

	// Whether or not to start Sauce Connect before running tests
	useSauceConnect: false,

	// Connection information for the remote WebDriver service. If using Sauce Labs, keep your username and password
	// in the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables unless you are sure you will NEVER be
	// publishing this configuration file somewhere
	webdriver: {
		host: 'localhost',
		port: 4444
	},

	// The desired AMD loader to use when running unit tests (client.html/client.js). Omit to use the default Dojo
	// loader
  
  // NOTE: this doesn't work for functional tests
  // if it did, we could use intern.js to run functional tests

	// useLoader: {
	// 	'host-node': 'http://js.arcgis.com/3.9/',
	// 	'host-browser': 'http://js.arcgis.com/3.9/'
	// },

	// Configuration options for the module loader; any AMD configuration options supported by the specified AMD loader
	// can be used here
	// loader: {
	// 	// Packages that should be registered with the loader in each testing environment
	// 	packages: [{
	// 	  name: 'tests',
	// 	  location: 'tests'
	// 	}, {
	// 	  name: 'extras',
	// 	  location: 'extras'
	// 	}, {
	// 	  name: 'esri',
	// 	  location: 'http://js.arcgis.com/3.9/js/esri'
	// 	}, {
	// 	  name: 'dojo',
	// 	  location: 'http://js.arcgis.com/3.9/js/dojo/dojo'
	// 	}, {
	// 	  name: 'dojox',
	// 	  location: 'http://js.arcgis.com/3.9/js/dojo/dojox'
	// 	}, {
	// 	  name: 'dijit',
	// 	  location: 'http://js.arcgis.com/3.9/js/dojo/dijit'
	// 	}]
	// },

	// Non-functional test suite(s) to run in each browser
  // NOTE: this will not work w/o using esri loader above
	suites: [ /*'tests/image'*/ ],

	// Functional test suite(s) to run in each browser once non-functional tests are completed
	functionalSuites: [ 'tests/functional/image' ],

	// A regular expression matching URLs to files that should not be included in code coverage analysis
	excludeInstrumentation: /^(?:tests|node_modules)\//
});
