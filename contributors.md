# Contributing

While any contribution is welcomed.  There are some steps that I would
appreciate contributors to follow.  Here is a list of what is expected for
anyone that is interested with contributing to this project.

1. Create an [Issues](https://github.com/ccorsi/setup-surrealdb/issues)

2. [Fork](https://github.com/ccorsi/setup-surrealdb/fork) this project

3. Create a branch with the issue number, for example

   ```bash
   $ git branch issue_####
   ```

4. :hammer_and_wrench: Install the dependencies

   ```bash
   $ npm install
   ```
5. Create test{s} that reproduces your issue within the \_\_tests\_\_ directory

6. Create the fix for the test

7. :white_check_mark: Run the tests

   ```bash
   $ npm test
   ...
   ```

8. :building_construction: Package the TypeScript for distribution

   ```bash
   $ npm run bundle
   ```

9. Format, test, and build the action

   ```bash
   $ npm run all
   ```

   > This step is important! It will run [`rollup`](https://rollupjs.org/) to
   > build the final JavaScript action code with all dependencies included. If
   > you do not run this step, your action will not work correctly when it is
   > used in a workflow.

10. Create a pull request and get feedback on your changes

All generated pull requests will be reviewed and verified that the test{s} and
fix is correct.

Lastly, thanks for taking the time to get involved in this project by
pointing out issues and providing fixes for those issues.

