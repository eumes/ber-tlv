import { ITlv } from './Tlv';
import { OctetBuffer } from '../node_modules/octet-buffer/dist/octet-buffer';
export declare class TlvParserResult<T> {
    result: T;
    error: Error;
    constructor(result: T, error: Error);
}
export declare class TlvParser {
    static parseItems(buffer: Buffer): TlvParserResult<ITlv[]>;
    static skipZeroBytes(buffer: OctetBuffer): OctetBuffer;
    static parseItem(buffer: OctetBuffer): TlvParserResult<ITlv>;
    static parseTag(buffer: OctetBuffer): TlvParserResult<Buffer>;
    static parseLength(buffer: OctetBuffer, tag: Buffer): TlvParserResult<number>;
    static parseValue(buffer: OctetBuffer, length: number, tag: Buffer): TlvParserResult<Buffer>;
}
