import React from 'react';
import Svg from 'react-native-svg';
import PetSprite from './PetSprite';

// The pet in its wardrobe, standing still, for menus and the stage end card.
export default function PetPreview({ species, wardrobe, size = 90 }) {
  return (
    <Svg width={size} height={(size * 60) / 64} viewBox="-4 -14 64 60">
      <PetSprite species={species} colour={wardrobe.colour} equipped={wardrobe.equipped} phase={1} pose="run" />
    </Svg>
  );
}
