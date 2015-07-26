import * as util from 'util';
import { OctetBuffer } from '../node_modules/octet-buffer/dist/octet-buffer';

/*
var ob = require('OctetBuffer');
var OctetBuffer = ob.OctetBuffer;
*/
    export enum TlvType {
	      PRIMITIVE,
        CONSTRUCTED
    }

    export enum TlvClass {
        UNIVERSAL,
        APPLICATION,
        CONTEXT_SPECIFIC,
        PRIVATE
    }

    export interface ITlv {
        tag: string;
        type: TlvType;
        class: TlvClass;
        value: Buffer;
        items: ITlv[];
        serialize(): Buffer;
    }


    class Tlv implements ITlv {
        public tag: string;
        public type: TlvType;
        public class: TlvClass;

        constructor(tagBuffer: Buffer, public items: ITlv[] = [], public value: Buffer = new Buffer(0)) {
            this.tag = tagBuffer.toString('hex').toUpperCase();
            this.type = TlvParser.typeFromTag(tagBuffer);
            this.class = TlvParser.classFromTag(tagBuffer);
        }

        public serialize(): Buffer {
            if (this.type === TlvType.CONSTRUCTED){
                return TlvSerializer.serializeConstrucedItem(this);
            }
            return TlvSerializer.serializePrimitiveItem(this);
        }
    }

    export class TlvFactory {

        static primitiveTlv(tag: string, value: Buffer): ITlv {
            var tagBuffer: Buffer = TlvParser.prepareTag(tag);
            value = TlvParser.prepareBuffer(value);
            return new Tlv(tagBuffer, [], value);
        }

        static constructedTlv(tag: string, value: Buffer, items: ITlv[]): ITlv {
            var tagBuffer: Buffer = TlvParser.prepareTag(tag);
            items = TlvParser.prepareItems(items);
            return new Tlv(tagBuffer, items, value);
        }

        static parseVerbose(buffer: Buffer): ITlvParsingResult {
            buffer = TlvParser.prepareParseBuffer(buffer);
            var octetBuffer: OctetBuffer = new OctetBuffer(buffer);
            var deserializeResult: TlvParserResult<ITlv[]> = TlvParser.parseItems(octetBuffer);
            var result: TlvParsingResult = new TlvParsingResult(deserializeResult.result, deserializeResult.error);
            return result;
        }

        static parse(buffer: Buffer): ITlv[] {
            var result: TlvParsingResult = this.parseVerbose(buffer);
            if (result.error !== null){
                return null;
            }
            return result.result;
        }


    }

    export interface ITlvParsingResult {
        result: ITlv[];
        error: Error;
    }

    class TlvParsingResult implements ITlvParsingResult {
        constructor(public result: ITlv[], public error: Error) {}
    }



    class TlvError implements Error {
        constructor(public name: string, public message: string) {}

        static errorTagEmpty(): TlvError {
            return new TlvParsingError('Error creating tag', 'Tag must NOT be <null> or ""');
        }
        static errorTagUnevenBytes(tag: string): TlvError {
            return new TlvParsingError('Error creating tag', 'Tag must be an even number, given ' + tag);
        }
        static errorTagContainsNonHex(tag: string): TlvError {
            return new TlvParsingError('Error creating tag', 'Tag must only contain hex characters, given ' + tag);
        }
    }

    class TlvSerializationError implements Error {
        constructor(public name: string, public message: string) {}

        static errorPayloadToBig(tag: string, requested: number, maximum: number): TlvSerializationError {
          return new TlvSerializationError('Error while serializing item ' + tag + '"', 'Present length is ' + requested + ', maximum supported ' + maximum);
        }
    }

    class TlvParsingError implements Error {
        constructor(public name: string, public message: string) {}

        static errorBufferNull(): TlvError {
            return new TlvParsingError('Error parsing data', 'Buffer must NOT be <null>');
        }

        static errorParsingTagInsufficientData(partialTag: string): TlvParsingError {
            return new TlvParsingError('Error while reading tag for item starting with "' + partialTag + '"', 'Need at least 1 additional byte to complete tag');
        }
        static errorParsingLengthInsufficientData(tag: string, missing: number): TlvParsingError {
            return new TlvParsingError('Error while reading length for item "' + tag + '"', 'Need at least ' + missing + ' addional bytes to read length information');
        }
        static errorParsingLengthNumberTooBig(tag: string, given: number): TlvParsingError {
            return new TlvParsingError('Error while reading length for item "' + tag + '"', 'Maximum number of concatenated length bytes supported is 4, present ' + given);
        }
        static errorParsingValueInsufficientData(tag: string, missing: number): TlvParsingError {
            return new TlvParsingError('Error while reading value for item "' + tag + '"', 'Need at least ' + missing + ' addional bytes for reading complete value');
        }
    }

    class TlvParserResult<T> {
        constructor(public result: T, public error: Error) {}
    }

    class TlvParser {

        static prepareTag(tag: string): Buffer {
            if (tag === null || tag.length === 0){
                throw TlvError.errorTagEmpty();
            }
            if (tag.length % 2 !== 0){
                throw TlvError.errorTagUnevenBytes(tag);
            }

            var buffer: Buffer;
            try {
                buffer = new Buffer(tag, 'hex');
            }
            catch (error){
                throw TlvError.errorTagContainsNonHex(tag);
            }
            return buffer;
        }

        static prepareBuffer(buffer: Buffer): Buffer {
            if (buffer === null){
                buffer = new Buffer(0);
            }
            return buffer;
        }

        static prepareItems(items: ITlv[]): ITlv[] {
            if (items === null){
              items = [];
            }
            return items;
        }

        static prepareParseBuffer(buffer: Buffer){
            if (buffer === null){
                throw TlvParsingError.errorBufferNull();
            }
            return buffer;
        }

        static parseItems(buffer: OctetBuffer): TlvParserResult<ITlv[]> {
            // console.log('start parsing items, remaining length: ' + buffer.remaining);
            var items: ITlv[] = [];
            var errorOccured: boolean = false;

            while(buffer.remaining > 0){
                var parseResult: TlvParserResult<ITlv> = this.parseItem(buffer);
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

            console.log('parsing completed with tags: ' +  util.inspect(items, {showHidden: false, depth: null}));
            return new TlvParserResult<ITlv[]>(items, null);
        }

        static parseItem(buffer: OctetBuffer): TlvParserResult<ITlv> {
            // console.log('start parsing single items, remaining length: ' + buffer.remaining);

            var tagParsingResult: TlvParserResult<string> = this.parseTag(buffer);
            if (tagParsingResult.error != null){
                return new TlvParserResult<ITlv>(null, tagParsingResult.error);
            }
            var tag: string = tagParsingResult.result;
            var tagBuffer: Buffer = new Buffer(tag, 'hex');
            var type: TlvType = this.typeFromTag(tagBuffer);
            // console.log('got tag: ' + tag);

            var lengthParsingResult: TlvParserResult<number> = this.parseLength(buffer, tag);
            if (lengthParsingResult.error != null){
                return new TlvParserResult<ITlv>(null, lengthParsingResult.error);
            }
            var length: number = lengthParsingResult.result;
            // console.log('got length: ' + length);

            var valueParsingResult: TlvParserResult<Buffer> = this.parseValue(buffer, length, tag);
            var value: Buffer = valueParsingResult.result;
            if (valueParsingResult.error != null){
                //we are returning the partially parsed data in case of an error
                var tlvItem: ITlv = TlvFactory.primitiveTlv(tag, value);
                return new TlvParserResult<ITlv>(tlvItem, valueParsingResult.error);
            }
            // console.log('got value: ' + value.toString('hex'));

            if (type == TlvType.PRIMITIVE){
                // console.log('returning with primitve tag');
                var tlvItem: ITlv = TlvFactory.primitiveTlv(tag, value);
                return new TlvParserResult<ITlv>(tlvItem, valueParsingResult.error);
            }
            else {
                // console.log('detected constructed tag, now parsing payload');
                var subBuffer = new OctetBuffer(value);
                var subParsingResult: TlvParserResult<ITlv[]> = this.parseItems(subBuffer);
                var tlvItem: ITlv = TlvFactory.constructedTlv(tag, value, subParsingResult.result);
                // console.log('returning with constructed tag');
                return new TlvParserResult<ITlv>(tlvItem, subParsingResult.error);
            }
        }


        static parseTag(buffer: OctetBuffer): TlvParserResult<string> {
            if (buffer.remaining == 0){
                return new TlvParserResult<string>(null, TlvParsingError.errorParsingTagInsufficientData(''));
            }

            var tagBuffer: OctetBuffer = new OctetBuffer();
            var tagByte: number = buffer.readUInt8();
            tagBuffer.writeUInt8(tagByte);
            // console.log('haha, first tag: ' + tagByte);

            if ((tagByte & 0x1F) != 0x1F){
                // console.log('returning with one byte tag: ' + tagByte);
                var tag: string = tagBuffer.toString().toUpperCase();
                return new TlvParserResult<string>(tag, null);
            }

            do {
                if (buffer.remaining == 0){
                    var partialTag: string = tagBuffer.toString().toUpperCase();
                    return new TlvParserResult<string>(null, TlvParsingError.errorParsingTagInsufficientData(partialTag));
                }

                tagByte = buffer.readUInt8();
                tagBuffer.writeUInt8(tagByte);
                // console.log('and we read another round of tags: ' + tagByte);
            } while((tagByte & 0x80) == 0x80);

            var tag: string = tagBuffer.toString().toUpperCase();
            return new TlvParserResult<string>(tag, null);
        }

        static parseLength(buffer: OctetBuffer, tag: string): TlvParserResult<number> {
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

        static parseValue(buffer: OctetBuffer, length: number, tag: string): TlvParserResult<Buffer> {
            if (buffer.remaining < length){
                console.log('need ' + length + ', available '+ buffer.remaining);
                var remaining = buffer.remaining;
                var partialValue: Buffer = buffer.readBufferRemainig();
                return new TlvParserResult<Buffer>(partialValue, TlvParsingError.errorParsingValueInsufficientData(tag, length - remaining));
            }
            var value: Buffer = buffer.readBuffer(length);
            return new TlvParserResult<Buffer>(value, null);
        }

        static typeFromTag(tagBuffer: Buffer): TlvType {
            var firstTagByte: number = tagBuffer.readUInt8(0);
            var typeIdentifier = (firstTagByte & 0x20);

            if (typeIdentifier == 0x20){
                return TlvType.CONSTRUCTED;
            }
            else {
                return TlvType.PRIMITIVE;
            }
        }

        static classFromTag(tagBuffer: Buffer): TlvClass {
            var firstTagByte: number = tagBuffer.readUInt8(0);
            var classIdentifier: number = (firstTagByte & 0xC0);

            if (classIdentifier == 0x00){
                return TlvClass.UNIVERSAL;
            }
            if (classIdentifier == 0x40){
                return TlvClass.APPLICATION;
            }
            if (classIdentifier == 0x80){
                return TlvClass.CONTEXT_SPECIFIC;
            }
            if (classIdentifier == 0xC0){
                return TlvClass.PRIVATE;
            }
        }
    }


    class TlvSerializer {

        static serializeConstrucedItem(item: ITlv): Buffer {
            var serializedItems: Buffer[] = [];
            item.items.forEach((item) => {
                serializedItems.push(item.serialize());
            });
            var serializedItemsBuffer = Buffer.concat(serializedItems);

            var tagBuffer: Buffer = new Buffer(item.tag, 'hex');
            var lengthBuffer: Buffer = this.lengthBufferForLengt(item.tag, serializedItemsBuffer.length);

            var serializedItem: Buffer = Buffer.concat([tagBuffer, lengthBuffer, serializedItemsBuffer]);
            return serializedItem;
        }

        static serializePrimitiveItem(item: ITlv): Buffer {
            var tagBuffer: Buffer = new Buffer(item.tag, 'hex');
            var lengthBuffer: Buffer = this.lengthBufferForLengt(item.tag, item.value.length);

            var serializedItem: Buffer = Buffer.concat([tagBuffer, lengthBuffer, item.value]);
            return serializedItem;
        }

        static lengthBufferForLengt(tag: string, length: number): Buffer{

            //TODO: in the worst case we create an additional buffer internally, rethink this approach
            var octetBuffer: OctetBuffer = new OctetBuffer(new Buffer(1));

            if (length < 0x80){
                octetBuffer.writeUInt8(length);
            }
            else if (length <= 0xFF){
                octetBuffer.writeUInt8(0x81);
                octetBuffer.writeUInt8(length);
            }
            else if (length <= 0xFFFF){
              octetBuffer.writeUInt8(0x82);
              octetBuffer.writeUInt16(length);
            }
            else if (length <= 0xFFFFFF){
              octetBuffer.writeUInt8(0x83);
              octetBuffer.writeUInt24(length);
            }
            else if (length <= 0xFFFFFFFF){
              octetBuffer.writeUInt8(0x84);
              octetBuffer.writeUInt32(length);
            }
            else {
                throw TlvSerializationError.errorPayloadToBig(tag, length, 0xFFFFFFFF);
            }

            return octetBuffer.backingBuffer;
        }


    }
