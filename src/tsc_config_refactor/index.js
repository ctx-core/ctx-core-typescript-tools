import { readFile, writeFile } from 'node:fs/promises'
import { globby } from 'globby'
import glob from 'tiny-glob'
import { map } from 'ctx-core/array'
import { deep_clone, merge } from 'ctx-core/object'
import { run } from 'ctx-core/run'
export async function tsc_config_refactor() {
	/** @type {Promise<any>[]} */
	const promise_a = []
	promise_a.push(...await glob('packages/*/tsconfig.json').then($a=>$a.map(
		async (tsconfig_path)=>{
			const tsconfig_json = await readFile(tsconfig_path).then($=>$.toString())
			const tsconfig = run(()=>{
				try { return JSON.parse(tsconfig_json) } catch (e) {
					console.error(`Error parsing: ${tsconfig_path}`)
					throw e
				}
			})
			let update = false
			if (!tsconfig.compilerOptions) {
				update = true
				tsconfig.compilerOptions = {}
			}
			if (tsconfig.compilerOptions.importsNotUsedAsValues !== 'error') {
				update = true
				tsconfig.compilerOptions.importsNotUsedAsValues = 'error'
			}
			if (tsconfig.compilerOptions.strict !== true) {
				update = true
				tsconfig.compilerOptions.strict = true
			}
			if (update) {
				await writeFile(
					tsconfig_path,
					JSON.stringify(tsconfig, null, '\t'))
			}
		})))
	promise_a.push(run(async ()=>{
		const base_tsconfig = JSON.parse((await readFile('./tsconfig.json')).toString())
		await Promise.all(map(
			await globby('packages/*/tsconfig.json'),
			async tsconfig_path=>{
				const tsconfig_json = (await readFile(tsconfig_path)).toString()
				let tsconfig = JSON.parse(tsconfig_json)
				let update
				if (tsconfig.extends == '../../tsconfig.json') {
					update = true
					delete tsconfig.extends
					tsconfig = merge(deep_clone(base_tsconfig), tsconfig)
				}
				if (tsconfig.references?.length) {
					update = true
					tsconfig.references = []
				}
				if (update) {
					await writeFile(tsconfig_path, JSON.stringify(tsconfig, null, '\t'))
				}
			})
		)
	}))
	await Promise.all(promise_a)
}
