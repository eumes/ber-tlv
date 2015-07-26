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
var TlvHelper = (function () {
    function TlvHelper() {
    }
    TlvHelper.typeFromTag = function (tagBuffer) {
        var firstTagByte = tagBuffer.readUInt8(0);
        var typeIdentifier = (firstTagByte & TLV_TAG_CONSTRUCTED_FLAG);
        if (typeIdentifier == TLV_TAG_CONSTRUCTED_FLAG) {
            return TlvType.CONSTRUCTED;
        }
        else {
            return TlvType.PRIMITIVE;
        }
    };
    TlvHelper.classFromTag = function (tagBuffer) {
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
    return TlvHelper;
})();
exports.TlvHelper = TlvHelper;
