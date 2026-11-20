import { createMissionHud } from '../../core/hud.js';

class Element extends EventTarget {
  textContent = '';
  children = [];
  attributes = new Set();
  hidden = false;
  open = false;
  scrollTop = 0;

  constructor(tagName) {
    super();
    this.tagName = tagName;
  }

  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  toggleAttribute(name, present) {
    if (present) this.attributes.add(name);
    else this.attributes.delete(name);
  }
}

export function missionHudFixture() {
  const elements = {
    'mission-hud': new Element('details'),
    'mission-summary': new Element('span'),
    'mission-panel': new Element('div'),
    'mission-list': new Element('ul'),
    'mission-hint': new Element('section'),
    'mission-hint-text': new Element('p'),
    'mission-inventory': new Element('section'),
    'mission-inventory-text': new Element('p'),
    'mission-toast': new Element('p'),
  };
  let now = 0;
  let nextId = 0;
  const pending = new Map();
  const timers = {
    setTimeout(callback, duration) {
      const id = nextId++;
      pending.set(id, { time: now + duration, callback });
      return id;
    },
    clearTimeout(id) { pending.delete(id); },
  };
  const game = {
    ownerDocument: { createElement: tag => new Element(tag) },
    querySelector: selector => elements[selector.slice(1)],
  };
  const notifications = [];
  const hud = createMissionHud(game, timers);

  return {
    hud, elements, pending, notifications, toast: elements['mission-toast'],
    notify(message) {
      notifications.push(message);
      hud.notify(message);
    },
    advance(ms) {
      now += ms;
      for (const [id, { time, callback }] of pending) {
        if (time > now) continue;
        pending.delete(id);
        callback();
      }
    },
  };
}
