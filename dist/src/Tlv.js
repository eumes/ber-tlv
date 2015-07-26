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
