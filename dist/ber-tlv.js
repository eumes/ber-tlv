var OctetBufferError = (function () {
    function OctetBufferError(name, message) {
        this.name = name;
        this.message = message;
    }
    OctetBufferError.errorReadingCausedByInsufficientBytes = function (type, missingBytes) {
        return new OctetBufferError('Error reading <' + type + '>', 'Buffer is missing ' + missingBytes + ' bytes');
    };
    OctetBufferError.errorConstructorWrongParameterType = function () {
        return new OctetBufferError('Error creating <OctetBuffer>', 'Provided constructor parameter is not valid');
    };
    OctetBufferError.errorMethodWrongParameterType = function () {
        return new OctetBufferError('Error interacting with <OctetBuffer>', 'Provided parameter is not valid');
    };
    return OctetBufferError;
})();
var UINT8_BYTES = 1;
var UINT16_BYTES = 2;
var UINT24_BYTES = 3;
var UINT32_BYTES = 4;
var OctetBuffer = (function () {
    function OctetBuffer(param) {
        if (typeof param === 'string') {
            var buffer = new Buffer(param, 'hex');
            this.backingBuffer = buffer;
        }
        else if (Buffer.isBuffer(param)) {
            this.backingBuffer = param;
        }
        else if (param == null) {
            this.backingBuffer = new Buffer(0);
        }
        else {
            throw OctetBufferError.errorConstructorWrongParameterType();
        }
        this.reset();
    }
    Object.defineProperty(OctetBuffer.prototype, "backingBuffer", {
        get: function () {
            return this._backingBuffer;
        },
        set: function (buffer) {
            this.checkParameterIsBuffer(buffer);
            this._backingBuffer = buffer;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OctetBuffer.prototype, "position", {
        get: function () {
            return this._position;
        },
        set: function (position) {
            this._position = position;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OctetBuffer.prototype, "available", {
        get: function () {
            return this.backingBuffer.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OctetBuffer.prototype, "remaining", {
        get: function () {
            return this.available - this.position;
        },
        enumerable: true,
        configurable: true
    });
    OctetBuffer.prototype.incrementPositionBy = function (incrementBy) {
        this.checkParameterIsNumber(incrementBy);
        this.position += incrementBy;
    };
    OctetBuffer.prototype.reset = function () {
        this.position = 0;
    };
    OctetBuffer.prototype.readUInt8 = function () {
        this.checkRemainingBytesAndThrow('uint8', UINT8_BYTES);
        var uint = this.backingBuffer.readUInt8(this.position);
        this.incrementPositionBy(UINT8_BYTES);
        return uint;
    };
    OctetBuffer.prototype.readUInt16 = function () {
        this.checkRemainingBytesAndThrow('uint16', UINT16_BYTES);
        var uint = this.backingBuffer.readUInt16BE(this.position);
        this.incrementPositionBy(UINT16_BYTES);
        return uint;
    };
    OctetBuffer.prototype.readUInt24 = function () {
        this.checkRemainingBytesAndThrow('uint24', UINT24_BYTES);
        var uint = OctetBuffer.readUInt24BE(this.backingBuffer, this.position);
        this.incrementPositionBy(UINT24_BYTES);
        return uint;
    };
    OctetBuffer.prototype.readUInt32 = function () {
        this.checkRemainingBytesAndThrow('uint32', UINT32_BYTES);
        var uint = this.backingBuffer.readUInt32BE(this.position);
        this.incrementPositionBy(UINT32_BYTES);
        return uint;
    };
    OctetBuffer.prototype.readBuffer = function (count) {
        if (count === void 0) { count = 1; }
        this.checkParameterIsNumber(count);
        this.checkRemainingBytesAndThrow('Buffer', count);
        var readBuffer = new Buffer(count);
        this.backingBuffer.copy(readBuffer, 0, this.position, this.position + count);
        this.incrementPositionBy(count);
        return readBuffer;
    };
    OctetBuffer.prototype.readBufferRemainig = function () {
        var readBuffer = this.readBuffer(this.remaining);
        return readBuffer;
    };
    OctetBuffer.prototype.writeUInt8 = function (uint) {
        this.checkParameterIsNumber(uint);
        this.extendBackingBufferToAcceptAdditionalBytes(UINT8_BYTES);
        OctetBuffer.writeUInt8(this.backingBuffer, uint, this.position);
        this.incrementPositionBy(UINT8_BYTES);
        return this;
    };
    OctetBuffer.prototype.writeUInt16 = function (uint) {
        this.checkParameterIsNumber(uint);
        this.extendBackingBufferToAcceptAdditionalBytes(UINT16_BYTES);
        OctetBuffer.writeUInt16BE(this.backingBuffer, uint, this.position);
        this.incrementPositionBy(UINT16_BYTES);
        return this;
    };
    OctetBuffer.prototype.writeUInt24 = function (uint) {
        this.checkParameterIsNumber(uint);
        this.extendBackingBufferToAcceptAdditionalBytes(UINT24_BYTES);
        OctetBuffer.writeUInt24BE(this.backingBuffer, uint, this.position);
        this.incrementPositionBy(UINT24_BYTES);
        return this;
    };
    OctetBuffer.prototype.writeUInt32 = function (uint) {
        this.checkParameterIsNumber(uint);
        this.extendBackingBufferToAcceptAdditionalBytes(UINT32_BYTES);
        OctetBuffer.writeUInt32BE(this.backingBuffer, uint, this.position);
        this.incrementPositionBy(UINT32_BYTES);
        return this;
    };
    OctetBuffer.prototype.writeArray = function (array) {
        this.checkParameterIsArray(array);
        var buffer = new Buffer(array);
        return this.writeBuffer(buffer);
    };
    OctetBuffer.prototype.writeBuffer = function (buffer) {
        this.checkParameterIsBuffer(buffer);
        this.extendBackingBufferToAcceptAdditionalBytes(buffer.length);
        this.writeBufferToBackingBuffer(buffer);
        this.incrementPositionBy(buffer.length);
        return this;
    };
    OctetBuffer.prototype.serialize = function () {
        return this._backingBuffer.toString('hex').toUpperCase();
    };
    OctetBuffer.prototype.extendBackingBufferToAcceptAdditionalBytes = function (additionalBytes) {
        if (this.remaining >= additionalBytes) {
            return;
        }
        var missingBytes = additionalBytes - this.remaining;
        var extendedBuffer = new Buffer(this.available + missingBytes);
        this.backingBuffer.copy(extendedBuffer, 0, 0, this.available);
        this.backingBuffer = extendedBuffer;
    };
    OctetBuffer.prototype.writeBufferToBackingBuffer = function (buffer) {
        buffer.copy(this.backingBuffer, this.position, 0, buffer.length);
    };
    OctetBuffer.readUInt24BE = function (buffer, position) {
        var uint = 0;
        uint = buffer.readUInt8(position) << 16;
        uint |= buffer.readUInt8(position + 1) << 8;
        uint |= buffer.readUInt8(position + 2) << 0;
        return uint;
    };
    OctetBuffer.writeUInt8 = function (buffer, uint, positon) {
        buffer.writeUInt8((uint & 0xff) >>> 0, positon);
    };
    OctetBuffer.writeUInt16BE = function (buffer, uint, positon) {
        buffer.writeUInt8((uint & 0xff00) >>> 8, positon);
        buffer.writeUInt8((uint & 0x00ff) >>> 0, positon + 1);
    };
    OctetBuffer.writeUInt24BE = function (buffer, uint, positon) {
        buffer.writeUInt8((uint & 0xff0000) >>> 16, positon);
        buffer.writeUInt8((uint & 0x00ff00) >>> 8, positon + 1);
        buffer.writeUInt8((uint & 0x0000ff) >>> 0, positon + 2);
    };
    OctetBuffer.writeUInt32BE = function (buffer, uint, positon) {
        buffer.writeUInt8((uint & 0xff000000) >>> 24, positon);
        buffer.writeUInt8((uint & 0x00ff0000) >>> 16, positon + 1);
        buffer.writeUInt8((uint & 0x0000ff00) >>> 8, positon + 2);
        buffer.writeUInt8((uint & 0x000000ff) >>> 0, positon + 3);
    };
    OctetBuffer.prototype.checkRemainingBytesAndThrow = function (type, requiredBytes) {
        if (requiredBytes > this.remaining) {
            var missingBytes = requiredBytes - this.remaining;
            throw OctetBufferError.errorReadingCausedByInsufficientBytes(type, missingBytes);
        }
    };
    OctetBuffer.prototype.checkParameterIsNumber = function (param) {
        if (param == null) {
            throw OctetBufferError.errorMethodWrongParameterType();
        }
        else if (typeof param !== 'number') {
            throw OctetBufferError.errorMethodWrongParameterType();
        }
    };
    OctetBuffer.prototype.checkParameterIsArray = function (param) {
        if (param == null) {
            throw OctetBufferError.errorMethodWrongParameterType();
        }
        else if (typeof param !== 'number') {
            throw OctetBufferError.errorMethodWrongParameterType();
        }
    };
    OctetBuffer.prototype.checkParameterIsBuffer = function (param) {
        if (param == null) {
            throw OctetBufferError.errorMethodWrongParameterType();
        }
        else if (!Buffer.isBuffer(param)) {
            throw OctetBufferError.errorMethodWrongParameterType();
        }
    };
    return OctetBuffer;
})();
exports.OctetBuffer = OctetBuffer;
var ByteHelper = (function () {
    function ByteHelper() {
    }
    ByteHelper.hexStringMatchesHexBitflags = function (param1, param2) {
        return true;
    };
    ;
    ByteHelper.hexStringMatchesHexBitpattern = function (param1, param2) {
        return true;
    };
    ;
    return ByteHelper;
})();
exports.ByteHelper = ByteHelper;
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
        var octetBuffer = new OctetBuffer(parseBuffer);
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
            var subBuffer = new OctetBuffer(value);
            var subParsingResult = this.parseItems(subBuffer);
            var tlvItem = TlvFactory.constructedTlv(tagBuffer, subParsingResult.result);
            return new TlvParserResult(tlvItem, subParsingResult.error);
        }
    };
    TlvParser.parseTag = function (buffer) {
        if (buffer.remaining === 0) {
            return new TlvParserResult(null, TlvParsingError.errorParsingTagInsufficientData(new Buffer(0)));
        }
        var tagBuffer = new OctetBuffer();
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
        var octetBuffer = new OctetBuffer(new Buffer(1));
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
var currencyLookup = require('country-data').lookup;
var countryLookup = require('i18n-iso-countries');
(function (AnnotationValueFormat) {
    AnnotationValueFormat[AnnotationValueFormat["ALPHABETIC"] = 0] = "ALPHABETIC";
    AnnotationValueFormat[AnnotationValueFormat["ALPHANUMERIC"] = 1] = "ALPHANUMERIC";
    AnnotationValueFormat[AnnotationValueFormat["ALPHANUMERIC_SPECIAL"] = 2] = "ALPHANUMERIC_SPECIAL";
    AnnotationValueFormat[AnnotationValueFormat["UNSIGNED_NUMBER"] = 3] = "UNSIGNED_NUMBER";
    AnnotationValueFormat[AnnotationValueFormat["COMPRESSED_NUMERIC"] = 4] = "COMPRESSED_NUMERIC";
    AnnotationValueFormat[AnnotationValueFormat["NUMERIC"] = 5] = "NUMERIC";
    AnnotationValueFormat[AnnotationValueFormat["VARIABLE_BITS"] = 6] = "VARIABLE_BITS";
    AnnotationValueFormat[AnnotationValueFormat["VARIABLE_BYTES"] = 7] = "VARIABLE_BYTES";
    AnnotationValueFormat[AnnotationValueFormat["YYMMDD"] = 8] = "YYMMDD";
    AnnotationValueFormat[AnnotationValueFormat["HHMMSS"] = 9] = "HHMMSS";
})(exports.AnnotationValueFormat || (exports.AnnotationValueFormat = {}));
var AnnotationValueFormat = exports.AnnotationValueFormat;
(function (AnnotationValueReference) {
    AnnotationValueReference[AnnotationValueReference["ISO_3166"] = 0] = "ISO_3166";
    AnnotationValueReference[AnnotationValueReference["ISO_4217"] = 1] = "ISO_4217";
})(exports.AnnotationValueReference || (exports.AnnotationValueReference = {}));
var AnnotationValueReference = exports.AnnotationValueReference;
var AnnotationValueReferenceHelper = (function () {
    function AnnotationValueReferenceHelper() {
    }
    AnnotationValueReferenceHelper.stringValueUsingReference = function (mappedValue, annotationValueReference) {
        var stringValue = mappedValue + " (unmapped)";
        switch (annotationValueReference) {
            case AnnotationValueReference.ISO_3166: {
                var countryNumber = parseInt(mappedValue, 10);
                var countryName = countryLookup.getName(countryNumber, "en");
                var countryAlpha2 = countryLookup.numericToAlpha2(mappedValue);
                stringValue = countryName + " (" + countryAlpha2 + ")";
                break;
            }
            case AnnotationValueReference.ISO_4217: {
                var currencyNumber = parseInt(mappedValue, 10);
                var currency = currencyLookup.currencies({ number: currencyNumber })[0];
                var currencyName = currency.name;
                var currencyCode = currency.code;
                stringValue = currencyName + " (" + currencyCode + ")";
                break;
            }
        }
        return stringValue;
    };
    return AnnotationValueReferenceHelper;
})();
var AnnotationValueFormatHelper = (function () {
    function AnnotationValueFormatHelper() {
    }
    AnnotationValueFormatHelper.stringValueUsingFormat = function (value, annotationValueFormat) {
        var rawValue = value.toString('hex').toUpperCase();
        var stringValue = rawValue;
        switch (annotationValueFormat) {
            case AnnotationValueFormat.ALPHABETIC: {
                stringValue = value.toString('utf-8');
                break;
            }
            case AnnotationValueFormat.ALPHANUMERIC: {
                stringValue = value.toString('utf-8');
                break;
            }
            case AnnotationValueFormat.ALPHANUMERIC_SPECIAL: {
                stringValue = value.toString('utf-8');
                break;
            }
            case AnnotationValueFormat.UNSIGNED_NUMBER: {
                stringValue = '' + value.readUInt8(value.length - 1);
                break;
            }
            case AnnotationValueFormat.VARIABLE_BYTES: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.VARIABLE_BITS: {
                var octetBuffer = new OctetBuffer(value);
                var bufferBinaryString = '';
                while (octetBuffer.remaining > 0) {
                    var bufferByte = octetBuffer.readUInt8();
                    var bufferByteBinaryString = bufferByte.toString(2);
                    var requiredPadding = 8 - bufferByteBinaryString.length;
                    bufferByteBinaryString = Array(requiredPadding + 1).join('0') + bufferByteBinaryString;
                    bufferBinaryString += bufferByteBinaryString + ' ';
                }
                bufferBinaryString = bufferBinaryString.slice(0, -1);
                stringValue = bufferBinaryString;
                break;
            }
            case AnnotationValueFormat.COMPRESSED_NUMERIC: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.NUMERIC: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.YYMMDD: {
                stringValue = rawValue;
                stringValue = stringValue.substring(0, 2) + '-' + stringValue.substring(2, 4) + '-' + stringValue.substring(4, 6);
                break;
            }
            case AnnotationValueFormat.HHMMSS: {
                stringValue = rawValue;
                stringValue = stringValue.substring(0, 2) + ':' + stringValue.substring(2, 4) + ':' + stringValue.substring(4, 6);
                break;
            }
        }
        return stringValue;
    };
    return AnnotationValueFormatHelper;
})();
var TlvAnnotation = (function () {
    function TlvAnnotation(tag, type, rawValue, mappedValue, name, description, reference, format, components) {
        if (mappedValue === void 0) { mappedValue = null; }
        if (name === void 0) { name = null; }
        if (description === void 0) { description = null; }
        if (reference === void 0) { reference = null; }
        if (format === void 0) { format = null; }
        if (components === void 0) { components = null; }
        this.tag = tag;
        this.type = type;
        this.rawValue = rawValue;
        this.mappedValue = mappedValue;
        this.name = name;
        this.description = description;
        this.reference = reference;
        this.format = format;
        this.components = components;
        this.items = null;
    }
    return TlvAnnotation;
})();
var TlvAnnotationComponent = (function () {
    function TlvAnnotationComponent(name, selector, triggered, value) {
        this.name = name;
        this.selector = selector;
        this.triggered = triggered;
        this.value = value;
    }
    return TlvAnnotationComponent;
})();
var TlvAnnotationRegistry = (function () {
    function TlvAnnotationRegistry() {
        this.providers = [];
    }
    TlvAnnotationRegistry.getInstance = function () {
        if (this.INSTANCE == null) {
            this.INSTANCE = new TlvAnnotationRegistry();
            this.INSTANCE.registerDefaultProviders();
        }
        return this.INSTANCE;
    };
    TlvAnnotationRegistry.lookupAnnotations = function (tlvItems) {
        return this.getInstance().lookupAnnotations(tlvItems);
    };
    TlvAnnotationRegistry.lookupAnnotation = function (tlvItems) {
        return this.getInstance().lookupAnnotation(tlvItems);
    };
    TlvAnnotationRegistry.registerAnnotationProvider = function (provider) {
        this.getInstance().registerAnnotationProvider(provider);
    };
    TlvAnnotationRegistry.prototype.lookupAnnotations = function (tlvItems) {
        var annotationItems = [];
        for (var i = 0; i < tlvItems.length; i++) {
            var tlvItem = tlvItems[i];
            var tlvAnnotation = this.lookupAnnotation(tlvItem);
            annotationItems.push(tlvAnnotation);
            if (tlvItem.items !== null) {
                var subAnnotationItems = this.lookupAnnotations(tlvItem.items);
                tlvAnnotation.items = subAnnotationItems;
            }
        }
        return annotationItems;
    };
    TlvAnnotationRegistry.prototype.lookupAnnotation = function (tlvItem) {
        for (var i = 0; i < this.providers.length; i++) {
            var provider = this.providers[i];
            var annotation = provider.lookup(tlvItem);
            if (annotation !== null) {
                return annotation;
            }
        }
        return this.defaultAnnotation(tlvItem);
    };
    TlvAnnotationRegistry.prototype.defaultAnnotation = function (tlvItem) {
        var tag = tlvItem.tag;
        var type = tlvItem.type;
        var rawValue = AnnotationValueFormatHelper.stringValueUsingFormat(tlvItem.value, AnnotationValueFormat.VARIABLE_BYTES);
        var annotationItem = new TlvAnnotation(tag, type, rawValue);
        return annotationItem;
    };
    TlvAnnotationRegistry.prototype.registerAnnotationProvider = function (provider) {
        this.providers.push(provider);
    };
    TlvAnnotationRegistry.prototype.registerDefaultProviders = function () {
    };
    return TlvAnnotationRegistry;
})();
exports.TlvAnnotationRegistry = TlvAnnotationRegistry;
var DefaultTlvAnnotationProvider = (function () {
    function DefaultTlvAnnotationProvider(resource) {
        this.resource = resource;
        this.reference = resource.reference;
        this.name = resource.name;
    }
    DefaultTlvAnnotationProvider.prototype.lookup = function (item) {
        var resourceItem = this.findItemWithTag(item.tag);
        if (resourceItem == null) {
            return null;
        }
        var annotation;
        if (item.type === TlvType.PRIMITIVE) {
            annotation = this.buildAnnotationPrimitive(item, resourceItem);
        }
        else {
            annotation = this.buildAnnotationConstructed(item, resourceItem);
        }
        return annotation;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationConstructed = function (item, resourceItem) {
        var tag = item.tag;
        var type = item.type;
        var name = resourceItem.name;
        var description = resourceItem.description;
        var reference = this.reference;
        var rawValue = item.value.toString('hex').toUpperCase();
        var annotationItem = new TlvAnnotation(tag, type, rawValue, null, name, description, reference);
        return annotationItem;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationPrimitive = function (item, resourceItem) {
        var tag = item.tag;
        var type = item.type;
        var name = resourceItem.name;
        var description = resourceItem.description;
        var reference = this.reference;
        var format = resourceItem.format;
        var reference = resourceItem.reference;
        var rawValue = item.value.toString('hex').toUpperCase();
        var mappedValue = AnnotationValueFormatHelper.stringValueUsingFormat(item.value, AnnotationValueFormat[format]);
        var componentsItems = this.buildAnnotationComponents(mappedValue, resourceItem);
        var referenceItem = this.buildAnnotationReference(reference, mappedValue);
        var mergedComponents = [];
        if (componentsItems !== null) {
            mergedComponents = mergedComponents.concat(componentsItems);
        }
        if (referenceItem !== null) {
            mergedComponents = mergedComponents.concat(referenceItem);
        }
        if (mergedComponents.length === 0) {
            mergedComponents = null;
        }
        var annotationItem = new TlvAnnotation(tag, type, rawValue, mappedValue, name, description, reference, format, mergedComponents);
        return annotationItem;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationReference = function (reference, mappedValue) {
        if (reference == null || reference.length === 0) {
            return null;
        }
        var referenceEnum = AnnotationValueReference[reference];
        var referenceValue = AnnotationValueReferenceHelper.stringValueUsingReference(mappedValue, referenceEnum);
        var referenceComponent = new TlvAnnotationComponent(reference, mappedValue, true, referenceValue);
        return referenceComponent;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationComponents = function (mappedValue, resourceItem) {
        if (resourceItem.components == null || resourceItem.components.length === 0) {
            return null;
        }
        var valueComponents = [];
        for (var i = 0; i < resourceItem.components.length; i++) {
            var resourceComponent = resourceItem.components[i];
            var name = resourceComponent.name;
            var selector = null;
            var triggered = false;
            var value = null;
            if (typeof (resourceComponent.bitmask) !== 'undefined' && resourceComponent.bitmask !== null) {
                selector = resourceComponent.bitmask;
                triggered = ByteHelper.hexStringMatchesHexBitflags(mappedValue, resourceComponent.bitmask);
            }
            else if (typeof (resourceComponent.bitpattern) !== 'undefined' && resourceComponent.bitpattern !== null) {
                selector = resourceComponent.bitpattern;
                triggered = ByteHelper.hexStringMatchesHexBitpattern(mappedValue, resourceComponent.bitpattern);
            }
            else if (typeof (resourceComponent.pattern) !== 'undefined' && resourceComponent.pattern !== null) {
                selector = resourceComponent.pattern.toUpperCase();
                triggered = (selector === mappedValue.toUpperCase());
            }
            var valueComponent = new TlvAnnotationComponent(name, selector, triggered, value);
            valueComponents.push(valueComponent);
        }
        return valueComponents;
    };
    DefaultTlvAnnotationProvider.prototype.extractRegex = function (reference, regex) {
        var compiledRegex = new RegExp(regex, 'i');
        var execResult = compiledRegex.exec(reference);
        if (execResult === null) {
            return null;
        }
        var match = execResult[1];
        return match;
    };
    DefaultTlvAnnotationProvider.prototype.findItemWithTag = function (tag) {
        for (var i = 0; i < this.resource.items.length; i++) {
            var item = this.resource.items[i];
            if (item.tag === tag) {
                return item;
            }
        }
        return null;
    };
    return DefaultTlvAnnotationProvider;
})();
exports.DefaultTlvAnnotationProvider = DefaultTlvAnnotationProvider;
