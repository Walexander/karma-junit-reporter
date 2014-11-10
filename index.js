var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');


var JUnitReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.junit');
  var reporterConfig = config.junitReporter || {};
  var pkgName = reporterConfig.suite || '';
  var outputFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile
      || 'test-results.xml'));

  var xml;
  var suites;
  var browsers = [];
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};
  var allMessages = [];

  baseReporterDecorator(this);

  this.adapters = [function(msg) {
    allMessages.push(msg);
  }];

  var initliazeXmlForBrowser = function(browser) {
	  browsers.push( browser.name )
  };

  this.onRunStart = function(browsers) {
    suites = Object.create(null);
    xml = builder.create('testsuites');
  };

  this.onBrowserStart = function(browser) {
    //initliazeXmlForBrowser(browser);
  };

  this.onBrowserComplete = function(browser) {
    /*
	 * var suite = suites[browser.id];
    suite.att('tests', result.total);
    suite.att('errors', result.disconnected || result.error ? 1 : 0);
    suite.att('failures', result.failed);
    suite.att('time', (result.netTime || 0) / 1000);

    suite.ele('system-out').dat(allMessages.join() + '\n');
    suite.ele('system-err');
	*/
  };

  this.onRunComplete = function() {
    var xmlToOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function(err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message);
        } else {
          log.debug('JUnit results written to "%s".', outputFile);
        }

        if (!--pendingFileWritings) {
          fileWritingFinished();
        }
      });
    });

    suites = xml = null;
    allMessages.length = 0;
  };

  this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
	var testName = result.suite.join(' ').replace(/\//g, '.')
	var browserName = browser.name.replace(/\..*$/g, '').toLowerCase()
	var package = testName.split(/[^\w]/)[0]
	suiteName = testName.replace(/[^a-zA-Z0-9\/\.].+$/, '')

	var suite = suites[suiteName] = suites[suiteName] || xml.ele('testsuite', {
		name: suiteName,
		package: package,
		timestamp: (new Date()).toISOString().substr(0,19),
		hostname: os.hostname(),
		id: 0,
		tests: 0,
		errors: 0,
		failures: 0
	})
	var total = suite.total || 0
	var errors = suite.errors || 0
	var failures = suite.failures | 0
	var spec = suite.ele('testcase', {
		name: testName + ': ' + result.description,
		time: ((result.time||0))/1000,
		classname: browserName
	})
	suite.att('tests', total++)
	suite.total = total

    if (result.skipped) {
      spec.ele('skipped');
    }


    if (!result.success) {
      result.log.forEach(function(err) {
        spec.ele('failure', {type: ''}, formatError(err));
      });
	  suite.att('failures', failures++)
	  suite.failures = failures
    }

  };

  // wait for writing all the xml files, before exiting
  this.onExit = function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  };
};

JUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:junit': ['type', JUnitReporter]
};
