var Tlv = require('../release/js/Tlv');
var TlvFactory = require('../release/js/TlvFactory');

var BerTlv = {};
//Tlv
BerTlv.ITlv = Tlv.ITlv;
BerTlv.TlvType = Tlv.TlvType;
BerTlv.TlvClass = Tlv.TlvClass;
BerTlv.TlvHelper = Tlv.TlvHelper;
//TlvFactory
BerTlv.IParseError = TlvFactory.IParseError;
BerTlv.TlvFactory = TlvFactory.TlvFactory;

module.exports = BerTlv;
