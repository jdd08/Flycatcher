/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Triangle
        METHOD: getType

*******************************************/

var assert = require('assert');


function Triangle(a,b,c) {
    this.a = a;
    this.b = b;
    this.c = c;
}

Triangle.prototype.setA = function(a) {
    this.a = a;
}

Triangle.prototype.setB = function(b) {
    this.b = b;
}

Triangle.prototype.setC = function(c) {
    this.c = c;
}

Triangle.prototype.getType = function() {
    
    function swap(a,b) {
        var tmp = a;
        a = b;
        b = tmp;
    }
    
    var type = 'PLAIN';
    var a = this.a;
    var b = this.b;
    var c = this.c;

    // swap sides such that a, b and c
    // are ranked from longest to smallest
    if (a<b) {
        swap(a,b);
    }
    if (a<c) {
        swap(a,c);
    }
    if (b<c && !isNaN(b)) {
        swap(b,c);
    }
    
    // checking triangle inequality i.e. making sure
    // that the longest side is smaller than the sum
    // of the other two
    if (a<(b+c)) {
        if (a === b && b === c) {
                type = 'EQUILATERAL';
        }
        else if (a === b || b === c) {
            type = 'ISOCELES';
        }
    }
    else {
        type = 'INVALID';
    }
    return type;
}

/*Triangle.prototype.printType = function(printStream) {
    printStream.output(this.type);
}*/


try {

// Test #1
var triangle75 = new Triangle(25,10,5);
triangle75.setA(25);
triangle75.setA(5);
assert.ok(triangle75.getType() === "PLAIN",
         'triangle75.getType() === "PLAIN"');

// Test #2
var triangle76 = new Triangle(19,7,19);
triangle76.setB(19);
triangle76.setB(14);
assert.ok(triangle76.getType() === "PLAIN",
         'triangle76.getType() === "PLAIN"');

// Test #3
var triangle77 = new Triangle(31,16,31);
triangle77.setA(20);
triangle77.setA(8);
assert.ok(triangle77.getType() === "PLAIN",
         'triangle77.getType() === "PLAIN"');

// Test #4
var triangle78 = new Triangle(7,15,16);
triangle78.setC(15);
triangle78.setB(7);
triangle78.setC(7);
triangle78.setC(15);
assert.ok(triangle78.getType() === "ISOCELES",
         'triangle78.getType() === "ISOCELES"');

// Test #5
var triangle109 = new Triangle(29,2,19);
triangle109.setC(15);
assert.ok(triangle109.getType() === "INVALID",
         'triangle109.getType() === "INVALID"');

// Test #6
var triangle183 = new Triangle(17,28,26);
triangle183.setC(28);
triangle183.setA(28);
assert.ok(triangle183.getType() === "EQUILATERAL",
         'triangle183.getType() === "EQUILATERAL"');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}