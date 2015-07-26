import { ITlv } from './Tlv';
export declare class TlvSerializerSerializeError implements Error {
    name: string;
    message: string;
    constructor(name: string, message: string);
    static errorPayloadToBig(tag: string, requested: number, maximum: number): TlvSerializerSerializeError;
}
export declare class TlvSerializer {
    static serializeItems(items: ITlv[]): Buffer;
    static serializeItem(item: ITlv): Buffer;
    static serializeConstrucedItem(item: ITlv): Buffer;
    static serializePrimitiveItem(item: ITlv): Buffer;
    static lengthBufferForLengt(tag: string, length: number): Buffer;
}
