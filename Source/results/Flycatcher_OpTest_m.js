/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: OpTest
        METHOD: m

*******************************************/

var assert = require('assert');



function OpTest(){    
}

OpTest.prototype.m = function(a,b) {

    a++;
    a--;
    b-2;
    b*4;
    b/8;        
    return a+b;
}

try {

// Test #1
var optest12 = new OpTest();
assert.ok(optest12.m(21,21) === 42,
         'optest12.m(21,21) === 42');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}