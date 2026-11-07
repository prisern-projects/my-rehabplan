// Rehab plan: "Back rehabilitation" from Aktiv Fysioterapi Nittedal (ExorLive, 05.11.2026).
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

export const EXERCISES = [
  {
    id: 'squat',
    name: 'Squat',
    area: 'Legs',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 10, rest: 60,
    steps: [
      'Stand with your feet shoulder-width apart.',
      'Bend down until your knees are at roughly 90 degrees, then press back up.',
      'Keep your back straight and look straight ahead.',
    ],
    tip: 'Alternative: hold the deep sitting position for a few seconds before pressing up.',
  },
  {
    id: 'calf-raise',
    sideWord: 'leg',
    name: 'Single-leg calf raise on step',
    area: 'Legs',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 10, rest: 45,
    perSide: true,
    steps: [
      'Stand on the edge of a step (a stair or bench also works) so your heels are free.',
      'Keep your feet about hip-width apart.',
      'Lift your heels and press up onto your toes.',
      'Lower back to the starting position and repeat.',
    ],
    tip: 'Can be done with or without holding on to something for support.',
  },
  {
    id: 'step-up',
    name: 'Step-up with knee raise',
    area: 'Legs',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 10, rest: 60,
    weight: '2 × 4 kg',
    steps: [
      'Use two steps of the stairs, holding a 4 kg weight in each hand.',
      'Place one foot on the step in front of you. Make sure knee and toes point straight ahead.',
      'Put all your weight on the leg on the step and push yourself up on it.',
      'Tighten the front of the thigh and your glutes so the standing leg straightens fully.',
      'Lift the opposite knee up in a bent position.',
      'Lower yourself slowly and repeat with the other leg.',
    ],
    tip: 'Alternate legs on each rep.',
  },
  {
    id: 'balance',
    sideWord: 'leg',
    name: 'Single-leg balance on cushion',
    area: 'Balance',
    type: 'time',
    sets: 3, duration: 30, rest: 20,
    perSide: true,
    steps: [
      'Stand on a cushion or a folded mat.',
      'Stand on one leg with a slight bend in the knee.',
    ],
    tip: 'Challenge yourself by moving the other leg around.',
  },
  {
    id: 'band-row',
    name: 'Standing row with band',
    area: 'Upper back',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 45,
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
    sets: 3, repsMin: 8, repsMax: 10, rest: 45,
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
    id: 'hamstring-stretch',
    sideWord: 'leg',
    name: 'Lying hamstring stretch',
    area: 'Stretch',
    type: 'time',
    sets: 3, duration: 20, rest: 10,
    perSide: true,
    steps: [
      'Lie on your back.',
      'Lift one leg and hold around it with your hands.',
      'Hold the stretch for 10–20 seconds.',
    ],
    tip: 'The sheet says 2–3 sets.',
  },
  {
    id: 'diagonal-lift-ball',
    name: 'Diagonal lift on ball',
    area: 'Back',
    type: 'reps',
    sets: 3, repsMin: 10, repsMax: 10, rest: 45, // default
    steps: [
      'Lie on your stomach over the ball.',
      'Lift one arm and the opposite leg until they are in line with your body.',
      'Then lift the other arm and leg.',
    ],
    tip: 'Count one rep per side lifted.',
  },
  {
    id: 'glute-bridge-ball',
    name: 'Glute bridge on exercise ball',
    area: 'Back',
    type: 'hold',
    sets: 3, repsMin: 8, repsMax: 8, hold: 4, relax: 4, rest: 45, // default reps
    steps: [
      'Lie with both legs a little way out on the ball, so you get a long lever.',
      'Keep your arms along your sides.',
      'Squeeze your glutes together and lift your pelvis and lower back off the floor.',
      'The whole lower leg rests on the ball.',
      'Hold for 3–5 seconds, then rest for the same amount of time.',
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
    sets: 3, repsMin: 10, repsMax: 10, rest: 45, // default
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
    sets: 3, repsMin: 10, repsMax: 10, rest: 45, // default
    steps: [
      'Stand with the dumbbells hanging down at your sides.',
      'Bend your elbows and lift the dumbbells all the way up while turning your palms outward.',
      'Lower slowly back down.',
    ],
  },
  {
    id: 'knee-pushup',
    name: 'Push-up on knees',
    area: 'Upper body',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 10, rest: 60, // default
    steps: [
      'Get on your knees with a stiff, braced body.',
      'Place your hands slightly wider than shoulder-width apart.',
      'Lower your body toward the floor and press back up.',
      'Do not bend at the hips.',
    ],
  },
  {
    id: 'knee-plank',
    name: 'Plank on knees and elbows',
    area: 'Core',
    type: 'time',
    sets: 3, duration: 20, rest: 30, // default
    steps: [
      'Lie on a mat.',
      'Support yourself on your elbows and knees.',
      'Keep your back straight like a plank for the whole exercise.',
    ],
  },
  {
    id: 'dips',
    name: 'Dips',
    area: 'Upper body',
    type: 'reps',
    sets: 3, repsMin: 8, repsMax: 8, rest: 60, // default
    steps: [
      'Let your body weight hang on straight arms.',
      'Keep your shoulders down, away from your ears.',
      'Bend your knees and lower your body slowly until your upper arms are about horizontal.',
      'Press back up.',
    ],
  },
];
