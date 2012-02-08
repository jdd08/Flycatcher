#!/usr/bin/env node --harmony_proxies

var dump = require('./lib/utils.js').dump;
var analyser = require('./lib/analyser.js');
var randomTestGenerator = require('./lib/randomTestGenerator.js');
var executor = require('./lib/executor.js');

var fs = require('fs');
var vm = require('vm');
var commander = require('commander');

commander
  .version('1.0')
  .usage('[options] <file path> <class name>')
  .option('-m, --method <name>', 'generate tests for a specific method of the given class')
  .parse(process.argv);

if (commander.args.length !== 2) {
    console.info(commander.helpInformation());
    process.exit(1);
}

var filePath = commander.args[0];
var className = commander.args[1];

try {
    var src = fs.readFileSync(filePath,'utf8');
}
catch (error) {
    console.error(error.toString());
    console.info(commander.helpInformation());
    process.exit(1);
}

var classContext = {};
vm.runInNewContext(src,classContext);

var classInfo = analyser.getClassInfo(commander,classContext,className);

var validTestCases = [];
for (var i=0; i<1; i++) {
    var exploratoryTestCase = randomTestGenerator.generate(classInfo);
    var res = executor.execute(exploratoryTestCase);
    validTestCases.push({t: exploratoryTestCase,r: res});
};

var fileName = "Flycatcher_"+classInfo.className+".js";
fs.writeFileSync(fileName,testScenarios);