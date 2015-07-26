import { expect } from 'chai';
import { TlvType, TlvClass, TlvFactory, ITlv, ITlvParsingResult} from './Tlv';

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
        var result: ITlvParsingResult;
        var items: ITlv[];
        var error: Error;

        it('can parse 1 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('5A', '02', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('5A');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 2 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('9F02', '02', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('9F02');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 3 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '02', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });

        it('can parse a constructed tlv object', () => {
            buffer = tlvGenerator('E0', '08', '9A02AABB 9B02DDFF');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('E0');
            expect(item.type).to.equal(TlvType.CONSTRUCTED);
        });

        it('can parse 1 byte tag with 1 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '8102', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 2 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '820002', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 3 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '83000002', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 4 byte length primitve tlv object', () => {
            buffer = tlvGenerator('DFAE03', '8400000002', '2020');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('DFAE03');
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });

        it('parses 0 length item', () => {
            buffer = tlvGenerator('12', '00', '');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            error = result.error;

            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('12');
            expect(item.value).to.exist;
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });

        it('fails on empty data', () => {
            buffer = tlvGenerator('DF', '', '');
            result = TlvFactory.parseVerbose(buffer);
            items = result.result;
            error = result.error;

            expect(items).to.exist;
            expect(items.length).to.equal(0);
            expect(error).to.exist;
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
