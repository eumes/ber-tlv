var Tlv_1 = require('./Tlv');
var TlvParser_1 = require('./TlvParser');
var TlvSerializer_1 = require('./TlvSerializer');
var TlvFactoryParsingError = (function () {
    function TlvFactoryParsingError(name, message, partialTlv) {
        this.name = name;
        this.message = message;
        this.partialTlv = partialTlv;
    }
    TlvFactoryParsingError.errorPartialResult = function (error, partialTlv) {
        return new TlvFactoryParsingError(error.name, error.message, partialTlv);
    };
    return TlvFactoryParsingError;
})();
exports.TlvFactoryParsingError = TlvFactoryParsingError;
var TlvFactoryTlvError = (function () {
    function TlvFactoryTlvError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvFactoryTlvError.errorEmpty = function (parameter) {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" must not be <null> or ""');
    };
    TlvFactoryTlvError.errorUnevenBytes = function (parameter, given) {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" must be an even number, given "' + given + '"');
    };
    TlvFactoryTlvError.errorContainsNonHex = function (parameter, given) {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" must only contain hex characters, given "' + given + '"');
    };
    TlvFactoryTlvError.errorUnsupportedType = function (parameter) {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" is an unsupported format');
    };
    return TlvFactoryTlvError;
})();
exports.TlvFactoryTlvError = TlvFactoryTlvError;
var TlvFactorySerializationError = (function () {
    function TlvFactorySerializationError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvFactorySerializationError.errorUnsupportedType = function (parameter) {
        return new TlvFactorySerializationError('Error serializing ' + parameter, '"' + parameter + '" parameter type provided is not supported');
    };
    return TlvFactorySerializationError;
})();
exports.TlvFactorySerializationError = TlvFactorySerializationError;
var Tlv = (function () {
    function Tlv(tag, payload) {
        var tagBuffer = tag;
        var tagString = tagBuffer.toString('hex').toUpperCase();
        ;
        this.tag = tagString;
        this.type = Tlv_1.TlvHelper.typeFromTag(tagBuffer);
        this.class = Tlv_1.TlvHelper.classFromTag(tagBuffer);
        this.value = TlvFactoryHelper.verifyUncheckedTlvPrimitivePayload(this.type, payload);
        this.items = TlvFactoryHelper.verifyUncheckedTlvConstructedPayload(this.type, payload);
    }
    return Tlv;
})();
var TlvFactory = (function () {
    function TlvFactory() {
    }
    TlvFactory.primitiveTlv = function (tag, value) {
        var verifiedTag = TlvFactoryHelper.verifyGenericTag(tag);
        var verifiedValue = TlvFactoryHelper.verifyPrimitiveValue(value);
        var primitiveTlv = new Tlv(verifiedTag, verifiedValue);
        return primitiveTlv;
    };
    TlvFactory.constructedTlv = function (tag, items) {
        var verifiedTag = TlvFactoryHelper.verifyGenericTag(tag);
        var verifiedItems = TlvFactoryHelper.verifyConstructedItems(items);
        var constructedTlv = new Tlv(verifiedTag, verifiedItems);
        return constructedTlv;
    };
    TlvFactory.parse = function (buffer) {
        var verifiedValue = TlvFactoryHelper.verifyParseValue(buffer);
        var parsedResult = TlvParser_1.TlvParser.parseItems(verifiedValue);
        if (parsedResult.error != null) {
            throw TlvFactoryParsingError.errorPartialResult(parsedResult.error, parsedResult.result);
        }
        return parsedResult.result;
    };
    TlvFactory.serialize = function (items) {
        var verifiedItems = TlvFactoryHelper.verifySerializeItems(items);
        var serializedItems = TlvSerializer_1.TlvSerializer.serializeItems(verifiedItems);
        return serializedItems;
    };
    return TlvFactory;
})();
exports.TlvFactory = TlvFactory;
var TlvFactoryHelper = (function () {
    function TlvFactoryHelper() {
    }
    TlvFactoryHelper.verifyUncheckedTlvPrimitivePayload = function (type, payload) {
        if (type !== Tlv_1.TlvType.PRIMITIVE) {
            return null;
        }
        if (payload == null) {
            return new Buffer(0);
        }
        return payload;
    };
    TlvFactoryHelper.verifyUncheckedTlvConstructedPayload = function (type, payload) {
        if (type !== Tlv_1.TlvType.CONSTRUCTED) {
            return null;
        }
        if (payload == null) {
            return [];
        }
        return payload;
    };
    TlvFactoryHelper.verifyGenericTag = function (tag) {
        if (tag == null) {
            throw TlvFactoryTlvError.errorEmpty('tag');
        }
        var verifiedTag = null;
        if (Buffer.isBuffer(tag)) {
            verifiedTag = TlvFactoryHelper.fromBuffer(tag);
        }
        else if (typeof tag === 'string') {
            verifiedTag = TlvFactoryHelper.fromString('tag', tag);
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('tag');
        }
        return verifiedTag;
    };
    TlvFactoryHelper.verifyPrimitiveValue = function (buffer) {
        var verifiedValue = null;
        if (buffer == null) {
            verifiedValue = TlvFactoryHelper.emptyBuffer();
        }
        else if (Buffer.isBuffer(buffer)) {
            verifiedValue = TlvFactoryHelper.fromBuffer(buffer);
        }
        else if (typeof buffer === 'string') {
            verifiedValue = TlvFactoryHelper.fromString('value', buffer);
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('value');
        }
        return verifiedValue;
    };
    TlvFactoryHelper.verifyConstructedItems = function (items) {
        var verifiedItems = null;
        if (items == null) {
            verifiedItems = [];
        }
        if (Array.isArray(items)) {
            verifiedItems = items;
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('items');
        }
        return verifiedItems;
    };
    TlvFactoryHelper.verifyParseValue = function (buffer) {
        var verifiedValue = null;
        if (buffer == null) {
            verifiedValue = TlvFactoryHelper.emptyBuffer();
        }
        else if (Buffer.isBuffer(buffer)) {
            verifiedValue = TlvFactoryHelper.fromBuffer(buffer);
        }
        else if (typeof buffer === 'string') {
            verifiedValue = TlvFactoryHelper.fromString('value', buffer);
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('buffer');
        }
        return verifiedValue;
    };
    TlvFactoryHelper.verifySerializeItems = function (items) {
        var verifiedItems = null;
        if (items == null) {
            throw TlvFactoryTlvError.errorUnsupportedType('items');
        }
        if (Array.isArray(items)) {
            verifiedItems = items;
        }
        else {
            verifiedItems = [items];
        }
        return verifiedItems;
    };
    TlvFactoryHelper.emptyBuffer = function () {
        return new Buffer(0);
    };
    TlvFactoryHelper.fromBuffer = function (buffer) {
        var verifiedBuffer = buffer;
        return verifiedBuffer;
    };
    TlvFactoryHelper.fromString = function (parameter, string) {
        if (string.length % 2 !== 0) {
            throw TlvFactoryTlvError.errorUnevenBytes(parameter, string);
        }
        var verifiedString = null;
        try {
            verifiedString = new Buffer(string, 'hex');
        }
        catch (error) {
            throw TlvFactoryTlvError.errorContainsNonHex(parameter, string);
        }
        return verifiedString;
    };
    return TlvFactoryHelper;
})();
