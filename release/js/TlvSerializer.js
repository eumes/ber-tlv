var Tlv_1 = require('./Tlv');
var octet_buffer_1 = require('octet-buffer');
var TlvSerializerSerializeError = (function () {
    function TlvSerializerSerializeError(name, message) {
        this.name = name;
        this.message = message;
    }
    TlvSerializerSerializeError.errorPayloadToBig = function (tag, requested, maximum) {
        return new TlvSerializerSerializeError('Error while serializing item ' + tag + '"', 'Provided length is ' + requested + ', maximum supported ' + maximum);
    };
    return TlvSerializerSerializeError;
})();
var TLV_SERIALIZE_MULTIBYTE_FLAG = 0x80;
var SERIALIZE_UINT8_MAX = 0xFF;
var SERIALIZE_UINT16_MAX = 0xFFFF;
var SERIALIZE_UINT24_MAX = 0xFFFFFF;
var SERIALIZE_UINT32_MAX = 0xFFFFFFFF;
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
            var subitem = _a[_i];
            var itemBuffer = TlvSerializer.serializeItem(subitem);
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
        if (length < TLV_SERIALIZE_MULTIBYTE_FLAG) {
            octetBuffer.writeUInt8(length);
        }
        else if (length <= SERIALIZE_UINT8_MAX) {
            octetBuffer.writeUInt8(TLV_SERIALIZE_MULTIBYTE_FLAG | 0x01);
            octetBuffer.writeUInt8(length);
        }
        else if (length <= SERIALIZE_UINT16_MAX) {
            octetBuffer.writeUInt8(TLV_SERIALIZE_MULTIBYTE_FLAG | 0x02);
            octetBuffer.writeUInt16(length);
        }
        else if (length <= SERIALIZE_UINT24_MAX) {
            octetBuffer.writeUInt8(TLV_SERIALIZE_MULTIBYTE_FLAG | 0x03);
            octetBuffer.writeUInt24(length);
        }
        else if (length <= SERIALIZE_UINT32_MAX) {
            octetBuffer.writeUInt8(TLV_SERIALIZE_MULTIBYTE_FLAG | 0x04);
            octetBuffer.writeUInt32(length);
        }
        else {
            throw TlvSerializerSerializeError.errorPayloadToBig(tag, length, SERIALIZE_UINT32_MAX);
        }
        return octetBuffer.backingBuffer;
    };
    return TlvSerializer;
})();
exports.TlvSerializer = TlvSerializer;
