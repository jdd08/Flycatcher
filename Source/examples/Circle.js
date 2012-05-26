////////////////////////////////////////////////////////////
// Circle.js                                              //
//                                                        //
// Dummy Circle class definition for testing analyser.js  //
//                                                        //
////////////////////////////////////////////////////////////

function Circle(radius)
{
    function getPerimeter(pi,two)
    {
        return this.radius * pi * two
    };

    this.radius = radius;    
    this.getPerimeter = getPerimeter;
    this.getDiameter = function(two) { return this.radius * two; };
}

Circle.prototype.getArea = function(pi,twosquared){ return this.radius * pi * twosquared };
Circle.prototype.getRadius = function(){ return this.radius };

function setRadius(r)
{
    this.radius = r;
}

Circle.prototype.setRadius = setRadius;

var doubleRadius = function() {
    this.radius = this.radius*2;
}

Circle.prototype.doubleRadius = doubleRadius;

function getMultiplyRadius() {
    function multiplyRadius(n) {
        this.radius = this.radius * n;
    }
    return multiplyRadius;
}

Circle.prototype.multiplyRadius = getMultiplyRadius();





