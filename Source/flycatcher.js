#! /usr/bin/env node --harmony_proxies

var dump = require('./lib/utils.js').dump;
var analyser = require('./lib/analyser.js');
var randomTest = require('./lib/randomTest.js');
var Executor = require('./lib/executor.js').Executor;

var fs = require('fs');
var vm = require('vm');
var cmd = require('commander');

cmd
.version('1.0')
.usage('[options] <file path> <class name>')
.option('-m, --method <name>', 'generate tests for a specific method')
.option('-c, --coverage_max <num>', 'maximum coverage %', Number, 100)
.parse(process.argv);

if (cmd.args.length !== 2) {
    console.info(cmd.helpInformation());
    process.exit(1);
}

var filePath = cmd.args[0];
var className = cmd.args[1];

try {
    var src = fs.readFileSync(filePath, 'utf8');
}
 catch(error) {
    console.error(error.toString());
    console.info(cmd.helpInformation());
    process.exit(1);
}

var classContext = {};
classContext.log = console.log;
try {
    vm.runInNewContext(src, classContext);
}
 catch(err) {
    console.error("Error while parsing source <" + filePath + ">");
    console.error(err.toString());
    process.exit(1);
}

// method under test has been specified
var method = cmd.method;
var maxCoverage = cmd.coverage_max;
if (method) {
    var classes = analyser.getClasses(cmd, classContext, className, method);
    var exec = new Executor(src, classes, className);
    process.stdout.write("Generating tests for at least ");
    process.stdout.write(maxCoverage + "\% coverage of ");
    process.stdout.write("method <" + method + "> from class <");
    process.stdout.write(className + "> :   ");
    var goodTests = [];
    var count = 0;
    while (exec.getCoverage() < maxCoverage && count++<3) {
        var test = randomTest.generate(classes, className);
        exec.setTest(test);
        exec.showTest(test);
        var testRun = exec.run();
        if (testRun.achievedCoverage && !test.hasUnknowns()) {
            goodTests.push(test.toUnitTestFormat(testRun.result,++count));
        }
    }
    var fileName = "Flycatcher_" + className + "_" + method + ".js";
    process.stdout.write(" (" + testRun.coverage + "\%)\nGeneration succesful.\n");
    process.stdout.write("Tests can be found in " + fileName + "\n\n");

    fs.writeFileSync(fileName,generateContent(src,className,method,goodTests));
}
 else {
    // by default generates tests for all of a class' methods
}

function generateContent(src,className,method,tests) {
    var header = "/*****************************************\n\n";
    header += "                  FLYCATCHER\n";
    header += "        AUTOMATIC UNIT TEST GENERATION\n";
    header += "        ------------------------------\n\n";
    header += "            CLASS: " + className + "\n";
    header += "            METHOD: " + method + "\n\n";
    header += "*******************************************/\n\n"
    header += "var assert = require('assert');\n\n";
    var success = "console.log(\"Unit test suite completed with success!\")";
    var content = header + src +"\n\ntry {\n\n" + tests.join('\n\n') + "\n\n"+ success; 
    content += "\n}\ncatch(err) {\n    console.log(err.name,err.message)\n}";
    return content;
}
