
function Foo(a,b,c,d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    
    this.printabcd = function() {
        print('a='+this.a+' '+'b='+this.b+' '+'c='+this.c+' '+'d='+this.d+' ');
        return "printabcd";
    }
    this.printOne = function(p) {
        print(p);
        return "printOne";
    }
    
    this.printTwo = function (p,pp) {
        var text = p + " " + pp;
        print(text);
        return "printTwo";
    }
    this.printThree = function (p,pp,ppp) {
        var text = p + " " + pp + " " + ppp;
        print(text);
        return "printThree";
    }
    
    this.printFour = function(p,pp,ppp,pppp) {
        var text = p + " " + pp + " " + ppp + " " + pppp;
        print(text);
        return "printFour";
    }
}