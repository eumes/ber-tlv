import * as util from 'util';
var currencyLookup = require('country-data').lookup;
var countryLookup =  require('i18n-iso-countries');

import { ITlv, TlvFactory, TlvType } from './Tlv';
import * as ByteHelper from './ByteHelper';
import { OctetBuffer } from '../node_modules/octet-buffer/dist/octet-buffer';

export enum AnnotationValueFormat {
    ALPHABETIC,           // Ascii [a-zA-Z]
    ALPHANUMERIC,         // Ascii [a-zA-Z0-9]
    ALPHANUMERIC_SPECIAL, // Ascii (all)
    UNSIGNED_NUMBER,      // Number, binary

    COMPRESSED_NUMERIC,	  // Number, left justified BCD, padded right with F
    NUMERIC,	          // Number, right justified BCD, padded left with 0

    VARIABLE_BITS,        // Proprietary, displayed bitwise)
    VARIABLE_BYTES,       // Proprietary, displayed bytewise hex)

    DOL,				  // Data object list (containing TLV tag + length items, without value)

    YYMMDD,               // Date format
    HHMMSS,               // Time format
}

/**
	Pattern:


"pattern": "05",			--> '<value>',				'05'
"bitmask": "0080",			--> '<byte>&<bitmask>',		'2&80'		-or- '2&10000000'	-or- '2&7'
"bitpattern": "xx000011",  	--> '<byte>=<bytemask>', 	'1=--000011'
"bitpattern": "x0xxxxxx",  								'1=-0------'
"bitpattern": "xx000000",  								'1=--000000'

<byte> == <number>
<bitmask>    == <number:2> hex, <number:8> bits, <number:1> bit
<bytemask>   == <<bitpattern>:8>
<bitpattern> == '-' ignore, '1'|'0' value

*/


export enum AnnotationValueReference {
    ISO_3166,             // Country
    ISO_4217,             // Currency
}

class AnnotationValueReferenceHelper {

    static stringValueUsingReference(mappedValue: string, annotationValueReference: AnnotationValueReference): string {

        var stringValue: string = mappedValue + " (unmapped)";
        switch(annotationValueReference){
            case AnnotationValueReference.ISO_3166: {
                var countryNumber = parseInt(mappedValue, 10);
                var countryName = countryLookup.getName(countryNumber, "en");
                var countryAlpha2 = countryLookup.numericToAlpha2(mappedValue);
                stringValue = countryName + " (" + countryAlpha2 + ")";
                break;
            }
            case AnnotationValueReference.ISO_4217: {
                var currencyNumber = parseInt(mappedValue, 10);
                var currency = currencyLookup.currencies({number: currencyNumber})[0];
                var currencyName = currency.name;
                var currencyCode = currency.code;
                stringValue = currencyName + " (" + currencyCode + ")";
                break;
            }
        }
        return stringValue;
    }
}

class AnnotationValueFormatHelper {

    static stringValueUsingFormat(value: Buffer, annotationValueFormat: AnnotationValueFormat): string {
        var rawValue: string = value.toString('hex').toUpperCase();
        var stringValue: string = rawValue;
        switch(annotationValueFormat){
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
                //TODO: make this conditional on how many bytes are available (extend OctetBuffer)
                //right now, this leads to error for number > 127
                stringValue = '' + value.readUInt8(value.length - 1);
                break;
            }
            case AnnotationValueFormat.VARIABLE_BYTES: {
                stringValue = rawValue;
                break;
            }
            case AnnotationValueFormat.VARIABLE_BITS: {

                var octetBuffer: OctetBuffer = new OctetBuffer(value);
                var bufferBinaryString: string = '';
                while (octetBuffer.remaining > 0){
                    var bufferByte: number = octetBuffer.readUInt8();
                    var bufferByteBinaryString: string = bufferByte.toString(2);

                    var requiredPadding: number = 8 - bufferByteBinaryString.length;
                    bufferByteBinaryString = Array(requiredPadding + 1).join('0') + bufferByteBinaryString;

                    bufferBinaryString += bufferByteBinaryString + ' ';
                }

                bufferBinaryString = bufferBinaryString.slice(0, -1);
                stringValue = bufferBinaryString;
                break;
            }
            case AnnotationValueFormat.COMPRESSED_NUMERIC: {
                stringValue = rawValue;
                //TOOD: remove right padded F
                break;
            }
            case AnnotationValueFormat.NUMERIC: {
                stringValue = rawValue;
                //TODO: remove left padded 0
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
    }
}

export interface ITlvAnnotation {
    tag: string;
    type: TlvType;
    rawValue: string;
    mappedValue: string;
    items: ITlvAnnotation[];

