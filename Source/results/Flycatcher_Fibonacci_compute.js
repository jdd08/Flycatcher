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
var fibonacci16 = new Fibonacci();
assert.ok(fibonacci16.compute(21) === 10946,
         'fibonacci16.compute(21) === 10946');

// Test #2
var fibonacci30 = new Fibonacci();
assert.ok(fibonacci30.compute(1) === 1,
         'fibonacci30.compute(1) === 1');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}