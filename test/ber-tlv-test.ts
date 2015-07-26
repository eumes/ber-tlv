import events = require("events");
import net = require("net");
import stream = require("stream");
import child  = require("child_process");
import tls = require("tls");
import http = require("http");
import crypto = require("crypto");
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
}


const TLV_TAG_CONSTRUCTED_FLAG: number = 0x20;
const TLV_TAG_CLASS_FLAG: number = 0xC0;
const TLV_TAG_CLASS_UNIVERSAL: number = 0x00;
const TLV_TAG_CLASS_APPLICATION: number = 0x40;
const TLV_TAG_CLASS_CONTEXT_SPECIFIC: number = 0x80;
const TLV_TAG_CLASS_PRIVATE: number = 0xC0;

export class TlvHelper {
    
    static typeFromTag(tagBuffer: Buffer): TlvType {
        var firstTagByte: number = tagBuffer.readUInt8(0);
        var typeIdentifier = (firstTagByte & TLV_TAG_CONSTRUCTED_FLAG);

        if (typeIdentifier === TLV_TAG_CONSTRUCTED_FLAG){
            return TlvType.CONSTRUCTED;
        }
        else {
            return TlvType.PRIMITIVE;
        }
    }

    static classFromTag(tagBuffer: Buffer): TlvClass {
        var firstTagByte: number = tagBuffer.readUInt8(0);
        var classIdentifier: number = (firstTagByte & TLV_TAG_CLASS_FLAG);

        if (classIdentifier === TLV_TAG_CLASS_UNIVERSAL){
            return TlvClass.UNIVERSAL;
        }
        else if (classIdentifier === TLV_TAG_CLASS_APPLICATION){
            return TlvClass.APPLICATION;
        }
        else if (classIdentifier === TLV_TAG_CLASS_CONTEXT_SPECIFIC){
            return TlvClass.CONTEXT_SPECIFIC;
        }
        else {
            return TlvClass.PRIVATE;
        }
    }
}

                                                                                                                                                                                    

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

                                                                                                                                         

class TlvSerializationError implements Error {
    constructor(public name: string, public message: string) {}

    static errorPayloadToBig(tag: string, requested: number, maximum: number): TlvSerializationError {
      return new TlvSerializationError('Error while serializing item ' + tag + '"', 'Present length is ' + requested + ', maximum supported ' + maximum);
    }
}


export class TlvSerializer {

    static serializeItems(items: ITlv[]): Buffer {

        var serializedItems: Buffer[] = [];
        for (var item of items){
            var itemBuffer: Buffer = TlvSerializer.serializeItem(item);
            serializedItems.push(itemBuffer);
        }

        var serializedBuffer = Buffer.concat(serializedItems);
        return serializedBuffer;
    }

    static serializeItem(item: ITlv): Buffer {

        var serializedItem: Buffer;
        if (item.type === TlvType.CONSTRUCTED){
            serializedItem = TlvSerializer.serializeConstrucedItem(item);
        } else {
            serializedItem = TlvSerializer.serializePrimitiveItem(item);
        }

        return serializedItem;
    }



    static serializeConstrucedItem(item: ITlv): Buffer {
        var serializedItems: Buffer[] = [];
        for (var item of item.items){
            var itemBuffer: Buffer = TlvSerializer.serializeItem(item);
            serializedItems.push(itemBuffer);
        }
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

                                                                                                                                                                      


export class TlvFactoryParsingError implements Error {
    constructor(public name: string, public message: string, public partialTlv: ITlv[]) {}

    static errorPartialResult(error: Error, partialTlv: ITlv[]): TlvFactoryParsingError{
        return new TlvFactoryParsingError(error.name, error.message, partialTlv);
    }
}

export class TlvFactoryTlvError implements Error {
    constructor(public name: string, public message: string) {}

    static errorEmpty(parameter: string): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" must not be <null> or ""');
    }
    static errorUnevenBytes(parameter: string, given: string): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" must be an even number, given "' + given + '"');
    }
    static errorContainsNonHex(parameter: string, given: string): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" must only contain hex characters, given "' + given + '"');
    }
    static errorUnsupportedType(parameter: string): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tlv item', '"' + parameter + '" is an unsupported format');
    }
}

export class TlvFactorySerializationError implements Error {
    constructor(public name: string, public message: string) {}

