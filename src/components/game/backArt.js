// Behind-the-back runner art: frames for each pet and pose, plus wardrobe and
// character items drawn for this view. Generated from the art sheets; sizes are
// the PNGs' pixel sizes. Anchors are fractions of each frame: hx = head centre,
// top = skull top between the ears, hw = head width, ny = collar line; frames
// that show the face add fx/fy (eye centre) and fw (glasses width).
// Units: a frame's pixels times UNIT[species] gives game units.

export const UNIT = { cat: 84 / 512, dog: 66 / 512 };

export const BACK_FRAMES = {
  cat: {
    run1: { pw: 405, ph: 512, hx: 0.65, top: 0.25, hw: 0.56, ny: 0.55, grey: require('../../../assets/sprites/cat_back_run1.png'), fur: require('../../../assets/sprites/cat_back_run1_fur.png'), gold: require('../../../assets/sprites/catgold_back_run1.png'), cyber: require('../../../assets/sprites/catcyber_back_run1.png'), zebra: require('../../../assets/sprites/catzebra_back_run1.png'), spot: require('../../../assets/sprites/catspot_back_run1.png') },
    run2: { pw: 405, ph: 512, hx: 0.55, top: 0.265, hw: 0.53, ny: 0.56, grey: require('../../../assets/sprites/cat_back_run2.png'), fur: require('../../../assets/sprites/cat_back_run2_fur.png'), gold: require('../../../assets/sprites/catgold_back_run2.png'), cyber: require('../../../assets/sprites/catcyber_back_run2.png'), zebra: require('../../../assets/sprites/catzebra_back_run2.png'), spot: require('../../../assets/sprites/catspot_back_run2.png') },
    jumpUp: { pw: 405, ph: 512, hx: 0.54, top: 0.085, hw: 0.56, ny: 0.38, grey: require('../../../assets/sprites/cat_back_jump_up.png'), fur: require('../../../assets/sprites/cat_back_jump_up_fur.png'), gold: require('../../../assets/sprites/catgold_back_jump_up.png'), cyber: require('../../../assets/sprites/catcyber_back_jump_up.png'), zebra: require('../../../assets/sprites/catzebra_back_jump_up.png'), spot: require('../../../assets/sprites/catspot_back_jump_up.png') },
    jumpDown: { pw: 405, ph: 512, hx: 0.58, top: 0.23, hw: 0.49, ny: 0.53, grey: require('../../../assets/sprites/cat_back_jump_down.png'), fur: require('../../../assets/sprites/cat_back_jump_down_fur.png'), gold: require('../../../assets/sprites/catgold_back_jump_down.png'), cyber: require('../../../assets/sprites/catcyber_back_jump_down.png'), zebra: require('../../../assets/sprites/catzebra_back_jump_down.png'), spot: require('../../../assets/sprites/catspot_back_jump_down.png') },
    duck: { pw: 405, ph: 512, hx: 0.665, top: 0.5, hw: 0.52, ny: 0.71, grey: require('../../../assets/sprites/cat_back_duck.png'), fur: require('../../../assets/sprites/cat_back_duck_fur.png'), gold: require('../../../assets/sprites/catgold_back_duck.png'), cyber: require('../../../assets/sprites/catcyber_back_duck.png'), zebra: require('../../../assets/sprites/catzebra_back_duck.png'), spot: require('../../../assets/sprites/catspot_back_duck.png') },
    hurt: { pw: 334, ph: 474, hx: 0.52, top: 0.16, hw: 0.69, ny: 0.485, grey: require('../../../assets/sprites/cat_back_hurt.png'), fur: require('../../../assets/sprites/cat_back_hurt_fur.png') },
    look: { pw: 377, ph: 434, hx: 0.68, top: 0.09, hw: 0.58, ny: 0.47, grey: require('../../../assets/sprites/cat_back_look.png'), fur: require('../../../assets/sprites/cat_back_look_fur.png'), fx: 0.76, fy: 0.27, fw: 0.4 },
    sit: { pw: 282, ph: 411, hx: 0.51, top: 0.07, hw: 0.77, ny: 0.46, grey: require('../../../assets/sprites/cat_back_sit.png'), fur: require('../../../assets/sprites/cat_back_sit_fur.png') },
    spinSide: { pw: 343, ph: 441, hx: 0.62, top: 0.09, hw: 0.61, ny: 0.49, grey: require('../../../assets/sprites/cat_back_spin_side.png'), fur: require('../../../assets/sprites/cat_back_spin_side_fur.png') },
    spinFront: { pw: 301, ph: 421, hx: 0.595, top: 0.083, hw: 0.7, ny: 0.49, grey: require('../../../assets/sprites/cat_back_spin_front.png'), fur: require('../../../assets/sprites/cat_back_spin_front_fur.png'), fx: 0.585, fy: 0.3, fw: 0.5 },
  },
  dog: {
    run1: { pw: 426, ph: 512, hx: 0.61, top: 0.085, hw: 0.51, ny: 0.44, grey: require('../../../assets/sprites/dog_back_run1.png'), fur: require('../../../assets/sprites/dog_back_run1_fur.png'), gold: require('../../../assets/sprites/doggold_back_run1.png') },
    run2: { pw: 426, ph: 512, hx: 0.42, top: 0.045, hw: 0.52, ny: 0.41, grey: require('../../../assets/sprites/dog_back_run2.png'), fur: require('../../../assets/sprites/dog_back_run2_fur.png'), gold: require('../../../assets/sprites/doggold_back_run2.png') },
    jump: { pw: 426, ph: 512, hx: 0.61, top: 0.05, hw: 0.51, ny: 0.41, grey: require('../../../assets/sprites/dog_back_jump.png'), fur: require('../../../assets/sprites/dog_back_jump_fur.png'), gold: require('../../../assets/sprites/doggold_back_jump.png') },
    duck: { pw: 426, ph: 512, hx: 0.68, top: 0.31, hw: 0.45, ny: 0.6, grey: require('../../../assets/sprites/dog_back_duck.png'), fur: require('../../../assets/sprites/dog_back_duck_fur.png'), gold: require('../../../assets/sprites/doggold_back_duck.png') },
    sit: { pw: 426, ph: 512, hx: 0.505, top: 0.21, hw: 0.5, ny: 0.56, grey: require('../../../assets/sprites/dog_back_sit.png'), fur: require('../../../assets/sprites/dog_back_sit_fur.png'), gold: require('../../../assets/sprites/doggold_back_sit.png') },
    hurt: { pw: 356, ph: 556, hx: 0.52, top: 0.17, hw: 0.56, ny: 0.47, grey: require('../../../assets/sprites/dog_back_hurt.png'), fur: require('../../../assets/sprites/dog_back_hurt_fur.png') },
    look: { pw: 380, ph: 506, hx: 0.64, top: 0.06, hw: 0.62, ny: 0.45, grey: require('../../../assets/sprites/dog_back_look.png'), fur: require('../../../assets/sprites/dog_back_look_fur.png'), fx: 0.75, fy: 0.25, fw: 0.46 },
    sit2: { pw: 316, ph: 495, hx: 0.49, top: 0.03, hw: 0.66, ny: 0.46, grey: require('../../../assets/sprites/dog_back_sit2.png'), fur: require('../../../assets/sprites/dog_back_sit2_fur.png') },
    spinSide: { pw: 449, ph: 485, hx: 0.67, top: 0.08, hw: 0.56, ny: 0.56, grey: require('../../../assets/sprites/dog_back_spin_side.png'), fur: require('../../../assets/sprites/dog_back_spin_side_fur.png') },
    spinFront: { pw: 352, ph: 490, hx: 0.61, top: 0.04, hw: 0.71, ny: 0.47, grey: require('../../../assets/sprites/dog_back_spin_front.png'), fur: require('../../../assets/sprites/dog_back_spin_front_fur.png'), fx: 0.61, fy: 0.32, fw: 0.62 },
  },
};
BACK_FRAMES.dog.jumpUp = BACK_FRAMES.dog.jump;
BACK_FRAMES.dog.jumpDown = BACK_FRAMES.dog.jump;
BACK_FRAMES.dog.sit = BACK_FRAMES.dog.sit2;

