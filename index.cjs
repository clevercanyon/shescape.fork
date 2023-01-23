'use strict';

var os = require('os');
var process = require('process');
var fs = require('fs');
var path = require('path');
var util = require('util');
var which = require('which');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

/**
 * @overview Provides functionality related to working with executables.
 * @license MPL-2.0
 */

/**
 * Resolves the location of an executable given an arbitrary valid string
 * representation of that executable.
 *
 * To obtain the location of the executable this function (if necessary):
 * - Expands the provided string to a absolute path.
 * - Follows symbolic links.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.executable A string representation of the executable.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.exists A function to check if a file exists.
 * @param {Function} deps.readlink A function to resolve (sym)links.
 * @param {Function} deps.which A function to perform a `which(1)`-like lookup.
 * @returns {string} The full path to the binary of the executable.
 * @throws {Error} If the `deps` aren't provided.
 */
function resolveExecutable({ executable }, { exists, readlink, which }) {
  if (readlink === undefined || which === undefined) {
    throw new Error();
  }

  try {
    executable = which(executable);
  } catch (_) {
    // For backwards compatibility return the executable even if its location
    // cannot be obtained
    return executable;
  }

  if (!exists(executable)) {
    // For backwards compatibility return the executable even if there exists no
    // file at the specified path
    return executable;
  }

  try {
    executable = readlink(executable);
  } catch (_) {
    // An error will be thrown if the executable is not a (sym)link, this is not
    // a problem so the error is ignored
  }

  return executable;
}

/**
 * @overview Provides an API to consistently escape or quote shell arguments
 * across platforms.
 * @license MPL-2.0
 */

/**
 * The error message for incorrect parameter types.
 *
 * @constant
 * @type {string}
 */
const typeError =
  "Shescape requires strings or values that can be converted into a string using .toString()";

/**
 * The `typeof` value of functions.
 *
 * @constant
 * @type {string}
 */
const typeofFunction = "function";

/**
 * The `typeof` value of strings.
 *
 * @constant
 * @type {string}
 */
const typeofString = "string";

/**
 * Checks if a value is a string.
 *
 * @param {any} value The value of interest.
 * @returns {boolean} `true` if `value` is a string, `false` otherwise.
 */
function isString(value) {
  return typeof value === typeofString;
}

/**
 * Checks if a value can be converted into a string.
 *
 * @param {any} value The value of interest.
 * @returns {boolean} `true` if `value` is stringable, `false` otherwise.
 */
function isStringable(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value.toString !== typeofFunction) {
    return false;
  }

  const str = value.toString();
  return isString(str);
}

/**
 * Parses options provided to {@link escapeShellArg} or {@link quoteShellArg}.
 *
 * @param {object} args The arguments for this function.
 * @param {object} args.options The options for escaping.
 * @param {string} [args.options.shell] The shell to escape for.
 * @param {boolean} [args.options.interpolation] Is interpolation enabled.
 * @param {object} args.process The `process` values.
 * @param {object} args.process.env The environment variables.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.getDefaultShell Get the default shell for the system.
 * @param {Function} deps.getShellName Get the name of a shell.
 * @returns {object} The parsed arguments.
 */
function parseOptions(
  { options: { interpolation, shell }, process: { env } },
  { getDefaultShell, getShellName }
) {
  interpolation = interpolation ? true : false;
  shell = isString(shell) ? shell : getDefaultShell({ env });

  const shellName = getShellName({ shell }, { resolveExecutable });
  return { interpolation, shellName };
}

/**
 * Escapes an argument for the given shell.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.arg The argument to escape.
 * @param {boolean} args.interpolation Is interpolation enabled.
 * @param {boolean} args.quoted Is `arg` being quoted.
 * @param {string} args.shellName The name of the shell to escape `arg` for.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.getEscapeFunction Get the escape function for a shell.
 * @returns {string} The escaped argument.
 * @throws {TypeError} The argument to escape is not stringable.
 */
function escape$1(
  { arg, interpolation, quoted, shellName },
  { getEscapeFunction }
) {
  if (!isStringable(arg)) {
    throw new TypeError(typeError);
  }

  const argAsString = arg.toString();
  const escape = getEscapeFunction(shellName);
  const escapedArg = escape(argAsString, { interpolation, quoted });
  return escapedArg;
}

