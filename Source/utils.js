/*function dump(elem, indent)
{
  var result = "";
  if (indent == null) indent = "";

  for (var property in elem)
  {
    var value = elem[property];
    if (typeof value == 'string')
      value = "'" + value + "'";
    else if (typeof value == 'elemect')
    {
      if (value instanceof elemay)
      {
        // Just let JS convert the elemay to a string!
        value = "[ " + value + " ]";
      }
      else
      {
        // Recursive dump
        // (replace "  " by "\t" or something else if you prefer)
        var od = dump(value, indent + "  ");
        // If you like { on the same line as the key
        //value = "{\n" + od + "\n" + indent + "}";
        // If you prefer { and } to be aligned
        value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
      }
    }
    result += indent + "'" + property + "' : " + value + ",\n";
  }
  print(result.replace(/,\n$/, ""));
}
*/

//var Utils {};
//Utils.insideArray = false;

function dump(elem) {
    print(dumpObj(elem,0));
}
var dumpObj = function(elem,level) {
	var dumped = "";
    // elemect types
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