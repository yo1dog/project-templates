const fs       = require('fs');
const pathUtil = require('path');

const jsLintScript = 'npx tsc -p jsconfig.json && npx eslint .';
const tsLintScript = 'npx tsc -p . --noEmit && npx eslint . --ext .js,.jsx,.ts,.tsx';


(function build() {
  node();
  nodeTSLint();
  nodeTypeScript();
  browser();
  browserTSLint();
  browserTypeScript();
  mixedTSLint();
})();

function node() {
  const dir = 'node';
  createProjectConfig(dir, false, false);
  createPackage(dir, jsLintScript);
  createESlint(
    dir,
    'parser/jsParser',
    'parser/jsProjectParserOptions',
    'env/nodeEnv',
    'rules/jsRules'
  );
  createNVM(dir);
  createGitIgnore(dir, false);
  createNPMInstall(dir, true, false);
}

function nodeTSLint() {
  const dir = 'nodeTSLint';
  createProjectConfig(dir, false, false);
  createPackage(dir, jsLintScript);
  createESlint(
    dir,
    'parser/tsParser',
    'parser/jsProjectParserOptions',
    'env/nodeEnv',
    'rules/jsRules',
    'rules/tsRules'
  );
  createNVM(dir);
  createGitIgnore(dir, false);
  createNPMInstall(dir, true, true);
}

function nodeTypeScript() {
  const dir = 'nodeTypeScript';
  createProjectConfig(dir, true, false);
  createPackage(dir, tsLintScript);
  createESlint(
    dir,
    'parser/tsParser',
    'parser/tsProjectParserOptions',
    'env/nodeEnv',
    'rules/jsRules',
    'rules/tsRules',
    'rules/tsProjectRules'
  );
  createNVM(dir);
  createGitIgnore(dir, true);
  createNPMInstall(dir, true, true);
}

function browser() {
  const dir = 'browser';
  createProjectConfig(dir, false, true);
  createPackage(dir, jsLintScript);
  createESlint(
    dir,
    'parser/jsParser',
    'parser/jsProjectParserOptions',
    'env/browserEnv',
    'rules/jsRules'
  );
  createGitIgnore(dir, false);
  createNPMInstall(dir, false, false);
}

function browserTSLint() {
  const dir = 'browserTSLint';
  createProjectConfig(dir, false, true);
  createPackage(dir, jsLintScript);
  createESlint(
    dir,
    'parser/tsParser',
    'parser/jsProjectParserOptions',
    'env/browserEnv',
    'rules/jsRules',
    'rules/tsRules'
  );
  createGitIgnore(dir, false);
  createNPMInstall(dir, false, true);
}

function browserTypeScript() {
  const dir = 'browserTypeScript';
  createProjectConfig(dir, true, true);
  createPackage(dir, tsLintScript);
  createESlint(
    dir,
    'parser/tsParser',
    'parser/tsProjectParserOptions',
    'env/browserEnv',
    'rules/jsRules',
    'rules/tsRules',
    'rules/tsProjectRules'
  );
  createGitIgnore(dir, true);
  createNPMInstall(dir, false, true);
}

