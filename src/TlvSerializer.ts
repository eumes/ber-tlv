import { ITlv, TlvType, TlvClass, TlvHelper } from './Tlv';
import { OctetBuffer } from '../node_modules/octet-buffer/dist/octet-buffer';

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
