#! /usr/bin/env node --harmony_proxies

var util = require('util');
var analyser = require('./lib/analyser.js');
var randomTest = require('./lib/randomTest.js');
var Executor = require('./lib/executor.js').Executor;

var fs = require('fs');
var vm = require('vm');
var _ = require('underscore');
var cmd = require('commander');
var colors = require('colors');
colors.setTheme({
  info: 'blue',
  warn: 'magenta',
  good: 'green',
  error: 'red',
  bad: 'red'
});

cmd
.version('1.0')
.usage('[options] <file path> <class name>')
.option('-m, --method <name>', 'generate tests for a specific method')
.option('-c, --coverage <num>', 'expected coverage %', Number, 100)
.option('-t, --timeout <num>', 'timeout in seconds')
.option('-n, --namespace <name>', 'specify a namespace for your class')
.option('-u, --usage <name>', 'number of parameter usages required before attempting type inference',Number,20)
// .option('-f, --files <name>', 'specify other files for your class')
// TODO option for more than one file
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

var expectedCoverage = cmd.coverage;
var pgmInfo = analyser.getProgramInfo(cmd, classContext, CUTname);

var CUTmethods = pgmInfo.getMethods(CUTname);
var unitTests = [];
var failingTests = [];
var unitTestsFile = "./results/Flycatcher_" + CUTname + ".js";
var failingTestsFile = "./results/Flycatcher_" + CUTname + ".log";

function generateTests(MUTname, unitTest, failingTests) {
    try {    
        var exec = new Executor(src, pgmInfo);
    
        console.log("\nGenerating tests for at least " + expectedCoverage + 
                    "\% coverage of method <" + MUTname + 
                    "> from class <" + CUTname + "> :   ");
        console.log("--------------------------------------------------" +
                    "----------------------------------------");
        var count = 0;
        var start = Date.now();
        // console.log(util.inspect(pgmInfo, true, null));
        while (exec.getCoverage() < expectedCoverage) {
            var test = randomTest.generate(pgmInfo);            
            exec.setTest(test);
            //console.log(pgmInfo.getMUT().params);
            // exec.showTest(test);
            var testRun = exec.run();
            if (testRun.newCoverage && !test.hasUnknowns()) {
                unitTests.push(test.toUnitTestFormat(testRun.results, ++count));
            }
            // keep track of the non-unknown tests that don't add coverage so that
            // if the timeout expires we can see what the failing tests were
            else if (testRun.error && !test.hasUnknowns()) {
                // console.log(util.inspect(test, false, null));
                failingTests.push(test.toFailingTestFormat(testRun.msg));
            }
            // exec.showCoverage();
            //  exec.showMUT();
            // the timeout is to avoid looping forever in the case
            // that the generated tests cannot achieve any further
            // coverage due to errors (these errors may be due to
            // the code under test itself or it may be that we failed
            // to infer correct types)
            if (cmd.timeout && Date.now() > (start + cmd.timeout*1000)) {
                console.warn("Flycatcher timed out as it could not achieve the desired coverage in time.");
                break;
            }
        }
    }
    catch(err) {
        console.error("ERROR while generating tests for method <" + MUTname + ">".error);
        if (err.type === "stack_overflow") 
            console.log("STACK OVERFLOW: there must be a cycle in the inferred parameter definitions".error);
        else console.log(err.toString());
    }
}

var prev = null;

// cmd.method is undefnied if MUT not specified by user
var cmdMethod = cmd.method;
for (var m in CUTmethods) {
    if (cmdMethod && m !== cmdMethod) continue;
    if (prev) prev.isMUT = false;
    var method = CUTmethods[m]
    var MUTname = method.name;
    pgmInfo.setMUT(MUTname);
    method.isMUT = true;
    prev = method;
    generateTests(MUTname, unitTests, failingTests);
}

if (unitTests.length) {
    console.log(("\n--> Unit tests can be found in " + unitTestsFile).good);
    fs.writeFileSync(unitTestsFile,
        generateUnitTests(src, CUTname, unitTests)
    );
}
else {
    console.log("\n--> No unit tests were generated.".bad);
}

if (failingTests.length) {
    console.log(("--> Failings tests can be found in " + failingTestsFile).bad);
    fs.writeFileSync(failingTestsFile,
        generateFailingTests(src, CUTname, failingTests)
    );
}
else {
    console.log("--> No generated tests failed.".good);
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

function generateFailingTests(src, CUTname, tests) {
    var header = "/*****************************************\n\n";
    header += "                  FLYCATCHER\n";
    header += "                 FAILING TEST LOG\n";
    header += "        ------------------------------\n\n";
    header += "        CLASS: " + CUTname + "\n";
    header += "*******************************************/\n\n"
    var res = "";
    for (var t=0; t < tests.length; t++) {
        res += tests[t];
        res += "\n\n";
    };
    return header + res;
}

function generateUnitTests(src, CUTname, tests) {
    var header = "/*****************************************\n\n";
    header += "                  FLYCATCHER\n";
    header += "        AUTOMATIC UNIT TEST GENERATION\n";
    header += "        ------------------------------\n\n";
    header += "        CLASS: " + CUTname + "\n";
    header += "*******************************************/\n\n"
    header += "var assert = require('assert');\n\n";
    var success = "console.log(\"Unit test suite completed with success!\")";
    var content = header + src +"\n\ntry {\n\n" + tests.join('\n\n') + "\n\n"+ success; 
    content += "\n}\ncatch(err) {\n    console.log(err.name,err.message)\n}";
    return content;
}
