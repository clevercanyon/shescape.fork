/**
 * @overview Contains fuzz tests for Shescape.
 * @license Unlicense
 * @author Eric Cornelissen <ericornelissen@gmail.com>
 */

const cp = require("child_process");
const os = require("os");

const shescape = require("../index.cjs");

require("dotenv").config();

function getFuzzShell() {
  return process.env.FUZZ_SHELL;
}

function prepareArg(arg) {
  const shell = getFuzzShell();
  const isWindows = () => os.platform() === "win32";
  const isShellCmd = () => shell === undefined || /cmd\.exe$/.test(shell);
  const isShellPowerShell = () => /powershell\.exe$/.test(shell);

  let result = arg.replace(/[\n\r]+/g, ""); // Avoid dealing with newlines
  if (isWindows()) {
    // Node on Windows ...
    if (isShellCmd()) {
      // ... in CMD interprets arguments with `\"` as `"` (even if there's a
      // null character between `\` and `"`) so we escape the `\`.
      result = result.replace(/((\\\u{0}*)+)(?=\u{0}*("|$))/gu, "$1$1");
    } else if (isShellPowerShell()) {
      // ... in PowerShell, depending on if there's whitespace in the
      // argument ...
      if (/\s/.test(result)) {
        // ... interprets arguments with `""` as nothing so we escape it with
        // extra double quotes as `""""` ...
        result = result.replace(/"/g, `""`);

        // ... and interprets arguments with `\"` as `"` (even if there's a null
        // character between `\` and `"`) so we escape the `\`.
        result = result.replace(/((\\\u{0}*)+)(?=\u{0}*("|$))/gu, "$1$1");
      } else {
        // ... interprets arguments with `\"` as `"` (even if there's a null
        // character between `\` and `"`) so we escape the `\`, except that the
        // quote closing the argument cannot be escaped ...
        result = result.replace(/((\\\u{0}*)+)(?=\u{0}*("))/gu, "$1$1");

        // ... and interprets arguments with `""` as nothing so we escape it
        // with `\"`.
        result = result.replace(/"/g, `\\"`);
      }
    }
  }

  return result;
}

function getExpectedOutput(arg) {
  return arg
    .replace(/[\n\r]+/g, "") // Avoid dealing with newlines
    .replace(/\u{0}/gu, ""); // Remove null characters
}

function checkQuotesAndEscapesCorrectly(arg) {
  const options = {
    shell: getFuzzShell(),
  };

  const preparedArg = prepareArg(arg);
  const quotedArg = shescape.quote(preparedArg, options);
  const cmd = `node test/fuzz/echo.js ${quotedArg}`;

  const result = cp.execSync(cmd, options).toString();
  const expected = getExpectedOutput(arg);
  if (expected !== result) {
    throw new Error(
      "Unexpected output (- got, + expected):\n" +
        `- ${result}\n` +
        `+ ${expected}`
    );
  }
}

function fuzz(buf) {
  const arg = buf.toString();
  checkQuotesAndEscapesCorrectly(arg);
}

module.exports = {
  fuzz,
  getFuzzShell,
};
