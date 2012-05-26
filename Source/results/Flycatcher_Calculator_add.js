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
var calculator0 = new Calculator(20,12);
calculator0.setA(12);
calculator0.setA(20);
calculator0.setA(20);
assert.ok(calculator0.add(15,18) === 65,
         'calculator0.add(15,18) === 65');

// Test #2
var calculator1 = new Calculator(13,30);
calculator1.setA(6);
calculator1.setA(21);
assert.ok(calculator1.add(21,6) === 78,
         'calculator1.add(21,6) === 78');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}