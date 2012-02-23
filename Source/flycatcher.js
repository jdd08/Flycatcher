#!/usr/bin/env node --harmony_proxies

var dump = require('./lib/utils.js').dump;
var analyser = require('./lib/analyser.js');
var randomTest = require('./lib/randomTest.js');
var executor = require('./lib/executor.js');

var fs = require('fs');
var vm = require('vm');
var cmd = require('commander');

cmd
  .version('1.0')
  .usage('[options] <file path> <class name>')
  .option('-m, --method <name>', 'generate tests for a specific method of the given class')
  .option('-c, --coverage_max <num>', 'maximum percentage for method coverage',Number,100)
  .parse(process.argv);

if (cmd.args.length !== 2) {
    console.info(cmd.helpInformation());
    process.exit(1);
}

var filePath = cmd.args[0];
var className = cmd.args[1];

try {
    var src = fs.readFileSync(filePath,'utf8');
}
catch (error) {
    console.error(error.toString());
    console.info(cmd.helpInformation());
    process.exit(1);
}

var classContext = {};
try {
    vm.runInNewContext(src,classContext);
}
catch (err){
    console.error("Error while parsing source <" + filePath + ">");
    console.error(err.toString());
    process.exit(1);   
}

var exec = executor();
exec.addSource(src);

// method under test has been specified
if (cmd.method) {
    var classes = analyser.getClasses(cmd,classContext,className,cmd.method);
    exec.setupContext(classes);
    
    var cut = classes[className];
    exec.setMUT(cut);
    process.stdout.write("\nGenerating tests for at least " + cmd.coverage_max + "\% coverage of ");
    process.stdout.write("method <" + cmd.method + "> from class <" + className + "> : ");
    var goodTestScenarios = [];
    var count = 0;
    while(exec.getMutCoverage() < cmd.coverage_max && count++ < 3) {
        var test = randomTest.generate(classes,className);
        exec.setTest(test.toExecutorFormat());
        var res = exec.run();
        if (res.good) {
            goodTestScenarios.push(test.toUnitTestFormat(res.result,cmd.method));
        }
//        console.log(classes[className].ctr.params)
    }
    var fileName = "Flycatcher_"+className+".js";
    console.log("(" + res.cov + "\%)\nGeneration succesful. Tests can be found in " + fileName + "\n");
    fs.writeFileSync(fileName,goodTestScenarios.join('\n\n'));
}
else { // by default generates tests for all of a class' methods

}
