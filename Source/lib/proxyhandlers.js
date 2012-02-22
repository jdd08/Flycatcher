/**
*  In this handler we return a void behaviour
*  since we do not care what happens inside
*  the construtor we only want it execute so
*  that we can get its signature.
*/

exports.analyserHandler = {

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
        return Proxy.createFunction(self,function(){return Proxy.create(self)});
    },

    // proxy[name] = value
    set: function(receiver, name, value) {
        var self = this;
        this[name] = Proxy.create(self);
        return true;
        /*if (canPut(this.target, name)) { // canPut as defined in ES5 8.12.4 [[CanPut]]
     this.target[name] = value;
     return true;
   }*/

        // ignored for the sake of the analyzer, only signatures are needed
        //   return false; // causes proxy to throw in strict mode, ignore otherwise
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