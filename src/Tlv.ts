import * as util from 'util';
import { OctetBuffer } from '../node_modules/octet-buffer/dist/octet-buffer';

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

//TODO: extract to TlvSerializer
    class Tlv implements ITlv {
        public tag: string;
        public type: TlvType;
        public class: TlvClass;
        public items: ITlv[];
        public value: Buffer;

        constructor(tag: Buffer, payload: ITlv[] | Buffer) {
            var tagBuffer: Buffer = tag;
            var tagString: string = tagBuffer.toString('hex').toUpperCase();;

            this.tag = tagString;
            this.type = TlvParser.typeFromTag(tagBuffer);
            this.class = TlvParser.classFromTag(tagBuffer);
            if (Buffer.isBuffer(payload)){
                this.value = <Buffer>payload;
                this.items = null;
            }
            else if (Array.isArray(payload)){
                this.value = null;
                this.items = <ITlv[]>payload;
            }
            else {
                this.items = null;
                this.value = null;
            }
        }

        public serialize(): Buffer {
            if (this.type === TlvType.CONSTRUCTED){
                return TlvSerializer.serializeConstrucedItem(this);
            }
            return TlvSerializer.serializePrimitiveItem(this);
        }
    }

//TODO: extract to TlvSerializer
    export class TlvFactory {
        static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv {
            var tagBuffer: Buffer = TlvParser.prepareTag(tag);
            var valueBuffer: Buffer = TlvParser.prepareBuffer(valueBuffer);
            return new Tlv(tagBuffer, valueBuffer);
        }

        static constructedTlv(tag: Buffer | string, items?: ITlv[]): ITlv {
            var tagBuffer: Buffer = TlvParser.prepareTag(tag);
            var itemsArray: ITlv[] = TlvParser.prepareItems(items);
            return new Tlv(tagBuffer, itemsArray);
        }

        static parseVerbose(buffer: Buffer | string): ITlvParsingResult {
            var parseBuffer: Buffer = TlvParser.prepareParseBuffer(buffer);
            var octetBuffer: OctetBuffer = new OctetBuffer(parseBuffer);
            var deserializeResult: TlvParserResult<ITlv[]> = TlvParser.parseItems(octetBuffer);
            var result: TlvParsingResult = new TlvParsingResult(deserializeResult.result, deserializeResult.error);
            return result;
        }

        static parse(buffer: Buffer | string): ITlv[] {
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

        static errorTagIllegaType(): TlvError {
            return new TlvParsingError('Error creating tag', 'Tag parameter is invalid');
        }
        static errorValueIllegaType(): TlvError {
            return new TlvParsingError('Error creating value', 'Value parameter is invalid');
        }
        static errorItemsIllegaType(): TlvError {
            return new TlvParsingError('Error creating items', 'Items parameter is invalid');
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
        static errorIllegalType(): TlvError {
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

    class TlvParserResult<T> {
        constructor(public result: T, public error: Error) {}
    }

//TODO: extract to TlvSerializer
    class TlvParser {

        static prepareTag(tag: Buffer | string): Buffer {
            if (tag == null){
                throw TlvError.errorTagEmpty();
            }

            var preparedTag: Buffer = null;
            if (Buffer.isBuffer(tag)){
                preparedTag = <Buffer>tag;
            }
            else if (typeof tag === 'string'){
                if (tag.length % 2 !== 0){
                    throw TlvError.errorTagUnevenBytes(<string>tag);
                }
                try {
                    preparedTag = new Buffer(<string>tag, 'hex');
                }
                catch (error){
                    throw TlvError.errorTagContainsNonHex(<string>tag);
                }
            }
            else {
                throw TlvError.errorTagIllegaType();
            }

            return preparedTag;
        }

        static prepareBuffer(buffer?: Buffer | string): Buffer {
            var preparedBuffer: Buffer = null;
            if (buffer == null){
                preparedBuffer = new Buffer(0);
            }
            else if (Buffer.isBuffer(buffer)){
                preparedBuffer = <Buffer>buffer;
            }
            else if (typeof buffer === 'string'){
                preparedBuffer = new Buffer(<string>buffer, 'hex');
            }
            else {
                throw TlvError.errorValueIllegaType();
            }
            return preparedBuffer;
        }

        static prepareItems(items?: ITlv[]): ITlv[] {
            var preparedItems: ITlv[] = null;
            if (items == null){
                preparedItems = [];
            }
            if (Array.isArray(items)){
                preparedItems = items;
            }
            else {
                throw TlvError.errorItemsIllegaType();
            }
            return preparedItems;
        }

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

        static parseItems(buffer: OctetBuffer): TlvParserResult<ITlv[]> {
            // console.log('start parsing items, remaining length: ' + buffer.remaining);
            var items: ITlv[] = [];
            var errorOccured: boolean = false;

            while(buffer.remaining > 0){
                this.skipZeroBytes(buffer);
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
            var type: TlvType = this.typeFromTag(tagBuffer);
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
                var subBuffer = new OctetBuffer(value);
                var subParsingResult: TlvParserResult<ITlv[]> = this.parseItems(subBuffer);
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


//TODO: extract to TlvSerializer
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
