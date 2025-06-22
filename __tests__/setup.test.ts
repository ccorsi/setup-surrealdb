/**
 * This file contains different setup tests for the surrealdb.  It should
 * contain different use cases that a user would require to be able to
 * install the surrealdb on the different systems that are provide by
 * GitHub Workflow environment.
 */

import { describe, jest } from '@jest/globals'
import {
  setup_runner_temp_and_cache,
  set_input,
  create_github_output,
  delete_github_output,
  read_github_output,
  execute
} from './utils'
import * as core from '@actions/core'
import { find } from '@actions/tool-cache'
import {
  CACHE_HIT,
  VERSION,
  RETRY_COUNT,
  default_retry_count
} from '../src/setup.js'

// Set test limit to 1 minute
jest.setTimeout(60000)

const cleanup_cache_and_temp: () => void = setup_runner_temp_and_cache('SETUP')

// prettier-ignore
// Delete the TEMP and CACHE directory before and/or after executing the tests
beforeAll ( cleanup_cache_and_temp )
// prettier-ignore
afterAll  ( cleanup_cache_and_temp )

const versions: string[] = ['v2.3.0', 'latest']

versions.forEach((version: string): void => {
  describe(`setup surrealdb for version: ${version}`, (): void => {
    // create the required GITHUB_OUTPUT file used to check that the required output were generated
    var filePath: string

    beforeEach((): void => {
      // create the required GITHUB_OUTPUT file
      filePath = create_github_output(version)
    })

    afterEach((): void => {
      // delete the generated GITHUB_OUTFILE file
      delete_github_output(filePath)
    })

    it(`setup surrealdb version: ${version} test`, async (): Promise<void> => {
      await execute(version)

      const data: Map<string, string> = await read_github_output(filePath)

      const ver: string = data.get(VERSION) || version

      // determine that the requested version was cached
      expect(find('surrealdb', ver)).not.toBe('')
    })

    it(`setup cached surrealdb version: ${version} test`, async (): Promise<void> => {
      core.info(`Inside cached surrealdb test for version: ${version}`)

      await execute(version)

      // Load all of the generated output entries from the GITHUB_OUTPUT file
      const data: Map<string, string> = await read_github_output(filePath)

      // get the version associated with the installed surrealdb or use the requested version
      const ver: string = data.get(VERSION) || version

      // check that the setup was successful
      expect(data.get(VERSION) || '').not.toBe('')

      // check that the setup was successful
      expect(find('surrealdb', ver)).not.toBe('')

      // check that the setup used the cached version
      expect(data.get(CACHE_HIT)).toBe('true')
    })
  })
})

describe('setup surrealdb invalid version tests', (): void => {
  // create the required GITHUB_OUTPUT file used to check that the required output were generated
  var filePath: string

  afterEach((): void => {
    // delete the generated GITHUB_OUTFILE file
    delete_github_output(filePath)
  })

  // prettier-ignore
  const versions: string[] = [
    'invalid',
    'v1.2.3.4.5',
    '2.3.1'
  ]

  versions.forEach((version: string): void => {
    it(`setup surrealdb invalid version test using version: '${version}'`, async (): Promise<void> => {
      // create the required GITHUB_OUTPUT file
      filePath = create_github_output(version)

      // this is suppose to raise an exception
      await execute(version)

      const data: Map<string, string> = await read_github_output(filePath)

      // check that the setup was successful
      expect(data.get(VERSION)).toBe(undefined)
    })
  })
})

describe('setup surrealdb retry count tests', (): void => {
  const version: string = 'latest'

  // create the required GITHUB_OUTPUT file used to check that the required output were generated
  var filePath: string

  beforeEach((): void => {
    // create the required GITHUB_OUTPUT file
    filePath = create_github_output(version)
  })

  afterEach((): void => {
    // delete the generated GITHUB_OUTFILE file
    delete_github_output(filePath)
  })

  const retry_counts: string[][] = [
    ['-1', String(default_retry_count)],
    ['1', '1'],
    ['10', '10']
  ]

  retry_counts.forEach((retry_count: string[]): void => {
    it(`setup surrealdb retry count test for [actual=${retry_count[0]},expected=${retry_count[1]}]`, async (): Promise<void> => {
      set_input(RETRY_COUNT, retry_count[0])

      await execute(version)

      const data: Map<string, string> = await read_github_output(filePath)

      // check that the setup was successful
      expect(data.get(VERSION) || '').not.toBe('')

      // check that the expected retry count was set properly
      expect(data.get(RETRY_COUNT)).toBe(retry_count[1])
    })
  })
})
