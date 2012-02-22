

function Foo(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;
}

Foo.prototype.foo1 = function() {
    return "foo1 " + this.x + this.y + this.z;
}

Foo.prototype.foo2 = function() {
    return "foo2" + this.x + this.y + this.z;    
}

function Point(foo) {
    this.x = 1;
    this.y = 1;
}

Point.prototype.incX = function() {
    this.foo.foo1();
    this.x++;   
}

Point.prototype.incY = function() {
    this.foo.foo2();
    this.y++;
}

function test() {
}

function Quadrilateral(topRight,topLeft,bottomRight,bottomLeft) {

    // All arguments are in effect Proxy objects which return
    // function Proxies such that the return values of get operations
    // on the proxies can be either called or dereferenced.
    // This is so that the execution of the constructor is unperturbed
    // and the signatures can be obtained for the various classes.

    // setting proxy property
    topRight.a = 123;
    // getting proxy property
    topRight.b;
    
    // calling proxy's method
    topRight.foo();
    // calling proxy's method result;
    topRight.foo().test();
    // getting proxy's method result's property;
    topRight.foo().field;
    // setting proxy's method result's property;
    topRight.foo().field = 3;


    // calling proxy's property's property
    topRight.a.f();
    // getting proxy's property's property
    topRight.a.f;
    // setting proxy's property's property
    topRight.a.f = 234;
    
    // etc. recursively

    this.topRight = topRight;
    this.topLeft = topLeft;
    this.bottomRight = bottomRight;
    this.bottomLeft = bottomLeft;
}

Quadrilateral.prototype.incTopRightX = function(n) {
    //this.topRight.incX();
}

Quadrilateral.prototype.intTopLeftX = function(n) {
    //this.topLeft.incX();
}

Quadrilateral.prototype.incBottomRightX = function(n) {
    //this.bottomRight.incX();
}

Quadrilateral.prototype.incBottomLeftX = function(n) {
    //this.bottomLeft.incX();
}

Quadrilateral.prototype.incTopRightY = function(n) {
    //this.topRight.incY();
}

Quadrilateral.prototype.intTopLeftY = function(n) {
    //this.topLeft.incY();
}

Quadrilateral.prototype.incBottomRightY = function(n) {
    //this.bottomRight.incY();
}

Quadrilateral.prototype.incBottomLeftY = function(n) {
    //this.bottomLeft.incY();
}

Quadrilateral.prototype.getCoords = function() {
    var res = this.topRight.x + " " + this.topRight.y + ", ";
    res += this.topLeft.x + " " + this.topLeft.y + ", ";
    res += this.bottomRight.x + " " + this.bottomRight.y + ", ";
    res += this.bottomLeft.x + " " + this.bottomLeft.y;
    return res;
}