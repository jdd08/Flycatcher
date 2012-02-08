
var randomDataGenerator = require('./randomDataGenerator.js')

exports.generate = function(classInfo) {
    MAX_SEQUENCE_LENGTH = 10;
    var testCase = {};
    var parameters = randomDataGenerator.generate(classInfo.ctr.params);
    testCase.ctr = {def: classInfo.ctr.def, params: parameters};
    var methodSequence = [];
    randomSequenceLength = Math.ceil(Math.random()*MAX_SEQUENCE_LENGTH);
    for (var j = 0; j<randomSequenceLength;j++) {
        var randomMethod = Math.floor(Math.random()*classInfo.methods.length);
        var method = classInfo.methods[randomMethod];
        methodSequence.push({name: method.name,
                             func: method.func,
                             params: randomDataGenerator.generate(method.paramTypes)});
    }
    var mut = classInfo.mut;
    methodSequence.push({name: mut.name,
                         func: mut.func,
                         params: randomDataGenerator.generate(mut.paramTypes)})
    testCase.methodSequence = methodSequence;
    return testCase;
}