// Hats seen from behind: width k and brim sink, as fractions of head width.
export const BACK_HATS = {
  'hat-party': { href: require('../../../assets/sprites/hat_party.png'), ar: 1.2812, k: 0.5, sink: 0.1, lift: 0 },
  'hat-beanie': { href: require('../../../assets/sprites/hat_beanie.png'), ar: 1.0458, k: 0.92, sink: 0.3, lift: 0 },
  'hat-sun': { href: require('../../../assets/sprites/hat_sun.png'), ar: 0.6875, k: 1.3, sink: 0.2, lift: 0 },
  'hat-cap': { href: require('../../../assets/sprites/hat_cap.png'), ar: 0.6937, k: 0.95, sink: 0.28, lift: 0 },
  'hat-chef': { href: require('../../../assets/sprites/hat_chef.png'), ar: 0.875, k: 0.8, sink: 0.18, lift: 0 },
  'hat-crown': { href: require('../../../assets/sprites/hat_crown.png'), ar: 0.7812, k: 0.72, sink: 0.12, lift: 0 },
  'hat-wizard': { href: require('../../../assets/sprites/hat_wizard.png'), ar: 0.9094, k: 1.0, sink: 0.16, lift: 0 },
  'hat-halo': { href: require('../../../assets/sprites/hat_halo.png'), ar: 0.5188, k: 0.75, sink: 0, lift: 0.14 },
};

