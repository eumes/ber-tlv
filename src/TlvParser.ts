import { ITlv, TlvType, TlvClass, TlvHelper } from './Tlv';
import { TlvFactory } from './TlvFactory';
import { OctetBuffer } from '../node_modules/octet-buffer/dist/octet-buffer';

class TlvParsingError implements Error {
    constructor(public name: string, public message: string) {}

    static errorBufferNull(): TlvParsingError {
        return new TlvParsingError('Error parsing data', 'Buffer must NOT be <null>');
    }
    static errorIllegalType(): TlvParsingError {
        return new TlvParsingError('Error parsing data', 'Biffer parameter is invalid');
    }

    static errorParsingTagInsufficientData(partialTag: Buffer): TlvParsingError {
        return new TlvParsingError('Error while reading tag for item starting with "' + partialTag.toString('hex').toUpperCase() + '"', 'Need at least 1 additional byte to complete tag');
    }
    static errorParsingLengthInsufficientData(tag: Buffer, missing: number): TlvParsingError {
        return new TlvParsingError('Error while reading length for item "' +  tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes to read length information');
    }
    static errorParsingLengthNumberTooBig(tag: Buffer, given: number): TlvParsingError {
        return new TlvParsingError('Error while reading length for item "' + tag.toString('hex').toUpperCase() + '"', 'Maximum number of concatenated length bytes supported is 4, present ' + given);
    }
    static errorParsingValueInsufficientData(tag: Buffer, missing: number): TlvParsingError {
        return new TlvParsingError('Error while reading value for item "' + tag.toString('hex').toUpperCase() + '"', 'Need at least ' + missing + ' addional bytes for reading complete value');
    }
}

export class TlvParserResult<T> {
    constructor(public result: T, public error: Error) {}
}

export class TlvParser {

    static prepareParseBuffer(buffer: Buffer | string){
        var preparedParseBuffer: Buffer = null;
        if (buffer == null){
            preparedParseBuffer = new Buffer(0);
        }
        else if (Buffer.isBuffer(buffer)){
            preparedParseBuffer = <Buffer>buffer;
        }
        else if (typeof buffer === 'string'){
            preparedParseBuffer = new Buffer(<string>buffer, 'hex');
        }
        else {
            TlvParsingError.errorIllegalType();
        }
        return preparedParseBuffer;
    }

    static parseItems(buffer: Buffer): TlvParserResult<ITlv[]> {
        var octetBuffer: OctetBuffer = new OctetBuffer(buffer);
        // console.log('start parsing items, remaining length: ' + buffer.remaining);
        var items: ITlv[] = [];
        var errorOccured: boolean = false;

        while(octetBuffer.remaining > 0){
            this.skipZeroBytes(octetBuffer);
            var parseResult: TlvParserResult<ITlv> = this.parseItem(octetBuffer);
            if (parseResult.result != null){
                // console.log('got first item: ' + parseResult.result);
                items.push(parseResult.result);
            }
            if (parseResult.error != null){
                // console.log('error parsing item: ' + parseResult.error);
                return new TlvParserResult<ITlv[]>(items, parseResult.error);
            }
            // console.log('remaining length: ' + buffer.remaining);
        }

        //console.log('parsing completed with tags: ' +  util.inspect(items, {showHidden: false, depth: null}));
        return new TlvParserResult<ITlv[]>(items, null);
    }

    static skipZeroBytes(buffer: OctetBuffer): OctetBuffer {
        var peeked: number;
        while(buffer.remaining > 0){
            peeked = buffer.peek();
            if (peeked !== 0x00){
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
            //we are returning the partially parsed data in case of an error
            var tlvItem: ITlv = TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult<ITlv>(tlvItem, valueParsingResult.error);
        }
        //console.log('got value: ' + value.toString('hex'));

        if (type == TlvType.PRIMITIVE){
            // console.log('returning with primitve tag');
            var tlvItem: ITlv = TlvFactory.primitiveTlv(tagBuffer, value);
            return new TlvParserResult<ITlv>(tlvItem, valueParsingResult.error);
        }
        else {
            // console.log('detected constructed tag, now parsing payload');
            var subParsingResult: TlvParserResult<ITlv[]> = this.parseItems(value);
            var tlvItem: ITlv = TlvFactory.constructedTlv(tagBuffer, subParsingResult.result);
            // console.log('returning with constructed tag');
            return new TlvParserResult<ITlv>(tlvItem, subParsingResult.error);
        }
    }


    static parseTag(buffer: OctetBuffer): TlvParserResult<Buffer> {
        if (buffer.remaining === 0){
            return new TlvParserResult<Buffer>(null, TlvParsingError.errorParsingTagInsufficientData(new Buffer(0)));
        }

        var tagBuffer: OctetBuffer = new OctetBuffer();
        var tagByte: number = buffer.readUInt8();
        tagBuffer.writeUInt8(tagByte);
        //console.log('first tag: ' + tagByte);

        if ((tagByte & 0x1F) !== 0x1F){
            //console.log('returning with one byte tag: ' + tagByte);
            return new TlvParserResult<Buffer>(tagBuffer.backingBuffer, null);
        }

        do {
            if (buffer.remaining === 0){
                return new TlvParserResult<Buffer>(tagBuffer.backingBuffer, TlvParsingError.errorParsingTagInsufficientData(tagBuffer.backingBuffer));
            }

            tagByte = buffer.readUInt8();
            tagBuffer.writeUInt8(tagByte);
            //console.log('and we read another round of tags: ' + tagByte);
        } while((tagByte & 0x80) == 0x80);

        return new TlvParserResult<Buffer>(tagBuffer.backingBuffer, null);
    }

    static parseLength(buffer: OctetBuffer, tag: Buffer): TlvParserResult<number> {
        if (buffer.remaining == 0){
            return new TlvParserResult<number>(null, TlvParsingError.errorParsingLengthInsufficientData(tag, 1));
        }

        var length: number = buffer.readUInt8();
        // console.log('first length: ' + length);
        if ((length & 0x80) != 0x80){
            // console.log('returning with one byte length: ' + length);
            return new TlvParserResult<number>(length, null);
        }

        var bytesToRead: number = (length & 0x7F);
        if (bytesToRead > 4){
            return new TlvParserResult<number>(null, TlvParsingError.errorParsingLengthNumberTooBig(tag, bytesToRead));
        }
        if (buffer.remaining < bytesToRead){
            return new TlvParserResult<number>(null, TlvParsingError.errorParsingLengthInsufficientData(tag, bytesToRead - buffer.remaining));
        }

        var nextByte: number;
        length = 0;
        for (var i: number = 0; i < bytesToRead; i++){
            nextByte = buffer.readUInt8();
            // console.log('read another round of length: ' + nextByte);
            length = length << 8;
            length = length | nextByte;
        }
        // console.log('returning with length: ' + length);
        return new TlvParserResult<number>(length, null);
    }

    static parseValue(buffer: OctetBuffer, length: number, tag: Buffer): TlvParserResult<Buffer> {
        if (buffer.remaining < length){
            //console.log('need ' + length + ', available '+ buffer.remaining);
            var remaining = buffer.remaining;
            var partialValue: Buffer = buffer.readBufferRemainig();
            return new TlvParserResult<Buffer>(partialValue, TlvParsingError.errorParsingValueInsufficientData(tag, length - remaining));
        }
        var value: Buffer = buffer.readBuffer(length);
        return new TlvParserResult<Buffer>(value, null);
    }


}
