/**
*  In this handler we return a void behaviour
*  since we do not care what happens inside
*  the construtor we only want it execute so
*  that we can get its signature.
*/

exports.analyserHandler = {

    delete: function(name) {
        console.log(name)
        var self = this;
        return Proxy.createFunction(self,
        function() {
            return Proxy.create(self)
        });
    },

    // ignoring fundamental traps that aren't in ES5
    getOwnPropertyDescriptor: function(name) {
        var desc = Object.getOwnPropertyDescriptor(this, name);
        // a trapping proxy's properties must always be configurable
        if (desc !== undefined) {
            desc.configurable = true;
        }
        return desc;
    },

    // proxy[name] -> any
    get: function(rcvr, name) {
        var self = this;
        if (name === "valueOf") {
            return function() {
                return 1;
            }
        }
        else {
            return Proxy.createFunction(self,
            function() {
                return Proxy.create(self)
            });
        }
    },

    // proxy[name] = value
    set: function(receiver, name, value) {
        this[name] = Proxy.create(this);
        return true;
    },

    // name in proxy -> boolean
    has: function(name) {
        return false;
    },

    // for (var name in proxy) { ... }
    enumerate: function() {
        var result = [];
        for (var name in this.target) {
            result.push(name);
        };
        return result;
    },

    // Object.keys(proxy) -> [ string ]
    keys: function() {
        return [];
    }
};

exports.execHandler = {

    delete: function(name) {
        console.log(name)
        var self = this;
        return Proxy.createFunction(self,
        function() {
            return Proxy.create(self)
        });
    },

    // ignoring fundamental traps that aren't in ES5
    getOwnPropertyDescriptor: function(name) {
        var desc = Object.getOwnPropertyDescriptor(this, name);
        // a trapping proxy's properties must always be configurable
        if (desc !== undefined) {
            desc.configurable = true;
        }
        return desc;
    },

    // proxy[name] -> any
    get: function(rcvr, name) {
        var self = this;
        if (name === "valueOf") {
            return function() {
                return 1;
            }
        }
        else {
            return Proxy.createFunction(self,
            function() {
                return Proxy.create(self)
            });
        }
    },

    // proxy[name] = value
    set: function(receiver, name, value) {
        this[name] = Proxy.create(this);
        return true;
    },

    // name in proxy -> boolean
    has: function(name) {
        return false;
    },

    // for (var name in proxy) { ... }
    enumerate: function() {
        var result = [];
        for (var name in this.target) {
            result.push(name);
        };
        return result;
    },

    // Object.keys(proxy) -> [ string ]
    keys: function() {
        return [];
    }
};