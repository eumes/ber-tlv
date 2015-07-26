import { ITlv, TlvType, TlvClass, TlvHelper } from './Tlv';
import { TlvParser, TlvParserResult } from './TlvParser';
import { TlvSerializer } from './TlvSerializer';


export class TlvFactoryParsingError implements Error {
    constructor(public name: string, public message: string, public partialTlv: ITlv[]) {}

    static error(error: Error, partialTlv: ITlv[]): TlvFactoryParsingError{
        return new TlvFactoryParsingError(error.name, error.message, partialTlv);
    }
}

export class TlvFactoryTlvError implements Error {
    constructor(public name: string, public message: string) {}

    static errorTagEmpty(): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tag', 'Tag must NOT be <null> or ""');
    }
    static errorTagUnevenBytes(tag: string): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tag', 'Tag must be an even number, given ' + tag);
    }
    static errorTagContainsNonHex(tag: string): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tag', 'Tag must only contain hex characters, given ' + tag);
    }

    static errorTagIllegaType(): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating tag', 'Tag parameter is invalid');
    }
    static errorValueIllegaType(): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating value', 'Value parameter is invalid');
    }
    static errorItemsIllegaType(): TlvFactoryTlvError {
        return new TlvFactoryTlvError('Error creating items', 'Items parameter is invalid');
    }
}

export class TlvFactorySerializationError implements Error {
    constructor(public name: string, public message: string) {}
}


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
        this.type = TlvHelper.typeFromTag(tagBuffer);
        this.class = TlvHelper.classFromTag(tagBuffer);
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
}

export class TlvFactory {
    static primitiveTlv(tag: Buffer | string, value?: Buffer | string): ITlv {
        var tagBuffer: Buffer = TlvFactoryHelper.prepareTag(tag);
        var valueBuffer: Buffer = TlvFactoryHelper.prepareBuffer(valueBuffer);
        return new Tlv(tagBuffer, valueBuffer);
    }

    static constructedTlv(tag: Buffer | string, items?: ITlv[]): ITlv {
        var tagBuffer: Buffer = TlvFactoryHelper.prepareTag(tag);
        var itemsArray: ITlv[] = TlvFactoryHelper.prepareItems(items);
        return new Tlv(tagBuffer, itemsArray);
    }

    static parse(buffer: Buffer | string): ITlv[] {
        var parseBuffer: Buffer = TlvParser.prepareParseBuffer(buffer);
        var parseResult: TlvParserResult<ITlv[]> = TlvParser.parseItems(parseBuffer);
        if (parseResult.error != null){
            throw TlvFactoryParsingError.error(parseResult.error, parseResult.result);
        }
        return parseResult.result;
    }

    static serialize(items: ITlv | ITlv[]): Buffer {
        //TODO: check for correcty parameters
        var checkedItems: ITlv[] = TlvFactoryHelper.prepareSerializeItems(items);

        var serializedTlv: Buffer = TlvSerializer.serializeItems(checkedItems);
        return serializedTlv;
    }

}

class TlvFactoryHelper {

    static prepareTag(tag: Buffer | string): Buffer {
        if (tag == null){
            throw TlvFactoryTlvError.errorTagEmpty();
        }

        var preparedTag: Buffer = null;
        if (Buffer.isBuffer(tag)){
            preparedTag = <Buffer>tag;
        }
        else if (typeof tag === 'string'){
            if (tag.length % 2 !== 0){
                throw TlvFactoryTlvError.errorTagUnevenBytes(<string>tag);
            }
            try {
                preparedTag = new Buffer(<string>tag, 'hex');
            }
            catch (error){
                throw TlvFactoryTlvError.errorTagContainsNonHex(<string>tag);
            }
        }
        else {
            throw TlvFactoryTlvError.errorTagIllegaType();
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
            throw TlvFactoryTlvError.errorValueIllegaType();
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
            throw TlvFactoryTlvError.errorItemsIllegaType();
        }
        return preparedItems;
    }

    static prepareSerializeItems(items: ITlv | ITlv[]): ITlv[] {
        var preparedItems: ITlv[] = null;
        if (items == null){
            throw TlvFactoryTlvError.errorItemsIllegaType();
        }

        if (Array.isArray(items)){
            preparedItems = <ITlv[]>items;
        }
        else {
            preparedItems = [<ITlv>items];
        }
        return preparedItems;
    }

}
