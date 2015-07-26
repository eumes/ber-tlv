var util = require('util');
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
    function Tlv(tagBuffer, items, value) {
        if (items === void 0) { items = []; }
        if (value === void 0) { value = new Buffer(0); }
        this.items = items;
        this.value = value;
        this.tag = tagBuffer.toString('hex').toUpperCase();
        this.type = TlvParser.typeFromTag(tagBuffer);
        this.class = TlvParser.classFromTag(tagBuffer);
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
        value = TlvParser.prepareBuffer(value);
        return new Tlv(tagBuffer, [], value);
    };
    TlvFactory.constructedTlv = function (tag, value, items) {
        var tagBuffer = TlvParser.prepareTag(tag);
        items = TlvParser.prepareItems(items);
        return new Tlv(tagBuffer, items, value);
    };
    TlvFactory.parseVerbose = function (buffer) {
        buffer = TlvParser.prepareParseBuffer(buffer);
        var octetBuffer = new octet_buffer_1.OctetBuffer(buffer);
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
        return new TlvParsingError('Error while reading tag for item starting with "' + partialTag + '"', 'Need at least 1 additional byte to complete tag');
    };
    TlvParsingError.errorParsingLengthInsufficientData = function (tag, missing) {
        return new TlvParsingError('Error while reading length for item "' + tag + '"', 'Need at least ' + missing + ' addional bytes to read length information');
    };
    TlvParsingError.errorParsingLengthNumberTooBig = function (tag, given) {
        return new TlvParsingError('Error while reading length for item "' + tag + '"', 'Maximum number of concatenated length bytes supported is 4, present ' + given);
    };
    TlvParsingError.errorParsingValueInsufficientData = function (tag, missing) {
        return new TlvParsingError('Error while reading value for item "' + tag + '"', 'Need at least ' + missing + ' addional bytes for reading complete value');
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
        if (tag === null || tag.length === 0) {
            throw TlvError.errorTagEmpty();
        }
        if (tag.length % 2 !== 0) {
            throw TlvError.errorTagUnevenBytes(tag);
        }
        var buffer;
        try {
            buffer = new Buffer(tag, 'hex');
        }
        catch (error) {
            throw TlvError.errorTagContainsNonHex(tag);
        }
        return buffer;
    };
    TlvParser.prepareBuffer = function (buffer) {
        if (buffer === null) {
            buffer = new Buffer(0);
        }
        return buffer;
    };
    TlvParser.prepareItems = function (items) {
        if (items === null) {
            items = [];
        }
        return items;
    };
    TlvParser.prepareParseBuffer = function (buffer) {
        if (buffer === null) {
            throw TlvParsingError.errorBufferNull();
        }
        return buffer;
    };
    TlvParser.parseItems = function (buffer) {
        var items = [];
        var errorOccured = false;
        while (buffer.remaining > 0) {
            var parseResult = this.parseItem(buffer);
            if (parseResult.result != null) {
                items.push(parseResult.result);
            }
            if (parseResult.error != null) {
                return new TlvParserResult(items, parseResult.error);
            }
        }
        console.log('parsing completed with tags: ' + util.inspect(items, { showHidden: false, depth: null }));
        return new TlvParserResult(items, null);
    };
    TlvParser.parseItem = function (buffer) {
        // console.log('start parsing single items, remaining length: ' + buffer.remaining);
        var tagParsingResult = this.parseTag(buffer);
        if (tagParsingResult.error != null) {
            return new TlvParserResult(null, tagParsingResult.error);
        }
        var tag = tagParsingResult.result;
        var tagBuffer = new Buffer(tag, 'hex');
        var type = this.typeFromTag(tagBuffer);
        var lengthParsingResult = this.parseLength(buffer, tag);
        if (lengthParsingResult.error != null) {
            return new TlvParserResult(null, lengthParsingResult.error);
        }
        var length = lengthParsingResult.result;
        var valueParsingResult = this.parseValue(buffer, length, tag);
        var value = valueParsingResult.result;
        if (valueParsingResult.error != null) {
            var tlvItem = TlvFactory.primitiveTlv(tag, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
        if (type == TlvType.PRIMITIVE) {
            var tlvItem = TlvFactory.primitiveTlv(tag, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
        else {
            var subBuffer = new octet_buffer_1.OctetBuffer(value);
            var subParsingResult = this.parseItems(subBuffer);
            var tlvItem = TlvFactory.constructedTlv(tag, value, subParsingResult.result);
            return new TlvParserResult(tlvItem, subParsingResult.error);
        }
    };
    TlvParser.parseTag = function (buffer) {
        if (buffer.remaining == 0) {
            return new TlvParserResult(null, TlvParsingError.errorParsingTagInsufficientData(''));
        }
        var tagBuffer = new octet_buffer_1.OctetBuffer();
        var tagByte = buffer.readUInt8();
        tagBuffer.writeUInt8(tagByte);
        if ((tagByte & 0x1F) != 0x1F) {
            var tag = tagBuffer.toString().toUpperCase();
            return new TlvParserResult(tag, null);
        }
        do {
            if (buffer.remaining == 0) {
                var partialTag = tagBuffer.toString().toUpperCase();
                return new TlvParserResult(null, TlvParsingError.errorParsingTagInsufficientData(partialTag));
            }
            tagByte = buffer.readUInt8();
            tagBuffer.writeUInt8(tagByte);
        } while ((tagByte & 0x80) == 0x80);
        var tag = tagBuffer.toString().toUpperCase();
        return new TlvParserResult(tag, null);
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
            console.log('need ' + length + ', available ' + buffer.remaining);
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
