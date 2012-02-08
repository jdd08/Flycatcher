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
  .option('-c, --coverage_max <num>', 'maximum percentage for method coverage',Number,60)
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

var exec = executor();
exec.addSource(src);

// method under test has been specified
if (commander.method) {

    var mutName = commander.method;
    var classInfo = analyser.getClassInfo(commander,classContext,className,mutName);
    exec.setMUT(classInfo);

    //while(measureCoverage(coverageNodes) < commander.max_coverage) {
    var goodTestScenarios = []
    for(var i = 0; i<3; i++) {
        var test = randomTestGenerator.generate(classInfo);
        exec.setTest(test.toExecutorFormat());
        var res = exec.execute();
        if (res.good) {
            goodTestScenarios.push(test.toUnitTestFormat(res.result));
        }
    }

    var fileName = "Flycatcher_"+className+".js";
    fs.writeFileSync(fileName,goodTestScenarios.join('\n\n'));
}
else { // by default generates tests for all of a class' methods
    
}