function mixedTSLint() {
  const dir = 'mixedTSLint';
  writeFile(
    `${dir}/jsconfig.json`,
    createProjectConfigContent(false, false)
    .replace('"node_modules"', '$&,\n    "app/browserFiles"')
  );
  createPackage(dir, 'for dir in . app/browserFiles; do npx tsc -p $dir/jsconfig.json; done && npx eslint .');
  createESlint(
    dir,
    'parser/tsParser',
    'parser/jsProjectParserOptions',
    'env/nodeEnv',
    'rules/jsRules',
    'rules/tsRules'
  );
  createGitIgnore(dir, false);
  createNPMInstall(dir, true, true);
  
  writeFile(
    `${dir}/app/browserFiles/jsconfig.json`,
    createProjectConfigContent(false, true)
    .replace(/(^.+"compilerOptions": {).+(\n +"lib": \[.+?\])/s, '$1$2')
    .replace(/^{/, '$&\n  "extends": "../../jsconfig.json",')
    .replace(/("exclude": \[).+(\])/s, '$1$2')
  );
  writeFile(
    `${dir}/app/browserFiles/.eslintrc.json`,
    createESlintContent(
      'parser/jsProjectParserOptions',
      'env/browserEnv'
    )
    .replace(/^{/, '$&\n  "extends": ["../../.eslintrc.json"],')
    .replace(/\n +"ecmaVersion": \d+,/, '')
    .replace(/\n +"sourceType": ".+?",/, '')
    .replace(/("project": ")(.+?")/, '$1app/browserFiles/$2')
  );
}


/**
 * @param {string} dir 
 * @param {boolean} isTSProject 
 * @param {boolean} includeDOM 
 */
function createProjectConfig(dir, isTSProject = false, includeDOM = false) {
  const filename = `${isTSProject? 'ts' : 'js'}config.json`;
  writeFile(`${dir}/${filename}`, createProjectConfigContent(isTSProject, includeDOM));
}
/**
 * @param {boolean} isTSProject 
 * @param {boolean} includeDOM 
 */
function createProjectConfigContent(isTSProject = false, includeDOM = false) {
  const filename = `${isTSProject? 'ts' : 'js'}config.json`;
  let content = readFile(`src/projectConfig/${filename}`);
  
  if (includeDOM) {
    content = content.replace(
      /("lib": \["es2020")(\])/i,
      `$1, "${isTSProject? 'DOM' : 'dom'}"$2`
    );
  }
  
  return content;
}

/**
 * @param {string} dir 
 * @param {string} lintScript 
 */
function createPackage(dir, lintScript) {
  const filename = 'package.json';
  const content = readFile(`src/${filename}`).replace('$$LINT_SCRIPT$$', lintScript);
  writeFile(`${dir}/${filename}`, content);
}

/**
 * @param {string} dir 
 * @param {...string} fileIncludes 
 */
function createESlint(dir, ...fileIncludes) {
  writeFile(`${dir}/.eslintrc.json`, createESlintContent(...fileIncludes));
}
/**
 * @param {...string} fileIncludes 
 */
function createESlintContent(...fileIncludes) {
  let content = '{\n';
  
  const standardIncludes = [];
  const ruleIncludes = [];
  for (const fileInclude of fileIncludes) {
    (fileInclude.startsWith('rules/')? ruleIncludes : standardIncludes).push(fileInclude);
  }
  
  content += (
    standardIncludes.map(filepath =>
      readFile(`src/eslint/${filepath}.eslintrc.json`)
      .replace(/^{\n/, '')
      .replace(/\n}$/, '')
    )
    .join(',\n')
  );
  
  if (ruleIncludes.length > 0) {
    if (standardIncludes.length > 0) {
      content += ',\n';
    }
    content += '  "rules": {\n';
    
    content += (
      ruleIncludes.map(filepath =>
        readFile(`src/eslint/${filepath}.eslintrc.json`)
        .replace(/^{\n +"rules": {\n/, '')
        .replace(/\n +}\n}$/, '')
      )
      .join(',\n    \n')
    );
    
    content += '\n    \n    // --- Project Specific ---\n    \n  }';
  }
  content += '\n}\n';
  
  return content;
}

/**
 * @param {string} dir 
 */
function createNVM(dir) {
  copyFile('src/.nvmrc', `${dir}/.nvmrc`);
}

/**
 * @param {string} dir 
 * @param {boolean} isTSProject 
 */
function createGitIgnore(dir, isTSProject = false) {
  copyFile(`src/git/${isTSProject? 'tsProject' : ''}.gitignore`, `${dir}/.gitignore`);
}

/**
 * @param {string} dir 
 * @param {boolean} isNode 
 * @param {boolean} isTSLint 
 */
function createNPMInstall(dir, isNode, isTSLint) {
  const packages = [];
  if (isNode) {
    packages.push('@types/node@^12');
  }
  if (isTSLint) {
    packages.push('@typescript-eslint/eslint-plugin');
    packages.push('@typescript-eslint/parser');
    packages.push('typescript');
    packages.push('eslint');
  }
  
  if (packages.length === 0) {
    return;
  }
  
  const content = `npm install ${packages.map(x => `'${x}'`).join(' ')} --save-dev`;
  writeFile(`${dir}/npm-install.txt`, content);
}


/**
 * @param {string} src 
 * @param {string} dest 
 */
function copyFile(src, dest) {
  return fs.copyFileSync(
    pathUtil.join(__dirname, ...src.split('/')),
    pathUtil.join(__dirname, ...dest.split('/'))
  );
}

/**
 * @param {string} path 
 */
function readFile(path) {
  return fs.readFileSync(pathUtil.join(__dirname, ...path.split('/')), 'utf8');
}

/**
 * @param {string} path 
 * @param {string} content 
 */
function writeFile(path, content) {
  return fs.writeFileSync(pathUtil.join(__dirname, ...path.split('/')), content, {encoding: 'utf8'});
}
