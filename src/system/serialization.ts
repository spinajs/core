export interface SerializationDescriptor {
    Properties: string[];
}

export function Serialize() {
    return (target: any, property: string) => {
        if (!Reflect.hasMetadata("framework:serialization", target)) {
            Reflect.defineMetadata("framework:serialization", {
                Properties: []
            }, target);
        }

        const sdesc: SerializationDescriptor = Reflect.getMetadata("framework:serialization", target);
        sdesc.Properties.push(property);
    }
}

export interface Serializable{
    [key:  string] : any;
}