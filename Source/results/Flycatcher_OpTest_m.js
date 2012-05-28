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

OpTest.prototype.m = function(acra) {
    (+acra && ((123-acra*456)*789 >> (121<242) && (151<<acra)) && false) && acra/1235 && acra %5421 && 'gweaek' && "aweawe"
}

try {

// Test #1
var optest2 = new OpTest();
assert.ok(optest2.m(13) === undefined,
         'optest2.m(13) === undefined');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}