    static errorUnsupportedType(parameter: string): TlvFactorySerializationError {
        return new TlvFactorySerializationError('Error serializing ' + parameter, '"' + parameter + '" parameter type provided is not supported');
    }
}


class Tlv implements ITlv {
    public tag: string;
    public type: TlvType;
    public class: TlvClass;
    public items: ITlv[];
    public value: Buffer;

    /**
     * Internal methods, no type checking done! Use at your own risk :)
     */
    constructor(tag: Buffer, payload?: Buffer | ITlv[]) {
        var tagBuffer: Buffer = tag;
        var tagString: string = tagBuffer.toString('hex').toUpperCase();;

        this.tag = tagString;
        this.type = TlvHelper.typeFromTag(tagBuffer);
        this.class = TlvHelper.classFromTag(tagBuffer);

        this.value = TlvFactoryHelper.verifyUncheckedTlvPrimitivePayload(this.type, payload);
        this.items = TlvFactoryHelper.verifyUncheckedTlvConstructedPayload(this.type, payload);
    }
}

export class TlvFactory {
    static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv {
        var verifiedTag: Buffer = TlvFactoryHelper.verifyGenericTag(tag);
        var verifiedValue: Buffer = TlvFactoryHelper.verifyPrimitiveValue(value);
        var primitiveTlv: ITlv = new Tlv(verifiedTag, verifiedValue);
        return primitiveTlv;
    }

    static constructedTlv(tag: Buffer | string, items?: ITlv[]): ITlv {
        var verifiedTag: Buffer = TlvFactoryHelper.verifyGenericTag(tag);
        var verifiedItems: ITlv[] = TlvFactoryHelper.verifyConstructedItems(items);
        var constructedTlv: ITlv = new Tlv(verifiedTag, verifiedItems);
        return constructedTlv;
    }

    static parse(buffer: Buffer | string): ITlv[] {
        var verifiedValue: Buffer = TlvFactoryHelper.verifyParseValue(buffer);
        var parsedResult: TlvParserResult<ITlv[]> = TlvParser.parseItems(verifiedValue);
        if (parsedResult.error != null){
            throw TlvFactoryParsingError.errorPartialResult(parsedResult.error, parsedResult.result);
        }
        return parsedResult.result;
    }

    static serialize(items: ITlv | ITlv[]): Buffer {
        var verifiedItems: ITlv[] = TlvFactoryHelper.verifySerializeItems(items);
        var serializedItems: Buffer = TlvSerializer.serializeItems(verifiedItems);
        return serializedItems;
    }

}

class TlvFactoryHelper {

    static verifyUncheckedTlvPrimitivePayload(type: TlvType, payload?: Buffer | ITlv[]): Buffer{
        if(type !== TlvType.PRIMITIVE){
            return null;
        }
        if (payload == null){
            return new Buffer(0);
        }

        return <Buffer>payload;
    }

    static verifyUncheckedTlvConstructedPayload(type: TlvType, payload?: Buffer | ITlv[]): ITlv[]{
        if(type !== TlvType.CONSTRUCTED){
            return null;
        }
        if (payload == null){
            return [];
        }

        return <ITlv[]>payload;
    }


    static verifyGenericTag(tag: Buffer | string): Buffer {
        if (tag == null){
            throw TlvFactoryTlvError.errorEmpty('tag');
        }

        var verifiedTag: Buffer = null;
        if (Buffer.isBuffer(tag)){
            verifiedTag = TlvFactoryHelper.fromBuffer(tag);
        }
        else if (typeof tag === 'string'){
            verifiedTag = TlvFactoryHelper.fromString('tag', tag);
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('tag');
        }

        return verifiedTag;
    }


    static verifyPrimitiveValue(buffer?: Buffer | string): Buffer {
        var verifiedValue: Buffer = null;
        if (buffer == null){
            verifiedValue = TlvFactoryHelper.emptyBuffer();
        }
        else if (Buffer.isBuffer(buffer)){
            verifiedValue = TlvFactoryHelper.fromBuffer(buffer);
        }
        else if (typeof buffer === 'string'){
            verifiedValue = TlvFactoryHelper.fromString('value', buffer);
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('value');
        }

        return verifiedValue;
    }

    static verifyConstructedItems(items?: ITlv[]): ITlv[] {
        var verifiedItems: ITlv[] = null;
        if (items == null){
            verifiedItems = [];
        }
        if (Array.isArray(items)){
            verifiedItems = items;
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('items');
        }

        return verifiedItems;
    }

