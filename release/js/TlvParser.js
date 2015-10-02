var Tlv_1 = require('./Tlv');
var TlvFactory_1 = require('./TlvFactory');
var octet_buffer_1 = require('octet-buffer');
var TlvParserParseError = (function () {
    function TlvParserParseError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvParserParseError.errorEmpty = function (parameter) {
        return new TlvParserParseError('Error parsing data', '"' + parameter + '" must not be <null> or ""');
    };
    TlvParserParseError.errorUnsupportedType = function (parameter) {
        return new TlvParserParseError('Error parsing data', '"' + parameter + '" is an unsupported format');
    };
    TlvParserParseError.errorInsufficientTagData = function (partialTag) {
        return new TlvParserParseError('Error while reading tag for item starting with "' + partialTag.toString('hex').toUpperCase() + '"', 'Need at least 1 additional byte to complete tag');
    };
    TlvParserParseError.errorInsufficientLengthData = function (tag, missing) {
        return new TlvParserParseError('Error while reading length for item "' + tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes to read length information');
    };
    TlvParserParseError.errorLengthTooBig = function (tag, given) {
        return new TlvParserParseError('Error while reading length for item "' + tag.toString('hex').toUpperCase() + '"', 'Maximum number of concatenated length bytes supported is 4, present ' + given);
    };
    TlvParserParseError.errorInsufficientValueData = function (tag, missing) {
        return new TlvParserParseError('Error while reading value for item "' + tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes for reading complete value');
    };
    return TlvParserParseError;
})();
var TlvParserResult = (function () {
    function TlvParserResult(result, error) {
        this.result = result;
        this.error = error;
    }
    return TlvParserResult;
})();
exports.TlvParserResult = TlvParserResult;
var TLV_IGNORE_VALUE = 0x00;
var TLV_TAG_ONE_BYTE_FLAG = 0x1F;
var TLV_TAG_HAS_NEXT_BYTE_FLAG = 0x80;
var TLV_LENGTH_ONE_BYTE_FLAG = 0x80;
var TLV_LENGTH_ADDITIONAL_BYTES_FLAG = 0x7F;
var TlvParser = (function () {
    function TlvParser() {
    }
    TlvParser.parseItems = function (buffer) {
        var octetBuffer = new octet_buffer_1.OctetBuffer(buffer);
        var items = [];
        while (octetBuffer.remaining > 0) {
            this.skipZeroBytes(octetBuffer);
            if (octetBuffer.remaining === 0) {
                continue;
            }
            var parseResult = this.parseItem(octetBuffer);
            if (parseResult.result !== null) {
                items.push(parseResult.result);
            }
            if (parseResult.error !== null) {
                return new TlvParserResult(items, parseResult.error);
            }
        }
        return new TlvParserResult(items, null);
    };
    TlvParser.skipZeroBytes = function (buffer) {
        var peeked;
        while (buffer.remaining > 0) {
            peeked = buffer.peek();
            if (peeked !== TLV_IGNORE_VALUE) {
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
        var type = Tlv_1.TlvHelper.typeFromTag(tagBuffer);
        var lengthParsingResult = this.parseLength(buffer, tagBuffer);
        if (lengthParsingResult.error != null) {
            return new TlvParserResult(null, lengthParsingResult.error);
        }
        var length = lengthParsingResult.result;
        var valueParsingResult = this.parseValue(buffer, length, tagBuffer);
        var value = valueParsingResult.result;
        if (valueParsingResult.error != null) {
            var tlvItem = TlvFactory_1.TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
        if (type === Tlv_1.TlvType.CONSTRUCTED) {
            var subParsingResult = this.parseItems(value);
            var tlvItem = TlvFactory_1.TlvFactory.constructedTlv(tagBuffer, subParsingResult.result);
            return new TlvParserResult(tlvItem, subParsingResult.error);
        }
        else {
            var tlvItem = TlvFactory_1.TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
    };
    TlvParser.parseTag = function (buffer) {
        if (buffer.remaining === 0) {
            return new TlvParserResult(null, TlvParserParseError.errorInsufficientTagData(new Buffer(0)));
        }
        var tagBuffer = new octet_buffer_1.OctetBuffer();
        var tagByte = buffer.readUInt8();
        tagBuffer.writeUInt8(tagByte);
        if ((tagByte & TLV_TAG_ONE_BYTE_FLAG) !== TLV_TAG_ONE_BYTE_FLAG) {
            return new TlvParserResult(tagBuffer.backingBuffer, null);
        }
        do {
            if (buffer.remaining === 0) {
                return new TlvParserResult(tagBuffer.backingBuffer, TlvParserParseError.errorInsufficientTagData(tagBuffer.backingBuffer));
            }
            tagByte = buffer.readUInt8();
            tagBuffer.writeUInt8(tagByte);
        } while ((tagByte & TLV_TAG_HAS_NEXT_BYTE_FLAG) == TLV_TAG_HAS_NEXT_BYTE_FLAG);
        return new TlvParserResult(tagBuffer.backingBuffer, null);
    };
    TlvParser.parseLength = function (buffer, tag) {
        if (buffer.remaining === 0) {
            return new TlvParserResult(null, TlvParserParseError.errorInsufficientLengthData(tag, 1));
        }
        var length = buffer.readUInt8();
        if ((length & TLV_LENGTH_ONE_BYTE_FLAG) !== TLV_LENGTH_ONE_BYTE_FLAG) {
            return new TlvParserResult(length, null);
        }
        var bytesToRead = (length & TLV_LENGTH_ADDITIONAL_BYTES_FLAG);
        if (bytesToRead > 4) {
            return new TlvParserResult(null, TlvParserParseError.errorLengthTooBig(tag, bytesToRead));
        }
        if (buffer.remaining < bytesToRead) {
            return new TlvParserResult(null, TlvParserParseError.errorInsufficientLengthData(tag, bytesToRead - buffer.remaining));
        }
        length = 0;
        switch (bytesToRead) {
            case 1:
                length = buffer.readUInt8();
                break;
            case 2:
                length = buffer.readUInt16();
                break;
            case 3:
                length = buffer.readUInt24();
                break;
            case 4:
                length = buffer.readUInt32();
                break;
        }
        return new TlvParserResult(length, null);
    };
    TlvParser.parseValue = function (buffer, length, tag) {
        if (buffer.remaining < length) {
            var missing = length - buffer.remaining;
            var partialValue = buffer.readBufferRemaining();
            return new TlvParserResult(partialValue, TlvParserParseError.errorInsufficientValueData(tag, missing));
        }
        var value = buffer.readBuffer(length);
        return new TlvParserResult(value, null);
    };
    return TlvParser;
})();
exports.TlvParser = TlvParser;
