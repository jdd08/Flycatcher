
exports.generate = function(paramTypes) {
    function getRandomNumber() {
        MAX_INT = 700;
        return Math.floor(Math.random()*MAX_INT);
    }
    function getRandomString() {
        MAX_LENGTH = 10;
        var string = "";
        var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for(var i=0; i < Math.ceil(Math.random()*MAX_LENGTH); i++) {
            string += charSet.charAt(Math.floor(Math.random() * charSet.length));
        }
        return string;
    }
    function getRandomBoolean() {
        return Math.floor(Math.random()*2) === 1;
    }
    function getRandomValueFromType(type) {
        var randomValue;
        switch(type) {
            case "int": {
                randomValue = getRandomNumber();
                break;
            }
            case "string": {
                randomValue = getRandomString();
                break;
            }
            case "boolean": {
                randomValue = getRandomBoolean();
                break;
            }
        }
        return randomValue;
    }
    var randomParams = [];
    for(var i = 0; i<paramTypes.length; i++) {
        randomParams[i] = getRandomValueFromType(paramTypes[i]);
    }
    return randomParams;
}