    static verifyParseValue(buffer?: Buffer | string): Buffer {
        var verifiedValue: Buffer = null;
        if (buffer == null){
            verifiedValue = TlvFactoryHelper.emptyBuffer();
        }
        else if (Buffer.isBuffer(buffer)){
            verifiedValue = TlvFactoryHelper.fromBuffer(buffer);
        }
        else if (typeof buffer === 'string'){
            verifiedValue = TlvFactoryHelper.fromString('value', buffer);
        }
        else {
            throw TlvFactoryTlvError.errorUnsupportedType('buffer');
        }
        return verifiedValue;
    }

    static verifySerializeItems(items: ITlv | ITlv[]): ITlv[] {
        var verifiedItems: ITlv[] = null;
        if (items == null){
            throw TlvFactoryTlvError.errorUnsupportedType('items');
        }
        if (Array.isArray(items)){
            verifiedItems = <ITlv[]>items;
        }
        else {
            verifiedItems = [<ITlv>items];
        }

        return verifiedItems;
    }


    static emptyBuffer(): Buffer{
        return new Buffer(0);
    }

    static fromBuffer(buffer: any): Buffer {
        var verifiedBuffer: Buffer = buffer;
        return verifiedBuffer;
    }
    static fromString(parameter: string, string: any): Buffer {
        if (string.length % 2 !== 0){
            throw TlvFactoryTlvError.errorUnevenBytes(parameter, string);
        }

        var verifiedString: Buffer = null;
        try {
            verifiedString = new Buffer(<string>string, 'hex');
        }
        catch (error){
            throw TlvFactoryTlvError.errorContainsNonHex(parameter, string);
        }

        return verifiedString;
    }

}

import events = require("events");
import net = require("net");
import stream = require("stream");
import child  = require("child_process");
import tls = require("tls");
import http = require("http");
import crypto = require("crypto");
class OctetBufferError implements Error {
    constructor(public name: string, public message: string) {}

    static errorReadingCausedByInsufficientBytes(type: string, missingBytes: number): OctetBufferError {
        return new OctetBufferError('Error reading <' + type + '>', 'Buffer is missing ' + missingBytes + ' bytes');
    }

    static errorConstructorWrongParameterType(): OctetBufferError {
        return new OctetBufferError('Error creating <OctetBuffer>', 'Provided constructor parameter is not valid');
    }

    static errorMethodWrongParameterType(): OctetBufferError {
        return new OctetBufferError('Error interacting with <OctetBuffer>', 'Provided parameter is not valid');
    }
}

const UINT8_BYTES: number = 1;
const UINT16_BYTES: number = 2;
const UINT24_BYTES: number = 3;
const UINT32_BYTES: number = 4;

export class OctetBuffer {

        private _backingBuffer: Buffer;
        private _position: number;

        get backingBuffer(): Buffer {
            return this._backingBuffer;
        }
        set backingBuffer(buffer: Buffer) {
            this.checkParameterIsBuffer(buffer);
            this._backingBuffer = buffer;
        }

        get position(): number {
            return this._position;
        }

        set position(position: number) {
            this._position = position;
        }

        get available(): number {
            return this.backingBuffer.length;
        }

        get remaining(): number {
            return this.available - this.position;
        }

        constructor(param?: Buffer | string){
            if (typeof param === 'string'){
                var buffer = new Buffer(<string>param, 'hex');
                this.backingBuffer = buffer;
            }
            else if (Buffer.isBuffer(param)){
                this.backingBuffer = <Buffer>param;
            }
            else if (param == null){
                this.backingBuffer = new Buffer(0);
            }
            else {
                throw OctetBufferError.errorConstructorWrongParameterType();
            }

            this.reset();
        }

        private incrementPositionBy(incrementBy: number): void {
            this.checkParameterIsNumber(incrementBy);
            this.position += incrementBy;
        }

        reset(): void {
            this.position = 0;
        }

