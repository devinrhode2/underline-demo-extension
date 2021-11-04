import { debounce, DebouncedFunc } from 'lodash'

console.log('Content script injected!');
console.log('Must reload extension for modifications to take effect.');

// Even at document_idle, lots of stuff can still be happening,
// even on a good MBP (latest intel chip)
// no other extensions, on keep.google.com

// init is defined via magic - do you know of said magic? (FYI - I think it's a bad practice, just trying to have fun here :)
// setTimeout(init, 2000) // skipping because it's annoying in development :)
init()

function init() {
  console.log('init')
  document.body.addEventListener('focusin', maybeUpdateHighlight)
  document.body.addEventListener('focusout', maybeUpdateHighlight)

  if (document.hasFocus()) {
    let { activeElement } = document
    if (isContentEditable(activeElement)) {
      console.log('already focused on contenteditable div, starting the engines...')
      startKeyUpListener(activeElement)
      // Note: activeElement now has type ContentEditableDiv :)
      highlight(activeElement)
    }
  }
}

// `interface` gives us better hover annotations throughout code. Example above: init()->highlight(*activeElement*)
interface ContentEditableDiv extends HTMLDivElement {
  // Exists in chrome... may not exist in other browsers.
  computedStyleMap?: () => ({
    // TODO: improve this type? (could use generics - which may or may not be helpful depending on actual implementation)
    entries: () => Array<[string, string]>
  })
}

function isContentEditable(thing: Element | EventTarget | null): thing is ContentEditableDiv {
  if (thing === null) return false
  if ((thing as Element).nodeName !== 'DIV') return false
  const contentEditableAttr = (thing as Element).getAttribute('contenteditable')
  const isValidAttr = contentEditableAttr === '' || (
    !!contentEditableAttr &&
    contentEditableAttr !== 'false'
  )
  return isValidAttr
}

let lastActiveElement: undefined | ContentEditableDiv

function maybeUpdateHighlight(event: FocusEvent) {
  if (event.type === 'focusin') {
    let { activeElement } = document

    if (!isContentEditable(activeElement)) {
      return 
    }

    if (lastActiveElement) {
      stopKeyUpListener(lastActiveElement)
    }

    lastActiveElement = activeElement

    startKeyUpListener(activeElement)
    highlight(activeElement)
  } else if (event.type === 'focusout') {
    if (
      lastActiveElement !== undefined
    ) {
      stopKeyUpListener(lastActiveElement)
      removeHighlight(lastActiveElement)
    }
  } else {
    // debug/test mode only:
    // Handler is currently only registered for `focusin` and `focusout`
    throw new Error('unhandled focus event:' + event.type)
  }
}

let lastListener: undefined | DebouncedFunc<(event: KeyboardEvent) => void>

function mapKeyUpToHighlight(event: KeyboardEvent) {
  console.log('keyup event', event)
  
  // debug/test mode only:
  if (event.type !== 'keyup') throw new Error('must use keyup event')
  if (!isContentEditable(event.target)) {
    throw new Error('event.target is not a content editable div - this should not be possible here')
  }

  highlight(event.target as ContentEditableDiv)
}

const underlines = [{
	from: 0,
	to: 5
}, {
	from: 12,
	to: 15
}, {
	from: 30,
	to: 33
}]


// ********************************** //
// *** Computing character widths *** //
// ********************************** //
/**
 * There are numerous strategies for computing character widths.
 * 
 * We must not forget, we still need to draw the underlines on the actual page.
 * 
 * Strategy:
 *   1. Create an absolutely positioned div on top of the page
 *        - (document.documentElement.appendChild - try to avoid affecting page flow/css as much as possible)
 *   2. That div should have all the same computed styles as the ContentEditableDiv the user is typing in/focused on.
 *   3. However we'll override these styles:
 *        `color` should be... rgba(... transparent)?
 *        opacity: 0.45 if localhost
 *        visibility: hidden unless localhost
 *        (ensure height/width are propertly calculated...)
 *        position: absolute;
 *        left: ${ceDiv.clientY}px;
 *        right: ${cdDiv.clientX}px
 *        pointer-events: none
 */

