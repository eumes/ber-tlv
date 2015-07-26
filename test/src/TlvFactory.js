var Tlv_1 = require('./Tlv');
var TlvParser_1 = require('./TlvParser');
var TlvSerializer_1 = require('./TlvSerializer');
var TlvFactoryParsingError = (function () {
    function TlvFactoryParsingError(name, message, partialTlv) {
        this.name = name;
        this.message = message;
        this.partialTlv = partialTlv;
    }
    TlvFactoryParsingError.error = function (error, partialTlv) {
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
    TlvFactoryTlvError.errorTagEmpty = function () {
        return new TlvFactoryTlvError('Error creating tag', 'Tag must NOT be <null> or ""');
    };
    TlvFactoryTlvError.errorTagUnevenBytes = function (tag) {
        return new TlvFactoryTlvError('Error creating tag', 'Tag must be an even number, given ' + tag);
    };
    TlvFactoryTlvError.errorTagContainsNonHex = function (tag) {
        return new TlvFactoryTlvError('Error creating tag', 'Tag must only contain hex characters, given ' + tag);
    };
    TlvFactoryTlvError.errorTagIllegaType = function () {
        return new TlvFactoryTlvError('Error creating tag', 'Tag parameter is invalid');
    };
    TlvFactoryTlvError.errorValueIllegaType = function () {
        return new TlvFactoryTlvError('Error creating value', 'Value parameter is invalid');
    };
    TlvFactoryTlvError.errorItemsIllegaType = function () {
        return new TlvFactoryTlvError('Error creating items', 'Items parameter is invalid');
    };
    return TlvFactoryTlvError;
})();
exports.TlvFactoryTlvError = TlvFactoryTlvError;
var TlvFactorySerializationError = (function () {
    function TlvFactorySerializationError(name, message) {
        this.name = name;
        this.message = message;
    }
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
        if (Buffer.isBuffer(payload)) {
            this.value = payload;
            this.items = null;
        }
        else if (Array.isArray(payload)) {
            this.value = null;
            this.items = payload;
        }
        else {
            this.items = null;
            this.value = null;
        }
    }
    return Tlv;
})();
var TlvFactory = (function () {
    function TlvFactory() {
    }
    TlvFactory.primitiveTlv = function (tag, value) {
        var tagBuffer = TlvFactoryHelper.prepareTag(tag);
        var valueBuffer = TlvFactoryHelper.prepareBuffer(valueBuffer);
        return new Tlv(tagBuffer, valueBuffer);
    };
    TlvFactory.constructedTlv = function (tag, items) {
        var tagBuffer = TlvFactoryHelper.prepareTag(tag);
        var itemsArray = TlvFactoryHelper.prepareItems(items);
        return new Tlv(tagBuffer, itemsArray);
    };
    TlvFactory.parse = function (buffer) {
        var parseBuffer = TlvParser_1.TlvParser.prepareParseBuffer(buffer);
        var parseResult = TlvParser_1.TlvParser.parseItems(parseBuffer);
        if (parseResult.error != null) {
            throw TlvFactoryParsingError.error(parseResult.error, parseResult.result);
        }
        return parseResult.result;
    };
    TlvFactory.serialize = function (items) {
        var checkedItems = TlvFactoryHelper.prepareSerializeItems(items);
        var serializedTlv = TlvSerializer_1.TlvSerializer.serializeItems(checkedItems);
        return serializedTlv;
    };
    return TlvFactory;
})();
exports.TlvFactory = TlvFactory;
var TlvFactoryHelper = (function () {
    function TlvFactoryHelper() {
    }
    TlvFactoryHelper.prepareTag = function (tag) {
        if (tag == null) {
            throw TlvFactoryTlvError.errorTagEmpty();
        }
        var preparedTag = null;
        if (Buffer.isBuffer(tag)) {
            preparedTag = tag;
        }
        else if (typeof tag === 'string') {
            if (tag.length % 2 !== 0) {
                throw TlvFactoryTlvError.errorTagUnevenBytes(tag);
            }
            try {
                preparedTag = new Buffer(tag, 'hex');
            }
            catch (error) {
                throw TlvFactoryTlvError.errorTagContainsNonHex(tag);
            }
        }
        else {
            throw TlvFactoryTlvError.errorTagIllegaType();
        }
        return preparedTag;
    };
    TlvFactoryHelper.prepareBuffer = function (buffer) {
        var preparedBuffer = null;
        if (buffer == null) {
            preparedBuffer = new Buffer(0);
        }
        else if (Buffer.isBuffer(buffer)) {
            preparedBuffer = buffer;
        }
        else if (typeof buffer === 'string') {
            preparedBuffer = new Buffer(buffer, 'hex');
        }
        else {
            throw TlvFactoryTlvError.errorValueIllegaType();
        }
        return preparedBuffer;
    };
    TlvFactoryHelper.prepareItems = function (items) {
        var preparedItems = null;
        if (items == null) {
            preparedItems = [];
        }
        if (Array.isArray(items)) {
            preparedItems = items;
        }
        else {
            throw TlvFactoryTlvError.errorItemsIllegaType();
        }
        return preparedItems;
    };
    TlvFactoryHelper.prepareSerializeItems = function (items) {
        var preparedItems = null;
        if (items == null) {
            throw TlvFactoryTlvError.errorItemsIllegaType();
        }
        if (Array.isArray(items)) {
            preparedItems = items;
        }
        else {
            preparedItems = [];
            preparedItems.push(items);
        }
        return preparedItems;
    };
    return TlvFactoryHelper;
})();
