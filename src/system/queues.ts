import { Serialize, SerializationDescriptor, Serializable } from "./serialization";
import * as moment from 'moment';

/**
 * Events are messages send via queue, we do not want to track it, dont care about result, no retry policy on failed execution etc.
 */
export abstract class EventBase {

    [key: string]: any;

    @Serialize()
    public CreatedAt: string;

    constructor(){
        this.CreatedAt = moment().format("YYYY-MM-DD HH:mm:ss.SSSSSS");
    }

    public hydrate(payload: any) {
        const sdesc: SerializationDescriptor = Reflect.getMetadata("framework:serialization", this);
        if (!sdesc || !payload) {
            return;
        }

        for (const prop of sdesc.Properties) {
            this[prop] = payload[prop];
        }
    }

    public abstract execute(): void;

    toJSON() {
        const sdesc: SerializationDescriptor = Reflect.getMetadata("framework:serialization", this);
        const data: Serializable = {};

        if (!sdesc) {
            return data;
        }

        for (const prop of sdesc.Properties) {
            data[prop] = this[prop];
        }

        return data;
    }
}

/**
 * Jobs are like events, except we track it execution, retry on fail, delayed execution etc.
 */
export abstract class JobBase extends EventBase {

    @Serialize()
    public JobId: string;
}
