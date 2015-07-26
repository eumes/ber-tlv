var chai_1 = require('chai');
var Tlv_1 = require('./Tlv');
var TlvFactory_1 = require('./TlvFactory');
function tlvGenerator(tag, length, value) {
    var tagBuffer = new Buffer(tag.replace(' ', ''), 'hex');
    var lengthBuffer = new Buffer(length.replace(' ', ''), 'hex');
    var valueBuffer = new Buffer(value.replace(' ', ''), 'hex');
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}
describe('Tlv', function () {
    describe('deserialize', function () {
        var buffer;
        var items;
        var error;
        it('can parse 1 byte tag primitve tlv object', function () {
            buffer = tlvGenerator('5A', '02', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('5A');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('can parse 2 byte tag primitve tlv object', function () {
            buffer = tlvGenerator('9F02', '02', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('9F02');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('can parse 3 byte tag primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '02', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('can parse a constructed tlv object', function () {
            buffer = tlvGenerator('E0', '08', '9A02AABB 9B02DDFF');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('E0');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.CONSTRUCTED);
        });
        it('can parse 1 byte tag with 1 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '8102', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 2 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '820002', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 3 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '83000002', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('can parse 1 byte tag with 4 byte length primitve tlv object', function () {
            buffer = tlvGenerator('DFAE03', '8400000002', '2020');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('DFAE03');
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('parses 0 length item', function () {
            buffer = tlvGenerator('12', '00', '');
            items = TlvFactory_1.TlvFactory.parse(buffer);
            chai_1.expect(items).to.exist;
            var item = items.pop();
            chai_1.expect(item.tag).to.equal('12');
            chai_1.expect(item.value).to.exist;
            chai_1.expect(item.type).to.equal(Tlv_1.TlvType.PRIMITIVE);
        });
        it('fails on empty data', function () {
            buffer = tlvGenerator('DF', '', '');
            var throwFunction = function () {
                items = TlvFactory_1.TlvFactory.parse(buffer);
            };
            chai_1.expect(throwFunction).to.throw;
        });
    });
    describe('class', function () {
        var tag;
        it('identified class universal', function () {
            tag = TlvFactory_1.TlvFactory.primitiveTlv('0F', new Buffer(0));
            chai_1.expect(tag.class).to.equal(Tlv_1.TlvClass.UNIVERSAL);
        });
        it('identified class application', function () {
            tag = TlvFactory_1.TlvFactory.primitiveTlv('4F', new Buffer(0));
            chai_1.expect(tag.class).to.equal(Tlv_1.TlvClass.APPLICATION);
        });
        it('identified class context-specific', function () {
            tag = TlvFactory_1.TlvFactory.primitiveTlv('8F', new Buffer(0));
            chai_1.expect(tag.class).to.equal(Tlv_1.TlvClass.CONTEXT_SPECIFIC);
        });
        it('identified class private', function () {
            tag = TlvFactory_1.TlvFactory.primitiveTlv('CF', new Buffer(0));
            chai_1.expect(tag.class).to.equal(Tlv_1.TlvClass.PRIVATE);
        });
    });
});
