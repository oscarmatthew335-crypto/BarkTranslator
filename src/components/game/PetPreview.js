import React from 'react';
import Svg from 'react-native-svg';
import PetSprite from './PetSprite';

// The pet in its wardrobe, standing still, for menus and the stage end card.
export default function PetPreview({ species, wardrobe, character, size = 90, pose = 'run' }) {
  const activeChar = character !== undefined ? character : wardrobe?.activeCharacter ?? null;
  return (
    <Svg width={size} height={(size * 60) / 64} viewBox="-4 -14 64 60">
      <PetSprite species={species} colour={wardrobe.colour} equipped={wardrobe.equipped} character={activeChar} phase={1} pose={pose} />
    </Svg>
  );
}