/**
 * Quotes and escape an argument for the given shell.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.arg The argument to escape.
 * @param {string} args.shellName The name of the shell to escape `arg` for.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.getEscapeFunction Get the escape function for a shell.
 * @param {Function} deps.getQuoteFunction Get the quote function for a shell.
 * @returns {string} The quoted and escaped argument.
 * @throws {TypeError} The argument to escape is not stringable.
 */
function quote$1({ arg, shellName }, { getEscapeFunction, getQuoteFunction }) {
  const escapedArg = escape$1(
    { arg, interpolation: false, quoted: true, shellName },
    { getEscapeFunction }
  );
  const quote = getQuoteFunction(shellName);
  const escapedAndQuotedArg = quote(escapedArg);
  return escapedAndQuotedArg;
}

/**
 * Escapes an argument for the given shell.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.arg The argument to escape.
 * @param {object} args.options The options for escaping `arg`.
 * @param {boolean} [args.options.interpolation] Is interpolation enabled.
 * @param {string} [args.options.shell] The shell to escape `arg` for.
 * @param {object} args.process The `process` values.
 * @param {object} args.process.env The environment variables.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.getDefaultShell Get the default shell for the system.
 * @param {Function} deps.getEscapeFunction Get an escape function for a shell.
 * @param {Function} deps.getShellName Get the name of a shell.
 * @returns {string} The escaped argument.
 */
function escapeShellArg(
  { arg, options: { interpolation, shell }, process: { env } },
  { getDefaultShell, getEscapeFunction, getShellName }
) {
  const options = parseOptions(
    { options: { interpolation, shell }, process: { env } },
    { getDefaultShell, getShellName }
  );
  return escape$1(
    {
      arg,
      interpolation: options.interpolation,
      quoted: false,
      shellName: options.shellName,
    },
    { getEscapeFunction }
  );
}

/**
 * Quotes and escape an argument for the given shell.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.arg The argument to escape.
 * @param {object} args.options The options for escaping `arg`.
 * @param {string} [args.options.shell] The shell to escape `arg` for.
 * @param {object} args.process The `process` values.
 * @param {object} args.process.env The environment variables.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.getDefaultShell Get the default shell for the system.
 * @param {Function} deps.getEscapeFunction Get an escape function for a shell.
 * @param {Function} deps.getQuoteFunction Get a quote function for a shell.
 * @param {Function} deps.getShellName Get the name of a shell.
 * @returns {string} The quoted and escaped argument.
 */
function quoteShellArg(
  { arg, options: { shell }, process: { env } },
  { getDefaultShell, getEscapeFunction, getQuoteFunction, getShellName }
) {
  const options = parseOptions(
    { options: { shell }, process: { env } },
    { getDefaultShell, getShellName }
  );
  return quote$1(
    { arg, shellName: options.shellName },
    { getEscapeFunction, getQuoteFunction }
  );
}

/**
 * @overview Provides functionality specifically for Unix systems.
 * @license MPL-2.0
 */

/**
 * The name of the Bourne-again shell (Bash) binary.
 *
 * @constant
 * @type {string}
 */
const binBash = "bash";

/**
 * The name of the C shell (csh) binary.
 *
 * @constant
 * @type {string}
 */
const binCsh = "csh";

/**
 * The name of the Debian Almquist shell (Dash) binary.
 *
 * @constant
 * @type {string}
 */
const binDash = "dash";

/**
 * The name of the Z shell (Zsh) binary.
 *
 * @constant
 * @type {string}
 */
const binZsh = "zsh";

/**
 * Escapes a shell argument for use in Bash(-like shells).
 *
 * @param {string} arg The argument to escape.
 * @param {object} options The escape options.
 * @param {boolean} options.interpolation Is interpolation enabled.
 * @param {boolean} options.quoted Is `arg` being quoted.
 * @returns {string} The escaped argument.
 */
