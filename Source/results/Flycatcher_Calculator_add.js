/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Calculator
        METHOD: add

*******************************************/

var assert = require('assert');



function Calculator(){
}

Calculator.prototype.add = function(a,b) {
    if(!isNaN(a) && !isNaN(b)) {
        return a+b;
    }
}

try {

// Test #1
var calculator2 = new Calculator();
assert.ok(calculator2.add("C2","R") === undefined,
         'calculator2.add("C2","R") === undefined');

// Test #2
var calculator3 = new Calculator();
assert.ok(calculator3.add(53,53) === 106,
         'calculator3.add(53,53) === 106');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}