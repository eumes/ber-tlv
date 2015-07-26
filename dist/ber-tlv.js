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
var TLV_TAG_CONSTRUCTED_FLAG = 0x20;
var TLV_TAG_CLASS_FLAG = 0xC0;
var TLV_TAG_CLASS_UNIVERSAL = 0x00;
var TLV_TAG_CLASS_APPLICATION = 0x40;
var TLV_TAG_CLASS_CONTEXT_SPECIFIC = 0x80;
var TLV_TAG_CLASS_PRIVATE = 0xC0;
var TlvHelper = (function () {
    function TlvHelper() {
    }
    TlvHelper.typeFromTag = function (tagBuffer) {
        var firstTagByte = tagBuffer.readUInt8(0);
        var typeIdentifier = (firstTagByte & TLV_TAG_CONSTRUCTED_FLAG);
        if (typeIdentifier === TLV_TAG_CONSTRUCTED_FLAG) {
            return TlvType.CONSTRUCTED;
        }
        else {
            return TlvType.PRIMITIVE;
        }
    };
    TlvHelper.classFromTag = function (tagBuffer) {
        var firstTagByte = tagBuffer.readUInt8(0);
        var classIdentifier = (firstTagByte & TLV_TAG_CLASS_FLAG);
        if (classIdentifier === TLV_TAG_CLASS_UNIVERSAL) {
            return TlvClass.UNIVERSAL;
        }
        else if (classIdentifier === TLV_TAG_CLASS_APPLICATION) {
            return TlvClass.APPLICATION;
        }
        else if (classIdentifier === TLV_TAG_CLASS_CONTEXT_SPECIFIC) {
            return TlvClass.CONTEXT_SPECIFIC;
        }
        else {
            return TlvClass.PRIVATE;
        }
    };
    return TlvHelper;
})();
exports.TlvHelper = TlvHelper;
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
        this.type = TlvHelper.typeFromTag(tagBuffer);
        this.class = TlvHelper.classFromTag(tagBuffer);
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
        var parseBuffer = TlvParser.prepareParseBuffer(buffer);
        var parseResult = TlvParser.parseItems(parseBuffer);
        if (parseResult.error != null) {
            throw TlvFactoryParsingError.error(parseResult.error, parseResult.result);
        }
        return parseResult.result;
    };
    TlvFactory.serialize = function (items) {
        var checkedItems = TlvFactoryHelper.prepareSerializeItems(items);
        var serializedTlv = TlvSerializer.serializeItems(checkedItems);
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
            preparedItems = [items];
        }
        return preparedItems;
    };
    return TlvFactoryHelper;
})();
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
    OctetBuffer.prototype.peek = function () {
        this.checkRemainingBytesAndThrow('uint8', UINT8_BYTES);
        var uint = this.backingBuffer.readUInt8(this.position);
        return uint;
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
var TlvParsingError = (function () {
    function TlvParsingError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvParsingError.errorBufferNull = function () {
        return new TlvParsingError('Error parsing data', 'Buffer must NOT be <null>');
    };
    TlvParsingError.errorIllegalType = function () {
        return new TlvParsingError('Error parsing data', 'Biffer parameter is invalid');
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
exports.TlvParserResult = TlvParserResult;
var TlvParser = (function () {
    function TlvParser() {
    }
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
            TlvParsingError.errorIllegalType();
        }
        return preparedParseBuffer;
    };
    TlvParser.parseItems = function (buffer) {
        var octetBuffer = new OctetBuffer(buffer);
        var items = [];
        var errorOccured = false;
        while (octetBuffer.remaining > 0) {
            this.skipZeroBytes(octetBuffer);
            var parseResult = this.parseItem(octetBuffer);
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
        var type = TlvHelper.typeFromTag(tagBuffer);
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
            var subParsingResult = this.parseItems(value);
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
    return TlvParser;
})();
exports.TlvParser = TlvParser;
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
var TlvSerializer = (function () {
    function TlvSerializer() {
    }
    TlvSerializer.serializeItems = function (items) {
        var serializedItems = [];
        for (var _i = 0; _i < items.length; _i++) {
            var item = items[_i];
            var itemBuffer = TlvSerializer.serializeItem(item);
            serializedItems.push(itemBuffer);
        }
        var serializedBuffer = Buffer.concat(serializedItems);
        return serializedBuffer;
    };
    TlvSerializer.serializeItem = function (item) {
        var serializedItem;
        if (item.type === TlvType.CONSTRUCTED) {
            serializedItem = TlvSerializer.serializeConstrucedItem(item);
        }
        else {
            serializedItem = TlvSerializer.serializePrimitiveItem(item);
        }
        return serializedItem;
    };
    TlvSerializer.serializeConstrucedItem = function (item) {
        var serializedItems = [];
        for (var _i = 0, _a = item.items; _i < _a.length; _i++) {
            var item = _a[_i];
            var itemBuffer = TlvSerializer.serializeItem(item);
            serializedItems.push(itemBuffer);
        }
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
exports.TlvSerializer = TlvSerializer;
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
        this.type = TlvHelper.typeFromTag(tagBuffer);
        this.class = TlvHelper.classFromTag(tagBuffer);
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
        var parseBuffer = TlvParser.prepareParseBuffer(buffer);
        var parseResult = TlvParser.parseItems(parseBuffer);
        if (parseResult.error != null) {
            throw TlvFactoryParsingError.error(parseResult.error, parseResult.result);
        }
        return parseResult.result;
    };
    TlvFactory.serialize = function (items) {
        var checkedItems = TlvFactoryHelper.prepareSerializeItems(items);
        var serializedTlv = TlvSerializer.serializeItems(checkedItems);
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
            preparedItems = [items];
        }
        return preparedItems;
    };
    return TlvFactoryHelper;
})();
