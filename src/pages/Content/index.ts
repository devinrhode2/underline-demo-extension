import { debounce, DebouncedFunc } from 'lodash'

console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

// Even at document_idle, lots of stuff can still be happening,
// even on a good MBP (latest intel chip)
// no other extensions, on keep.google.com

// init is defined via magic - do you know of said magic? (FYI - I think it's a bad practice, just trying to have fun here :)
// setTimeout(init, 2000) // skipping because it's annoying in development :)
init()

// Gosh idk why ts EventTarget is so bad here :/
type RealisticEventTarget = Element | null

function init() {
  console.log('init')
  document.body.addEventListener('focusin', maybeUpdateHighlight)
  document.body.addEventListener('focusout', maybeUpdateHighlight)

  if (document.hasFocus()) {
    let { activeElement } = document
    if (isContentEditable(activeElement)) {
      console.log('already focused on contenteditable div, starting the engines...')
      startKeyUpListener(activeElement)
      // Note: activeElement is now an HTMLDivElement :)
      highlight(activeElement)
    }
  }
}

// IME `interface` (as opposed to `type`) should let this nice type name flow through rest of code hover annotations
interface ContentEditableDiv extends HTMLDivElement {}

function isContentEditable(thing: Element | EventTarget | null): thing is ContentEditableDiv {
  if (thing === null) return false
  if ((thing as Element).nodeName !== 'DIV') return false
  const contentEditableAttr = (thing as Element).getAttribute('contenteditable')
  const isValidAttr = contentEditableAttr === '' || (
    !!contentEditableAttr &&
    contentEditableAttr !== 'false'
  )
  return isValidAttr
  if (isValidAttr) {
    // Ensure all other code can simply read the property normally, without concern:
    // (thing as HTMLDivElement).contentEditable = true
    return isValidAttr
  }
}

let lastActiveElement: undefined | ContentEditableDiv

function maybeUpdateHighlight(event: FocusEvent) {
  // on focusout, activeElement may not be our original div.
  let eventTarget = event.target as RealisticEventTarget // TODO: TS-UPGRADE: ideally we don't need any type casting here :)
  if (!isContentEditable(eventTarget)) return

  if (event.type === 'focusin') {
    let { activeElement } = document

    // log this to sentry, remove or archive if it never happens:
    if (!isContentEditable(activeElement)) {
      console.warn(
        'document.activeElement IS NOT contenteditable but focusin event.target IS',
        { eventTarget, activeElement }
      )
      return 
    }

    lastActiveElement = activeElement

    startKeyUpListener(activeElement)
    highlight(activeElement)
  } else if (event.type === 'focusout') {

    // Given implementation requirements, we should always just use `lastActiveElement`.
    // However, if business wants to not always remove highlight when user removes focus on (maybe create setting for user, idk)
    // Then, we may not want to keep this variable reference around, for optimal memory usage. Instead, browser gives us event target
    // we can use that instead of holding onto an extra variable reference.

    // log this to sentry, remove or archive if it never happens:
    if (
      lastActiveElement !== undefined &&
      lastActiveElement !== eventTarget
    ) {
      console.warn(
        'eventTarget does not match lastActiveElement',
        { lastActiveElement, eventTarget }
      )
      stopKeyUpListener(lastActiveElement)
      removeHighlight(lastActiveElement)
    }

    stopKeyUpListener(eventTarget)
    removeHighlight(eventTarget)
  } else {
    // Handler is currently only registered for `focusin` and `focusout`
    throw new Error('unhandled focus event:' + event.type)
  }
}

let lastListener: undefined | ((event: KeyboardEvent) => void)

function mapKeyUpToHighlight(event: KeyboardEvent) {
  if (event.type !== 'keyup') 
  // debug/test mode only:
  if (!isContentEditable(event.target)) {

  }
  highlight(event.target as ContentEditableDiv)
}

function startKeyUpListener(div: ContentEditableDiv) {
  stopKeyUpListener(div)
  lastListener = debounce(mapKeyUpToHighlight, 500, {trailing: true})
  div.addEventListener('keyup', lastListener)
}

function stopKeyUpListener(div: ContentEditableDiv) {
  div.removeEventListener('keyup', lastListener.cancel)  
}

function highlight(div: ContentEditableDiv) {
  
}

function removeHighlight(div: ContentEditableDiv) {
  
}

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
