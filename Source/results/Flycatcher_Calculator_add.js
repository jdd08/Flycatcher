/*****************************************

                  FLYCATCHER
        AUTOMATIC UNIT TEST GENERATION
        ------------------------------

        CLASS: Calculator
        METHOD: add

*******************************************/

var assert = require('assert');



function Calculator(poing,doiung){
}

Calculator.prototype.add = function(a,b) {
    return a<b+3
}

try {



console.log("Unit test suite completed with success!")
}
catch(err) {
    console.log(err.name,err.message)
}