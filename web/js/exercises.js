// Rehab plan: "Back rehabilitation" from Aktiv Fysioterapi Nittedal (ExorLive, updated plan Nov 2026).
// Translated from Norwegian. Values marked "default" were not given on the sheet
// and can be changed in Settings inside the app.
//
// Exercise types:
//   reps  – tap-to-count reps, then rest between sets
//   time  – countdown timer per set (e.g. balance, plank, stretch)
//   hold  – each rep is a timed hold followed by a relax period
//
// perSide: the set is done once for each side (left, then right).

export const PLAN_NOTE = 'Train every other day. On rest days, take short walks.';

const SHEET = [
  {
    id: 'squat',
    name: 'Squat with kettlebell',
    area: 'Legs',
    type: 'reps',
    weight: '10 kg kettlebell',
    sets: 3, repsMin: 8, repsMax: 10, rest: 30,
    steps: [
      'Hold a 10 kg kettlebell in front of your chest.',
      'Stand with your feet shoulder-width apart.',
      'Bend down until your knees are at roughly 90 degrees, then press back up.',
      'Keep your back straight and look straight ahead.',
    ],
    tip: 'Alternative: hold the deep sitting position for a few seconds before pressing up.',
  },
  {
    id: 'calf-raise',
    sideWord: 'leg',
    name: 'Single-leg calf raise on step with weight',
    area: 'Legs',
    type: 'reps',
    weight: 'Hold a weight',
    sets: 3, repsMin: 8, repsMax: 10, rest: 30,
    perSide: true,
    steps: [
      'Stand on the edge of a step (a stair or bench also works) so your heels are free.',
      'Hold a weight (e.g. a dumbbell or the kettlebell) in your hand.',
      'Keep your feet about hip-width apart.',
      'Lift your heels and press up onto your toes.',
      'Lower back to the starting position and repeat.',
    ],
    tip: 'Can be done with or without holding on to something for support.',
  },
  {
    id: 'band-row',
    name: 'Standing row with band',
    area: 'Upper back',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30,
    steps: [
      'Anchor the band low on the wall bars.',
      'Stand with feet apart, facing the wall, one handle in each hand.',
      'Start with your arms straight out in front of you.',
      'Pull the handles toward your stomach.',
      'Return slowly.',
    ],
  },
  {
    id: 'pelvic-tilt-situp',
    name: 'Pelvic tilt with small sit-ups',
    area: 'Core',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 10, rest: 30,
    steps: [
      'Lie on your back with knees bent and feet on the floor.',
      'Press your lower back down into the floor.',
      'Lift your head and shoulders slightly off the floor in a small sit-up.',
    ],
  },
  {
    id: 'cat-cow',
    name: 'Cat-cow (round and arch back)',
    area: 'Mobility',
    type: 'reps',
    sets: 2, repsMin: 10, repsMax: 10, rest: 30, // default – not given on sheet
    steps: [
      'Get down on all fours.',
      'Round your back and look down.',
      'Then gently arch your back.',
      'Do not go all the way to the end position.',
    ],
    tip: 'Move slowly and smoothly.',
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    area: 'Core',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30, // default – not given on sheet
    steps: [
      'Lie on your back with hips and knees bent to 90 degrees and your arms raised above your chest.',
      'Activate the lowest, deepest part of your stomach muscles: pull your belly button in toward your spine and make a "flat stomach".',
      'At the same time, lower one arm and the opposite leg.',
      'Bring them back up and repeat with the other arm and leg.',
    ],
    tip: 'Keep your lower back pressed to the floor. Count each side as one rep.',
  },
  {
    id: 'diagonal-lift-ball',
    name: 'Diagonal lift on ball',
    area: 'Back',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30, // default
    steps: [
      'Lie on your stomach over the ball.',
      'Lift one arm and the opposite leg until they are in line with your body.',
      'Then lift the other arm and leg.',
    ],
    tip: 'Count one rep per side lifted.',
  },
  {
    id: 'bridge-leg-curl-ball',
    name: 'Glute bridge and leg curl on ball',
    area: 'Back',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30, // default – not given on sheet
    steps: [
      'Lie with both legs on the ball and your arms along your sides.',
      'Find a neutral position in your back and pelvis and make a "flat stomach".',
      'Lift your pelvis until you are resting on your shoulder blades.',
      'Pull your feet toward your bottom by bending your knees.',
      'Roll the ball back out and repeat.',
    ],
  },
  {
    id: 'seated-pelvic-tilt-ball',
    name: 'Seated pelvic tilt on ball',
    area: 'Mobility',
    type: 'reps',
    sets: 2, repsMin: 10, repsMax: 10, rest: 30, // default
    steps: [
      'Sit on the ball with a good, stable posture. Keep your pelvis in a neutral position.',
      'Tilt your pelvis forward so your lower back arches.',
      'Then tilt your pelvis slowly back so the curve at the bottom of your back straightens out.',
      'Return to neutral and repeat.',
    ],
  },
  {
    id: 'band-side-steps',
    sideWord: 'direction',
    name: 'Side steps with band',
    area: 'Hips',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30, // default
    perSide: true,
    steps: [
      'Take small steps sideways with your feet pointing straight ahead.',
      'Keep your core and glute muscles engaged.',
    ],
    tip: 'Count steps in one direction, then go back the other way.',
  },
  {
    id: 'biceps-curl',
    name: 'Standing biceps curl with dumbbells',
    area: 'Arms',
    type: 'reps',
    weight: '10 kg',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30, // default
    steps: [
      'Stand with the dumbbells hanging down at your sides.',
      'Bend your elbows and lift the dumbbells all the way up while turning your palms outward.',
      'Lower slowly back down.',
    ],
  },
  {
    id: 'pushup',
    name: 'Push-up',
    area: 'Upper body',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 10, rest: 30,
    steps: [
      'Place your hands about shoulder-width apart.',
      'Keep your body stable and straight.',
      'Lower yourself in a controlled way toward the floor, chest first.',
      'Press back up until your arms are fully straight.',
      'Avoid arching your lower back or bending at the hips.',
    ],
  },
  {
    id: 'plank',
    name: 'Plank on elbows and toes',
    area: 'Core',
    type: 'time',
    sets: 2, duration: 30, rest: 30,
    steps: [
      'Support yourself on your toes and elbows.',
      'Find the neutral position of your back and pelvis.',
      'Make a "flat stomach" and hold this position.',
    ],
    tip: 'The sheet says 20–30 seconds – start with what you can hold with good form.',
  },
  {
    id: 'plank-pelvis-tilt',
    sameSheetNo: true, // second part of sheet no. 13
    name: 'Plank with side-to-side pelvis tilt',
    area: 'Core',
    type: 'reps',
    sets: 2, repsMin: 5, repsMax: 5, rest: 30,
    perSide: true,
    steps: [
      'Get into the plank on elbows and toes.',
      'Tilt your pelvis slowly from side to side.',
      'Do 5 to each side.',
    ],
  },
  {
    id: 'dips',
    name: 'Dips',
    area: 'Upper body',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 8, rest: 30, // default
    steps: [
      'Let your body weight hang on straight arms.',
      'Keep your shoulders down, away from your ears.',
      'Bend your knees and lower your body slowly until your upper arms are about horizontal.',
      'Press back up.',
    ],
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    area: 'Upper back',
    type: 'reps',
    sets: 3, repsMin: 5, repsMax: 8, rest: 30, // default – not given on sheet
    steps: [
      'Hang from the bar with a wide grip.',
      'Pull yourself straight up until your neck is level with the bar.',
      'Lower yourself slowly back down.',
      'Keep your gaze forward and slightly down throughout the movement.',
    ],
    tip: 'If you can\'t do full reps yet, do as many as you can with good form.',
  },
  {
    id: 'pallof-press',
    name: 'Standing Pallof press with band',
    area: 'Core',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 30, // default – not given on sheet
    perSide: true,
    steps: [
      'Stand upright with your side to where the band is anchored.',
      'Hold the handle with both hands at chest height, close to your body.',
      'Brace your stomach and back.',
      'Press your hands straight out in front of you without letting your body twist.',
      'Bring your hands slowly back to your chest.',
    ],
    tip: 'Do one side, then turn around and do the other side.',
  },
  {
    id: 'hamstring-stretch',
    sideWord: 'leg',
    name: 'Lying hamstring stretch',
    area: 'Stretch',
    type: 'time',
    sets: 3, duration: 20, rest: 30,
    perSide: true,
    steps: [
      'Lie on your back.',
      'Lift one leg and hold around it with your hands.',
      'Hold the stretch for 10–20 seconds.',
    ],
    tip: 'The sheet says 2–3 sets.',
  },
];

