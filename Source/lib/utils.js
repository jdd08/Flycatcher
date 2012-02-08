exports.dump = function(elem,type) {
    if (!type) {
        console.log(dumpObj(elem,0));        
    }
    else if (type === "f") {
        console.log(dumpfObj(elem,0));        
    }
    else if (type === "r") {
        return dumpObj(elem,0);
    }
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
            if(func[i] === '\n') break;
            dumped += func[i];
        }
        dumped += '...';
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

var dumpfObj = function(elem,level) {
	var dumped = "";
    // object types
	if(typeof(elem) === 'object') {
	    if(elem instanceof Array) {
	        dumped += '[';
	        for(var k=0; k<elem.length; k++){
	            dumped += k + ': ';
	            dumped += dumpfObj(elem[k],level+1);
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
	            dumped += dumpfObj(elem[item],level+1);
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
        dumped += elem.toString();
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