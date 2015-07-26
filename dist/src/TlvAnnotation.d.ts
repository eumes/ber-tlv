import { ITlv, TlvType } from './Tlv';
export declare enum AnnotationValueFormat {
    ALPHABETIC = 0,
    ALPHANUMERIC = 1,
    ALPHANUMERIC_SPECIAL = 2,
    UNSIGNED_NUMBER = 3,
    COMPRESSED_NUMERIC = 4,
    NUMERIC = 5,
    VARIABLE_BITS = 6,
    VARIABLE_BYTES = 7,
    DOL = 8,
    YYMMDD = 9,
    HHMMSS = 10,
}
export declare enum AnnotationValueReference {
    ISO_3166 = 0,
    ISO_4217 = 1,
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
export interface ITlvAnnotationComponent {
    selector: string;
    name: string;
    triggered: boolean;
    value: string;
}
export declare class TlvAnnotationRegistry {
    private static INSTANCE;
    static getInstance(): TlvAnnotationRegistry;
    static lookupAnnotations(tlvItems: ITlv[]): ITlvAnnotation[];
    static lookupAnnotation(tlvItems: ITlv): ITlvAnnotation;
    static registerAnnotationProvider(provider: ITlvAnnotationProvider): void;
    providers: ITlvAnnotationProvider[];
    constructor();
    lookupAnnotations(tlvItems: ITlv[]): ITlvAnnotation[];
    lookupAnnotation(tlvItem: ITlv): ITlvAnnotation;
    private defaultAnnotation(tlvItem);
    registerAnnotationProvider(provider: ITlvAnnotationProvider): void;
    private registerDefaultProviders();
}
export interface ITlvAnnotationProvider {
    name: string;
    reference: string;
    lookup(item: ITlv): ITlvAnnotation;
}
export declare class DefaultTlvAnnotationProvider implements ITlvAnnotationProvider {
    resource: ITlvAnnotationResource;
    name: string;
    reference: string;
    constructor(resource: ITlvAnnotationResource);
    lookup(item: ITlv): ITlvAnnotation;
    private buildAnnotationConstructed(item, resourceItem);
    private buildAnnotationPrimitive(item, resourceItem);
    private buildAnnotationReference(reference, mappedValue);
    private buildAnnotationComponents(mappedValue, resourceItem);
    private extractRegex(reference, regex);
    private findItemWithTag(tag);
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
