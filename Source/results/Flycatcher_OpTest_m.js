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
var optest4 = new OpTest();
assert.ok(optest4.m(6,6) === 12,
         'optest4.m(6,6) === 12');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}