// Neck items in three poses (run, jump, duck). cape: drapes down the back.
export const BACK_NECK = {
  'bandana-pink': { cape: false, run: { href: require('../../../assets/sprites/bandana_pink_run.png'), ar: 0.625 }, jump: { href: require('../../../assets/sprites/bandana_pink_jump.png'), ar: 1.0281 }, duck: { href: require('../../../assets/sprites/bandana_pink_duck.png'), ar: 0.5273 } },
  'bandana-rainbow': { cape: false, run: { href: require('../../../assets/sprites/bandana_rainbow_run.png'), ar: 0.9062 }, jump: { href: require('../../../assets/sprites/bandana_rainbow_jump.png'), ar: 0.9727 }, duck: { href: require('../../../assets/sprites/bandana_rainbow_duck.png'), ar: 0.7109 } },
  'bandana-sa': { cape: false, run: { href: require('../../../assets/sprites/bandana_sa_run.png'), ar: 1.0 }, jump: { href: require('../../../assets/sprites/bandana_sa_jump.png'), ar: 1.2427 }, duck: { href: require('../../../assets/sprites/bandana_sa_duck.png'), ar: 0.6445 } },
  'bandana-champ': { cape: false, run: { href: require('../../../assets/sprites/bandana_champ_run.png'), ar: 0.7852 }, jump: { href: require('../../../assets/sprites/bandana_champ_jump.png'), ar: 1.0079 }, duck: { href: require('../../../assets/sprites/bandana_champ_duck.png'), ar: 0.5156 } },
  'cape-hero': { cape: true, run: { href: require('../../../assets/sprites/cape_hero_run.png'), ar: 0.7812 }, jump: { href: require('../../../assets/sprites/cape_hero_jump.png'), ar: 1.0063 }, duck: { href: require('../../../assets/sprites/cape_hero_duck.png'), ar: 0.5312 } },
  'char-royal': { cape: true, run: { href: require('../../../assets/sprites/cape_royal_run.png'), ar: 0.7781 }, jump: { href: require('../../../assets/sprites/cape_royal_jump.png'), ar: 0.5844 }, duck: { href: require('../../../assets/sprites/cape_royal_duck.png'), ar: 0.5156 } },
  'bowtie-red': { band: true, back: { href: require('../../../assets/sprites/bowtie_back.png'), ar: 0.599 }, front: { href: require('../../../assets/sprites/bowtie_front.png'), ar: 0.6354 } },
};

// Glasses: back = arms over the ears (seen from behind); front = on the face.
export const BACK_GLASSES = {
  'glasses-round': { back: { href: require('../../../assets/sprites/glasses_round_back.png'), ar: 0.5417 }, front: { href: require('../../../assets/sprites/glasses_round_front.png'), ar: 0.474 } },
  'glasses-sun': { back: { href: require('../../../assets/sprites/glasses_sun_back.png'), ar: 0.4948 }, front: { href: require('../../../assets/sprites/glasses_sun_front.png'), ar: 0.526 } },
  'glasses-star': { back: { href: require('../../../assets/sprites/glasses_star_back.png'), ar: 0.5469 }, front: { href: require('../../../assets/sprites/glasses_star_front.png'), ar: 0.5104 } },
  'glasses-heart': { back: { href: require('../../../assets/sprites/glasses_heart_back.png'), ar: 0.5104 }, front: { href: require('../../../assets/sprites/glasses_heart_front.png'), ar: 0.5 } },
  'glasses-monocle': { back: { href: require('../../../assets/sprites/glasses_monocle_back.png'), ar: 0.8594 }, front: { href: require('../../../assets/sprites/glasses_monocle_front.png'), ar: 1.4015 } },
  'glasses-cyber': { back: { href: require('../../../assets/sprites/glasses_cyber_back.png'), ar: 0.4479 }, front: { href: require('../../../assets/sprites/glasses_cyber_front.png'), ar: 0.5625 } },
};

export const BACK_CHAR = {
  helmet: { href: require('../../../assets/sprites/acc_astro_helmet.png'), ar: 1.0922 },
  pack: { href: require('../../../assets/sprites/acc_astro_pack.png'), ar: 1.0492 },
  ear: { href: require('../../../assets/sprites/acc_cyber_ear.png'), ar: 1.0159 },
  headband: { run: { href: require('../../../assets/sprites/headband_ninja_run.png'), ar: 0.625 }, jump: { href: require('../../../assets/sprites/headband_ninja_jump.png'), ar: 1.5238 }, duck: { href: require('../../../assets/sprites/headband_ninja_duck.png'), ar: 0.582 } },
  mask: { href: require('../../../assets/sprites/mask_ninja.png'), ar: 0.6094 },
};
