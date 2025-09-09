/**
 * This setup script is used to setup the requested SurrealDB version such that it can then
 * be used within your workflow.  It will provide access to the requested version by including
 * it to the system path.
 */
import * as core from '@actions/core'
import * as hc from '@actions/http-client'
import { extractTar, find, downloadTool, cacheDir } from '@actions/tool-cache'
import { randomUUID } from 'crypto'
import { join, sep } from 'path'
import { rename, rm } from 'fs/promises'

const prefix: string = 'surrealdb'

function create_string(name: string): string {
  return `${prefix}-${name}`
}

// Define the constant attributes of this action
const PATH: string = create_string('path')
const VERSION: string = create_string('version')
const CACHE_HIT: string = 'cache-hit'
const RETRY_COUNT: string = 'retry-count'
const INPUT_VERSION: string = 'version'

export { VERSION, PATH, CACHE_HIT, RETRY_COUNT, INPUT_VERSION }

// The following two interfaces were required to be able to gather the required information from
// the http get call.  The get call returned JSON data contains information that is stored using
// the following two interfaces.  While these interfaces would not be required within a pure
// JavaScript file.  They are required when developing with TypeScript.
interface Asset {
  name: string
  browser_download_url: string
}

interface TagObject {
  tag_name: string
  assets: Array<Asset>
}

/**
 * This method will install the requested SurrealDB version.  It will
 * then setup the required output values upon successfully downloading,
 * installing and configuring the SurrealDB database.
 *
 * @returns Promise<void>
 */
