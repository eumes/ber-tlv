export declare enum TlvType {
    PRIMITIVE = 0,
    CONSTRUCTED = 1,
}
export declare enum TlvClass {
    UNIVERSAL = 0,
    APPLICATION = 1,
    CONTEXT_SPECIFIC = 2,
    PRIVATE = 3,
}
export interface ITlv {
    tag: string;
    type: TlvType;
    class: TlvClass;
    value: Buffer;
    items: ITlv[];
    serialize(): Buffer;
}
export declare class TlvFactory {
    static primitiveTlv(tag: string, value: Buffer): ITlv;
    static constructedTlv(tag: string, value: Buffer, items: ITlv[]): ITlv;
    static parseVerbose(buffer: Buffer): ITlvParsingResult;
    static parse(buffer: Buffer): ITlv[];
}
export interface ITlvParsingResult {
    result: ITlv[];
    error: Error;
}
