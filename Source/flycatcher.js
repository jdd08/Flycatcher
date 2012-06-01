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
.option('-t, --timeout <num>', 'timeout in seconds')
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
var CUTmethods = pgmInfo.getMethods(CUTname);

var unitTests = [];
var failingTests = [];
var unitTestsFile = "./results/Flycatcher_" + CUTname + ".js";
var failingTestsFile = "./results/Flycatcher_" + CUTname + ".log";

var red, green, yellow, reset;
red   = '\u001b[31m';
green  = '\u001b[32m';
yellow  = '\u001b[33m';
reset = '\u001b[0m';

function generateTests(MUTname, unitTest, failingTests) {
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
        //exec.showCoverage();
        //exec.showMUT();
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

// specific method to test was specified
if (MUTname) {
    pgmInfo.setMUT(MUTname);
    _.filter(CUTmethods, function(m) {
        return m.name === MUTname;
    })[0].isMUT = true;
    try {
        generateTests(MUTname, unitTests, failingTests);
    }
    catch(err) {
        console.error("\u001b[31mERROR while generating tests for method <"
                      + MUTname + ">: \u001b[0m");
        if (err.type === "stack_overflow") 
            console.log("STACK OVERFLOW: there is a cycle in the inferred parameter definitions");
        else console.log(err.toString());
    }
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
        prev = method;        
        // if generation for one method fails notify and attempt others
        try {
            generateTests(MUTname, unitTests, failingTests);
        }
        catch(err) {
            console.error("\u001b[31mERROR while generating tests for method <"
                          + MUTname + ">: \u001b[0m");
            if (err.type === "stack_overflow") 
                console.log("STACK OVERFLOW: there is a cycle in the inferred parameter definitions");
            else console.log(err.toString());
        }
    }
}

if (unitTests.length) {
    console.log(green + "\n--> Unit tests can be found in " + unitTestsFile + reset);
    fs.writeFileSync(unitTestsFile,
        generateUnitTests(src, CUTname, unitTests)
    );
}
else {
    console.log(red + "\n--> No unit tests were generated." + reset);
}
if (failingTests.length) {
    console.log(red + "--> Failings tests can be found in " + failingTestsFile  + reset);
    fs.writeFileSync(failingTestsFile,
        generateFailingTests(src, CUTname, failingTests)
    );
}

else {
    console.log(green + "--> No generated tests failed." + reset);
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