export async function setup_surrealdb(): Promise<void> {
  try {
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.info(`Installing SurrealDB...`)

    // Generate the required url to access information about a specific SurrealDB release
    const url: string = format_version_url(core.getInput(INPUT_VERSION))

    // Create a client connection
    const client: hc.HttpClient = new hc.HttpClient(`github-surrealdb-release`)

    // execute the url call using the http client instance
    const res: hc.HttpClientResponse = await executeClientGetCall(client, url)

    // get the returned body
    const body: string = await res.readBody()

    // convert body into a json object
    const jsonTag: TagObject = JSON.parse(body)

    // convert the jsonTag into a string value
    core.debug(`processing version tag: ${jsonTag?.tag_name}`)

    // extract the version information from the retreived tag information
    const version: string = jsonTag.tag_name

    // determine if the given surrealdb version was already downloaded
    let cachePath: string = find('surrealdb', version)

    if (cachePath.length > 0) {
      core.info(`Using cached SurrealDB version ${version}`)
      // Add the cached path to the system path to be able to run the surrealdb command
      core.addPath(cachePath)
      // Set outputs for other workflow steps to use
      set_output(version, cachePath, true)
      return // no need to do anything else
    }

    // determine which system we are currently executing this action from
    const [os, os_type] = get_platform_info()

    core.debug(`Installing SurrealDB for ${os} of type ${os_type}`)

    let download: string = '',
      target: string = ''

    // loop through the assets and determine which asset to download
    for (let idx: number = 0; idx < jsonTag.assets.length; idx++) {
      const asset: Asset = jsonTag['assets'][idx]
      if (asset.name.includes(os) && asset.name.includes(os_type)) {
        download = asset.browser_download_url
        target = join(
          String(process.env['RUNNER_TEMP']),
          randomUUID(),
          asset.name
        )
        // break out of the for loop
        break
      }
    }

    // determine if we found the requesting SurrealDB version
    if (download.length == 0) {
      throw new Error(
        `Unable to determine the download url for SurrealDB version: ${version}`
      )
    }

    // Download the targeted SurrealDB version
    const targetName: string = await downloadTool(download, target)

    let surrealdbExtractedFolder: string

    if (process.platform != 'win32') {
      core.debug(`Extracting target: ${targetName}`)
      // Extract the surrealdb command from the gzipped tarred distribution
      surrealdbExtractedFolder = await extractTar(targetName)
      // delete the download archive since it isn't required any longer
      await rm(targetName)
    } else {
      // The downloaded file is the executable itself thus rename the target and cache
      // the executable
      surrealdbExtractedFolder = targetName.substring(
        0,
        targetName.lastIndexOf(sep)
      )
      // rename the downloaded executable 'surreal.exe'
      await rename(targetName, join(surrealdbExtractedFolder, 'surreal.exe'))
    }

    // This will be set to the directory that the required SurrealDB version was installed
    cachePath = await cacheDir(surrealdbExtractedFolder, 'surrealdb', version)

    core.debug(`Adding surrealdb directory "${cachePath}" to the path`)
    // Add the path to the surrealdb executable to the system path environment variable
    core.addPath(cachePath)
    core.debug(`Added surrealdb directory "${cachePath}" to the path`)

    // Set outputs for other workflow steps to use
    set_output(version, cachePath, false)

    core.info(`Successfully installed SurrealDB version: ${version}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      // stringify the catch error to inform the workflow run that this action failed
      core.setFailed(String(error))
    }
  }
}

/**
 * This function will set the different output fields for this action.
 *
 * @param version The surrealdb version installed
 * @param cachePath Path to the surrealdb executable
 * @param cache_hit If we are using a cache version or not
 */
function set_output(version: string, cachePath: string, cache_hit: boolean) {
  // prettier-ignore
  // set the surrealdb version that is being used since 'latest' is a valid input
  core.setOutput(VERSION,   version)
  // prettier-ignore
  // set the surrealdb path output for other workflow steps to use
  core.setOutput(PATH,      cachePath)
  // prettier-ignore
  // state if this version of the surrealdb was retrieved from the local cache
  core.setOutput(CACHE_HIT, cache_hit)
}

/**
 * This method will check that the passed version is correctly
 * formatted.  It will throw an exception if the passed version
 * is incorrect.
 *
 * @param version Version of the SurrealDB database
 * @returns The formatted version of the SurrealDB
 */
function format_version_url(version: string): string {
  if (version == 'latest') {
    // The latest release information is located at the following link
    return 'https://api.github.com/repos/surrealdb/surrealdb/releases/latest'
  } else {
    // Insure that the requested version starts with the 'v' character
    // This requested version has to contain a valid tag name
    if (!version.startsWith('v')) {
      throw new Error(`Invalid SurrealDB version format: "${version}"`)
    } // if ( ! version.startsWith('v') )

    // Specific release information is located at the following generated link
    return `https://api.github.com/repos/surrealdb/surrealdb/releases/tags/${version}`
  }
}

/**
 * This method will execute the passed uri using the passed HttpClient instance.  It
 * will retry the call if we've reached the retry limit for the github restapi call.
 *
 * @param client An HttpClinet instance
 * @param uri The URI use with the passed HttpClient instance
 * @returns The returned Promise<HttpClientResponse> from the HttpClient instance
 */
async function executeClientGetCall(
  client: hc.HttpClient,
  uri: string
): Promise<hc.HttpClientResponse> {
  let res: hc.HttpClientResponse
  let retryCount: number = 0
  const max_retry_count: number = set_max_retry_count()

  // this is for testing purposes only but won't be documented since the user doesn't need this output information
  core.setOutput(RETRY_COUNT, max_retry_count)

  let status: boolean = true,
    statusCode: number = -1,
    statusMessage: string = 'unknown'

  do {
    try {
      // Execute the get call using the passed uri
      res = await client.get(uri)
      // Check if the return status code is OK (200)
      if (res.message?.statusCode == hc.HttpCodes.OK) {
        // The get call was sucessful thus return
        return res
      }
    } catch (cause: unknown) {
      let message: string = ''
      if (cause instanceof Error) {
        // This will generate an exception
        message = `The client request: ${uri} generated the error: ${cause.stack}`
      } else {
        message = `The client request: ${uri} generated the an unknown error: ${cause}`
      }
      // core.error(message) <- this is not required since setFailed will display the same message
      throw new Error(message, { cause })
    }

    if (retryCount == max_retry_count) {
      // eat the rest of the input information so that no memory leak will be generated
      res.message.resume()

      // We've exhausted the retry count
      const message = `The retry count was exhausted for client request: ${uri}`
      // core.warning(message) <- this is not required since setFailed will display the same message in error
      throw new Error(message)
    }

    // prettier-ignore
    if (res.message.statusCode === hc.HttpCodes.Forbidden && res.message.headers['retry-after']) {
      // eat the rest of the input information so that no memory leak will be generated
      res.message.resume()

      // Get the minimum amount of seconds that one should wait before trying again.
      const secondsToWait = Number(res.message.headers['retry-after'])

      // prettier-ignore
      core.warning(`You have exceeded your rate limit. Retrying in ${secondsToWait} seconds.`)

      // retry the command after the amount of second within the header retry-after attribute
      await sleep(secondsToWait)

      // increment the retryCount
      retryCount += 1

      continue
    }

    // prettier-ignore
    if (res.message.statusCode === hc.HttpCodes.Forbidden && res.message.headers['x-ratelimit-remaining'] === '0') {
      // eat the rest of the input information so that no memory leak will be generated
      res.message.resume()

      // prettier-ignore
      // Get the ratelimit reset date in utc epoch seconds
      const resetTimeEpochSeconds: number = Number(res.message.headers['x-ratelimit-reset'])

      // Get the current utc time in epoch seconds
      const currentTimeEpochSeconds: number = Math.floor(Date.now() / 1000)

      // Determine the minimum amount of seconds that one should wait before trying again.
      const secondsToWait = resetTimeEpochSeconds - currentTimeEpochSeconds

      // prettier-ignore
      core.warning(`You have exceeded your rate limit. Retrying in ${secondsToWait} seconds.`)

      // retry the command after the amount of second within the header retry-after attribute
      await sleep(secondsToWait)

      // increment the retryCount
      retryCount += 1

      continue
    }

    // eat the rest of the input information so that no memory leak will be generated
    res.message.resume()

    // we are done so let us exit the while loop
    status = false

    statusCode = res.message?.statusCode || -1

    statusMessage = res.message?.statusMessage || 'unknown'
  } while (status)

  // We've received a status code that we don't know how to process
  const message = `The client request: ${uri} returned an unknown status code: ${statusCode} with message: ${statusMessage}`
  // core.warning(message) <- this is not required since setFailed will display the same message in error
  throw new Error(message)
}

/*
 * This method will be used whenever we need to wait a certain amount of time before continuing.
 * This is the case whenever we've reach the rate limit on the github rest api calls.  This method
 * will sleep for the passed seconds before continuing.
 *
 * @param {Number} the number of seconds that this method will sleep
 * @return {Promise<void>}  A Promise instance that doesn't return any value
 */
function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * This method will return the respective operating system information required to be able to
 * download and install the appropriate SurrealDB distribution.
 *
 * @returns Array of string with os type and os archetecture
 */
function get_platform_info(): string[] {
  const result: string[] = ['', '']

  // Determine the operating system we are running
  switch (process.platform) {
    case 'win32':
      result[0] = 'windows'
      break
    case 'linux':
      result[0] = 'linux'
      break
    case 'darwin':
      result[0] = 'darwin'
      break
    default:
      throw new Error('Unable to determine operating system')
  }

  // Determine the operating system archetecture
  switch (process.arch) {
    case 'arm64':
      result[1] = 'arm64'
      break
    case 'x64':
      result[1] = 'amd64'
      break
    default:
      throw new Error('Unable to determine the system archetecture')
  }

  return result
}

export const default_retry_count: number = 3

/**
 * This function will return the maximum number of retries to download the SurrealDB distribution.
 * It will use the retry-count input to determine if a valid value was set or return the
 * default retry count.
 *
 * @returns the retry count for downloading the surrealdb installation
 */
function set_max_retry_count(): number {
  const input: string = core.getInput(RETRY_COUNT)

  const v: number = Number(input)
  if (Number.isInteger(v)) {
    const value: number = v.valueOf()
    if (value > 0) {
      core.info(`Setting retry count to ${v}`)
      // return the passed input value for the surrealdb retry count
      return v.valueOf()
    } else {
      // prettier-ignore
      core.warning(`An invalid ${RETRY_COUNT} was passed, the value has to be greater than 0, dafaulting to ${default_retry_count}`)
    }
  } else if (input?.length > 0) {
    // prettier-ignore
    core.warning(`An invalid ${RETRY_COUNT} was passed, defaulting to ${default_retry_count}`)
  }

  return default_retry_count
}
