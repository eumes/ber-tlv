var util = require('util');
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
var chai_1 = require('chai');
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
        var octetBuffer = new OctetBuffer(buffer);
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
            var subBuffer = new OctetBuffer(value);
            var subParsingResult = this.parseItems(subBuffer);
            var tlvItem = TlvFactory.constructedTlv(tag, value, subParsingResult.result);
            return new TlvParserResult(tlvItem, subParsingResult.error);
        }
    };
    TlvParser.parseTag = function (buffer) {
        if (buffer.remaining == 0) {
            return new TlvParserResult(null, TlvParsingError.errorParsingTagInsufficientData(''));
        }
        var tagBuffer = new OctetBuffer();
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
function tlvGenerator(tag, length, value) {
    var tagBuffer = new Buffer(tag.replace(' ', ''), 'hex');
    var lengthBuffer = new Buffer(length.replace(' ', ''), 'hex');
    var valueBuffer = new Buffer(value.replace(' ', ''), 'hex');
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}
describe('Tlv', function () {
    describe('deserialize', function () {
        var buffer;
        var result;
        var items;
        var error;
        it('can parse 1 byte tag primitve tlv object', function () {
            buffer = tlvGenerator('5A', '02', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('5A');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 2 byte tag primitve tlv object', function () {
            buffer = tlvGenerator('9F02', '02', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('9F02');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 3 byte tag primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '02', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse a constructed tlv object', function () {
            buffer = tlvGenerator('E0', '08', '9A02AABB 9B02DDFF');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('E0');
            chai_1.expect(item.type).to.equal(TlvType.CONSTRUCTED);
        });
        it('can parse 1 byte tag with 1 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '8102', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 2 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '820002', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 3 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '83000002', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 4 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '8400000002', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('parses 0 length item', function () {
            buffer = tlvGenerator('12', '00', '');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            error = result.error;
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('12');
            chai_1.expect(item.value).to.exist;
            chai_1.expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('fails on empty data', function () {
            buffer = tlvGenerator('DF', '', '');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            error = result.error;
            chai_1.expect(items).to.exist;
            chai_1.expect(items.length).to.equal(0);
            chai_1.expect(error).to.exist;
        });
    });
    describe('class', function () {
        var tag;
        it('identified class universal', function () {
            tag = TlvFactory.primitiveTlv('0F', new Buffer(0));
            chai_1.expect(tag.class).to.equal(TlvClass.UNIVERSAL);
        });
        it('identified class application', function () {
            tag = TlvFactory.primitiveTlv('4F', new Buffer(0));
            chai_1.expect(tag.class).to.equal(TlvClass.APPLICATION);
        });
        it('identified class context-specific', function () {
            tag = TlvFactory.primitiveTlv('8F', new Buffer(0));
            chai_1.expect(tag.class).to.equal(TlvClass.CONTEXT_SPECIFIC);
        });
        it('identified class private', function () {
            tag = TlvFactory.primitiveTlv('CF', new Buffer(0));
            chai_1.expect(tag.class).to.equal(TlvClass.PRIVATE);
        });
    });
});
