
var fs = require('fs');
var dump = require('./utils.js').dump;
var bunker = require('bunker');
var assert = require('assert');

function createTest(testCase,CUT,instrMUT) {

     function getConstructorCall(testCase) {
         // func.name needs changing to a name property!
         var constructor = testCase.ctr;
         var call = "var o = new " + constructor.func.name + "(";
         var params = constructor.params;
         for(var j = 0; j<params.length; j++) {
             call += params[j].toString();
             if(j !== params.length-1) {
                 call += ", ";
             }
         }
         call += ");\n";
         return call;
     }
     
     function getMethodCalls(testCase) {
         var string = "";
         var methods = testCase.methodSequence;
         for(var k = 0; k<methods.length; k++){

             var method = methods[k];
             string += "o.";
             if(k !== methods.length-1) {
                 string += method.name + "(";
             }
             else {
                 string += "MUT" + "(";
             }
             params = method.params;
             for(var l = 0; l<params.length; l++) {
                 
                 if(l !== params.length-1) {
                     string += ", ";
                 }
             }
             string += ");\n";
         }
         return string;
     }

     var test = getConstructorCall(testCase);
     test += getMethodCalls(testCase);
     return test;
}

exports.execute = function(testCase) {
    var b = bunker();
    var src = fs.readFileSync('bar1.js','utf8');
    
    var CUT = 'Bar';
    var instrMUT = {};
    instrMUT.name = "undertest1";
    instr = b.instrumentMUT(testCase.methodSequence[testCase.methodSequence.length-1].name,
                                     testCase.methodSequence[testCase.methodSequence.length-1].func,
                                     CUT);
    instrMUT.func = instr.r;
    
    // ignoring the first node which contains the MUT definition
    var nodeCoverage = instr.cov.slice(1);

    //dump(nodeCoverage)
    var test = createTest(testCase,CUT,instrMUT);
    b.addSource(src);
    b.addSource(instrMUT.func)
    b.addSource(test);
    //b.displaySource();
    var counts = {};

    b.on('node', function (node) {
        if (!counts[node.id]) {
            counts[node.id] = { times : 0, node : node };
        }
        counts[node.id].times ++;
    });

    var bunkerContext = {};
    bunkerContext.assert = assert;
    b.run(bunkerContext);

    Object.keys(counts).forEach(function (key) {
        if(key > '0'){
            var count = counts[key];
            console.log(key + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);

            // relevant nodes are indexed from 1 but the array starts from 0 for convenience
            nodeCoverage[key-1].exec = true;
        }
        //console.log(count.node.node)
    })
    dump(nodeCoverage)
    dump("Current coverage of the mut: ")

    /*//console.log("Executing test case.........");
    var testObj = new (testCase.ctr.func)(testCase.ctr.params[0],testCase.ctr.params[1],testCase.ctr.params[2],testCase.ctr.params[3]);
    dump(testObj)
    var methods = testCase.methodSequence;
    var result;
    for(var m=0; m<methods.length; m++) {
        result = methods[m].func.apply(testObj,methods[m].params);
    }
    */
    return "";
}