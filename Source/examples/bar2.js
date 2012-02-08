var doNothing = function(a){a++; return a;};

function Bar(x,y) {
    this.x = x; 
    this.y = y;
};

Bar.prototype.incX = function(){this.x++;}
Bar.prototype.decX = function(){this.x--;}
Bar.prototype.incY = function(){this.y++;}
Bar.prototype.decY = function(){this.y--;}

Bar.prototype.undertest = function(){

    var x= this.x;
    var y = this.y;
    
    if(x>1) {
        if (y>1) {
            var one = 1; 
            return doNothing(one);
        } 
        else {
            var two = 2;
            return doNothing(two);
        }
    } 
    else {
        if (y>1){
            var three = 3;
            return doNothing(three);
        } 
        else {
            var four = 4;
            return doNothing(four);
        }
    }

};
