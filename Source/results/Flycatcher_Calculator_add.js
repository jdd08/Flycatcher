/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Calculator
        METHOD: add

*******************************************/

var assert = require('assert');



function Calculator(a, b) {
    this.a = a;
    this.b = b;
}

Calculator.prototype.add = function(c, d) {
    c>d && d == (c + this.a);
    this.a - this.b;
    c++;
    c--;
    return this.a + this.b + c + d;
}

Calculator.prototype.setA = function(a) {
    this.a = a;
}

Calculator.prototype.setB = function(b) {
    this.b = b;
}

try {

// Test #1
var calculator85 = new Calculator(24,24);
calculator85.setB(24);
calculator85.setA(24);
calculator85.setA(19);
calculator85.setB(24);
calculator85.setB(27);
calculator85.setB(24);
calculator85.setA(29);
assert.ok(calculator85.add(22,23) === 98,
         'calculator85.add(22,23) === 98');

// Test #2
var calculator87 = new Calculator(31,31);
calculator87.setA(15);
calculator87.setB(2);
calculator87.setA(31);
calculator87.setA(21);
assert.ok(calculator87.add(17,14) === 54,
         'calculator87.add(17,14) === 54');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}