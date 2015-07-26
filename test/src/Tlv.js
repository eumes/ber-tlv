var octet_buffer_1 = require('../node_modules/octet-buffer/dist/octet-buffer');
(function (TlvType) {
    TlvType[TlvType["PRIMITIVE"] = 0] = "PRIMITIVE";
    TlvType[TlvType["CONSTRUCTED"] = 1] = "CONSTRUCTED";
})(exports.TlvType || (exports.TlvType = {}));
var TlvType = exports.TlvType;
(function (TlvClass) {
    TlvClass[TlvClass["UNIVERSAL"] = 0] = "UNIVERSAL";
    TlvClass[TlvClass["APPLICATION"] = 1] = "APPLICATION";
    TlvClass[TlvClass["CONTEXT_SPECIFIC"] = 2] = "CONTEXT_SPECIFIC";
    TlvClass[TlvClass["PRIVATE"] = 3] = "PRIVATE";
})(exports.TlvClass || (exports.TlvClass = {}));
var TlvClass = exports.TlvClass;
var Tlv = (function () {
    function Tlv(tag, payload) {
        var tagBuffer = tag;
        var tagString = tagBuffer.toString('hex').toUpperCase();
        ;
        this.tag = tagString;
        this.type = TlvParser.typeFromTag(tagBuffer);
        this.class = TlvParser.classFromTag(tagBuffer);
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
    Tlv.prototype.serialize = function () {
        if (this.type === TlvType.CONSTRUCTED) {
            return TlvSerializer.serializeConstrucedItem(this);
        }
        return TlvSerializer.serializePrimitiveItem(this);
    };
    return Tlv;
})();
var TlvFactory = (function () {
    function TlvFactory() {
    }
    TlvFactory.primitiveTlv = function (tag, value) {
        var tagBuffer = TlvParser.prepareTag(tag);
        var valueBuffer = TlvParser.prepareBuffer(valueBuffer);
        return new Tlv(tagBuffer, valueBuffer);
    };
    TlvFactory.constructedTlv = function (tag, items) {
        var tagBuffer = TlvParser.prepareTag(tag);
        var itemsArray = TlvParser.prepareItems(items);
        return new Tlv(tagBuffer, itemsArray);
    };
    TlvFactory.parseVerbose = function (buffer) {
        var parseBuffer = TlvParser.prepareParseBuffer(buffer);
        var octetBuffer = new octet_buffer_1.OctetBuffer(parseBuffer);
        var deserializeResult = TlvParser.parseItems(octetBuffer);
        var result = new TlvParsingResult(deserializeResult.result, deserializeResult.error);
        return result;
    };
    TlvFactory.parse = function (buffer) {
        var result = this.parseVerbose(buffer);
        if (result.error !== null) {
            return null;
        }
        return result.result;
    };
    return TlvFactory;
})();
exports.TlvFactory = TlvFactory;
var TlvParsingResult = (function () {
    function TlvParsingResult(result, error) {
        this.result = result;
        this.error = error;
    }
    return TlvParsingResult;
})();
var TlvError = (function () {
    function TlvError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvError.errorTagEmpty = function () {
        return new TlvParsingError('Error creating tag', 'Tag must NOT be <null> or ""');
    };
    TlvError.errorTagUnevenBytes = function (tag) {
        return new TlvParsingError('Error creating tag', 'Tag must be an even number, given ' + tag);
    };
    TlvError.errorTagContainsNonHex = function (tag) {
        return new TlvParsingError('Error creating tag', 'Tag must only contain hex characters, given ' + tag);
    };
    return TlvError;
})();
var TlvSerializationError = (function () {
    function TlvSerializationError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvSerializationError.errorPayloadToBig = function (tag, requested, maximum) {
        return new TlvSerializationError('Error while serializing item ' + tag + '"', 'Present length is ' + requested + ', maximum supported ' + maximum);
    };
    return TlvSerializationError;
})();
var TlvParsingError = (function () {
    function TlvParsingError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvParsingError.errorBufferNull = function () {
        return new TlvParsingError('Error parsing data', 'Buffer must NOT be <null>');
    };
    TlvParsingError.errorParsingTagInsufficientData = function (partialTag) {
        return new TlvParsingError('Error while reading tag for item starting with "' + partialTag.toString('hex').toUpperCase() + '"', 'Need at least 1 additional byte to complete tag');
    };
    TlvParsingError.errorParsingLengthInsufficientData = function (tag, missing) {
        return new TlvParsingError('Error while reading length for item "' + tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes to read length information');
    };
    TlvParsingError.errorParsingLengthNumberTooBig = function (tag, given) {
        return new TlvParsingError('Error while reading length for item "' + tag.toString('hex').toUpperCase() + '"', 'Maximum number of concatenated length bytes supported is 4, present ' + given);
    };
    TlvParsingError.errorParsingValueInsufficientData = function (tag, missing) {
        return new TlvParsingError('Error while reading value for item "' + tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes for reading complete value');
    };
    return TlvParsingError;
})();
var TlvParserResult = (function () {
    function TlvParserResult(result, error) {
        this.result = result;
        this.error = error;
    }
    return TlvParserResult;
})();
var TlvParser = (function () {
    function TlvParser() {
    }
    TlvParser.prepareTag = function (tag) {
        if (tag == null) {
            throw TlvError.errorTagEmpty();
        }
        var preparedTag = null;
        if (Buffer.isBuffer(tag)) {
            preparedTag = tag;
        }
        else if (typeof tag === 'string') {
            if (tag.length % 2 !== 0) {
                throw TlvError.errorTagUnevenBytes(tag);
            }
            try {
                preparedTag = new Buffer(tag, 'hex');
            }
            catch (error) {
                throw TlvError.errorTagContainsNonHex(tag);
            }
        }
        else {
        }
        return preparedTag;
    };
    TlvParser.prepareBuffer = function (buffer) {
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
        }
        return preparedBuffer;
    };
    TlvParser.prepareItems = function (items) {
        var preparedItems = null;
        if (items == null) {
            preparedItems = [];
        }
        if (Array.isArray(items)) {
            preparedItems = items;
        }
        else {
        }
        return preparedItems;
    };
    TlvParser.prepareParseBuffer = function (buffer) {
        var preparedParseBuffer = null;
        if (buffer == null) {
            preparedParseBuffer = new Buffer(0);
        }
        else if (Buffer.isBuffer(buffer)) {
            preparedParseBuffer = buffer;
        }
        else if (typeof buffer === 'string') {
            preparedParseBuffer = new Buffer(buffer, 'hex');
        }
        else {
        }
        return preparedParseBuffer;
    };
    TlvParser.parseItems = function (buffer) {
        var items = [];
        var errorOccured = false;
        while (buffer.remaining > 0) {
            this.skipZeroBytes(buffer);
            var parseResult = this.parseItem(buffer);
            if (parseResult.result != null) {
                items.push(parseResult.result);
            }
            if (parseResult.error != null) {
                return new TlvParserResult(items, parseResult.error);
            }
        }
        return new TlvParserResult(items, null);
    };
    TlvParser.skipZeroBytes = function (buffer) {
        var peeked;
        while (buffer.remaining > 0) {
            peeked = buffer.peek();
            if (peeked !== 0x00) {
                break;
            }
            buffer.readUInt8();
        }
        return buffer;
    };
    TlvParser.parseItem = function (buffer) {
        //console.log('start parsing single items, remaining length: ' + buffer.remaining);
        var tagParsingResult = this.parseTag(buffer);
        if (tagParsingResult.error != null) {
            return new TlvParserResult(null, tagParsingResult.error);
        }
        var tagBuffer = tagParsingResult.result;
        var type = this.typeFromTag(tagBuffer);
        var lengthParsingResult = this.parseLength(buffer, tagBuffer);
        if (lengthParsingResult.error != null) {
            return new TlvParserResult(null, lengthParsingResult.error);
        }
        var length = lengthParsingResult.result;
        var valueParsingResult = this.parseValue(buffer, length, tagBuffer);
        var value = valueParsingResult.result;
        if (valueParsingResult.error != null) {
            var tlvItem = TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
        if (type == TlvType.PRIMITIVE) {
            var tlvItem = TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
        else {
            var subBuffer = new octet_buffer_1.OctetBuffer(value);
            var subParsingResult = this.parseItems(subBuffer);
            var tlvItem = TlvFactory.constructedTlv(tagBuffer, subParsingResult.result);
            return new TlvParserResult(tlvItem, subParsingResult.error);
        }
    };
    TlvParser.parseTag = function (buffer) {
        if (buffer.remaining === 0) {
            return new TlvParserResult(null, TlvParsingError.errorParsingTagInsufficientData(new Buffer(0)));
        }
        var tagBuffer = new octet_buffer_1.OctetBuffer();
        var tagByte = buffer.readUInt8();
        tagBuffer.writeUInt8(tagByte);
        if ((tagByte & 0x1F) !== 0x1F) {
            return new TlvParserResult(tagBuffer.backingBuffer, null);
        }
        do {
            if (buffer.remaining === 0) {
                return new TlvParserResult(tagBuffer.backingBuffer, TlvParsingError.errorParsingTagInsufficientData(tagBuffer.backingBuffer));
            }
            tagByte = buffer.readUInt8();
            tagBuffer.writeUInt8(tagByte);
        } while ((tagByte & 0x80) == 0x80);
        return new TlvParserResult(tagBuffer.backingBuffer, null);
    };
    TlvParser.parseLength = function (buffer, tag) {
        if (buffer.remaining == 0) {
            return new TlvParserResult(null, TlvParsingError.errorParsingLengthInsufficientData(tag, 1));
        }
        var length = buffer.readUInt8();
        if ((length & 0x80) != 0x80) {
            return new TlvParserResult(length, null);
        }
        var bytesToRead = (length & 0x7F);
        if (bytesToRead > 4) {
            return new TlvParserResult(null, TlvParsingError.errorParsingLengthNumberTooBig(tag, bytesToRead));
        }
        if (buffer.remaining < bytesToRead) {
            return new TlvParserResult(null, TlvParsingError.errorParsingLengthInsufficientData(tag, bytesToRead - buffer.remaining));
        }
        var nextByte;
        length = 0;
        for (var i = 0; i < bytesToRead; i++) {
            nextByte = buffer.readUInt8();
            length = length << 8;
            length = length | nextByte;
        }
        return new TlvParserResult(length, null);
    };
    TlvParser.parseValue = function (buffer, length, tag) {
        if (buffer.remaining < length) {
            var remaining = buffer.remaining;
            var partialValue = buffer.readBufferRemainig();
            return new TlvParserResult(partialValue, TlvParsingError.errorParsingValueInsufficientData(tag, length - remaining));
        }
        var value = buffer.readBuffer(length);
        return new TlvParserResult(value, null);
    };
    TlvParser.typeFromTag = function (tagBuffer) {
        var firstTagByte = tagBuffer.readUInt8(0);
        var typeIdentifier = (firstTagByte & 0x20);
        if (typeIdentifier == 0x20) {
            return TlvType.CONSTRUCTED;
        }
        else {
            return TlvType.PRIMITIVE;
        }
    };
    TlvParser.classFromTag = function (tagBuffer) {
        var firstTagByte = tagBuffer.readUInt8(0);
        var classIdentifier = (firstTagByte & 0xC0);
        if (classIdentifier == 0x00) {
            return TlvClass.UNIVERSAL;
        }
        if (classIdentifier == 0x40) {
            return TlvClass.APPLICATION;
        }
        if (classIdentifier == 0x80) {
            return TlvClass.CONTEXT_SPECIFIC;
        }
        if (classIdentifier == 0xC0) {
            return TlvClass.PRIVATE;
        }
    };
    return TlvParser;
})();
var TlvSerializer = (function () {
    function TlvSerializer() {
    }
    TlvSerializer.serializeConstrucedItem = function (item) {
        var serializedItems = [];
        item.items.forEach(function (item) {
            serializedItems.push(item.serialize());
        });
        var serializedItemsBuffer = Buffer.concat(serializedItems);
        var tagBuffer = new Buffer(item.tag, 'hex');
        var lengthBuffer = this.lengthBufferForLengt(item.tag, serializedItemsBuffer.length);
        var serializedItem = Buffer.concat([tagBuffer, lengthBuffer, serializedItemsBuffer]);
        return serializedItem;
    };
    TlvSerializer.serializePrimitiveItem = function (item) {
        var tagBuffer = new Buffer(item.tag, 'hex');
        var lengthBuffer = this.lengthBufferForLengt(item.tag, item.value.length);
        var serializedItem = Buffer.concat([tagBuffer, lengthBuffer, item.value]);
        return serializedItem;
    };
    TlvSerializer.lengthBufferForLengt = function (tag, length) {
        var octetBuffer = new octet_buffer_1.OctetBuffer(new Buffer(1));
        if (length < 0x80) {
            octetBuffer.writeUInt8(length);
        }
        else if (length <= 0xFF) {
            octetBuffer.writeUInt8(0x81);
            octetBuffer.writeUInt8(length);
        }
        else if (length <= 0xFFFF) {
            octetBuffer.writeUInt8(0x82);
            octetBuffer.writeUInt16(length);
        }
        else if (length <= 0xFFFFFF) {
            octetBuffer.writeUInt8(0x83);
            octetBuffer.writeUInt24(length);
        }
        else if (length <= 0xFFFFFFFF) {
            octetBuffer.writeUInt8(0x84);
            octetBuffer.writeUInt32(length);
        }
        else {
            throw TlvSerializationError.errorPayloadToBig(tag, length, 0xFFFFFFFF);
        }
        return octetBuffer.backingBuffer;
    };
    return TlvSerializer;
})();
