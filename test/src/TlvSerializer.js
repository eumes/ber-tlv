var Tlv_1 = require('./Tlv');
var octet_buffer_1 = require('../node_modules/octet-buffer/dist/octet-buffer');
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
        if (item.type === Tlv_1.TlvType.CONSTRUCTED) {
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
exports.TlvSerializer = TlvSerializer;
