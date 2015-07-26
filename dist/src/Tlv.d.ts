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
}
export declare class TlvHelper {
    static typeFromTag(tagBuffer: Buffer): TlvType;
    static classFromTag(tagBuffer: Buffer): TlvClass;
}
