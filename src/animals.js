export const ANIMALS = [
  { id: 'tiger', type: 0, icon: require('../assets/img/zoo/tiger.png'), name: 'tiger', color: '#94fcee' },
  { id: 'panda', type: 1, icon: require('../assets/img/zoo/panda.png'), name: 'panda', color: '#808486' },
  { id: 'flamingo', type: 2, icon: require('../assets/img/zoo/flaming.png'), name: 'flamingo', color: '#FF375F' },
  { id: 'peacock', type: 3, icon: require('../assets/img/zoo/peacock.png'), name: 'peacock', color: '#d19aff' },
  { id: 'zebra', type: 4, icon: require('../assets/img/zoo/zebra.png'), name: 'zebra', color: '#FFD60A' },
  { id: 'chameleon', type: 5, icon: require('../assets/img/zoo/chameleon.png'), name: 'chameleon', color: '#00C7BE' },
];

export function iconForType(type) {
  return ANIMALS[type].icon;
}

export function nameForType(type) {
  return ANIMALS[type].name;
}

export function colorForType(type) {
  return ANIMALS[type].color;
}
