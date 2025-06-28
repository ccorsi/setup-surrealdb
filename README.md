# Setup SurrealDB Action

[![GitHub Super-Linter](https://github.com/ccorsi/setup-surrealdb/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/ccorsi/setup-surrealdb/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/ccorsi/setup-surrealdb/actions/workflows/check-dist.yml/badge.svg)](https://github.com/ccorsi/setup-surrealdb/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/ccorsi/setup-surrealdb/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/ccorsi/setup-surrealdb/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This action provides the following functionality for GitHub Actions users:

- Downloading and caching the distribution of the requested SurrealDB version,
  and adding it to the PATH

## Usage

See [action.yml](action.yml)

Here is a table of the different inputs that can be used with this action

| Name        | Description                          | Optional | Default Value |
| ----------- | ------------------------------------ | -------- | ------------- |
| version     | version of the SurrealDB to install  | true     | latest        |
| retry-count | the retry count for GitHub API calls | true     | 3             |

Note that the input combination of the SurrealDB version would greatly shorten
the installation of SurrealDB. Thou, the requirement of the version is optional,
an invalid version will cause the action to fail. The recommended inputs would
be to correctly define the version of the SurrealDB installation. This
information can be found on the
[SurrealDB releases](https://github.com/surrealdb/surrealdb/releases) page. The
above release page will contain the defined version tags with vX.Y.Z version
format for all official releases. While prereleases will be formatted
differently.

The addition of the retry-count optional option is only required when you are
performing extensive GitHub API calls from multiple concurrent workflow
processing. The retry count is used to determine how many tries the setup
surrealdb action will make GitHub API calls before exiting the setup surrealdb
action. The GitHub API call is used to get the version artifact information
associated to the surrealdb version being requested. The version is necessary to
be able to correctly format the download URL for the requested version of
surrealdb. The advantage of setting the retry count becomes useful whenever you
are going to be performing many concurrent setup surrealdb calls. This would
then cause your currently executing workflow to incur rate limit response from
using the GitHub API too frequently. Retrying those calls becomes useful but you
might need to increase the retry count to something larger to insure that all
setup surrealdb calls will be successful.

Here is a table of the different outputs that will be produced by this action

| Name              | Description                                                                      | Example |
| ----------------- | -------------------------------------------------------------------------------- | ------- |
| cache-hit         | A boolean value to indicate if this SurrealDB version is a cached version or not | true    |
| surrealdb-version | The installed SurrealDB version                                                  | v2.3.0  |
| surrealdb-path    | The path where the requested SurrealDB is located                                |         |

**Basic:**

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-surrealdb@v1
    with:
      version: v2.3.0
  - run: surreal start --user root --pass root
```

The `version` or 'retry-count` inputs are not required.

The action will first check the local cache for a SemVer match. If unable to
find a specific version in the cache, the action will attempt to download the
specified version of SurrealDB. Note that an incorrect SurrealDB version will
cause this action to fail. You can find the correct version on the
[SurrealDB releases](https://github.com/surrealdb/surrealdb/releases) page.

### Supported version syntax

The `version` input uses the same versioning format that the SurrealDB team
uses, check out the
[SurrealDB Releases](https://github.com/surrealdb/surrealdb/releases) page. The
`version` is not a required input to be able to download the latest release of
SurrealDB.

Examples:

| version        |
| -------------- |
| v2.3.0         |
| v3.0.0-alpha.7 |
| v2.3.4         |
| latest         |

## Matrix Testing

Let us look at different use cases that one can use with the setup-surrealdb
action.

This first example will simply install a single version of SurrealDB.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    name: SurrealDB v2.3.2 sample
    steps:
      - uses: actions/checkout@v4
      - name: Setup SurrealDB v2.3.2
        uses: actions/setup-surrealdb@v1
        with:
          version: v2.3.2
      - run: surreal start --user root --pass root
```

The following one will install multiple versions of SurrealDB.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        surrealdb: [v2.3.0, v2.3.5]
    name: SurrealDB ${{ matrix.surrealdb }} sample
    steps:
      - uses: actions/checkout@v4
      - name: Setup SurrealDB v${{ matrix.surrealdb }}
        uses: actions/setup-surrealdb@v1
        with:
          version: ${{ matrix.surrealdb }}
      - run: surreal start --user root --pass root
```

The following example shows how one can go about installing the latest version
of SurrealDB by not defining the version input.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    name: Latest SurrealDB Version sample
    steps:
      - uses: actions/checkout@v4
      - name: Setup Latest SurrealDB Version
        uses: actions/setup-surrealdb@v1
      - run: surreal start --user root --pass root
```

The last example can be useful for projects that need to insure that the latest
version of SurrealDB works as expected for their project.

While the above examples don't necessarily include the version input to work.
There is always a chance that the setup surrealdb action will require retries
because the setup will be performing GitHub API calls. These calls can incur a
rate limit response which requires retries. These response will contain
information about how long one needs to wait before retrying the GitHub API
call. While the default retry count is set to 3. One can always increase this
value using the retry-count input variable like the following example.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    name: Latest SurrealDB Version sample
    steps:
      - uses: actions/checkout@v4
      - name: Setup Latest SurrealDB Version
        uses: actions/setup-surrealdb@v1
        with:
          retry-count: 10
      - run: surreal start --user root --pass root
```

The above example shows you how you can increase the retry count of the setup
surrealdb action to 10. While this is a nice little feature. I do not expect
this feature to be something that many will tend to use.

## License

The scripts and documentation in this project are released under the
[MIT License](LICENSE)

## Contributions

Contributions are welcome! See [Contributor's Guide](contributors.md)

## Code of Conduct

:wave: Be nice. See [our code of conduct](CODE_OF_CONDUCT.md)
