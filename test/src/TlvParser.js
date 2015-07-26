var Tlv_1 = require('./Tlv');
var TlvFactory_1 = require('./TlvFactory');
var octet_buffer_1 = require('../node_modules/octet-buffer/dist/octet-buffer');
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
        var octetBuffer = new octet_buffer_1.OctetBuffer(buffer);
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
        if (type == Tlv_1.TlvType.PRIMITIVE) {
            var tlvItem = TlvFactory_1.TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult(tlvItem, valueParsingResult.error);
        }
        else {
            var subParsingResult = this.parseItems(value);
            var tlvItem = TlvFactory_1.TlvFactory.constructedTlv(tagBuffer, subParsingResult.result);
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
    return TlvParser;
})();
exports.TlvParser = TlvParser;
