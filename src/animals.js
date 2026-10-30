// Display names live in i18n (each locale's `animals` list, same index order),
// since plural forms and grammar differ per language.
export const ANIMALS = [
  { id: 'tiger', type: 0, icon: require('../assets/img/zoo/tiger.png'), color: '#94fcee' },
  { id: 'panda', type: 1, icon: require('../assets/img/zoo/panda.png'), color: '#808486' },
  { id: 'flamingo', type: 2, icon: require('../assets/img/zoo/flaming.png'), color: '#FF375F' },
  { id: 'peacock', type: 3, icon: require('../assets/img/zoo/peacock.png'), color: '#d19aff' },
  { id: 'zebra', type: 4, icon: require('../assets/img/zoo/zebra.png'), color: '#FFD60A' },
  { id: 'chameleon', type: 5, icon: require('../assets/img/zoo/chameleon.png'), color: '#00C7BE' },
];

export function iconForType(type) {
  return ANIMALS[type].icon;
}

export function colorForType(type) {
  return ANIMALS[type].color;
}
