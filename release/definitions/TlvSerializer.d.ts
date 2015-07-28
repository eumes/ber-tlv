import { ITlv } from './Tlv';
export declare class TlvSerializer {
    static serializeItems(items: ITlv[]): Buffer;
    static serializeItem(item: ITlv): Buffer;
    static serializeConstrucedItem(item: ITlv): Buffer;
    static serializePrimitiveItem(item: ITlv): Buffer;
    static lengthBufferForLengt(tag: string, length: number): Buffer;
}
