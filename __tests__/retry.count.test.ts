import { jest, describe } from '@jest/globals'
import { RETRY_COUNT } from '../src/setup'
import {
  create_github_output,
  delete_github_output,
  execute,
  read_github_output,
  set_input,
  setup_runner_temp_and_cache
} from './utils'

jest.setTimeout(60000)

const cleanup_cache_and_temp: () => void = setup_runner_temp_and_cache('RETRY')

// prettier-ignore
// Delete the TEMP and CACHE directory before and/or after executing the tests
beforeAll( cleanup_cache_and_temp )
// prettier-ignore
afterAll ( cleanup_cache_and_temp )

describe('SurrealDB Retry Count Tests', (): void => {
  const retries: Array<{ input: string; output: string }> = [
    { input: '3', output: '3' },
    { input: '0', output: '3' },
    { input: '2', output: '2' },
    { input: 'A', output: '3' },
    { input: '-11', output: '3' }
  ]

  // Use a set version of SurrealDB version
  const version: string = 'v2.3.3'

  // create the required GITHUB_OUTPUT file used to check that the required output were generated
  let filePath: string

  beforeEach((): void => {
    // create the required GITHUB_OUTPUT file
    filePath = create_github_output(version)
  })

  afterEach((): void => {
    // delete the generated GITHUB_OUTFILE file
    delete_github_output(filePath)
  })

  retries.forEach((retry) => {
    test(`SurrealDB retry count test using [input, output]: [${retry.input}, ${retry.output}]`, async (): Promise<void> => {
      set_input(RETRY_COUNT, retry.input)
      await execute(version)
      const outputs = await read_github_output(filePath)
      expect(outputs.get(RETRY_COUNT)).toBe(retry.output)
    })
  })
})
