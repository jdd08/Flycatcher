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
var fibonacci2 = new Fibonacci();
assert.ok(fibonacci2.compute("koc") === 0,
         'fibonacci2.compute("koc") === 0');

// Test #2
var fibonacci5 = new Fibonacci();
assert.ok(fibonacci5.compute(17) === 1597,
         'fibonacci5.compute(17) === 1597');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}