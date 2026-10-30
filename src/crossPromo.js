import { Platform } from 'react-native';

// First-party cross-promotion for other Amulet Studios games, shown in
// Settings → More Games (and the featured one on the home screen). An entry
// only appears on a platform it has a store URL for. iOS links use the
// country-less apps.apple.com/app/id… form so each player lands on their own
// storefront.
export const CROSS_PROMO_GAMES = [
  {
    id: 'blockys_blitz',
    name: "Blocky's Blitz",
    icon: require('../assets/blocky\'sicon.png'),
    androidUrl: 'https://play.google.com/store/apps/details?id=com.amuletstudios.blockysblitz&hl=en',
    iosUrl: 'https://apps.apple.com/app/id6795014997',
  },
  {
    id: 'ilgi',
    name: 'Ilgi',
    icon: require('../assets/dearme_icon.png'),
    androidUrl: 'https://play.google.com/store/apps/details?id=com.amuletstudios.dearme&hl=en',
  },
  {
    id: 'nubkins',
    name: 'Nubkins',
    icon: require('../assets/nubkins_icon.png'),
    androidUrl: 'https://play.google.com/store/apps/details?id=com.amuletstudios.nubkins&hl=en',
  },
];

export function storeUrlFor(game) {
  return Platform.OS === 'android' ? game.androidUrl : game.iosUrl;
}

// The game promoted on the home screen, or null if it has no link on this
// platform.
const FEATURED_ID = 'blockys_blitz';
export function featuredPromo() {
  const game = CROSS_PROMO_GAMES.find(g => g.id === FEATURED_ID);
  return game && storeUrlFor(game) ? game : null;
}
