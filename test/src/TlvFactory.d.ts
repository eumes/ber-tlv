import { ITlv } from './Tlv';
export declare class TlvFactoryParsingError implements Error {
    name: string;
    message: string;
    partialTlv: ITlv[];
    constructor(name: string, message: string, partialTlv: ITlv[]);
    static errorPartialResult(error: Error, partialTlv: ITlv[]): TlvFactoryParsingError;
}
export declare class TlvFactoryTlvError implements Error {
    name: string;
    message: string;
    constructor(name: string, message: string);
    static errorEmpty(parameter: string): TlvFactoryTlvError;
    static errorUnevenBytes(parameter: string, given: string): TlvFactoryTlvError;
    static errorContainsNonHex(parameter: string, given: string): TlvFactoryTlvError;
    static errorUnsupportedType(parameter: string): TlvFactoryTlvError;
}
export declare class TlvFactorySerializationError implements Error {
    name: string;
    message: string;
    constructor(name: string, message: string);
    static errorUnsupportedType(parameter: string): TlvFactorySerializationError;
}
export declare class TlvFactory {
    static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv;
    static constructedTlv(tag: Buffer | string, items?: ITlv[]): ITlv;
    static parse(buffer: Buffer | string): ITlv[];
    static serialize(items: ITlv | ITlv[]): Buffer;
}
