declare module BerTlv{

    export enum TlvType {
        PRIMITIVE = 0,
        CONSTRUCTED = 1,
    }
    export enum TlvClass {
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
    export class TlvHelper {
        static typeFromTag(tagBuffer: Buffer): TlvType;
        static classFromTag(tagBuffer: Buffer): TlvClass;
    }

    export interface IParseError extends Error {
        partialTlv: ITlv[];
    }
    export class TlvFactory {
        static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv;
        static constructedTlv(tag: Buffer | string, items?: ITlv[]): ITlv;
        static parse(buffer: Buffer | string): ITlv[];
        static serialize(items: ITlv | ITlv[]): Buffer;
    }
}

declare module 'ber-tlv'{
  export = BerTlv;
}
