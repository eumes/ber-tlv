export enum TlvType {
    PRIMITIVE,
    CONSTRUCTED
}

export enum TlvClass {
    UNIVERSAL,
    APPLICATION,
    CONTEXT_SPECIFIC,
    PRIVATE
}

export interface ITlv {
    tag: string;
    type: TlvType;
    class: TlvClass;
    value: Buffer;
    items: ITlv[];
}


const TLV_TAG_CONSTRUCTED_FLAG: number = 0x20;
const TLV_TAG_CLASS_FLAG: number = 0xC0;
const TLV_TAG_CLASS_UNIVERSAL: number = 0x00;
const TLV_TAG_CLASS_APPLICATION: number = 0x40;
const TLV_TAG_CLASS_CONTEXT_SPECIFIC: number = 0x80;
const TLV_TAG_CLASS_PRIVATE: number = 0xC0;

export class TlvHelper {
    
    static typeFromTag(tagBuffer: Buffer): TlvType {
        var firstTagByte: number = tagBuffer.readUInt8(0);
        var typeIdentifier = (firstTagByte & TLV_TAG_CONSTRUCTED_FLAG);

        if (typeIdentifier === TLV_TAG_CONSTRUCTED_FLAG){
            return TlvType.CONSTRUCTED;
        }
        else {
            return TlvType.PRIMITIVE;
        }
    }

    static classFromTag(tagBuffer: Buffer): TlvClass {
        var firstTagByte: number = tagBuffer.readUInt8(0);
        var classIdentifier: number = (firstTagByte & TLV_TAG_CLASS_FLAG);

        if (classIdentifier === TLV_TAG_CLASS_UNIVERSAL){
            return TlvClass.UNIVERSAL;
        }
        else if (classIdentifier === TLV_TAG_CLASS_APPLICATION){
            return TlvClass.APPLICATION;
        }
        else if (classIdentifier === TLV_TAG_CLASS_CONTEXT_SPECIFIC){
            return TlvClass.CONTEXT_SPECIFIC;
        }
        else {
            return TlvClass.PRIVATE;
        }
    }
}
