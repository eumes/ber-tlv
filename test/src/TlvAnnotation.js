var currencyLookup = require('country-data').lookup;
var countryLookup = require('i18n-iso-countries');
var Tlv_1 = require('./Tlv');
var ByteHelper_1 = require('./ByteHelper');
var octet_buffer_1 = require('../node_modules/octet-buffer/dist/octet-buffer');
(function (AnnotationValueFormat) {
    AnnotationValueFormat[AnnotationValueFormat["ALPHABETIC"] = 0] = "ALPHABETIC";
    AnnotationValueFormat[AnnotationValueFormat["ALPHANUMERIC"] = 1] = "ALPHANUMERIC";
    AnnotationValueFormat[AnnotationValueFormat["ALPHANUMERIC_SPECIAL"] = 2] = "ALPHANUMERIC_SPECIAL";
    AnnotationValueFormat[AnnotationValueFormat["UNSIGNED_NUMBER"] = 3] = "UNSIGNED_NUMBER";
    AnnotationValueFormat[AnnotationValueFormat["COMPRESSED_NUMERIC"] = 4] = "COMPRESSED_NUMERIC";
    AnnotationValueFormat[AnnotationValueFormat["NUMERIC"] = 5] = "NUMERIC";
    AnnotationValueFormat[AnnotationValueFormat["VARIABLE_BITS"] = 6] = "VARIABLE_BITS";
    AnnotationValueFormat[AnnotationValueFormat["VARIABLE_BYTES"] = 7] = "VARIABLE_BYTES";
    AnnotationValueFormat[AnnotationValueFormat["YYMMDD"] = 8] = "YYMMDD";
    AnnotationValueFormat[AnnotationValueFormat["HHMMSS"] = 9] = "HHMMSS";
})(exports.AnnotationValueFormat || (exports.AnnotationValueFormat = {}));
var AnnotationValueFormat = exports.AnnotationValueFormat;
(function (AnnotationValueReference) {
    AnnotationValueReference[AnnotationValueReference["ISO_3166"] = 0] = "ISO_3166";
    AnnotationValueReference[AnnotationValueReference["ISO_4217"] = 1] = "ISO_4217";
})(exports.AnnotationValueReference || (exports.AnnotationValueReference = {}));
var AnnotationValueReference = exports.AnnotationValueReference;
var AnnotationValueReferenceHelper = (function () {
    function AnnotationValueReferenceHelper() {
    }
    AnnotationValueReferenceHelper.stringValueUsingReference = function (mappedValue, annotationValueReference) {
        var stringValue = mappedValue + " (unmapped)";
        switch (annotationValueReference) {
            case AnnotationValueReference.ISO_3166: {
                var countryNumber = parseInt(mappedValue, 10);
                var countryName = countryLookup.getName(countryNumber, "en");
                var countryAlpha2 = countryLookup.numericToAlpha2(mappedValue);
                stringValue = countryName + " (" + countryAlpha2 + ")";
                break;
            }
            case AnnotationValueReference.ISO_4217: {
                var currencyNumber = parseInt(mappedValue, 10);
                var currency = currencyLookup.currencies({ number: currencyNumber })[0];
                var currencyName = currency.name;
                var currencyCode = currency.code;
                stringValue = currencyName + " (" + currencyCode + ")";
                break;
            }
        }
        return stringValue;
    };
    return AnnotationValueReferenceHelper;
})();
var AnnotationValueFormatHelper = (function () {
    function AnnotationValueFormatHelper() {
    }
    AnnotationValueFormatHelper.stringValueUsingFormat = function (value, annotationValueFormat) {
        var rawValue = value.toString('hex').toUpperCase();
        var stringValue = rawValue;
        switch (annotationValueFormat) {
            case AnnotationValueFormat.ALPHABETIC: {
                stringValue = value.toString('utf-8');
                break;
            }
            case AnnotationValueFormat.ALPHANUMERIC: {
                stringValue = value.toString('utf-8');
                break;
            }
            case AnnotationValueFormat.ALPHANUMERIC_SPECIAL: {
                stringValue = value.toString('utf-8');
                break;
            }
            case AnnotationValueFormat.UNSIGNED_NUMBER: {
                stringValue = '' + value.readUInt8(value.length - 1);
                break;
            }
            case AnnotationValueFormat.VARIABLE_BYTES: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.VARIABLE_BITS: {
                var octetBuffer = new octet_buffer_1.OctetBuffer(value);
                var bufferBinaryString = '';
                while (octetBuffer.remaining > 0) {
                    var bufferByte = octetBuffer.readUInt8();
                    var bufferByteBinaryString = bufferByte.toString(2);
                    var requiredPadding = 8 - bufferByteBinaryString.length;
                    bufferByteBinaryString = Array(requiredPadding + 1).join('0') + bufferByteBinaryString;
                    bufferBinaryString += bufferByteBinaryString + ' ';
                }
                bufferBinaryString = bufferBinaryString.slice(0, -1);
                stringValue = bufferBinaryString;
                break;
            }
            case AnnotationValueFormat.COMPRESSED_NUMERIC: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.NUMERIC: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.YYMMDD: {
                stringValue = rawValue;
                stringValue = stringValue.substring(0, 2) + '-' + stringValue.substring(2, 4) + '-' + stringValue.substring(4, 6);
                break;
            }
            case AnnotationValueFormat.HHMMSS: {
                stringValue = rawValue;
                stringValue = stringValue.substring(0, 2) + ':' + stringValue.substring(2, 4) + ':' + stringValue.substring(4, 6);
                break;
            }
        }
        return stringValue;
    };
    return AnnotationValueFormatHelper;
})();
var TlvAnnotation = (function () {
    function TlvAnnotation(tag, type, rawValue, mappedValue, name, description, reference, format, components) {
        if (mappedValue === void 0) { mappedValue = null; }
        if (name === void 0) { name = null; }
        if (description === void 0) { description = null; }
        if (reference === void 0) { reference = null; }
        if (format === void 0) { format = null; }
        if (components === void 0) { components = null; }
        this.tag = tag;
        this.type = type;
        this.rawValue = rawValue;
        this.mappedValue = mappedValue;
        this.name = name;
        this.description = description;
        this.reference = reference;
        this.format = format;
        this.components = components;
        this.items = null;
    }
    return TlvAnnotation;
})();
var TlvAnnotationComponent = (function () {
    function TlvAnnotationComponent(name, selector, triggered, value) {
        this.name = name;
        this.selector = selector;
        this.triggered = triggered;
        this.value = value;
    }
    return TlvAnnotationComponent;
})();
var TlvAnnotationRegistry = (function () {
    function TlvAnnotationRegistry() {
        this.providers = [];
    }
    TlvAnnotationRegistry.getInstance = function () {
        if (this.INSTANCE == null) {
            this.INSTANCE = new TlvAnnotationRegistry();
            this.INSTANCE.registerDefaultProviders();
        }
        return this.INSTANCE;
    };
    TlvAnnotationRegistry.lookupAnnotations = function (tlvItems) {
        return this.getInstance().lookupAnnotations(tlvItems);
    };
    TlvAnnotationRegistry.lookupAnnotation = function (tlvItems) {
        return this.getInstance().lookupAnnotation(tlvItems);
    };
    TlvAnnotationRegistry.registerAnnotationProvider = function (provider) {
        this.getInstance().registerAnnotationProvider(provider);
    };
    TlvAnnotationRegistry.prototype.lookupAnnotations = function (tlvItems) {
        var annotationItems = [];
        for (var i = 0; i < tlvItems.length; i++) {
            var tlvItem = tlvItems[i];
            var tlvAnnotation = this.lookupAnnotation(tlvItem);
            annotationItems.push(tlvAnnotation);
            if (tlvItem.items !== null) {
                var subAnnotationItems = this.lookupAnnotations(tlvItem.items);
                tlvAnnotation.items = subAnnotationItems;
            }
        }
        return annotationItems;
    };
    TlvAnnotationRegistry.prototype.lookupAnnotation = function (tlvItem) {
        for (var i = 0; i < this.providers.length; i++) {
            var provider = this.providers[i];
            var annotation = provider.lookup(tlvItem);
            if (annotation !== null) {
                return annotation;
            }
        }
        return this.defaultAnnotation(tlvItem);
    };
    TlvAnnotationRegistry.prototype.defaultAnnotation = function (tlvItem) {
        var tag = tlvItem.tag;
        var type = tlvItem.type;
        var rawValue = AnnotationValueFormatHelper.stringValueUsingFormat(tlvItem.value, AnnotationValueFormat.VARIABLE_BYTES);
        var annotationItem = new TlvAnnotation(tag, type, rawValue);
        return annotationItem;
    };
    TlvAnnotationRegistry.prototype.registerAnnotationProvider = function (provider) {
        this.providers.push(provider);
    };
    TlvAnnotationRegistry.prototype.registerDefaultProviders = function () {
    };
    return TlvAnnotationRegistry;
})();
exports.TlvAnnotationRegistry = TlvAnnotationRegistry;
var DefaultTlvAnnotationProvider = (function () {
    function DefaultTlvAnnotationProvider(resource) {
        this.resource = resource;
        this.reference = resource.reference;
        this.name = resource.name;
    }
    DefaultTlvAnnotationProvider.prototype.lookup = function (item) {
        var resourceItem = this.findItemWithTag(item.tag);
        if (resourceItem == null) {
            return null;
        }
        var annotation;
        if (item.type === Tlv_1.TlvType.PRIMITIVE) {
            annotation = this.buildAnnotationPrimitive(item, resourceItem);
        }
        else {
            annotation = this.buildAnnotationConstructed(item, resourceItem);
        }
        return annotation;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationConstructed = function (item, resourceItem) {
        var tag = item.tag;
        var type = item.type;
        var name = resourceItem.name;
        var description = resourceItem.description;
        var reference = this.reference;
        var rawValue = item.value.toString('hex').toUpperCase();
        var annotationItem = new TlvAnnotation(tag, type, rawValue, null, name, description, reference);
        return annotationItem;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationPrimitive = function (item, resourceItem) {
        var tag = item.tag;
        var type = item.type;
        var name = resourceItem.name;
        var description = resourceItem.description;
        var reference = this.reference;
        var format = resourceItem.format;
        var reference = resourceItem.reference;
        var rawValue = item.value.toString('hex').toUpperCase();
        var mappedValue = AnnotationValueFormatHelper.stringValueUsingFormat(item.value, AnnotationValueFormat[format]);
        var componentsItems = this.buildAnnotationComponents(mappedValue, resourceItem);
        var referenceItem = this.buildAnnotationReference(reference, mappedValue);
        var mergedComponents = [];
        if (componentsItems !== null) {
            mergedComponents = mergedComponents.concat(componentsItems);
        }
        if (referenceItem !== null) {
            mergedComponents = mergedComponents.concat(referenceItem);
        }
        if (mergedComponents.length === 0) {
            mergedComponents = null;
        }
        var annotationItem = new TlvAnnotation(tag, type, rawValue, mappedValue, name, description, reference, format, mergedComponents);
        return annotationItem;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationReference = function (reference, mappedValue) {
        if (reference == null || reference.length === 0) {
            return null;
        }
        var referenceEnum = AnnotationValueReference[reference];
        var referenceValue = AnnotationValueReferenceHelper.stringValueUsingReference(mappedValue, referenceEnum);
        var referenceComponent = new TlvAnnotationComponent(reference, mappedValue, true, referenceValue);
        return referenceComponent;
    };
    DefaultTlvAnnotationProvider.prototype.buildAnnotationComponents = function (mappedValue, resourceItem) {
        if (resourceItem.components == null || resourceItem.components.length === 0) {
            return null;
        }
        var valueComponents = [];
        for (var i = 0; i < resourceItem.components.length; i++) {
            var resourceComponent = resourceItem.components[i];
            var name = resourceComponent.name;
            var selector = null;
            var triggered = false;
            var value = null;
            if (typeof (resourceComponent.bitmask) !== 'undefined' && resourceComponent.bitmask !== null) {
                selector = resourceComponent.bitmask;
                triggered = ByteHelper_1.ByteHelper.hexStringMatchesHexBitflags(mappedValue, resourceComponent.bitmask);
            }
            else if (typeof (resourceComponent.bitpattern) !== 'undefined' && resourceComponent.bitpattern !== null) {
                selector = resourceComponent.bitpattern;
                triggered = ByteHelper_1.ByteHelper.hexStringMatchesHexBitpattern(mappedValue, resourceComponent.bitpattern);
            }
            else if (typeof (resourceComponent.pattern) !== 'undefined' && resourceComponent.pattern !== null) {
                selector = resourceComponent.pattern.toUpperCase();
                triggered = (selector === mappedValue.toUpperCase());
            }
            var valueComponent = new TlvAnnotationComponent(name, selector, triggered, value);
            valueComponents.push(valueComponent);
        }
        return valueComponents;
    };
    DefaultTlvAnnotationProvider.prototype.extractRegex = function (reference, regex) {
        var compiledRegex = new RegExp(regex, 'i');
        var execResult = compiledRegex.exec(reference);
        if (execResult === null) {
            return null;
        }
        var match = execResult[1];
        return match;
    };
    DefaultTlvAnnotationProvider.prototype.findItemWithTag = function (tag) {
        for (var i = 0; i < this.resource.items.length; i++) {
            var item = this.resource.items[i];
            if (item.tag === tag) {
                return item;
            }
        }
        return null;
    };
    return DefaultTlvAnnotationProvider;
})();
exports.DefaultTlvAnnotationProvider = DefaultTlvAnnotationProvider;
