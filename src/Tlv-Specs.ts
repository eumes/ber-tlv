import { expect } from 'chai';
import { ITlv, TlvType, TlvClass } from './Tlv';
import { TlvFactory, IParseError } from './TlvFactory';

function tlvGenerator(tag: string, length:string, value: string): Buffer {
    var tagBuffer: Buffer = new Buffer(tag.replace(' ', ''), 'hex');
    var lengthBuffer: Buffer = new Buffer(length.replace(' ', ''), 'hex');
    var valueBuffer: Buffer = new Buffer(value.replace(' ', ''), 'hex');
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * Unit tests
 */
describe('TlvFactory', () => {

    var buffer: Buffer;
    var items: ITlv[];
    var error: Error;
    var serialized: Buffer;

    var tlvs: ITlv[];
    var tlv: ITlv;

    describe('#parse', () => {

        it('can parse 1 byte tag primitve tlv object', () => {
            buffer = tlvGenerator('005A', '02', '2020');
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

        it('ignores 00 in between', () => {
            buffer =  new Buffer('00005A0101005702020200', 'hex');
            items = TlvFactory.parse(buffer);

            expect(items.length).to.equal(2);
            expect(items).to.exist;
            var item: ITlv = items.pop()
            expect(item.tag).to.equal('57');
            expect(item.value).to.exist;
            expect(item.type).to.equal(TlvType.PRIMITIVE);
        });
        //ignores 00

        it('fails on empty data', () => {
            buffer = tlvGenerator('DF', '', '');
            var throwFunction = () => {
                items = TlvFactory.parse(buffer);
            }

            expect(throwFunction).to.throw;
        });

    });

    describe('#primitiveTlv', () => {

        var tlv: ITlv;
        var serialized: Buffer;

        it('creates primitive with <string>(uppercase)', () => {
            var givenTagString = '5A';
            var givenValueString = '90DF';
            var expectedBuffer = new Buffer('5A0290DF', 'hex');

            tlv = TlvFactory.primitiveTlv(givenTagString, givenValueString);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates primitive with <string>(lowercase)', () => {
            var givenTagString = '5a';
            var givenValueString = '90df';
            var expectedBuffer = new Buffer('5A0290DF', 'hex');

            tlv = TlvFactory.primitiveTlv(givenTagString, givenValueString);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates primitive with <Buffer>', () => {
            var givenTagBuffer = new Buffer('5A', 'hex');
            var givenValueBuffer = new Buffer('90DF', 'hex');
            var expectedBuffer = new Buffer('5A0290DF', 'hex');

            tlv = TlvFactory.primitiveTlv(givenTagBuffer, givenValueBuffer);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates primitive with <Buffer>, <string>', () => {
            var givenTagBuffer = new Buffer('5A', 'hex');
            var givenValueString = '90df';
            var expectedBuffer = new Buffer('5A0290DF', 'hex');

            tlv = TlvFactory.primitiveTlv(givenTagBuffer, givenValueString);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates primitive with <string>, buffer', () => {
            var givenTagString = '5a';
            var givenValueBuffer = new Buffer('90DF', 'hex');
            var expectedBuffer = new Buffer('5A0290DF', 'hex');

            tlv = TlvFactory.primitiveTlv(givenTagString, givenValueBuffer);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates primitive with no value', () => {
            var givenTagString = '5A';
            var expectedBuffer = new Buffer('5A00', 'hex');

            tlv = TlvFactory.primitiveTlv(givenTagString);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('fails with invalid tag class', () => {
            var givenTagString = 'E0';

            var throwFunction = () => {
                tlv = TlvFactory.primitiveTlv(givenTagString);
            }

            expect(throwFunction).to.throw;
        });

        it('fails with invalid data (tag)', () => {
            var givenNumber = 22;

            var throwFunction = () => {
                tlv = TlvFactory.primitiveTlv(<any>givenNumber, '');
            }

            expect(throwFunction).to.throw;
        });

        it('fails with invalid data (value)', () => {
            var givenNumber = 22;

            var throwFunction = () => {
                tlv = TlvFactory.primitiveTlv('', <any>givenNumber);
            }

            expect(throwFunction).to.throw;
        });


    });

    describe('#constructedTlv', () => {

        var tlv: ITlv;
        var serialized: Buffer;

        it('creates constrcuted with <string>(uppercase)', () => {
            var givenTagString = 'E0';
            var givenPayloadTlv = TlvFactory.parse("5A00");
            var expectedBuffer = new Buffer('E0025A00', 'hex');

            tlv = TlvFactory.constructedTlv(givenTagString, givenPayloadTlv);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates constructed with <string>(lowercase)', () => {
            var givenTagString = 'e0';
            var givenPayloadTlv = TlvFactory.parse("5A00");
            var expectedBuffer = new Buffer('E0025A00', 'hex');

            tlv = TlvFactory.constructedTlv(givenTagString, givenPayloadTlv);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates constructed with <buffer>', () => {
            var givenTagBuffer = new Buffer('E0', 'hex');
            var givenPayloadTlv = TlvFactory.parse("5A00");
            var expectedBuffer = new Buffer('E0025A00', 'hex');

            tlv = TlvFactory.constructedTlv(givenTagBuffer, givenPayloadTlv);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates constructed with no payload', () => {
            var givenTagBuffer = new Buffer('E0', 'hex');
            var expectedBuffer = new Buffer('E000', 'hex');

            tlv = TlvFactory.constructedTlv(givenTagBuffer);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates constrcuted with array payload', () => {
            var givenTagBuffer = new Buffer('E0', 'hex');
            var givenPayloadTlv = TlvFactory.parse("5A00");
            var expectedBuffer = new Buffer('E0025A00', 'hex');

            tlv = TlvFactory.constructedTlv(givenTagBuffer, givenPayloadTlv);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('creates constrcuted with single payload', () => {
            var givenTagBuffer = new Buffer('E0', 'hex');
            var givenPayloadTlv = TlvFactory.primitiveTlv("5A");
            var expectedBuffer = new Buffer('E0025A00', 'hex');

            tlv = TlvFactory.constructedTlv(givenTagBuffer, givenPayloadTlv);
            serialized = TlvFactory.serialize(tlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('fails with invalid payload', () => {
            var givenTagString = '5a';
            var givenValueNumber = 22;

            var throwFunction = () => {
                tlv = TlvFactory.primitiveTlv(givenTagString, <any>givenValueNumber);
            }

            expect(throwFunction).to.throw;
        });

        it('fails with invalid tag class', () => {
            var givenTagString = '5A';

            var throwFunction = () => {
                tlv = TlvFactory.constructedTlv(givenTagString);
            }

            expect(throwFunction).to.throw;
        });

        it('fails with invalid data (tag)', () => {
            var givenNumber: number = 22;

            var throwFunction = () => {
                tlv = TlvFactory.constructedTlv(<any>givenNumber, []);
            }

            expect(throwFunction).to.throw;
        });

        it('fails with invalid data (value)', () => {
            var givenNumber: number = 22;

            var throwFunction = () => {
                tlv = TlvFactory.primitiveTlv('', <any>givenNumber);
            }

            expect(throwFunction).to.throw;
        });


    });

    describe('#serialize', () => {

        it('serializes primitive', () => {
            var givenTlv = TlvFactory.primitiveTlv('5A', '0100')
            var expectedBuffer = tlvGenerator('5A', '02', '0100');

            serialized = TlvFactory.serialize(givenTlv);

            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('serializes concatenated primitive', () => {
            var givenTlv = TlvFactory.parse('5A020100570101')
            var expectedBuffer = Buffer.concat([tlvGenerator('5A', '02', '0100'), tlvGenerator('57', '01', '01')]);

            serialized = TlvFactory.serialize(givenTlv);

            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('serializes constructed', () => {
            var givenTlv = TlvFactory.constructedTlv('E0', TlvFactory.primitiveTlv('57'))
            var expectedBuffer = tlvGenerator('E0', '02', '5700');

            serialized = TlvFactory.serialize(givenTlv);

            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('serializes concatenated constructed', () => {
            var givenTlv = TlvFactory.parse('E0025700E0055A01015700')
            var expectedBuffer = Buffer.concat([tlvGenerator('E0', '02', '5700'), tlvGenerator('E0', '05', '5A01015700')]);

            serialized = TlvFactory.serialize(givenTlv);

            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });

        it('serializes constructed constructed', () => {
            var givenTlv = TlvFactory.parse('E005E003570101')
            var expectedBuffer = tlvGenerator('E0', '05', 'E003570101');

            serialized = TlvFactory.serialize(givenTlv);
            expect(serialized.toString('hex')).to.equal(expectedBuffer.toString('hex'));
        });


        it('fails on wrong data', () => {
            buffer = new Buffer(0);
            var throwFunction = () => {
                serialized = TlvFactory.serialize(<any>buffer);
            }

            expect(throwFunction).to.throw;
        });

    });

});

describe('Tlv', () => {

    var tlv: ITlv;
    describe('#class', () => {

        it('identified universal', () => {
          tlv = TlvFactory.primitiveTlv('0F', new Buffer(0));
          expect(tlv.class).to.equal(TlvClass.UNIVERSAL);
        });
        it('identified application', () => {
          tlv = TlvFactory.primitiveTlv('4F', new Buffer(0));
          expect(tlv.class).to.equal(TlvClass.APPLICATION);
        });
        it('identified context-specific', () => {
          tlv = TlvFactory.primitiveTlv('8F', new Buffer(0));
          expect(tlv.class).to.equal(TlvClass.CONTEXT_SPECIFIC);
        });
        it('identified private', () => {
          tlv = TlvFactory.primitiveTlv('CF', new Buffer(0));
          expect(tlv.class).to.equal(TlvClass.PRIVATE);
        });

    });

    describe('#type', () => {

        var tag: ITlv;
        it('identified primitive', () => {
          tlv = TlvFactory.primitiveTlv('5A', new Buffer(0));
          expect(tlv.type).to.equal(TlvType.PRIMITIVE);
        });
        it('identified constructed', () => {
          tlv = TlvFactory.primitiveTlv('E0', new Buffer(0));
          expect(tlv.type).to.equal(TlvType.CONSTRUCTED);
        });
    });
});
