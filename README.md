smart-trade-node-project-template
============

Node.js project-template for the smart-trader team.

## What am I getting?

* Unified project structure.
* Enforcing unified coding style (using eslint).
* Support ES7/ES8 syntax using babel.
* Built-in logger module.
* Testing and coverage tools.
* CI process integration (Jenkinsfile).

## How to use this project?

- Download this repository as zip file from: https://github.com/bitmain-israel/smart-trade-node-project-template/archive/master.zip
- Run 'npm install'
- Change the following entries in package.json to address the new repository:
    1. name
    2. description
    3. repository
    4. bugs
    5. homepage
- Set process title on '/src/index.js'
- Server folder contains a basic example of writing mocha unit-test - delete or modify to suite your needs.
- jsconfig.json & .babelrc files contains list of module alias (for absolute path references) - you can modify it as you like.

## Debugging

We are using ES7/ES8 syntax while our code is running on Node.js v8 using babel transpiler.
In order to debug our source code in VS Code, you can add the following configuration to your launch.json:

```javascript

        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${workspaceRoot}/src/index.js",
            "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/babel-node",
            "cwd": "${workspaceRoot}"
        }

```

## Create new Github repository based on this project

After making all required changes:
In your project root path, execute the following commands:
- Create an empty repository on Github
- git init
- git add .
- git commit -m "first commit"
- git remote add origin {your new repository URL}
- git push origin master
- git remote add upstream https://github.com/bitmain-israel/smart-trade-node-project-template.git
- git remote set-url --push upstream DISABLE
- git pull upstream master --allow-unrelated-histories