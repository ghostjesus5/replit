// Procedural sound and music. GameScene emits game.events 'sfx' (name, data) and 'music' ({ theme, boss }).
export function initAudio(game) {
  game.audio = { toggleMute: () => false, isMuted: () => false };
}