function escapeArgBash(arg, { interpolation, quoted }) {
  let result = arg
    .replace(/[\0\u0008\u001B\u009B]/gu, "")
    .replace(/\r(?!\n)/gu, "");

  if (interpolation) {
    result = result
      .replace(/\\/gu, "\\\\")
      .replace(/\r?\n/gu, " ")
      .replace(/(^|\s)([#~])/gu, "$1\\$2")
      .replace(/(["$&'()*;<>?`{|])/gu, "\\$1")
      .replace(/(?<=[:=])(~)(?=[\s+\-/0:=]|$)/gu, "\\$1")
      .replace(/([\t ])/gu, "\\$1");
  } else if (quoted) {
    result = result.replace(/'/gu, `'\\''`);
  }

  return result;
}

/**
 * Escapes a shell argument for use in csh.
 *
 * @param {string} arg The argument to escape.
 * @param {object} options The escape options.
 * @param {boolean} options.interpolation Is interpolation enabled.
 * @param {boolean} options.quoted Is `arg` being quoted.
 * @returns {string} The escaped argument.
 */
function escapeArgCsh(arg, { interpolation, quoted }) {
  let result = arg
    .replace(/[\0\u0008\u001B\u009B]/gu, "")
    .replace(/\r?\n|\r/gu, " ");

  if (interpolation) {
    result = result
      .replace(/\\/gu, "\\\\")
      .replace(/(^|\s)(~)/gu, "$1\\$2")
      .replace(/(["#$&'()*;<>?[`{|])/gu, "\\$1")
      .replace(/([\t ])/gu, "\\$1");

    const textEncoder = new util.TextEncoder();
    result = result
      .split("")
      .map(
        // Due to a bug in C shell version 20110502-7, when a character whose
        // utf-8 encoding includes the bytes 0xA0 (160 in decimal) appears in
        // an argument after an escaped character, it will hang and endlessly
        // consume memory unless the character is escaped with quotes.
        // ref: https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=995013
        (char) => (textEncoder.encode(char).includes(160) ? `'${char}'` : char)
      )
      .join("");
  } else {
    result = result.replace(/\\!$/gu, "\\\\!");
    if (quoted) {
      result = result.replace(/'/gu, `'\\''`);
    }
  }

  result = result.replace(/!(?!$)/gu, "\\!");

  return result;
}

/**
 * Escapes a shell argument for use in Dash.
 *
 * @param {string} arg The argument to escape.
 * @param {object} options The escape options.
 * @param {boolean} options.interpolation Is interpolation enabled.
 * @param {boolean} options.quoted Is `arg` being quoted.
 * @returns {string} The escaped argument.
 */
function escapeArgDash(arg, { interpolation, quoted }) {
  let result = arg
    .replace(/[\0\u0008\u001B\u009B]/gu, "")
    .replace(/\r(?!\n)/gu, "");

  if (interpolation) {
    result = result
      .replace(/\\/gu, "\\\\")
      .replace(/\r?\n/gu, " ")
      .replace(/(^|\s)([#~])/gu, "$1\\$2")
      .replace(/(["$&'()*;<>?`|])/gu, "\\$1")
      .replace(/([\t\n ])/gu, "\\$1");
  } else if (quoted) {
    result = result.replace(/'/gu, `'\\''`);
  }

  return result;
}

/**
 * Escapes a shell argument for use in Zsh.
 *
 * @param {string} arg The argument to escape.
 * @param {object} options The escape options.
 * @param {boolean} options.interpolation Is interpolation enabled.
 * @param {boolean} options.quoted Is `arg` being quoted.
 * @returns {string} The escaped argument.
 */
function escapeArgZsh(arg, { interpolation, quoted }) {
  let result = arg
    .replace(/[\0\u0008\u001B\u009B]/gu, "")
    .replace(/\r(?!\n)/gu, "");

  if (interpolation) {
    result = result
      .replace(/\\/gu, "\\\\")
      .replace(/\r?\n/gu, " ")
      .replace(/(^|\s)([#=~])/gu, "$1\\$2")
      .replace(/(["$&'()*;<>?[\]`{|}])/gu, "\\$1")
      .replace(/([\t ])/gu, "\\$1");
  } else if (quoted) {
    result = result.replace(/'/gu, `'\\''`);
  }

  return result;
}

/**
 * Quotes an argument for use in a Unix shell.
 *
 * @param {string} arg The argument to quote.
 * @returns {string} The quoted argument.
 */
function quoteArg$1(arg) {
  return `'${arg}'`;
}

/**
 * Returns the basename of a directory or file path on a Unix system.
 *
 * @param {string} fullPath A Unix-style directory or file path.
 * @returns {string} The basename of `fullPath`.
 */
function getBasename$1(fullPath) {
  return path__namespace.basename(fullPath);
}

/**
 * Returns the default shell for Unix systems.
 *
 * For more information, see `options.shell` in:
 * https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback.
 *
 * @returns {string} The default shell.
 */
function getDefaultShell$1() {
  return "/bin/sh";
}

/**
 * Returns a function to escape arguments for use in a particular shell.
 *
 * @param {string} shellName The name of a Unix shell.
 * @returns {Function?} A function to escape arguments for use in the shell.
 */
function getEscapeFunction$1(shellName) {
  switch (shellName) {
    case binBash:
      return escapeArgBash;
    case binCsh:
      return escapeArgCsh;
    case binDash:
      return escapeArgDash;
    case binZsh:
      return escapeArgZsh;
    default:
      return null;
  }
}

/**
 * Returns a function to quote arguments for use in a particular shell.
 *
 * @param {string} shellName The name of a Unix shell.
 * @returns {Function?} A function to quote arguments for use in the shell.
 */
function getQuoteFunction$1(shellName) {
  switch (shellName) {
    case binBash:
    case binCsh:
    case binDash:
    case binZsh:
      return quoteArg$1;
    default:
      return null;
  }
}

/**
 * Determines the name of the shell identified by a file path or file name.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.shell The name or path of the shell.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.resolveExecutable Resolve the path to an executable.
 * @returns {string} The shell name.
 */
function getShellName$1({ shell }, { resolveExecutable }) {
  shell = resolveExecutable(
    { executable: shell },
    { exists: fs__namespace.existsSync, readlink: fs__namespace.readlinkSync, which: which.sync }
  );

  const shellName = getBasename$1(shell);
  if (getEscapeFunction$1(shellName) === null) {
    return binBash;
  }

  return shellName;
}

var unix = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getDefaultShell: getDefaultShell$1,
  getEscapeFunction: getEscapeFunction$1,
  getQuoteFunction: getQuoteFunction$1,
  getShellName: getShellName$1
});

/**
 * @overview Provides functionality specifically for Windows systems.
 * @license MPL-2.0
 */

/**
 * The name of the Windows Command Prompt binary.
 *
 * @constant
 * @type {string}
 */
const binCmd = "cmd.exe";

/**
 * The name of the Windows PowerShell binary.
 *
 * @constant
 * @type {string}
 */
const binPowerShell = "powershell.exe";

/**
 * Escapes a shell argument for use in Windows Command Prompt.
 *
 * @param {string} arg The argument to escape.
 * @param {object} options The escape options.
 * @param {boolean} options.interpolation Is interpolation enabled.
 * @param {boolean} options.quoted Is `arg` being quoted.
 * @returns {string} The escaped argument.
 */
function escapeArgCmd(arg, { interpolation, quoted }) {
  let result = arg
    .replace(/[\0\u0008\u001B\u009B]/gu, "")
    .replace(/\r?\n|\r/gu, " ");

  if (interpolation) {
    result = result.replace(/\^/gu, "^^").replace(/(["&<>|])/gu, "^$1");
  } else if (quoted) {
    result = result.replace(/"/gu, `""`);
  }

  return result;
}

/**
 * Escapes a shell argument for use in Windows PowerShell.
 *
 * @param {string} arg The argument to escape.
 * @param {object} options The escape options.
 * @param {boolean} options.interpolation Is interpolation enabled.
 * @param {boolean} options.quoted Is `arg` being quoted.
 * @returns {string} The escaped argument.
 */
function escapeArgPowerShell(arg, { interpolation, quoted }) {
  let result = arg
    .replace(/[\0\u0008\u001B\u009B]/gu, "")
    .replace(/`/gu, "``")
    .replace(/\$/gu, "`$$")
    .replace(/\r(?!\n)/gu, "");

  if (interpolation) {
    result = result
      .replace(/\r?\n/gu, " ")
      .replace(/(^|[\s\u0085])([*1-6]?)(>)/gu, "$1$2`$3")
      .replace(/(^|[\s\u0085])([#\-:<@\]])/gu, "$1`$2")
      .replace(/(["&'(),;{|}‘’‚‛“”„])/gu, "`$1")
      .replace(/([\s\u0085])/gu, "`$1");
  } else if (quoted) {
    result = result.replace(/(["“”„])/gu, "$1$1");
  }

  return result;
}

/**
 * Quotes an argument for use in a Windows shell.
 *
 * @param {string} arg The argument to quote.
 * @returns {string} The quoted argument.
 */
function quoteArg(arg) {
  return `"${arg}"`;
}

/**
 * Returns the basename of a directory or file path on a Windows system.
 *
 * @param {string} fullPath A Windows-style directory or file path.
 * @returns {string} The basename of `fullPath`.
 */
function getBasename(fullPath) {
  return path__namespace.win32.basename(fullPath);
}

/**
 * Returns the default shell for Windows systems.
 *
 * For more information, see:
 * https://nodejs.org/api/child_process.html#default-windows-shell.
 *
 * @param {object} args The arguments for this function.
 * @param {object} args.env The environment variables.
 * @param {string} [args.env.ComSpec] The %COMSPEC% value.
 * @returns {string} The default shell.
 */
function getDefaultShell({ env: { ComSpec } }) {
  if (ComSpec !== undefined) {
    return ComSpec;
  }

  return binCmd;
}

/**
 * Returns a function to escape arguments for use in a particular shell.
 *
 * @param {string} shellName The name of a Windows shell.
 * @returns {Function?} A function to escape arguments for use in the shell.
 */
function getEscapeFunction(shellName) {
  switch (shellName) {
    case binCmd:
      return escapeArgCmd;
    case binPowerShell:
      return escapeArgPowerShell;
    default:
      return null;
  }
}

/**
 * Returns a function to quote arguments for use in a particular shell.
 *
 * @param {string} shellName The name of a Windows shell.
 * @returns {Function?} A function to quote arguments for use in the shell.
 */
function getQuoteFunction(shellName) {
  switch (shellName) {
    case binCmd:
    case binPowerShell:
      return quoteArg;
    default:
      return null;
  }
}

/**
 * Determines the name of the shell identified by a file path or file name.
 *
 * @param {object} args The arguments for this function.
 * @param {string} args.shell The name or path of the shell.
 * @param {object} deps The dependencies for this function.
 * @param {Function} deps.resolveExecutable Resolve the path to an executable.
 * @returns {string} The shell name.
 */
function getShellName({ shell }, { resolveExecutable }) {
  shell = resolveExecutable(
    { executable: shell },
    { exists: fs__namespace.existsSync, readlink: fs__namespace.readlinkSync, which: which.sync }
  );

  const shellName = getBasename(shell);
  if (getEscapeFunction(shellName) === null) {
    return binCmd;
  }

  return shellName;
}

var win = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getDefaultShell: getDefaultShell,
  getEscapeFunction: getEscapeFunction,
  getQuoteFunction: getQuoteFunction,
  getShellName: getShellName
});

/**
 * @overview Provides functionality related to getting the platform module for
 * the current system.
 * @license MPL-2.0
 */

/**
 * The string identifying the OS type Cygwin.
 *
 * @constant
 * @type {string}
 */
const cygwin = "cygwin";

/**
 * The string identifying the OS type MSYS.
 *
 * @constant
 * @type {string}
 */
const msys = "msys";

/**
 * The string identifying Windows platforms.
 *
 * @constant
 * @type {string}
 */
const win32 = "win32";

/**
 * Checks if the current system is a Windows system.
 *
 * @param {object} args The arguments for this function.
 * @param {Object<string, string>} args.env The environment variables.
 * @param {string} args.platform The `os.platform()` value.
 * @returns {boolean} `true` if the system is Windows, `false` otherwise.
 */
function isWindow({ env, platform }) {
  return env.OSTYPE === cygwin || env.OSTYPE === msys || platform === win32;
}

/**
 * Returns all helper functions for a specific system.
 *
 * @param {object} args The arguments for this function.
 * @param {Object<string, string>} args.env The environment variables.
 * @param {string} args.platform The `os.platform()` value.
 * @returns {object} The helper functions for the current system.
 */
function getHelpersByPlatform({ env, platform }) {
  if (isWindow({ env, platform })) {
    return win;
  }

  return unix;
}

/**
 * A simple shell escape library. Use it to escape user-controlled inputs to
 * shell commands to prevent shell injection.
 *
 * @overview Entrypoint for the library.
 * @module shescape
 * @version 1.6.4
 * @license MPL-2.0
 */

/**
 * Get the helper functions for the current platform.
 *
 * @returns {object} The helper functions for the current platform.
 */
function getPlatformHelpers() {
  const platform = os.platform();
  const helpers = getHelpersByPlatform({ env: process.env, platform });
  return helpers;
}

/**
 * Converts the provided value into an array if it is not already an array and
 * returns the array.
 *
 * @param {Array | any} x The value to convert to an array if necessary.
 * @returns {Array} An array containing `x` or `x` itself.
 */
function toArrayIfNecessary(x) {
  return Array.isArray(x) ? x : [x];
}

/**
 * Take a single value, the argument, and escape any dangerous characters.
 *
 * Non-string inputs will be converted to strings using a `toString()` method.
 *
 * NOTE: when the `interpolation` option is set to `true`, whitespace is escaped
 * to prevent argument splitting except for cmd.exe (which does not support it).
 *
 * @example
 * import { spawn } from "node:child_process";
 * spawn(
 *   "echo",
 *   ["Hello", shescape.escape(userInput)],
 *   null // `options.shell` MUST be falsy
 * );
 * @param {string} arg The argument to escape.
 * @param {object} [options] The escape options.
 * @param {boolean} [options.interpolation=false] Is interpolation enabled.
 * @param {boolean | string} [options.shell] The shell to escape for.
 * @returns {string} The escaped argument.
 * @throws {TypeError} The argument is not stringable.
 * @since 0.1.0
 */
function escape(arg, options = {}) {
  const helpers = getPlatformHelpers();
  return escapeShellArg({ arg, options, process }, helpers);
}

/**
 * Take a array of values, the arguments, and escape any dangerous characters in
 * every argument.
 *
 * Non-array inputs will be converted to one-value arrays and non-string values
 * will be converted to strings using a `toString()` method.
 *
 * @example
 * import { spawn } from "node:child_process";
 * spawn(
 *   "echo",
 *   shescape.escapeAll(["Hello", userInput]),
 *   null // `options.shell` MUST be falsy
 * );
 * @param {string[]} args The arguments to escape.
 * @param {object} [options] The escape options.
 * @param {boolean} [options.interpolation=false] Is interpolation enabled.
 * @param {boolean | string} [options.shell] The shell to escape for.
 * @returns {string[]} The escaped arguments.
 * @throws {TypeError} One of the arguments is not stringable.
 * @since 1.1.0
 */
function escapeAll(args, options = {}) {
  args = toArrayIfNecessary(args);
  return args.map((arg) => escape(arg, options));
}

/**
 * Take a single value, the argument, put OS-specific quotes around it and
 * escape any dangerous characters.
 *
 * Non-string inputs will be converted to strings using a `toString()` method.
 *
 * @example
 * import { spawn } from "node:child_process";
 * const spawnOptions = { shell: true }; // `options.shell` SHOULD be truthy
 * const shescapeOptions = { ...spawnOptions };
 * spawn(
 *   "echo",
 *   ["Hello", shescape.quote(userInput, shescapeOptions)],
 *   spawnOptions
 * );
 * @example
 * import { exec } from "node:child_process";
 * const execOptions = null || { };
 * const shescapeOptions = { ...execOptions };
 * exec(
 *   `echo Hello ${shescape.quote(userInput, shescapeOptions)}`,
 *   execOptions
 * );
 * @param {string} arg The argument to quote and escape.
 * @param {object} [options] The escape and quote options.
 * @param {boolean | string} [options.shell] The shell to escape for.
 * @returns {string} The quoted and escaped argument.
 * @throws {TypeError} The argument is not stringable.
 * @since 0.3.0
 */
function quote(arg, options = {}) {
  const helpers = getPlatformHelpers();
  return quoteShellArg({ arg, options, process }, helpers);
}

/**
 * Take an array of values, the arguments, put OS-specific quotes around every
 * argument and escape any dangerous characters in every argument.
 *
 * Non-array inputs will be converted to one-value arrays and non-string values
 * will be converted to strings using a `toString()` method.
 *
 * @example
 * import { spawn } from "node:child_process";
 * const spawnOptions = { shell: true }; // `options.shell` SHOULD be truthy
 * const shescapeOptions = { ...spawnOptions };
 * spawn(
 *   "echo",
 *   shescape.quoteAll(["Hello", userInput], shescapeOptions),
 *   spawnOptions
 * );
 * @param {string[]} args The arguments to quote and escape.
 * @param {object} [options] The escape and quote options.
 * @param {boolean | string} [options.shell] The shell to escape for.
 * @returns {string[]} The quoted and escaped arguments.
 * @throws {TypeError} One of the arguments is not stringable.
 * @since 0.4.0
 */
function quoteAll(args, options = {}) {
  args = toArrayIfNecessary(args);
  return args.map((arg) => quote(arg, options));
}

exports.escape = escape;
exports.escapeAll = escapeAll;
exports.quote = quote;
exports.quoteAll = quoteAll;
