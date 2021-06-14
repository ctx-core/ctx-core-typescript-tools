import { promisify } from 'util';
import fs from 'fs';
import globby from 'globby';
import { run } from '@ctx-core/function';
import { deep_clone, merge } from '@ctx-core/object';
import { map } from '@ctx-core/array';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
export async function tsc_config_refactor() {
    const promise_a = [];
    promise_a.push(...(await globby('packages/*/tsconfig.json')).map(async (tsconfig_path) => {
        const tsconfig_json = (await fs.promises.readFile(tsconfig_path)).toString();
        const tsconfig = run(() => {
            try {
                return JSON.parse(tsconfig_json);
            }
            catch (e) {
                console.error(`Error parsing: ${tsconfig_path}`);
                throw e;
            }
        });
        let update = false;
        if (!tsconfig.compilerOptions) {
            update = true;
            tsconfig.compilerOptions = {};
        }
        if (tsconfig.compilerOptions.importsNotUsedAsValues !== 'error') {
            update = true;
            tsconfig.compilerOptions.importsNotUsedAsValues = 'error';
        }
        if (tsconfig.compilerOptions.strict !== true) {
            update = true;
            tsconfig.compilerOptions.strict = true;
        }
        if (update) {
            await fs.promises.writeFile(tsconfig_path, JSON.stringify(tsconfig, null, '\t'));
        }
    }));
    promise_a.push(run(async () => {
        const base_tsconfig = JSON.parse((await readFile('./tsconfig.json')).toString());
        await Promise.all(map(await globby('packages/*/tsconfig.json'), async (tsconfig_path) => {
            var _a;
            const tsconfig_json = (await readFile(tsconfig_path)).toString();
            let tsconfig = JSON.parse(tsconfig_json);
            let update;
            if (tsconfig.extends == '../../tsconfig.json') {
                update = true;
                delete tsconfig.extends;
                tsconfig = merge(deep_clone(base_tsconfig), tsconfig);
            }
            if ((_a = tsconfig.references) === null || _a === void 0 ? void 0 : _a.length) {
                update = true;
                tsconfig.references = [];
            }
            if (update) {
                await writeFile(tsconfig_path, JSON.stringify(tsconfig, null, '\t'));
            }
        }));
    }));
    await Promise.all(promise_a);
}
//# sourceMappingURL=../src/cli/tsc-config-refactor.js.map