// get the computed styles on the given contenteditable,
// "hard-code" those styles into the elements style attribute, with !important
// Do our computation
// "un-hard-code" the styles, remove our computation div?
// Further, we can insert our computation div right under document.documentElement at very end of the page, so it really shouldn't interfere with any css

// However, we can actually do something else nifty:

// We can process each character in the actual div, key by key, letter by letter.
// Ideally, we process _as the user is typing_
// This way, we gradually build up a cache of character widths
// However, if they paste a bunch of stuff, then we need to "walk" through each character we haven't seen before

// "Walking" through each character could serve as a fun progress indicator/loading animation
// The the next character we need to process
// Exactly how we do that is a little tricky.

const smallChars = 'qwertyuiopasdfghjklzxcvbnm'.split('')
const capitalChars = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('')

let underlineContainer: undefined | HTMLElement

function insertUnderlineContainer(existingContentEditableDiv: ContentEditableDiv) {
  underlineContainer = document.createElement('underline-container')
  if (!existingContentEditableDiv.computedStyleMap) {
    throw new Error('browser does not support computedStyleMap()!')
  }
  const computedStyle = Object.fromEntries(Array.from(existingContentEditableDiv.computedStyleMap().entries()))
  

  const parent = existingContentEditableDiv.parentNode as ParentNode // This can never be null. Even if you deliberately try to create a div without an <html> or <body> parent, chrome will create <body> for everyone's sanity :)
  // TODO:
  //  This can affect css selectors like: `#parent > div:first-child` as such, this dom mutation does risks affecting how the page looks
  //  As a future optimization, we should get the computed styles of the existingContentEditableDiv,
  //  "hard-code" those styles into the elements style attribute, with !important
  //  Do our computation
  //  "un-hard-code" the styles, remove our computation div?
  //  Further, we can insert our computation div right under document.documentElement at very end of the page, so it really shouldn't interfere with any css
  parent.insertBefore(underlineContainer.content, existingContentEditableDiv)
  // Generally, computing character widths is a topic of deep optimization.
  //   We could actually use browsers to build a database up in real-time
  //   Sync this charWidth database to client browsers
  //   Even use some cypress scripts to crawl the web, and keep it updated ourselves.
  //   We can spot-check a few characters, "W", "O", "i", "l". If the width of all 4 of these match a known character/font set,
  //   Then we would 
}

// replicate actual text in the same font, but with styling on the character spans
// Actually!
// We could pre-compute a map of character widths
// iterate over common characters
// create them in the dom, with the correct css/font styling,
// then...
// we just use the widths we've already computed

// Probably PO wants this extension to be very memory efficient (near 0 when you aren't focused on the input)
// Therefore, we won't cache computations in-between typing sessions....? or, we should clear cache when user leaves tab, using page visiblity api?


function startKeyUpListener(div: ContentEditableDiv) {
  console.log('starting keyup listener...')
  insertUnderlineContainer(div)
  lastListener = debounce(mapKeyUpToHighlight, 500, {trailing: true})
  div.addEventListener('keyup', lastListener)
}

function stopKeyUpListener(div: ContentEditableDiv) {
  // debug/test mode only:
  if (lastListener === undefined || !lastListener.cancel) {
    console.error('lastListener.cancel is not truthy - this should not be possible.')
    return
  }
  lastListener.cancel()
  div.removeEventListener('keyup', lastListener)  
}

function highlight(div: ContentEditableDiv) {
  // TODO: resume here
  //   (verify code from last night first, then continue here)
  let text = div.innerText
  if (text.length === 0) return // could to text.trim().length, but that edge case is probably not worth the cost in performance
  console.log('highlight this:', text)
  div.style.border = '10px dotted red'


}

function removeHighlight(div: ContentEditableDiv) {
  console.log('remove highlight from:', div)
  div.style.border = '1px solid black'
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
