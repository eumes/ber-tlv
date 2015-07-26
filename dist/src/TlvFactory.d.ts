import { ITlv } from './Tlv';
export declare class TlvFactoryParsingError implements Error {
    name: string;
    message: string;
    partialTlv: ITlv[];
    constructor(name: string, message: string, partialTlv: ITlv[]);
    static error(error: Error, partialTlv: ITlv[]): TlvFactoryParsingError;
}
export declare class TlvFactoryTlvError implements Error {
    name: string;
    message: string;
    constructor(name: string, message: string);
    static errorTagEmpty(): TlvFactoryTlvError;
    static errorTagUnevenBytes(tag: string): TlvFactoryTlvError;
    static errorTagContainsNonHex(tag: string): TlvFactoryTlvError;
    static errorTagIllegaType(): TlvFactoryTlvError;
    static errorValueIllegaType(): TlvFactoryTlvError;
    static errorItemsIllegaType(): TlvFactoryTlvError;
}
export declare class TlvFactorySerializationError implements Error {
    name: string;
    message: string;
    constructor(name: string, message: string);
}
export declare class TlvFactory {
    static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv;
    static constructedTlv(tag: Buffer | string, items?: ITlv[]): ITlv;
    static parse(buffer: Buffer | string): ITlv[];
    static serialize(items: ITlv | ITlv[]): Buffer;
}
