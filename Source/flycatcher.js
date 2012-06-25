#! /usr/bin/env node --harmony_proxies

var Analyser = require('./lib/analyser.js');
var RandomTest = require('./lib/randomTest.js');
var Executor = require('./lib/executor.js').Executor;
var StrictTimeout = require('./lib/executor.js').StrictTimeout;

var util = require('util');
var fs = require('fs');
var vm = require('vm');

var _ = require('underscore');
var colors = require('colors');
colors.setTheme({
  info1: 'blue',
  info2: 'yellow',  
  warn: 'magenta',
  good: 'green',
  error: 'red',
  bad: 'red'
});
var cmd = require('commander');
cmd
.version('1.0')
.usage('<file path> <class name> [options]')
.option('-m, --method <name>', 'generate tests for a specific method')
.option('-N, --namespace <name>', 'specify a namespace for your class')
.option('-o, --output-format [expresso|nodeunit]', 'specify a unit test suite output format')
.option('-f, --test-suite-file <name>', 'specify a destination file to output the test suite')
.option('-b, --bug-report-file <name>', 'specify a destination file to output the bug report')
.option('-s, --custom-strings <re>', 'JavaScript RegExp describing a custom set of strings to use e.g. \'[a-d]+\'')
.option('-n, --custom-numbers <re>', 'JavaScript RegExp describing a custom set of numbers to use e.g \'[1-4]\'')
.option('-t, --timeout <num>', 'timeout after <num> tests are generated with no coverage', Number, Number.MAX_INT)
.option('-T, --strict-timeout <num>', 'timeout after <num> seconds')
.option('-l, --max-sequence-length <num>', 'maximum length of method call sequence in tests', Number, 10)
.option('-d, --type-inference-delay <num>', 'min number of calls involving a parameter before its type inference', Number, 20)
.parse(process.argv);

(function main(cmd) {
    if (cmd.args.length !== 2) {
        console.info(cmd.helpInformation());
        process.exit(1);
    }

    var filePath = cmd.args[0];
    var CUTname = cmd.args[1];

    try {
        var src = fs.readFileSync(filePath, 'utf8');
    }
     catch(error) {
        console.error(error.toString());
        console.info(cmd.helpInformation());
        process.exit(1);
    }
    
    var classContext = {exports : {}};
    try {
        vm.runInNewContext(src, classContext);
    }
     catch(err) {
        console.error("Syntax error while parsing source <" + filePath + ">");
        console.log(err.stack);
        process.exit(1);
    }
    
    var pgmInfo = Analyser.getProgramInfo(cmd, classContext, CUTname);
    // initialising custom primitive data generators if need be
    var numRE = cmd.customNumbers;
    if (numRE) RandomTest.DataGenerator.setNumbers(numRE);
    var strRE = cmd.customStrings;
    if (strRE) RandomTest.DataGenerator.setStrings(strRE);
        
    var unitTests = [];
    var failingTests = [];

    // cmd.method is undefined if MUT not specified by user
    var cmdMethod = cmd.method;
    var CUTmethods = pgmInfo.getMethods(CUTname);
    var MUTdefined;
    for (var m in CUTmethods) {
        var method = CUTmethods[m];
        if (cmdMethod && method.name !== cmdMethod) continue;
        MUTdefined = true;
        pgmInfo.setMUT(method);
        generateTests(src, pgmInfo, unitTests, failingTests);
    }
    
    if(!MUTdefined) {
        console.error("Error: specified method <" + cmdMethod + "> was not found in class <" + CUTname +">");
        console.log(cmd.helpInformation());
    }
    
    outputTests(src, pgmInfo, unitTests, failingTests, cmd.testSuiteFile, cmd.bugReportFile);
})(cmd);

function Timeout(){
    Error.captureStackTrace(this, Timeout);
    this.toString = function() {
        return "TIMEOUT: ".info2 + "no coverage achieved with the last " +
                cmd.timeout + " valid tests";
    }
};