        readUInt8(): number {
            this.checkRemainingBytesAndThrow('uint8', UINT8_BYTES);
            var uint: number = this.backingBuffer.readUInt8(this.position);
            this.incrementPositionBy(UINT8_BYTES);
            return uint;
        }
        readUInt16(): number {
            this.checkRemainingBytesAndThrow('uint16', UINT16_BYTES);
            var uint: number = this.backingBuffer.readUInt16BE(this.position);
            this.incrementPositionBy(UINT16_BYTES);
            return uint;
        }
        readUInt24(): number {
            this.checkRemainingBytesAndThrow('uint24', UINT24_BYTES);
            var uint: number = OctetBuffer.readUInt24BE(this.backingBuffer, this.position);
            this.incrementPositionBy(UINT24_BYTES);
            return uint;
        }
        readUInt32(): number {
            this.checkRemainingBytesAndThrow('uint32', UINT32_BYTES);
            var uint: number = this.backingBuffer.readUInt32BE(this.position);
            this.incrementPositionBy(UINT32_BYTES);
            return uint;
        }

        readBuffer(count: number = 1): Buffer {
            this.checkParameterIsNumber(count);
            this.checkRemainingBytesAndThrow('Buffer', count);
            var readBuffer = new Buffer(count);
            this.backingBuffer.copy(readBuffer, 0, this.position, this.position + count);
            this.incrementPositionBy(count);
            return readBuffer;
        }

        readBufferRemainig(): Buffer {
            var readBuffer = this.readBuffer(this.remaining);
            return readBuffer;
        }

        writeUInt8(uint: number): OctetBuffer {
            this.checkParameterIsNumber(uint);
            this.extendBackingBufferToAcceptAdditionalBytes(UINT8_BYTES);
            OctetBuffer.writeUInt8(this.backingBuffer, uint, this.position);
            this.incrementPositionBy(UINT8_BYTES);
            return this;
        }

        writeUInt16(uint: number): OctetBuffer {
            this.checkParameterIsNumber(uint);
            this.extendBackingBufferToAcceptAdditionalBytes(UINT16_BYTES);
            OctetBuffer.writeUInt16BE(this.backingBuffer, uint, this.position);
            this.incrementPositionBy(UINT16_BYTES);
            return this;
        }
        writeUInt24(uint: number): OctetBuffer {
            this.checkParameterIsNumber(uint);
            this.extendBackingBufferToAcceptAdditionalBytes(UINT24_BYTES);
            OctetBuffer.writeUInt24BE(this.backingBuffer, uint, this.position);
            this.incrementPositionBy(UINT24_BYTES);
            return this;
        }
        writeUInt32(uint: number): OctetBuffer {
            this.checkParameterIsNumber(uint);
            this.extendBackingBufferToAcceptAdditionalBytes(UINT32_BYTES);
            OctetBuffer.writeUInt32BE(this.backingBuffer, uint, this.position);
            this.incrementPositionBy(UINT32_BYTES);
            return this;
        }

        writeArray(array: number[]): OctetBuffer {
            this.checkParameterIsArray(array);
            var buffer = new Buffer(array);
            return this.writeBuffer(buffer);
        }

        writeBuffer(buffer: Buffer): OctetBuffer {
            this.checkParameterIsBuffer(buffer);
            this.extendBackingBufferToAcceptAdditionalBytes(buffer.length);
            this.writeBufferToBackingBuffer(buffer);
            this.incrementPositionBy(buffer.length);
            return this;
        }

        serialize(): string {
            return this._backingBuffer.toString('hex').toUpperCase();
        }

        peek(): number {
            this.checkRemainingBytesAndThrow('uint8', UINT8_BYTES);
            var uint: number = this.backingBuffer.readUInt8(this.position);
            return uint;
        }

        private extendBackingBufferToAcceptAdditionalBytes(additionalBytes: number): void {
            if (this.remaining >= additionalBytes) {
                return;
            }

            var missingBytes = additionalBytes - this.remaining;
            var extendedBuffer = new Buffer(this.available + missingBytes);
            this.backingBuffer.copy(extendedBuffer, 0, 0, this.available);
            this.backingBuffer = extendedBuffer;
        }

        private writeBufferToBackingBuffer(buffer: Buffer): void {
            buffer.copy(this.backingBuffer, this.position, 0, buffer.length);
        }

        private static readUInt24BE(buffer: Buffer, position: number): number {
            var uint: number = 0;
            uint = buffer.readUInt8(position) << 16;
            uint |= buffer.readUInt8(position + 1) << 8;
            uint |= buffer.readUInt8(position + 2) << 0;
            return uint;
        }

        private static writeUInt8(buffer: Buffer, uint: number, positon: number): void {
            buffer.writeUInt8((uint & 0xff) >>> 0, positon);
        }

