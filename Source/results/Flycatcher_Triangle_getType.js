/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Triangle
        METHOD: getType

*******************************************/

var assert = require('assert');


function Triangle(a,b,c,d,e) {
    this.a = a;
    this.b = b;
    this.c = c;
    
    var a = "AWE";
    a += d;
    a += e;
//    var f = [d,e].toString();
//    log(f);
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

// Test #2
var unknown1_0 = new Object();
var unknown2_1 = new Object();
var unknown2_2 = new Object();
var unknown3_3 = new Object();
var unknown3_4 = new Object();
var triangle0 = new Triangle(unknown1_0,unknown2_1,unknown2_2,unknown3_3,unknown3_4);
var unknown4_0 = new Object();
triangle0.setB(unknown4_0);
var unknown2_0 = new Object();
triangle0.setC(unknown2_0);
var unknown5_0 = new Object();
triangle0.setB(unknown5_0);
var unknown6_0 = new Object();
triangle0.setC(unknown6_0);
assert.ok(triangle0.getType() === [object Object],
         'triangle0.getType() === [object Object]');

// Test #4
var unknown8_0 = new Object();
var unknown8_1 = new Object();
var unknown9_2 = new Object();
var unknown10_3 = new Object();
var unknown11_4 = new Object();
var triangle7 = new Triangle(unknown8_0,unknown8_1,unknown9_2,unknown10_3,unknown11_4);
var unknown12_0 = new Object();
triangle7.setB(unknown12_0);
assert.ok(triangle7.getType() === [object Object],
         'triangle7.getType() === [object Object]');

// Test #6
var unknown14_0 = new Object();
var unknown14_1 = new Object();
var unknown15_2 = new Object();
var unknown16_3 = new Object();
var unknown17_4 = new Object();
var triangle13 = new Triangle(unknown14_0,unknown14_1,unknown15_2,unknown16_3,unknown17_4);
var unknown18_0 = new Object();
triangle13.setB(unknown18_0);
var unknown14_0 = new Object();
triangle13.setC(unknown14_0);
var unknown19_0 = new Object();
triangle13.setC(unknown19_0);
assert.ok(triangle13.getType() === [object Object],
         'triangle13.getType() === [object Object]');

// Test #8
var unknown21_0 = new Object();
var unknown22_1 = new Object();
var unknown23_2 = new Object();
var unknown22_3 = new Object();
var unknown24_4 = new Object();
var triangle20 = new Triangle(unknown21_0,unknown22_1,unknown23_2,unknown22_3,unknown24_4);
var unknown25_0 = new Object();
triangle20.setB(unknown25_0);
var unknown26_0 = new Object();
triangle20.setC(unknown26_0);
var unknown27_0 = new Object();
triangle20.setA(unknown27_0);
assert.ok(triangle20.getType() === [object Object],
         'triangle20.getType() === [object Object]');

// Test #10
var unknown29_0 = new Object();
var unknown30_1 = new Object();
var unknown31_2 = new Object();
var unknown29_3 = new Object();
var unknown32_4 = new Object();
var triangle28 = new Triangle(unknown29_0,unknown30_1,unknown31_2,unknown29_3,unknown32_4);
var unknown31_0 = new Object();
triangle28.setC(unknown31_0);
var unknown33_0 = new Object();
triangle28.setA(unknown33_0);
var unknown34_0 = new Object();
triangle28.setB(unknown34_0);
var unknown35_0 = new Object();
triangle28.setA(unknown35_0);
var unknown33_0 = new Object();
triangle28.setA(unknown33_0);
assert.ok(triangle28.getType() === [object Object],
         'triangle28.getType() === [object Object]');

console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}