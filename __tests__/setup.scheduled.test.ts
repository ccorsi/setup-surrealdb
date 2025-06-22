/**
 * These set of tests will be executed on a schedule set of time.  The reason that that is the case
 * is to be able to insure that the current implementation of the SurrealDB setup action still functions
 * as expected with newer releases of the SurrealDB.
 */

import { jest, describe } from '@jest/globals'
import { VERSION } from '../src/setup'
import {
  create_github_output,
  delete_github_output,
  execute,
  read_github_output,
  setup_runner_temp_and_cache
} from './utils'
import { find } from '@actions/tool-cache'
import * as hc from '@actions/http-client'
import * as core from '@actions/core'

jest.setTimeout(6000000)

// prettier-ignore
const cleanup_cache_and_temp: () => void = setup_runner_temp_and_cache('SCHEDULED')

// prettier-ignore
// Delete the TEMP and CACHE directory before and/or after executing the tests
beforeAll( cleanup_cache_and_temp )
// prettier-ignore
afterAll ( cleanup_cache_and_temp )

async function executeTest(version: string, filePath: string) {
  await execute(version)

  const data: Map<string, string> = await read_github_output(filePath)

  const ver: string = data.get(VERSION) || version

  // determine that the requested version was cached
  expect(find('surrealdb', ver)).not.toBe('')
}

describe('SurrealDB Setup Scheduled Tests', (): void => {
  describe('Setup Tests', (): void => {
    // Use a set version of SurrealDB version
    const version: string = 'latest'

    // create the required GITHUB_OUTPUT file used to check that the required output were generated
    var filePath: string

    beforeEach((): void => {
      // create the required GITHUB_OUTPUT file
      filePath = create_github_output('scheduled-setup')
    })

    afterEach((): void => {
      // delete the generated GITHUB_OUTFILE file
      delete_github_output(filePath)
    })

    test('SurrealDB Setup latest version test', async (): Promise<void> => {
      await executeTest(version, filePath)
    })
  })

  describe('Rate Limit Tests', (): void => {
    // Use a set version of SurrealDB version
    const version: string = 'v2.3.2'

    // create the required GITHUB_OUTPUT file used to check that the required output were generated
    var filePath: string

    // use a timeout variable to if the rate limit was reached during the setup of the test
    let timeout: number = -1

    beforeEach(async (): Promise<void> => {
      // create the required GITHUB_OUTPUT file
      filePath = create_github_output('scheduled-retry')

      // We need to exhaust the ability to download the release without waiting for some time

      // create the release url
      const tag = `https://api.github.com/repos/surrealdb/surrealdb/releases/tags/${version}`

      // prettier-ignore
      // Create a client connection
      const client = new hc.HttpClient(`github-surrealdb-${version}-version-tag`)

      let start: number = Date.now()

      // Loop through a simple GitHub REST API call until it reaches a rate limit
      while (true) {
        // retrieve a list of tags
        let res: hc.HttpClientResponse = await client.get(tag)

        // eat the rest of the input information so that no memory leak will be generated
        res.message.resume()

        // prettier-ignore
        if ( res.message.statusCode === hc.HttpCodes.Forbidden && res.message.headers['retry-after'] ) {
          // Get the minimum amount of seconds that one should wait before trying again.
          // prettier-ignore
          const secondsToWait: number = Number(res.message.headers['retry-after'])

          timeout = (secondsToWait + 5) * 1000 // convert seconds into milliseconds

          core.info(
            `Setting the timeout entry to ${timeout} after retry-after header entry`
          )
          break
        // prettier-ignore
        } else if ( res.message.statusCode === hc.HttpCodes.Forbidden &&
                    res.message.headers['x-ratelimit-remaining'] === '0' ) {
          // prettier-ignore
          // Get the ratelimit reset date in utc epoch seconds
          const resetTimeEpochSeconds: number = Number(res.message.headers['x-ratelimit-reset'])

          // Get the current utc time in epoch seconds
          const currentTimeEpochSeconds: number = Math.floor(Date.now() / 1000)

          // prettier-ignore
          // Determine the minimum amount of seconds that one should wait before trying again.
          const secondsToWait: number = resetTimeEpochSeconds - currentTimeEpochSeconds

          timeout = (secondsToWait + 5) * 1000 // convert seconds into milliseconds

          // prettier-ignore
          core.info(`Setting the timeout entry to ${timeout} after x-ratelimit-remaining header entry`)
          break
        } else if (res.message.statusCode != hc.HttpCodes.OK) {
          // prettier-ignore
          throw new Error(`An unknown status code was generated: ${res.message?.statusCode}`)
        }
      }

      core.info(`Checking that the timeout value was update`)

      // should I determine that the timeout was updated?
      expect(timeout != -1)

      // prettier-ignore
      core.info(`Forced a rate limit condition after ${(Date.now() - start) / 1000} seconds`)
    }, 60000)

    afterEach((): void => {
      // delete the generated GITHUB_OUTFILE file
      delete_github_output(filePath)
    })

    test('rate limit test', async (): Promise<void> => {
      await executeTest(version, filePath)
    })
  })
})
