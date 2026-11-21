import { isPublicArea } from './area-registry.js';

export function renderAreaList(list, { areas, progress, current, select }) {
  const document = list.ownerDocument;
  const cards = [];
  for (const [id, area] of Object.entries(areas)) {
    if (!isPublicArea(areas, id)) continue;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'area-card';
    card.dataset.area = id;
    if (id === current) card.setAttribute('aria-current', 'location');

    if (area.thumbnail) {
      const image = document.createElement('img');
      image.src = area.thumbnail;
      image.alt = '';
      image.width = 640;
      image.height = 360;
      image.decoding = 'async';
      card.append(image);
    }
    const title = document.createElement('span');
    title.className = 'area-card-title';
    title.textContent = area.title;
    card.append(title);

    if (progress.has(id)) {
      const badge = document.createElement('span');
      badge.className = 'area-card-completion';
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '✓';
      badge.append(mark, 'Missions complete');
      card.append(badge);
    }
    card.addEventListener('click', () => select(id));
    cards.push(card);
  }
  list.replaceChildren(...cards);
}
