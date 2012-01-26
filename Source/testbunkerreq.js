function dump(elem) {
    console.log(dumpObj(elem,0));
}
var dumpObj = function(elem,level) {
	var dumped = "";
    // object types
	if(typeof(elem) === 'object') {
	    if(elem instanceof Array) {
	        dumped += '[';
	        for(var k=0; k<elem.length; k++){
	            dumped += k + ': ';
	            dumped += dumpObj(elem[k],level+1);
	            if(k !== elem.length-1) {
	                dumped += ', ';
                }
	        }
	        dumped += ']';
	    }
	    else {
	        dumped += '{';
	        var counter = 0;
	        for(var item in elem) {
                counter++;
                if(counter!==1 && level === 0){
                    dumped += " ";
                }
	            dumped += item + ':';
	            dumped += dumpObj(elem[item],level+1);
	            if(counter !== Object.keys(elem).length){
                    dumped += ', ';
	            }
	            if(level === 0){
                    dumped += "\n";
                }
            }
    		dumped += '}';
	    }
	}
    else if(typeof(elem) === 'function') {
        var func = elem.toString();
        for(var i=0; i<func.length; i++) {
            //if(func[i] === '\n') break;
            dumped += func[i];
        }
        //dumped += '...';
    }
	else { // primitive types
        if(typeof elem === "string") {
            dumped += "'";
	    }
		dumped += elem;
	    if(typeof elem === "string") {
            dumped += "'";
	    }
	}
	return dumped;
}

var bunker = require('bunker');
var fs = require('fs');

function execute(p) {
    var b = bunker(p);

    var counts = {};

    b.on('node', function (node) {
        if (!counts[node.id]) {
            counts[node.id] = { times : 0, node : node };
        }
        counts[node.id].times ++;
        //dump(node.start)
        //dump(node);
    });

    b.run();

    Object.keys(counts).forEach(function (key) {
        var count = counts[key];
        console.log(count.times + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);
    });
}

var initBunker = function(data) {
    return data;
}

fs.readFile('./bar.js','utf8', function (err, data) {
    if (err) {
        throw err;
    }
    else {
        //execute(data);
        initBunker(data);
    }
});

var b = bunker();
var bar = 'function Bar(x,y){ this.x = x; \nthis.y = y }\n';
bar += 'Bar.prototype.incX = function(){this.x++;}\n';
bar += 'Bar.prototype.decX = function(){this.x--;}\n';
bar += 'Bar.prototype.incY = function(){this.y++;}\n';
bar += 'Bar.prototype.decY = function(){this.y--;}\n';
bar += 'Bar.prototype.undertest = function(){ if(x>1){ if (y>1){doNothing();} else {doNothing();}} else {if (y>1){doNothing();} else {doNothing();}}};\n'
b.includeSource(bar);

//var test = "\nvar v = new Bar(0,0);\nv.incX();\nv.incY();\nassert(true)";
var test = "";
b.includeTest(test);

var counts = {};

b.on('node', function (node) {    
    if (!counts[node.id]) {
        counts[node.id] = { times : 0, node : node };
    }
    counts[node.id].times ++;
    //dump(node.start)
    //dump(node);
});

function AssertException(message) { this.message = message; }
AssertException.prototype.toString = function () {
    return 'assertion failed: ' + this.message;
}

function assert(exp) {
    if (!exp) {
        console.log("Assertion failed!");
    }
}

function doNothing() {
}

b.run({assert: assert, doNothing: doNothing});

Object.keys(counts).forEach(function (key) {
    var count = counts[key];
    console.log(count.times + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);
})

/*var s = 'var bar = new Bar();\n'
s += 'bar.x(3);\n'
//s += 'bar.y(4);\n'
//s += 'bar.z(5);'
b.include(s);

//dump(b)


var counts = {};

b.on('node', function (node) {
    dump(node.parent)
    
    //if (!counts[node.id]) {
    //    counts[node.id] = { times : 0, node : node };
    //}
    //counts[node.id].times ++;
    //dump(node.start)
    //dump(node);
});

b.run();

Object.keys(counts).forEach(function (key) {
    var count = counts[key];
    console.log(count.times + ' : ' + count.node.source() + " name: " + count.node.name + " line: " + count.node.start.line);
});*/