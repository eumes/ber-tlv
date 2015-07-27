import { ITlv, TlvType, TlvClass, TlvHelper } from './Tlv';
import { TlvParser, TlvParserResult } from './TlvParser';
import { TlvSerializer } from './TlvSerializer';

export class TlvFactoryParseError implements Error {
    constructor(public name: string, public message: string, public partialTlv: ITlv[]) {}

    static errorPartialResult(error: Error, partialTlv: ITlv[]): TlvFactoryParseError{
        return new TlvFactoryParseError(error.name, error.message, partialTlv);
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

export class TlvFactorySerializeError implements Error {
    constructor(public name: string, public message: string) {}

    static errorUnsupportedType(parameter: string): TlvFactorySerializeError {
        return new TlvFactorySerializeError('Error serializing ' + parameter, '"' + parameter + '" parameter type provided is not supported');
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
            throw TlvFactoryParseError.errorPartialResult(parsedResult.error, parsedResult.result);
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
