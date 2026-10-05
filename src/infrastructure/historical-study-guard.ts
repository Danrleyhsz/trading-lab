import { isDeepStrictEqual } from 'node:util';
import type { PerpetualStudy } from '../application/perpetual-studies.js';
const same = (a: unknown, b: unknown) => isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
/** Retain admitted identity and loaded evidence before a terminal result exists. */
export function assertHistoricalStudiesAppendOnly(previous: PerpetualStudy[] = [], next: PerpetualStudy[] = []) {
    for (const study of previous) {
        const current = next.find(row => row.id === study.id);
        if (!current || current.createdAt !== study.createdAt || !same(current.request, study.request))
            throw Error('study identity rewrite rejected');
        if (study.dataset !== undefined && (current.dataset === undefined || !same(current.dataset, study.dataset)))
            throw Error('study input evidence rewrite rejected');
        if (study.datasetHash !== undefined && current.datasetHash !== study.datasetHash)
            throw Error('study input hash rewrite rejected');
        if (['COMPLETED', 'FAILED', 'INTERRUPTED'].includes(study.status) && !same(current, study))
            throw Error('study evidence rewrite rejected');
    }
}