function generateTests(src, pgmInfo, unitTests, failingTests) {
    try {
        var noCoverage = 0;
        var start = Date.now();        
        var exec = new Executor(src, pgmInfo, start, cmd.strictTimeout);

        var MUTname = pgmInfo.MUT.name;
        var CUTname = pgmInfo.CUTname;
        console.log("\nGenerating tests for method <" + MUTname + "> from class <" + CUTname + "> :   ");
        console.log("------------------------------------------------------------------------------------------");
        var count = 0;
        while (exec.getCoverage() < 100) {
            var test = RandomTest.generate(pgmInfo);            
            exec.setTest(test);
            var testRun = exec.run();
            if(!test.hasUnknowns()) {
                if (testRun.newCoverage) {
                    if (cmd.outputFormat === "expresso")
                        unitTests.push(test.toExpressoFormat(testRun.results, ++count));
                    else if (cmd.outputFormat === "nodeunit")
                        unitTests.push(test.toNodeUnitFormat(testRun.results, ++count));
                    else if (cmd.outputFormat) {
                        console.error("ERROR:".red + " Unit test suite format specified is unsupported.");
                        process.exit(1);
                    }
                    else
                        unitTests.push(test.toAssertFormat(testRun.results, ++count));
                }
                // the timeout is to avoid looping forever in the case
                // that the generated tests cannot achieve any further
                // coverage due to errors or dead code
                else if(++noCoverage >= cmd.timeout) throw new Timeout();
                // keep track of the non-unknown tests that don't add coverage so that
                // if the timeout expires we can see what the failing tests were
                if (testRun.error) failingTests.push(test.toFailingTestFormat(testRun.msg));
            }
        }
    }
    catch(err) {
        if(err instanceof Timeout || err instanceof StrictTimeout) {
            console.log(err.toString());
        }
        else {
            console.error(("ERROR while generating tests for method <" + MUTname + ">").error);
            if (err.type === "stack_overflow") 
                console.log("STACK OVERFLOW: there must be a cycle in the inferred parameter definitions".error);
            else console.log(err.stack);            
        }
    }
}

function outputTests(src, pgmInfo, unitTests, failingTests, testsFile, errorsFile) {
    var CUTname = pgmInfo.CUTname;
    if (unitTests.length) {
        var unitTestsFile = testsFile || "./Flycatcher_" + CUTname + ".js";
        console.log(("\n--> Unit tests can be found in " + unitTestsFile).good);
        fs.writeFileSync(unitTestsFile,
            generateUnitTests(src, CUTname, unitTests)
        );
    }
    else console.log("\n--> No unit tests were generated.".bad);

    if (failingTests.length) {
        var failingTestsFile = errorsFile || "./Flycatcher_" + CUTname + ".log";
        console.log(("--> Failings tests can be found in " + failingTestsFile).bad);
        fs.writeFileSync(failingTestsFile,
            generateFailingTests(src, CUTname, failingTests)
        );
    }
    else console.log("--> No candidate tests failed".good);
    
    function generateFailingTests(src, CUTname, tests) {
        var header = "------------------------------------------\n";
        header += " FLYCATCHER BUG REPORT for " + CUTname + "\n";
        header += "---------------------------------------------\n\n";
        var res = "";
        for (var t=0; t < tests.length; t++) {
            res += tests[t];
            res += "\n\n";
        };
        return header + res;
    }

    function generateUnitTests(src, CUTname, tests) {
        var header = "// ---------------------------------------------\n";
        header += "// FLYCATCHER TEST SUITE for " + CUTname + "\n";
        header += "// ---------------------------------------------\n\n";
        header += "var assert = require('assert');\n\n";
        var success = "console.log(\"Unit test suite completed with success!\")";
        var content = header;
        var classes = _.pluck(pgmInfo.classes, 'name');
        if(!cmd.namespace) {
            for (var i in classes) {
                var c = classes[i];
                content += "var " + c + " = require('" + __dirname + "/" + cmd.args[0] + "')." + c + ";\n";
            }            
        }
        else content += "var " + cmd.namespace + " = require('" + __dirname
                     + "/" + cmd.args[0] + "')." + cmd.namespace + ";\n";
        if(!cmd.outputFormat) content += "\ntry {\n\n";
        content += "\n" + tests.join('\n\n') + "\n\n"; 
        if(!cmd.outputFormat) content += success + "\n}\ncatch(err) {\n    console.log(err.toString())\n}";
        return content;
    }
}