        private static writeUInt16BE(buffer: Buffer, uint: number, positon: number): void {
            buffer.writeUInt8((uint & 0xff00) >>> 8, positon);
            buffer.writeUInt8((uint & 0x00ff) >>> 0, positon + 1);
        }

        private static writeUInt24BE(buffer: Buffer, uint: number, positon: number): void {
            buffer.writeUInt8((uint & 0xff0000) >>> 16, positon);
            buffer.writeUInt8((uint & 0x00ff00) >>> 8, positon + 1);
            buffer.writeUInt8((uint & 0x0000ff) >>> 0, positon + 2);
        }

        private static writeUInt32BE(buffer: Buffer, uint: number, positon: number): void {
            buffer.writeUInt8((uint & 0xff000000) >>> 24, positon);
            buffer.writeUInt8((uint & 0x00ff0000) >>> 16, positon + 1);
            buffer.writeUInt8((uint & 0x0000ff00) >>> 8, positon + 2);
            buffer.writeUInt8((uint & 0x000000ff) >>> 0, positon + 3);
        }

        private checkRemainingBytesAndThrow(type: string, requiredBytes: number){
            if (requiredBytes > this.remaining) {
                var missingBytes = requiredBytes - this.remaining;
                throw OctetBufferError.errorReadingCausedByInsufficientBytes(type, missingBytes);
            }
        }
        private checkParameterIsNumber(param: any){
            if (param == null){
                throw OctetBufferError.errorMethodWrongParameterType();
            }
            else if (typeof param !== 'number'){
                throw OctetBufferError.errorMethodWrongParameterType();
            }
        }

        private checkParameterIsArray(param: any[]){
            if (param == null){
                throw OctetBufferError.errorMethodWrongParameterType();
            }
            else if (typeof param !== 'number'){
                throw OctetBufferError.errorMethodWrongParameterType();
            }
        }
        private checkParameterIsBuffer(param: any){
            if (param == null){
                throw OctetBufferError.errorMethodWrongParameterType();
            }
            else if (!Buffer.isBuffer(param)){
                throw OctetBufferError.errorMethodWrongParameterType();
            }
        }
}


import { expect } from 'chai';
import { expect } from 'chai';                                                                                                                    

function tlvGenerator(tag: string, length:string, value: string): Buffer {
    var tagBuffer: Buffer = new Buffer(tag.replace(' ', ''), 'hex');
    var lengthBuffer: Buffer = new Buffer(length.replace(' ', ''), 'hex');
    var valueBuffer: Buffer = new Buffer(value.replace(' ', ''), 'hex');
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * Unit tests
 */
describe('Tlv', () => {

    describe('deserialize', () => {

        var buffer: Buffer;
        var items: ITlv[];
        var error: Error;

        it('can parse 1 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('5A', '02', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('5A');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 2 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('9F02', '02', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('9F02');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 3 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '02', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });

        it('can parse a constructed tlv object', () => {
            buffer = tlvGenerator('E0', '08', '9A02AABB 9B02DDFF');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('E0');
            expect(item.type).to.equal(TlvType.CONSTRUCTED);
        });

        it('can parse 1 byte tag with 1 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '8102', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 2 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '820002', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 3 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '83000002', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 4 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '8400000002', '2020');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });

        it('parses 0 length item', () => {
            buffer = tlvGenerator('12', '00', '');
            items = TlvFactory.parse(buffer);

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('12');
            expect(item.value).to.exist;
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });

        it('fails on empty data', () => {
            buffer = tlvGenerator('DF', '', '');
            var throwFunction = () => {
                items = TlvFactory.parse(buffer);
            }

            expect(throwFunction).to.throw;
        });

    });



    describe('class', () => {

        var tag: ITlv;
        it('identified class universal', () => {
          tag = TlvFactory.primitiveTlv('0F', new Buffer(0));
          expect(tag.class).to.equal(TlvClass.UNIVERSAL);
        });
        it('identified class application', () => {
          tag = TlvFactory.primitiveTlv('4F', new Buffer(0));
          expect(tag.class).to.equal(TlvClass.APPLICATION);
        });
        it('identified class context-specific', () => {
          tag = TlvFactory.primitiveTlv('8F', new Buffer(0));
          expect(tag.class).to.equal(TlvClass.CONTEXT_SPECIFIC);
        });
        it('identified class private', () => {
          tag = TlvFactory.primitiveTlv('CF', new Buffer(0));
          expect(tag.class).to.equal(TlvClass.PRIVATE);
        });

    });
});