    name: string;
    description: string;
    reference: string;
    format: string;
    components: ITlvAnnotationComponent[];
}

class TlvAnnotation implements ITlvAnnotation {
    public items: ITlvAnnotation[];
    constructor(public tag: string, public type: TlvType, public rawValue: string, public mappedValue: string = null, public name: string = null, public description: string = null, public reference: string = null, public format: string = null, public components: ITlvAnnotationComponent[] = null) {
        this.items = null;
    }
}

export interface ITlvAnnotationComponent {
    selector: string;
    name: string;
    triggered: boolean;
    value: string;
}

class TlvAnnotationComponent implements ITlvAnnotationComponent {
    constructor(public name: string, public selector: string, public triggered: boolean, public value: string) {}
}

export class TlvAnnotationRegistry {

    private static INSTANCE: TlvAnnotationRegistry;

    public static getInstance(): TlvAnnotationRegistry {
        if (this.INSTANCE == null){
            this.INSTANCE = new TlvAnnotationRegistry();
            this.INSTANCE.registerDefaultProviders();
        }
        return this.INSTANCE;
    }

    public static  lookupAnnotations(tlvItems: ITlv[]): ITlvAnnotation[]{
        return this.getInstance().lookupAnnotations(tlvItems);
    }
    public static  lookupAnnotation(tlvItems: ITlv): ITlvAnnotation{
        return this.getInstance().lookupAnnotation(tlvItems);
    }

    public static registerAnnotationProvider(provider: ITlvAnnotationProvider): void {
        this.getInstance().registerAnnotationProvider(provider);
    }

    public providers: ITlvAnnotationProvider[];

    constructor(){
        this.providers = [];
    }

    public lookupAnnotations(tlvItems: ITlv[]): ITlvAnnotation[]{
        var annotationItems: ITlvAnnotation[] = [];
        for (var i: number = 0; i < tlvItems.length; i++){
            var tlvItem: ITlv = tlvItems[i];
            var tlvAnnotation: ITlvAnnotation = this.lookupAnnotation(tlvItem);
            annotationItems.push(tlvAnnotation);

            if (tlvItem.items !== null){
                var subAnnotationItems: ITlvAnnotation[] = this.lookupAnnotations(tlvItem.items);
                tlvAnnotation.items = subAnnotationItems;
            }
        }
        return annotationItems;
    }

    public lookupAnnotation(tlvItem: ITlv): ITlvAnnotation {
        for (var i: number = 0; i < this.providers.length; i++){
            var provider: ITlvAnnotationProvider = this.providers[i];
            var annotation: ITlvAnnotation = provider.lookup(tlvItem);
            if (annotation !== null){
                return annotation;
            }
        }

        return this.defaultAnnotation(tlvItem);
    }

    private defaultAnnotation(tlvItem: ITlv): ITlvAnnotation{
        var tag: string = tlvItem.tag;
        var type: TlvType = tlvItem.type;
        var rawValue: string = AnnotationValueFormatHelper.stringValueUsingFormat(tlvItem.value, AnnotationValueFormat.VARIABLE_BYTES);

        var annotationItem: ITlvAnnotation = new TlvAnnotation(tag, type, rawValue);
        return annotationItem;
    }

    public registerAnnotationProvider(provider: ITlvAnnotationProvider): void {
        this.providers.push(provider);
    }

    private registerDefaultProviders(): void {

    }
}

export interface ITlvAnnotationProvider {
    name: string;
    reference: string;

    lookup(item: ITlv): ITlvAnnotation;
}

export class DefaultTlvAnnotationProvider implements ITlvAnnotationProvider {
    public name: string;
    public reference: string;

    constructor(public resource: ITlvAnnotationResource){
      this.reference = resource.reference;
      this.name = resource.name;
    }

    lookup(item: ITlv): ITlvAnnotation {
        var resourceItem: ITlvAnnotationResourceItem = this.findItemWithTag(item.tag);
        if (resourceItem == null){
            return null;
        }

        var annotation: ITlvAnnotation;
        if (item.type === TlvType.PRIMITIVE){
          annotation = this.buildAnnotationPrimitive(item, resourceItem);
        }
        else {
          annotation = this.buildAnnotationConstructed(item, resourceItem);
        }
        return annotation;
    }

    private buildAnnotationConstructed(item: ITlv, resourceItem: ITlvAnnotationResourceItem): ITlvAnnotation {
        var tag: string = item.tag;
        var type: TlvType = item.type;
        var name: string = resourceItem.name;
        var description: string = resourceItem.description;
        var reference: string = this.reference;
        var rawValue: string = item.value.toString('hex').toUpperCase();

        var annotationItem: ITlvAnnotation = new TlvAnnotation(tag, type, rawValue, null, name, description, reference);
        return annotationItem;
    }

