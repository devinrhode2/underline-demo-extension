import { printLine } from './modules/print';

console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

/*

document_idle, run stuff

funcion handleFocus() {
  check if document.activeElement is... div[contenteditable]
}

document.body - by pasting this data url into chrome: `data:text/html,<html><head></head><div></div></html>`, and checking document.body in console, suggests it is always defined.

document.body onFocus...

check for what element currently has focus..

if document.hasFocus() and/or document.visibilityState === 'visible?'
  focusedTextInput = ???
  handleFocus(focusedTextInput)





User may click and start typing _before_ our code runs

0. Add focus event handler (on body, or documentElement)
1. Check where current focus is?
2. Is it an input[type="text"], textarea, or div[contenteditable]?
3. If it is text input...
4. Start processing 

Alternatively:
0. Register keyup listener on body?
1. on keypress: - a keypress indicates a character has been sent to the text input value
- actually after press, before up, the .value has been updated
- on keyup, cache .value, set 2000ms timer
- on subsequent keyup, cache .value, 
  A. Toggle flag for "pending grammar check"
  B. Debounce 2000ms? (if no key up for 2000ms, then send to language service)
    - there is an edge case where typists are fidgeting with arrow/shift/ctrl keys to select text
    - this could be a feature, taken as an indication the typist is still thinking,
      - maybe they don't want to think about grammar quite yet
      - they can learn that fidgeting with keys will hold off grammar checking
        - if users never fidget to hold off grammar checker, maybe we have performance issue?
        ... arrow keys, etc, do not send key PRESS, they are only sending key down/up.
        - Except for delete key, is actually just sending down/up, but it's mutating text
  // B. cache text contents as a shared/semi-global "inputCache[selector]", wait 2000ms, check if text is still the same.
  //   1. if text content hasn't changed:
  //       - send to language service
  //   2. If text content has changed, 

event listener on body
detect click, or focus

*/

printLine("Using the 'printLine' function from the Print Module");
