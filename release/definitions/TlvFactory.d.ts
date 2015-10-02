import { ITlv } from './Tlv';
export interface IParseError extends Error {
    partialTlv: ITlv[];
}
export declare class TlvFactory {
    static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv;
    static constructedTlv(tag: Buffer | string, items?: ITlv | ITlv[]): ITlv;
    static parse(buffer: Buffer | string): ITlv[];
    static serialize(items: ITlv | ITlv[]): Buffer;
}
