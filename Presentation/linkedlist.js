

    function LinkedList() {
        this.length = 0;
        this.first = null;
        this.last = null;
    }

    LinkedList.prototype = {
        append: function(node) {
            // implementation
        },

        remove: function(node) {
            // implementation
        },

        size: function() {
            // implementation
        },
    ...
    }
    
    var l = new LinkedList();
    var node = new Node();
    l.append(node);
    l.remove(node);
    l.append(node);
    assert(l.size() === 1);

    
    
    var linkedList = new LinkedList();

    var node1 = new Node(123);
    linkedList.add(node1);

    var node2 = new Node(234);
    linkedList.add(node2);
    assert(linkedList.size() = 2);

    var node3 = new Node(345);
    linkedList.add(node3);
    assert(linkedList.size() = 3);
    
    
    
    
    
    