#! /usr/bin/env node --harmony_proxies

var util = require('util');
var analyser = require('./lib/analyser.js');
var randomTest = require('./lib/randomTest.js');
var Executor = require('./lib/executor.js').Executor;

var fs = require('fs');
var vm = require('vm');
var _ = require('underscore');
var cmd = require('commander');

cmd
.version('1.0')
.usage('[options] <file path> <class name>')
.option('-m, --method <name>', 'generate tests for a specific method')
.option('-c, --coverage <num>', 'expected coverage %', Number, 100)
.parse(process.argv);

if (cmd.args.length !== 2) {
    console.info(cmd.helpInformation());
    process.exit(1);
}

var filePath = cmd.args[0];
// cut : class under test
var CUTname = cmd.args[1];

try {
    var src = fs.readFileSync(filePath, 'utf8');
}
 catch(error) {
    console.error(error.toString());
    console.info(cmd.helpInformation());
    process.exit(1);
}

// TODO remove log from the classContext and add options to specify the type
// of environment that the test programs should be run, adding the appropriate
// context objects
var classContext = {};
Object.defineProperty(classContext,"log", {get : function() {return console.log},
                                           enumerable : false});

try {
    vm.runInNewContext(src, classContext);
}
 catch(err) {
    console.error("Syntax error while parsing source <" + filePath + ">");
    console.log(err.stack);
    process.exit(1);
}

// mut: method under test
var MUTname = cmd.method;
var expectedCoverage = cmd.coverage;

var pgmInfo = analyser.getProgramInfo(cmd, classContext, CUTname);
var unitTests = [];
var CUTmethods = pgmInfo.getMethods(CUTname);

// specific method to test was specified
if (MUTname) {
    console.log("Unit tests for " + MUTname + "...");
    pgmInfo.setMUT(MUTname);
    _.filter(CUTmethods, function(m) {
        return m.name === MUTname;
    })[0].isMUT = true;
    generateTests(MUTname);
}
// otherwise generate tests for all of a class's methods
else {
    var prev = null;
    for (var m in CUTmethods) {
        if (prev) prev.isMUT = false;
        var method = CUTmethods[m]
        var MUTname = method.name;
        pgmInfo.setMUT(MUTname);
        method.isMUT = true;
        generateTests(MUTname);
        prev = method;
    }
}

var fileName = "./results/Flycatcher_" + CUTname + ".js";
process.stdout.write("\nTests can be found in " + fileName + "\n\n");
fs.writeFileSync(fileName,generateContent(src,CUTname,MUTname,unitTests));

function generateTests(MUTname) {
    var exec = new Executor(src, pgmInfo);
    process.stdout.write("Generating tests for at least ");
    process.stdout.write(expectedCoverage + "\% coverage of ");
    process.stdout.write("method <" + MUTname + "> from class <");
    process.stdout.write(CUTname + "> :   ");
    var count = 0;
    while (exec.getCoverage() < expectedCoverage) {
        try {
            var test = randomTest.generate(pgmInfo);
            exec.setTest(test);
            console.log();
            exec.showTest(test);
            // exec.showMUT();
            var testRun = exec.run();
            if (testRun.newCoverage && !test.hasUnknowns()) {
                unitTests.push(test.toUnitTestFormat(testRun.results,
                                                     testRun.error,
                                                     ++count));
            }
            // exec.showCoverage();
        }
        catch(err) {
            console.error(err.stack);
            process.exit(1);
        }
    }
    console.log("\nGeneration succesful.");
}

/* catch MUT not defined
 if(!mutDefined) {
    console.error("Error: specified method <" +
                   MUTname + "> was not found in class <" +
                   CUTname +">");
    console.error("(see README for information on recognised class definitions)");
    console.info(cmd.helpInformation());
    process.exit(1);
}
*/

function generateContent(src,CUTname,MUTname,tests) {
    var header = "/*****************************************\n\n";
    header += "                  FLYCATCHER\n";
    header += "        AUTOMATIC UNIT TEST GENERATION\n";
    header += "        ------------------------------\n\n";
    header += "        CLASS: " + CUTname + "\n";
    header += "        METHOD: " + MUTname + "\n\n";
    header += "*******************************************/\n\n"
    header += "var assert = require('assert');\n\n";
    var success = "console.log(\"Unit test suite completed with success!\")";
    var content = header + src +"\n\ntry {\n\n" + tests.join('\n\n') + "\n\n"+ success; 
    content += "\n}\ncatch(err) {\n    console.log(err.name,err.message)\n}";
    return content;
}