    private buildAnnotationPrimitive(item: ITlv, resourceItem: ITlvAnnotationResourceItem): ITlvAnnotation {
        var tag: string = item.tag;
        var type: TlvType = item.type;
        var name: string = resourceItem.name;
        var description: string = resourceItem.description;
        var reference: string = this.reference;
        var format: string = resourceItem.format;
        var reference: string = resourceItem.reference;
        var rawValue: string = item.value.toString('hex').toUpperCase();
        var mappedValue: string = AnnotationValueFormatHelper.stringValueUsingFormat(item.value, (<any>AnnotationValueFormat)[format]); //enum workaround
        var componentsItems: ITlvAnnotationComponent[] = this.buildAnnotationComponents(mappedValue, resourceItem);
        var referenceItem: ITlvAnnotationComponent = this.buildAnnotationReference(reference, mappedValue);

        var mergedComponents: ITlvAnnotationComponent[] = [];
        if (componentsItems !== null){
            mergedComponents = mergedComponents.concat(componentsItems);
        }
        if (referenceItem !== null){
            mergedComponents = mergedComponents.concat(referenceItem);
        }
        if (mergedComponents.length === 0){
            mergedComponents = null;
        }

        var annotationItem: ITlvAnnotation = new TlvAnnotation(tag, type, rawValue, mappedValue, name, description, reference, format, mergedComponents);
        return annotationItem;
    }

    private buildAnnotationReference(reference: string, mappedValue: string): ITlvAnnotationComponent {
        if (reference == null || reference.length === 0){
            return null;
        }

        var referenceEnum: AnnotationValueReference = (<any>AnnotationValueReference)[reference];
        var referenceValue: string = AnnotationValueReferenceHelper.stringValueUsingReference(mappedValue, referenceEnum);

        var referenceComponent: ITlvAnnotationComponent = new TlvAnnotationComponent(reference, mappedValue, true, referenceValue);
        return referenceComponent;
    }

    private buildAnnotationComponents(mappedValue: string, resourceItem: ITlvAnnotationResourceItem): ITlvAnnotationComponent[] {
        if (resourceItem.components == null || resourceItem.components.length === 0){
            return null;
        }

        var valueComponents: ITlvAnnotationComponent[] = [];
        for (var i: number = 0; i < resourceItem.components.length; i++){
            var resourceComponent: ITlvAnnotationResourceItemComponents = resourceItem.components[i];
            var name: string = resourceComponent.name;
            var selector: string = null;
            var triggered: boolean = false;
            var value: string = null;
            /*
            if (typeof(resourceComponent.regex) !== 'undefined' && resourceComponent.regex !== null){
                selector = resourceComponent.regex;
                var regexResult = this.extractRegex(mappedValue, resourceComponent.regex);
                if (regexResult !== null){
                    triggered = true;
                    value = regexResult;
                }
            }
            else */
            if (typeof(resourceComponent.bitmask) !== 'undefined' && resourceComponent.bitmask !== null){
                selector = resourceComponent.bitmask;
                triggered = ByteHelper.hexStringMatchesHexBitflags(mappedValue, resourceComponent.bitmask);
            }
            else if (typeof(resourceComponent.bitpattern) !== 'undefined' && resourceComponent.bitpattern !== null){
                selector = resourceComponent.bitpattern;
                triggered = ByteHelper.hexStringMatchesHexBitpattern(mappedValue, resourceComponent.bitpattern);
            }
            else if (typeof(resourceComponent.pattern) !== 'undefined' && resourceComponent.pattern !== null){
                selector = resourceComponent.pattern.toUpperCase();
                triggered = (selector === mappedValue.toUpperCase());
            }
            var valueComponent: ITlvAnnotationComponent = new TlvAnnotationComponent(name, selector, triggered, value);
            valueComponents.push(valueComponent);
        }
        return valueComponents;
    }

    private extractRegex(reference: string, regex: string): string{
        var compiledRegex: RegExp = new RegExp(regex, 'i');
        var execResult: RegExpExecArray = compiledRegex.exec(reference);
        if (execResult === null){
            return null;
        }
        var match: string = execResult[1];
        return match;
    }

    private findItemWithTag(tag: string): ITlvAnnotationResourceItem{
        for (var i: number = 0; i < this.resource.items.length; i++){
            var item: ITlvAnnotationResourceItem = this.resource.items[i];
            if (item.tag === tag){
                return item;
            }
        }
        return null;
    }
}

export interface ITlvAnnotationResource {
    name: string;
    reference: string;
    items: ITlvAnnotationResourceItem[];
}

export interface ITlvAnnotationResourceItem {
    tag: string;
    name: string;
    description: string;
    format?: string;
    reference?: string;
    components?: ITlvAnnotationResourceItemComponents[];
}

export interface ITlvAnnotationResourceItemComponents {
    name: string;
    bitmask?: string;
    pattern?: string;
    bitpattern?: string;
}