// Workout order: warm up the back first, then everything standing, then the
// floor/ball exercises, and finish with the stretch. This keeps changes of
// position and equipment to a minimum. `sheetNo` is the number on the physio's sheet.
const ORDER = [
  'cat-cow',                 // warm-up: mobility on all fours
  'seated-pelvic-tilt-ball', // warm-up: mobility sitting on the ball
  'squat',                   // standing – kettlebell
  'calf-raise',              // step + weight
  'band-side-steps',         // band
  'band-row',                // band on the wall bars
  'pallof-press',            // band, standing side-on
  'pull-up',                 // bar
  'biceps-curl',             // dumbbells
  'dips',                    // dip bars / bench
  'pushup',                  // floor
  'plank',                   // floor
  'plank-pelvis-tilt',       // floor, straight after the plank
  'diagonal-lift-ball',      // lying on the ball
  'bridge-leg-curl-ball',    // lying on your back, legs on the ball
  'dead-bug',                // lying on your back
  'pelvic-tilt-situp',       // lying on your back
  'hamstring-stretch',       // cool-down stretch
];

// Number each exercise as on the sheet (an entry marked sameSheetNo shares the previous number).
let n = 0;
const SHEET_NO = Object.fromEntries(SHEET.map((e) => [e.id, e.sameSheetNo ? n : ++n]));

export const EXERCISES = ORDER.map((id) => {
  const e = SHEET.find((x) => x.id === id);
  return e && { ...e, sheetNo: SHEET_NO[id] };
});

if (EXERCISES.length !== SHEET.length || EXERCISES.some((e) => !e)) {
  throw new Error('ORDER in exercises.js must list every exercise exactly once');
}
