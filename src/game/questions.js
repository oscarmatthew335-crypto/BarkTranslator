// Treat-round questions about the pet. Text lives in src/i18n/game/*.js under
// q.<id> (the question) and q.<id>.<option> (each answer). Every question
// also offers "Not sure", which is rewarded exactly like any other answer.
//
// kind 'profile' answers are about the pet itself and can be changed later in
// the pets sheet; kind 'habit' answers describe what the pet usually does.
// species: which pets the question is for.

export const UNSURE = 'unsure';

export const PROFILE_QUESTIONS = [
  { id: 'ageBand', kind: 'profile', species: ['dog', 'cat'], options: ['young', 'adult', 'mature', 'senior'] },
  { id: 'size', kind: 'profile', species: ['dog'], options: ['small', 'medium', 'large'] },
  { id: 'energy', kind: 'profile', species: ['dog', 'cat'], options: ['low', 'medium', 'high'] },
  { id: 'home', kind: 'profile', species: ['dog', 'cat'], options: ['indoor', 'garden', 'both'] },
  { id: 'otherPets', kind: 'profile', species: ['dog', 'cat'], options: ['none', 'dogs', 'cats', 'both', 'other'] }
];

export const HABIT_QUESTIONS = [
  { id: 'barkWhen', kind: 'habit', species: ['dog'], options: ['morning', 'day', 'evening', 'night', 'alone', 'noPattern'] },
  { id: 'meowWhen', kind: 'habit', species: ['cat'], options: ['morning', 'day', 'evening', 'night', 'beforeFood', 'noPattern'] },
  { id: 'knock', kind: 'habit', species: ['dog', 'cat'], options: ['vocal', 'runsToDoor', 'hides', 'ignores'] },
  { id: 'foodAsk', kind: 'habit', species: ['dog', 'cat'], options: ['vocal', 'stares', 'paws', 'waits'] },
  { id: 'walkAsk', kind: 'habit', species: ['dog'], options: ['bringsLead', 'vocal', 'sitsAtDoor', 'doesntAsk'] },
  { id: 'stranger', kind: 'habit', species: ['dog', 'cat'], options: ['vocal', 'hides', 'friendly', 'watches'] },
  { id: 'birds', kind: 'habit', species: ['cat'], options: ['chatters', 'stalks', 'ignores'] },
  { id: 'greeting', kind: 'habit', species: ['dog', 'cat'], options: ['vocal', 'jumps', 'rubs', 'ignores'] }
];

export const ALL_QUESTIONS = [...PROFILE_QUESTIONS, ...HABIT_QUESTIONS];
export const getQuestion = (id) => ALL_QUESTIONS.find((q) => q.id === id) || null;
export const questionsFor = (species, kind) => ALL_QUESTIONS.filter((q) => q.kind === kind && q.species.includes(species));
