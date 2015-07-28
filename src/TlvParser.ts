import { ITlv, TlvType, TlvClass, TlvHelper } from './Tlv';
import { TlvFactory } from './TlvFactory';

import { OctetBuffer } from 'octet-buffer';

class TlvParserParseError implements Error {
    constructor(public name: string, public message: string) {}

    static errorEmpty(parameter: string): TlvParserParseError {
        return new TlvParserParseError('Error parsing data', '"' + parameter + '" must not be <null> or ""');
    }
    static errorUnsupportedType(parameter: string): TlvParserParseError {
        return new TlvParserParseError('Error parsing data', '"' + parameter + '" is an unsupported format');
    }

    static errorInsufficientTagData(partialTag: Buffer): TlvParserParseError {
        return new TlvParserParseError('Error while reading tag for item starting with "' + partialTag.toString('hex').toUpperCase() + '"', 'Need at least 1 additional byte to complete tag');
    }
    static errorInsufficientLengthData(tag: Buffer, missing: number): TlvParserParseError {
        return new TlvParserParseError('Error while reading length for item "' +  tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes to read length information');
    }
    static errorLengthTooBig(tag: Buffer, given: number): TlvParserParseError {
        return new TlvParserParseError('Error while reading length for item "' + tag.toString('hex').toUpperCase() + '"', 'Maximum number of concatenated length bytes supported is 4, present ' + given);
    }
    static errorInsufficientValueData(tag: Buffer, missing: number): TlvParserParseError {
        return new TlvParserParseError('Error while reading value for item "' + tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes for reading complete value');
    }
}

export class TlvParserResult<T> {
    constructor(public result: T, public error: Error) {}
}

const TLV_IGNORE_VALUE: number = 0x00;
const TLV_TAG_ONE_BYTE_FLAG: number = 0x1F;
const TLV_TAG_HAS_NEXT_BYTE_FLAG: number = 0x80;
const TLV_LENGTH_ONE_BYTE_FLAG: number = 0x80;
const TLV_LENGTH_ADDITIONAL_BYTES_FLAG: number = 0x7F;

export class TlvParser {

    static parseItems(buffer: Buffer): TlvParserResult<ITlv[]> {
        var octetBuffer: OctetBuffer = new OctetBuffer(buffer);
        var items: ITlv[] = [];

        while(octetBuffer.remaining > 0){
            this.skipZeroBytes(octetBuffer);
            var parseResult: TlvParserResult<ITlv> = this.parseItem(octetBuffer);
            if (parseResult.result !== null){
                items.push(parseResult.result);
            }
            if (parseResult.error !== null){
                return new TlvParserResult<ITlv[]>(items, parseResult.error);
            }
        }

        return new TlvParserResult<ITlv[]>(items, null);
    }

    static skipZeroBytes(buffer: OctetBuffer): OctetBuffer {
        var peeked: number;
        while(buffer.remaining > 0){
            peeked = buffer.peek();
            if (peeked !== TLV_IGNORE_VALUE){
                break;
            }
            buffer.readUInt8();
        }
        return buffer;
    }

    static parseItem(buffer: OctetBuffer): TlvParserResult<ITlv> {
        //console.log('start parsing single items, remaining length: ' + buffer.remaining);

        var tagParsingResult: TlvParserResult<Buffer> = this.parseTag(buffer);
        if (tagParsingResult.error != null){
            return new TlvParserResult<ITlv>(null, tagParsingResult.error);
        }

        var tagBuffer: Buffer = tagParsingResult.result;
        var type: TlvType = TlvHelper.typeFromTag(tagBuffer);
        //console.log('got tag: ' + tagBuffer.toString('hex'));

        var lengthParsingResult: TlvParserResult<number> = this.parseLength(buffer, tagBuffer);
        if (lengthParsingResult.error != null){
            return new TlvParserResult<ITlv>(null, lengthParsingResult.error);
        }
        var length: number = lengthParsingResult.result;
        //console.log('got length: ' + length);

        var valueParsingResult: TlvParserResult<Buffer> = this.parseValue(buffer, length, tagBuffer);
        var value: Buffer = valueParsingResult.result;
        if (valueParsingResult.error != null){
            var tlvItem: ITlv = TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult<ITlv>(tlvItem, valueParsingResult.error);
        }
        //console.log('got value: ' + value.toString('hex'));

        if (type === TlvType.CONSTRUCTED) {
            // console.log('detected constructed tag, now parsing payload');
            var subParsingResult: TlvParserResult<ITlv[]> = this.parseItems(value);
            var tlvItem: ITlv = TlvFactory.constructedTlv(tagBuffer, subParsingResult.result);
            // console.log('returning with constructed tag');
            return new TlvParserResult<ITlv>(tlvItem, subParsingResult.error);
        }
        else {
            // console.log('returning with primitve tag');
            var tlvItem: ITlv = TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult<ITlv>(tlvItem, valueParsingResult.error);
        }

    }


    static parseTag(buffer: OctetBuffer): TlvParserResult<Buffer> {
        if (buffer.remaining === 0){
            return new TlvParserResult<Buffer>(null, TlvParserParseError.errorInsufficientTagData(new Buffer(0)));
        }

        var tagBuffer: OctetBuffer = new OctetBuffer();
        var tagByte: number = buffer.readUInt8();
        tagBuffer.writeUInt8(tagByte);
        //console.log('first tag: ' + tagByte);

        if ((tagByte & TLV_TAG_ONE_BYTE_FLAG) !== TLV_TAG_ONE_BYTE_FLAG){
            //console.log('returning with one byte tag: ' + tagByte);
            return new TlvParserResult<Buffer>(tagBuffer.backingBuffer, null);
        }

        do {
            if (buffer.remaining === 0){
                return new TlvParserResult<Buffer>(tagBuffer.backingBuffer, TlvParserParseError.errorInsufficientTagData(tagBuffer.backingBuffer));
            }

            tagByte = buffer.readUInt8();
            tagBuffer.writeUInt8(tagByte);
            //console.log('and we read another round of tags: ' + tagByte);
        } while((tagByte & TLV_TAG_HAS_NEXT_BYTE_FLAG) == TLV_TAG_HAS_NEXT_BYTE_FLAG);

        return new TlvParserResult<Buffer>(tagBuffer.backingBuffer, null);
    }

    static parseLength(buffer: OctetBuffer, tag: Buffer): TlvParserResult<number> {
        if (buffer.remaining === 0){
            return new TlvParserResult<number>(null, TlvParserParseError.errorInsufficientLengthData(tag, 1));
        }

        var length: number = buffer.readUInt8();
        // console.log('first length: ' + length);
        if ((length & TLV_LENGTH_ONE_BYTE_FLAG) !== TLV_LENGTH_ONE_BYTE_FLAG){
            // console.log('returning with one byte length: ' + length);
            return new TlvParserResult<number>(length, null);
        }

        var bytesToRead: number = (length & TLV_LENGTH_ADDITIONAL_BYTES_FLAG);
        if (bytesToRead > 4){
            return new TlvParserResult<number>(null, TlvParserParseError.errorLengthTooBig(tag, bytesToRead));
        }
        if (buffer.remaining < bytesToRead){
            return new TlvParserResult<number>(null, TlvParserParseError.errorInsufficientLengthData(tag, bytesToRead - buffer.remaining));
        }

        length = 0;
        switch(bytesToRead){
            case 1:
                length = buffer.readUInt8();
                break;
            case 2:
                length = buffer.readUInt16();
                break;
            case 3:
                length = buffer.readUInt24();
                break;
            case 4:
                length = buffer.readUInt32();
                break;
        }

        // console.log('returning with length: ' + length);
        return new TlvParserResult<number>(length, null);
    }

    static parseValue(buffer: OctetBuffer, length: number, tag: Buffer): TlvParserResult<Buffer> {
        if (buffer.remaining < length){
            //console.log('need ' + length + ', available '+ buffer.remaining);
            var missing = length - buffer.remaining;
            var partialValue: Buffer = buffer.readBufferRemainig();
            return new TlvParserResult<Buffer>(partialValue, TlvParserParseError.errorInsufficientValueData(tag, missing));
        }
        var value: Buffer = buffer.readBuffer(length);
        return new TlvParserResult<Buffer>(value, null);
    }


}
