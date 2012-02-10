var randomDataGenerator = require('./randomDataGenerator.js');
var dump = require('./utils').dump;

function TestCase(ctr,callSequence,mut) {
    this.ctr = ctr;
    this.callSequence = callSequence;
    this.mut = mut;
}

TestCase.prototype.getConstructorCall = function() {
    var constructor = this.ctr;
    var call = "var o = new " + constructor.name + "(";
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

TestCase.prototype.getMethodCalls = function() {
    var string = "";
    var methods = this.callSequence;
    for(var k = 0; k<methods.length; k++){
        var method = methods[k];
        string += "o." + method.name + "(";
        params = method.params;
        for(var l = 0; l<params.length; l++) {
            string += params[l].toString();
            if(l !== params.length-1) {
                string += ", ";
            }
        }
        string += ");\n";
    }
    return string;
}

TestCase.prototype.getDummyMutCall = function() {
    // adding call to MUT
    var string = "o.MUT(";
    params = this.mut.params;
    for(var l = 0; l<params.length; l++) {
        string += params[l].toString();
        if(l !== params.length-1) {
            string += ", ";
        }
    }
    string += ")";
    return string;
}

TestCase.prototype.getRealMutCall = function() {
    // adding call to MUT
    var string = "o." + this.mut.name + "(";
    params = this.mut.params;
    for(var l = 0; l<params.length; l++) {
        string += params[l].toString();
        if(l !== params.length-1) {
            string += ", ";
        }
    }
    string += ")";
    return string;
}

TestCase.prototype.toExecutorFormat = function() {
    var test = this.getConstructorCall();
    test += this.getMethodCalls();
    test += this.getDummyMutCall() + ";\n";
    return test;
}

TestCase.prototype.toUnitTestFormat = function(result) {
    var test = this.getConstructorCall();
    test += this.getMethodCalls();
    test += "assert(" + this.getRealMutCall() + " === " + result + ");";
    return test;
}

exports.generate = function(classInfo) {
    MAX_SEQUENCE_LENGTH = 10;
    
    var parameters = randomDataGenerator.generate(classInfo.ctr.params);
    var ctr = {name: classInfo.name, params: parameters};

    var callSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*classInfo.methods.length);        
        var method = classInfo.methods[randomMethod];
        callSequence.push({name: method.name,
                           params: randomDataGenerator.generate(method.params)});
    }
    var mut = {params : randomDataGenerator.generate(classInfo.mut.params),
               name : classInfo.mut.name};
    return new TestCase(ctr,callSequence,mut);
}