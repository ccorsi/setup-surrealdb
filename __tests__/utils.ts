/*
 * This file contains different utility functions that will be used by the
 * different tests.
 */

import * as core from '@actions/core'
import * as path from 'path'
import { existsSync, rmSync, openSync, closeSync, mkdirSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import { setup_surrealdb, INPUT_VERSION } from '../src/setup'

/*
 * This method will create the runner temporary and tool cache directories that
 * contains the passed name as part of these directories.  This method will then
 * return a function that can be used to delete the newly created runner directories.
 * This function can be used within the before/after jest callbacks.
 *
 * @param name unique name used to create runner directories
 * @return function the can be used to detele the created directories
 */
export function setup_runner_temp_and_cache(name: string) : () => void {
    const root_directory: string = path.join(path.dirname('./utils.js'), name)
    const [ tempPath, cachePath ] : string[] = [
        path.join(root_directory, 'TEMP'),
        path.join(root_directory, 'CACHE')
    ]

    core.debug(`Created runner temp path: ${tempPath} and runner tool cache path: ${cachePath}`)

    // Set temp and tool directories before importing (used to set global state)
    process.env['RUNNER_TEMP']       = tempPath
    process.env['RUNNER_TOOL_CACHE'] = cachePath

    return () => {
        core.debug(`Determining if the directory: ${root_directory} exists.`)
        if (existsSync(root_directory)) {
            core.debug(`Removing existing directory ${root_directory}.`)
            rmSync(root_directory, { recursive: true, force: true})
            core.debug(`Removed existing directory ${root_directory}.`)
        }
    }
}

/*
 * This function is used to set the input values for the given name.  This can be
 * used to setup different test inputs.
 *
 * @param name The name of the input variable
 * @param value The value associated with the named input variable
 */
export function set_input(name: string, value: string) : void {
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = String(value)
}

/**
 * This function will generate and create the associated GITHUB_OUTPUT file that
 * will be used to store the output information.  It will then used to determine
 * if the required outputs were generated correctly.
 *
 * @param name The suffix associated with the generated output file
 * @returns The fully qualified file name
 */
export function create_github_output(name: string) : string {
    const root_directory: string = String(process.env['RUNNER_TEMP'] || '')
    // generate the file name
    const filePath: string = path.join(root_directory, `github_output_${name}.txt`)
    // set the file name correct
    process.env["GITHUB_OUTPUT"] = filePath
    core.debug(`Creating GITHUB_OUTPUT file: ${filePath}`)
    // create the required sub-directories if the don't exist
    mkdirSync(root_directory, { recursive: true })
    // create and close the file
    closeSync(openSync(filePath, 'w+'))
    // return the fully qualified file name
    return filePath
}

export function delete_github_output(name: string) :void {
    // determine if the file exists
    if (existsSync(name)) {
        core.debug(`Deleting GITHUB_OUTPUT file: ${name}`)
        // delete the create file
        rmSync(name)
    }
    // unset the GITHUB_OUTPUT environment variable such that it doesn't interfer with other tests
    process.env["GITHUB_OUTPUT"] = ''
}

export async function read_github_output(name: string) : Promise<Map<string,string>> {
    var result: Map<string,string> = new Map<string,string>();
    // determine that the file exists
    if (existsSync(name)) {
        const fileStream = createReadStream(name)

        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity
        })

        var key:string = '', delimiter = '';

        // core.info('######## Reading properties from the github_output')
        for await (const line of rl) {
            if (key.length > 0) {
                if (line == delimiter) {
                    core.info(`final ${key} : '${result.get(key)}'`)
                    delimiter = key = ''
                    continue
                }
                // core.info(`before ${key} : '${result.get(key) || ''}'`)
                var prior: string = result.get(key) || ''
                prior = prior + (prior.length > 0 ? '\n' : '')
                // add a newline character and append the line to the current key
                result.set(key, prior + line)
                // core.info(`after ${key} : '${result.get(key)}'`)
            } else {
                const index:number = line.indexOf("<<")
                if (index > -1) {
                    key = line.substring(0,index)
                    delimiter = line.substring(index+2)
                }
            }
        }
        // core.info('######## Read properties from the github_output')

        rl.close()
    }

    return result
}


/**
 * This function will execute the request surrealdb setup call for the passed
 * SurrealDB version.  It will return a void Promise.
 *
 * @param version The version of SurrealDB to setup
 * @returns Promise<void> instance
 */
export async function execute(version: string) : Promise<void> {
    set_input(INPUT_VERSION, version)
    // execute the surrealdb setup method
    return setup_surrealdb()
}
