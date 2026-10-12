// Bible campaign story text: intro cards per world id, plus the ending.
// Each world's lines play on a scripture page before its first level.
export const BIBLE_STORY = {
  eden: [
    'In the beginning there was the Bible. It got mixed reviews.',
    'Two thousand years later He came back. On a rainbow unicorn. With miniguns.',
    'This is the Newest Testament. He is working through the old one in order.',
    'First stop, the garden. The serpent never paid rent.',
  ],
  egypt: [
    'Egypt still had not let His people go.',
    'Ten plagues were sent. Pharaoh read none of them.',
    'Plague eleven is a unicorn.',
  ],
  redsea: [
    'The sea parted once. Then it closed again. People complained.',
    'He found the staff of Moses in lost and found.',
    'Do not look down. Or do. You can walk on water now.',
  ],
  jericho: [
    'The walls of Jericho came down the first time with trumpets.',
    'Somebody rebuilt them. Without a permit.',
    'He brought something louder than trumpets.',
  ],
  babel: [
    'Mankind built a tower to reach heaven.',
    'Heaven noticed. Heaven sent a unicorn.',
    'Nobody up there speaks the same language. Bullets translate.',
  ],
  revelation: [
    'And so it came to the last book.',
    'Seven seals. Seven trumpets. One very large beast.',
    'He read the ending in advance. He is still going.',
    'Saddle up. This is the finale.',
  ],
};

export const BIBLE_OUTRO = [
  'Six worlds. Then on the seventh day, He rested.',
  'The Bible was cleaned up. Every chapter. Every verse.',
  'The beast was smitten. The tower was demolished. The serpent was evicted.',
  'The unicorn has been put out to pasture. A very nice pasture.',
  'Bible 2 is complete. Bible 3 is in early development.',
  'Amen.',
];

// used when a campaign has no outro of its own
export const GENERIC_OUTRO = [
  'And so the book was finished.',
  'Some of it may have happened.',
  'Scholars are still arguing. The unicorn is not.',
  'Amen.',
];

// deadpan lines for the death screen, rotated per cause
export const DEATH_LINES = {
  pit: [
    'Even the Son of God has off days.',
    'He descended into the pit. Not for the first time.',
    'Gravity was created on day one. Respect it.',
    'The pit is not part of the plan.',
  ],
  water: [
    'Walking on water is a power-up. Not a lifestyle.',
    'He was baptized again. Involuntarily.',
    'The sea does not part on its own. Get the staff.',
    'Swept away. Mostly the unicorn.',
  ],
  hit: [
    'Even the Son of God has off days.',
    'He turned the other cheek. It also got hit.',
    'Smitten. The irony is noted.',
    'Forgive them. Then go back and shoot them.',
  ],
};

// the Another Testament campaign gets its own excuses
export const MORMON_DEATH_LINES = {
  pit: [
    'No archaeological evidence of this pit either.',
    'He fell. The angel has the plates now.',
    'The pit was translated from reformed Egyptian. Badly.',
  ],
  water: [
    'The barges were watertight. That was the problem.',
    'Baptized. Posthumously. That is allowed here.',
    'Somebody forgot to put a hole in the top of the barge.',
  ],
  hit: [
    'The seer stone did not see that coming.',
    'He will translate this defeat from inside a hat.',
    'Eleven witnesses saw it. None of them will say it twice.',
    'The plates have been returned to the angel. No refunds.',
  ],
};
