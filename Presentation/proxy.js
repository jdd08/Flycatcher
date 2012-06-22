




_    var proxy = Proxy.create({
      get: function(receiver, name) {
        return name + " -> It's a trap!";
      }
    });

    proxy.treasure = "gold";
    proxy.treasure // returns "treasure -> It's a trap!"
    
    
    get: function(rcvr, name) {
        var handler = this;
        if (name === "valueOf") {
            return function() {
                return 1;
            }
        }
        else {
            return Proxy.createFunction(handler, // Object Proxy
                                        function() { // Function Proxy
                                            return Proxy.create(handler)
                                        });
        }
    }
    
    
    var linkedlist325 = new LinkedList();
    var node326 = new Node("AdlwkJCa2");
    linkedlist325.prepend(node326);
    assert.equal(linkedlist325.remove(node326), true);
    linkedlist325.size();
    var node327 = new Node("5asd24all");
    linkedlist325.prepend(node327);
    var node328 = new Node("azcma5");
    assert.equal(linkedlist325.remove(node328), false);
    // Success!
    
    
    
    var linkedlist309 = new LinkedList();
    var node310 = new Node("J619y4xu1");
    var node311 = new Node("segBPUR5");
    linkedlist309.insertBefore(node310,node311);
    linkedlist309.at(22);
    var node312 = new Node("L93Ifj7t75");
    linkedlist309.append(node312);
    var node313 = new Node("9");
    linkedlist309.remove(node313);
    // TypeError: Cannot set property 'next' of null
    // in method insertBefore of class LinkedList
    
    
    