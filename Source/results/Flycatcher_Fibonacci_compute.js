/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Fibonacci
        METHOD: compute

*******************************************/

var assert = require('assert');



function Fibonacci() {
}

Fibonacci.prototype.compute = function(n) {
    if (n>1) {
        return this.compute(n-1) + this.compute(n-2);
    }
    else if (n === 1) {
        return 1;
    }
    else {
        return 0;
    }
}


try {

// Test #1
var fibonacci6 = new Fibonacci();
assert.ok(fibonacci6.compute(0) === 0,
         'fibonacci6.compute(0) === 0');

// Test #2
var fibonacci7 = new Fibonacci();
assert.ok(fibonacci7.compute(36) === 14930352,
         'fibonacci7.compute(36) === 14930352');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}