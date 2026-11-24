import React from 'react';
import Svg from 'react-native-svg';
import PetSprite, { SkateRider, riderLook } from './PetSprite';

// The pet in menus and on the stage end card: on its skateboard, looking back
// at you, in its fur colour or painted set. pose="front" keeps the old
// face-on drawing (used where a plain portrait fits better).
export default function PetPreview({ species, wardrobe, character, size = 90, pose = 'look' }) {
  const activeChar = character !== undefined ? character : wardrobe?.activeCharacter ?? null;
  if (pose === 'front') {
    return (
      <Svg width={size} height={(size * 60) / 64} viewBox="-4 -14 64 60">
        <PetSprite species={species} colour={wardrobe.colour} equipped={{}} character={activeChar} phase={1} pose="front" />
      </Svg>
    );
  }
  const { variant, tint } = riderLook(wardrobe?.colour, activeChar);
  return (
    <Svg width={size} height={(size * 60) / 64} viewBox="-22 -60 100 94">
      <SkateRider cat={species === 'cat'} pose="look" clock={0} tint={tint} variant={variant} board={wardrobe?.equipped?.board} shadow={false} />
    </Svg>
  );
}
