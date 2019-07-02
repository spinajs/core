import { resolve, normalize, join } from 'path';

export function dir(path: string) {
    return resolve(normalize(join(__dirname, path)));
}
