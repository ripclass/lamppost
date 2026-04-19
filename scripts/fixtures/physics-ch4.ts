/**
 * Sample chapter fixture — SSC Physics Class 9, Chapter 4:
 * Work, Energy and Power.
 *
 * Content only. Embeddings live in physics-ch4.embeddings.json, generated
 * by `seed-sample-chapter.ts --regenerate-embeddings` via Ollama
 * (nomic-embed-text, 768-dim).
 *
 * Entries are sorted alphabetically by question so diffs are deterministic
 * across future expansions. If you add a new entry, add it in sort order.
 *
 * Step 7 will translate `_bn` fields via Gemini. Until then, they are null.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType =
  | 'conceptual'
  | 'procedural'
  | 'definitional'
  | 'misconception'
  | 'application'
  | 'edge_case'
  | 'comparison'
  | 'visual';

export interface FixtureQAEntry {
  question: string;
  question_bn: null; // Step 7: translate via Gemini
  answer: string;
  answer_bn: null; // Step 7: translate via Gemini
  topic_tags: string[];
  difficulty: Difficulty;
  question_type: QuestionType;
  common_wrong_answer?: string;
  why_wrong?: string;
  has_whiteboard: boolean;
}

export const SAMPLE_CHAPTER = {
  curriculum: {
    name: 'SSC',
    board: 'NCTB',
    language: 'en',
    country: 'BD',
  },
  subject: {
    name: 'Physics',
    name_bn: 'পদার্থবিজ্ঞান',
    code: 'PHY',
    grade: 'Class 9',
  },
  chapter: {
    chapter_number: 4,
    title: 'Work, Energy and Power',
    title_bn: 'কাজ, শক্তি ও ক্ষমতা',
    description:
      'Concepts of work, kinetic and potential energy, conservation of energy, power, and mechanical efficiency.',
  },
} as const;

export const QA_ENTRIES: readonly FixtureQAEntry[] = [
  {
    question: 'Can kinetic energy be negative?',
    question_bn: null,
    answer:
      "No, kinetic energy cannot be negative. KE = (1/2) × m × v². Mass is always positive, and velocity squared is always non-negative (a negative number squared is positive). The minimum kinetic energy is zero — when the object is at rest. Direction of motion doesn't matter because the square erases the sign.",
    answer_bn: null,
    topic_tags: ['kinetic energy', 'edge case', 'sign'],
    difficulty: 'medium',
    question_type: 'edge_case',
    common_wrong_answer: 'Yes, if the object moves backward, its KE is negative.',
    why_wrong:
      "Backward motion has negative velocity, but velocity gets squared in the KE formula, so the sign disappears. KE is a scalar — it doesn't carry direction.",
    has_whiteboard: false,
  },
  {
    question: 'Can work be negative?',
    question_bn: null,
    answer:
      'Yes. Work is negative when the force opposes the displacement. Friction, for example, always does negative work because it acts opposite to the direction of motion. Mathematically, when the angle θ between force and displacement is greater than 90°, cos(θ) is negative, so W = F × d × cos(θ) becomes negative. Negative work means energy is being taken away from the object.',
    answer_bn: null,
    topic_tags: ['work', 'negative work', 'friction', 'energy'],
    difficulty: 'medium',
    question_type: 'conceptual',
    common_wrong_answer: 'No, work is always positive because it involves force and distance.',
    why_wrong:
      "Distance is always positive, but work depends on the direction of force relative to displacement. For angles greater than 90°, cos(θ) is negative, making work negative. It's a common misconception because distance can't be negative, but work can.",
    has_whiteboard: false,
  },
  {
    question: 'Does a book sitting on a shelf have energy?',
    question_bn: null,
    answer:
      "Yes — it has gravitational potential energy relative to the ground. PE = m × g × h, where h is the height of the shelf above your chosen reference level (usually the floor). The book isn't moving, so its kinetic energy is zero, but the earth's gravity has the potential to do work on it if it falls. The higher the shelf, the more potential energy the book has.",
    answer_bn: null,
    topic_tags: ['potential energy', 'gravity', 'conceptual'],
    difficulty: 'easy',
    question_type: 'conceptual',
    has_whiteboard: false,
  },
  {
    question: 'Does carrying a heavy bag horizontally count as work?',
    question_bn: null,
    answer:
      "In physics terms: no — as long as the bag moves purely horizontally and you're supporting it against gravity, you do zero work on the bag. The force you apply (upward) is perpendicular to the displacement (horizontal), and cos(90°) = 0. Biologically you feel tired because your muscles are constantly contracting, but that's a biology story, not a physics story. The physics definition of work only counts force component along the motion.",
    answer_bn: null,
    topic_tags: ['work', 'perpendicular force', 'misconception'],
    difficulty: 'medium',
    question_type: 'misconception',
    common_wrong_answer:
      "Yes — you feel tired, so you must be doing work.",
    why_wrong:
      "Feeling tired is about your body's internal energy use, not the physics definition of work. Physics defines work as force × displacement in the direction of the force. When the two are perpendicular, the physics work is zero, even if your muscles ache.",
    has_whiteboard: true,
  },
  {
    question: 'How do you calculate kinetic energy?',
    question_bn: null,
    answer:
      'Kinetic energy is the energy an object has because of its motion. The formula is KE = (1/2) × m × v², where m is mass in kilograms and v is speed in meters per second. The result is in joules. Notice that velocity is squared — so doubling the speed quadruples the kinetic energy. This is why fast-moving objects are so much more dangerous than slow ones.',
    answer_bn: null,
    topic_tags: ['kinetic energy', 'formula', 'mass', 'velocity'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'How is power different from energy?',
    question_bn: null,
    answer:
      "Energy is a quantity — how much work can be done or has been done. Power is a rate — how fast that energy is transferred. P = W / t, measured in watts (joules per second). Two engines can deliver the same total energy over a trip, but the more powerful one delivers it faster. A 100-watt light bulb uses the same energy in one hour that a 50-watt bulb uses in two hours.",
    answer_bn: null,
    topic_tags: ['power', 'energy', 'rate', 'comparison'],
    difficulty: 'medium',
    question_type: 'comparison',
    has_whiteboard: false,
  },
  {
    question: 'How much work is done when you lift a 2 kg book 1 meter?',
    question_bn: null,
    answer:
      "About 19.6 joules. The force you must apply equals the book's weight, F = m × g = 2 × 9.8 = 19.6 newtons. The displacement is 1 meter in the same direction as the force (upward). So W = F × d = 19.6 × 1 = 19.6 J. That energy is stored as gravitational potential energy in the book — it would release it if the book fell back down.",
    answer_bn: null,
    topic_tags: ['work', 'calculation', 'gravity', 'potential energy'],
    difficulty: 'easy',
    question_type: 'application',
    has_whiteboard: false,
  },
  {
    question: 'If energy is conserved, why do moving things stop?',
    question_bn: null,
    answer:
      "Energy is conserved, but it's not always conserved in the form you started with. A rolling ball slows down because friction with the ground and air resistance transfer its kinetic energy into heat and sound. The energy still exists — it's just spread out as slightly warmer ground, slightly warmer air, and tiny sound waves. You can never get that energy back in a useful form, but it wasn't destroyed.",
    answer_bn: null,
    topic_tags: ['conservation', 'friction', 'heat', 'misconception'],
    difficulty: 'medium',
    question_type: 'misconception',
    common_wrong_answer:
      "The kinetic energy gets used up and disappears.",
    why_wrong:
      "Energy can't be destroyed — that's the first law of thermodynamics. What happens is it changes form: from kinetic into thermal (heat) and sound. Those forms are harder to put back to work, but they're still there.",
    has_whiteboard: false,
  },
  {
    question: 'If I push a wall and it does not move, am I doing work?',
    question_bn: null,
    answer:
      "In physics: no. Work requires displacement. W = F × d × cos(θ). If d = 0, then W = 0, regardless of how hard you push. Your muscles are burning energy internally, but that energy isn't transferred to the wall because the wall isn't moving. You're converting chemical energy (from food) into heat in your muscles, not into mechanical work on the wall.",
    answer_bn: null,
    topic_tags: ['work', 'displacement', 'misconception'],
    difficulty: 'easy',
    question_type: 'misconception',
    has_whiteboard: false,
  },
  {
    question: 'Is a joule a big unit or a small unit?',
    question_bn: null,
    answer:
      "A joule is a fairly small unit on an everyday scale. One joule is roughly the energy needed to lift a 100-gram apple by one meter against gravity. A single AA battery stores about 10,000 J. Your body uses about 8 million joules of energy per day from food. So joules are small for everyday things — that's why you often see kilojoules (kJ = 1,000 J) on food labels.",
    answer_bn: null,
    topic_tags: ['joule', 'units', 'scale'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'Is gravitational potential energy always positive?',
    question_bn: null,
    answer:
      "Not necessarily — it depends on where you put your reference level. PE = m × g × h is only positive when h is above your chosen zero. If you put the zero at a tabletop and the object is on the floor below, h is negative, so PE is negative. That's fine: the absolute value of PE is arbitrary; what matters physically is the change in PE between two points.",
    answer_bn: null,
    topic_tags: ['potential energy', 'reference level', 'sign', 'edge case'],
    difficulty: 'hard',
    question_type: 'edge_case',
    has_whiteboard: false,
  },
  {
    question: 'Is power a scalar or a vector?',
    question_bn: null,
    answer:
      "Power is a scalar. It has magnitude but no direction. P = W / t — both work (scalar) and time (scalar) are scalars, so their ratio is a scalar. You can talk about how much power is delivered, but not in which direction. Force has a direction, velocity has a direction, but power (like energy) does not.",
    answer_bn: null,
    topic_tags: ['power', 'scalar', 'vectors'],
    difficulty: 'medium',
    question_type: 'conceptual',
    has_whiteboard: false,
  },
  {
    question: 'Is the work-energy theorem just the same as conservation of energy?',
    question_bn: null,
    answer:
      "They're related but not identical. The work-energy theorem says: net work on an object equals its change in kinetic energy (ΔKE = W_net). It's about one object and only kinetic energy. Conservation of energy is broader: the total energy of a closed system — kinetic, potential, thermal, chemical, all of it — stays constant. The work-energy theorem is one consequence of the larger conservation law.",
    answer_bn: null,
    topic_tags: ['work-energy theorem', 'conservation', 'comparison'],
    difficulty: 'hard',
    question_type: 'comparison',
    has_whiteboard: false,
  },
  {
    question: 'What does it mean for a machine to be 80% efficient?',
    question_bn: null,
    answer:
      'It means 80% of the energy you put into the machine becomes useful output work, and the other 20% is lost — usually to friction, heat, sound, or vibration. Efficiency = (useful output / total input) × 100%. No real machine is 100% efficient because you always lose some energy to friction and other non-ideal effects. The higher the efficiency, the less energy is wasted.',
    answer_bn: null,
    topic_tags: ['efficiency', 'machines', 'energy loss'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What happens to the energy when a ball bounces?',
    question_bn: null,
    answer:
      "At the top of the fall, the ball has maximum gravitational PE and zero KE. As it falls, PE converts to KE until impact. During the bounce, some KE briefly becomes elastic PE in the squished ball, then converts back to KE. But not all of it — some is lost to heat, sound, and deformation. That's why each bounce is lower than the last. If the ball were perfectly elastic and the floor frictionless, it would bounce back to the same height forever.",
    answer_bn: null,
    topic_tags: ['conservation', 'bouncing', 'elastic energy', 'potential energy'],
    difficulty: 'medium',
    question_type: 'conceptual',
    has_whiteboard: true,
  },
  {
    question: 'What is 1 watt?',
    question_bn: null,
    answer:
      '1 watt is the rate of doing 1 joule of work per second. 1 W = 1 J / 1 s. A 60-watt light bulb converts 60 joules of electrical energy every second (mostly into light and heat). A healthy adult can sustain about 75 watts of mechanical power over long periods. A professional cyclist can hit 400+ watts during a sprint.',
    answer_bn: null,
    topic_tags: ['watt', 'power', 'units'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is gravitational potential energy?',
    question_bn: null,
    answer:
      "Gravitational potential energy is the energy an object has because of its height above some reference point, usually the ground. PE = m × g × h, where m is mass, g is gravitational acceleration (9.8 m/s² on Earth), and h is height in meters. It's called 'potential' because the object has the potential to do work if it's released and falls. The higher you lift it, the more PE it stores.",
    answer_bn: null,
    topic_tags: ['potential energy', 'gravity', 'formula'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is kinetic energy?',
    question_bn: null,
    answer:
      "Kinetic energy is the energy an object has because it's moving. A moving bicycle, a falling raindrop, a flying cricket ball — all have kinetic energy. The formula is KE = (1/2) × m × v². The faster an object moves, the more kinetic energy it has. Doubling the speed quadruples the energy because v is squared.",
    answer_bn: null,
    topic_tags: ['kinetic energy', 'motion', 'definitional'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is mechanical energy?',
    question_bn: null,
    answer:
      "Mechanical energy is the sum of an object's kinetic energy and potential energy: ME = KE + PE. In a system with no friction or other losses, mechanical energy is conserved — it just shifts between KE and PE as the object moves. A pendulum swinging in a vacuum would keep the same mechanical energy forever, trading KE (fastest at the bottom) for PE (highest at the ends).",
    answer_bn: null,
    topic_tags: ['mechanical energy', 'kinetic energy', 'potential energy', 'conservation'],
    difficulty: 'medium',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is power?',
    question_bn: null,
    answer:
      'Power is the rate at which work is done — or equivalently, the rate at which energy is transferred. P = W / t, where W is work in joules and t is time in seconds. The SI unit is the watt (W): 1 watt = 1 joule per second. A powerful machine does the same amount of work as a weaker one, but in less time.',
    answer_bn: null,
    topic_tags: ['power', 'definitional', 'rate'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is the SI unit of work?',
    question_bn: null,
    answer:
      'The SI unit of work is the joule (J). 1 joule = 1 newton × 1 meter = 1 N·m. It is named after James Prescott Joule, who studied the relationship between heat and mechanical work in the 19th century. In everyday terms, 1 joule is roughly the energy needed to lift a 100-gram apple by 1 meter against gravity.',
    answer_bn: null,
    topic_tags: ['work', 'units', 'joule', 'SI units'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is the difference between work and energy?',
    question_bn: null,
    answer:
      'Work and energy are closely related but different concepts. Energy is the capacity to do work — it is a property that an object has (like kinetic energy or potential energy). Work is the process of transferring energy from one object to another. Think of it this way: energy is like money in a bank account, and work is like a transaction. When you do work on an object, you transfer energy to it. The work-energy theorem states: net work done on an object = change in its kinetic energy.',
    answer_bn: null,
    topic_tags: ['work', 'energy', 'work-energy theorem', 'comparison'],
    difficulty: 'medium',
    question_type: 'comparison',
    has_whiteboard: false,
  },
  {
    question: 'What is the formula for work?',
    question_bn: null,
    answer:
      'Work is defined as the product of force and displacement in the direction of the force. The formula is W = F × d × cos(θ), where W is work (in joules), F is the applied force (in newtons), d is the displacement (in meters), and θ is the angle between the force and displacement vectors. When the force is in the same direction as the displacement (θ = 0°), cos(0°) = 1, so W = F × d.',
    answer_bn: null,
    topic_tags: ['work', 'force', 'displacement', 'formula'],
    difficulty: 'easy',
    question_type: 'definitional',
    common_wrong_answer: 'W = F × d (without considering the angle).',
    why_wrong:
      'Many students forget the cos(θ) term. When force and displacement are not in the same direction, you must include the angle. W = F × d only works when θ = 0°.',
    has_whiteboard: false,
  },
  {
    question: 'What is the horsepower unit?',
    question_bn: null,
    answer:
      "A horsepower (hp) is a non-SI unit of power. 1 hp ≈ 746 watts. It was coined by James Watt to compare the output of his steam engines to the power of draft horses. It's still used in the automotive and heavy-machinery world, but in physics class you should stick to watts.",
    answer_bn: null,
    topic_tags: ['horsepower', 'power', 'units'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is the law of conservation of energy?',
    question_bn: null,
    answer:
      'Energy can neither be created nor destroyed, only transformed from one form to another. In a closed system, the total amount of energy stays constant. A falling ball converts potential energy into kinetic energy; a burning candle converts chemical energy into heat and light; a battery converts chemical energy into electrical energy. In every transformation, the total energy is conserved — nothing is lost, just rearranged.',
    answer_bn: null,
    topic_tags: ['conservation', 'energy transformation', 'definitional'],
    difficulty: 'medium',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'What is the work-energy theorem?',
    question_bn: null,
    answer:
      'The work-energy theorem states that the net work done on an object equals its change in kinetic energy: W_net = ΔKE = KE_final − KE_initial. If you do positive net work on a stationary object, it speeds up. If you do negative net work (like friction) on a moving object, it slows down. It connects force and motion directly to energy, which is often the easier way to solve problems.',
    answer_bn: null,
    topic_tags: ['work-energy theorem', 'kinetic energy', 'motion'],
    difficulty: 'medium',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'When do you use P = F × v instead of P = W / t?',
    question_bn: null,
    answer:
      "Use P = F × v when an object is moving at a constant velocity against a constant force — it's a shortcut that skips the W/t calculation. For example, a car cruising at 20 m/s against 500 N of air drag: P = 500 × 20 = 10,000 W. Both formulas give the same power, but F × v is faster when you already know the force and speed. Use W / t when you have total work and total time.",
    answer_bn: null,
    topic_tags: ['power', 'formula', 'application'],
    difficulty: 'medium',
    question_type: 'application',
    has_whiteboard: false,
  },
  {
    question: 'Why does a bullet have so much kinetic energy?',
    question_bn: null,
    answer:
      "Because velocity is squared in the KE formula. A bullet's mass is tiny (maybe 10 grams), but its speed is huge (400+ m/s). KE = (1/2) × 0.01 × 400² = 800 J — about the same as a 2 kg brick dropped from 40 meters. The squared velocity term is what makes fast objects disproportionately dangerous. Halving the speed cuts KE by four, and doubling it multiplies KE by four.",
    answer_bn: null,
    topic_tags: ['kinetic energy', 'velocity squared', 'application'],
    difficulty: 'medium',
    question_type: 'application',
    has_whiteboard: true,
  },
  {
    question: 'Why does climbing stairs take more power than walking on flat ground?',
    question_bn: null,
    answer:
      "On flat ground you do almost no work against gravity — your weight doesn't move up, so no potential energy is gained. Climbing stairs, every step lifts your full body weight by the step's height. Work = weight × height, and if you climb fast, that work happens in less time, meaning higher power (P = W/t). Walking flat only costs the small energy to overcome friction and air resistance, which is far less than lifting 60+ kg of body weight against gravity.",
    answer_bn: null,
    topic_tags: ['power', 'potential energy', 'everyday physics'],
    difficulty: 'medium',
    question_type: 'application',
    has_whiteboard: false,
  },
  {
    question: 'Why does friction always do negative work?',
    question_bn: null,
    answer:
      "Because kinetic friction always acts opposite to the direction of motion. If an object slides to the right, friction pushes left. The angle between friction and displacement is 180°, and cos(180°) = −1. So W_friction = F × d × (−1) = −F × d, which is negative. Friction is always removing energy from the moving object and turning it into heat — that's why your hands warm up when you rub them together.",
    answer_bn: null,
    topic_tags: ['friction', 'negative work', 'heat'],
    difficulty: 'medium',
    question_type: 'conceptual',
    has_whiteboard: true,
  },
  {
    question: 'Why does kinetic energy depend on velocity squared, not just velocity?',
    question_bn: null,
    answer:
      'Because stopping a fast object takes disproportionately more work than stopping a slow one. Doubling the speed quadruples the stopping distance at constant braking force — which means four times the work to stop. Since work equals the kinetic energy removed, KE must scale with v². This is a real-world consequence: a car at 60 km/h has four times the kinetic energy of the same car at 30 km/h — that is why high-speed crashes are so much more destructive.',
    answer_bn: null,
    topic_tags: ['kinetic energy', 'velocity squared', 'conceptual'],
    difficulty: 'hard',
    question_type: 'conceptual',
    has_whiteboard: false,
  },
  {
    question: 'Why does the work formula use cosine instead of sine?',
    question_bn: null,
    answer:
      "The cosine appears because work only counts the component of force that acts along the direction of displacement. Imagine pushing a box at an angle — only the horizontal component of your push actually moves the box forward. The vertical component just pushes the box into the ground. cos(θ) extracts that useful horizontal component. When θ = 0° (pushing straight), cos(0°) = 1, so all the force does work. When θ = 90° (pushing straight down), cos(90°) = 0, so no work is done because you're not moving the box at all. Sine would give you the perpendicular component — that's for torque, not work.",
    answer_bn: null,
    topic_tags: ['work', 'cosine', 'force components', 'vectors'],
    difficulty: 'medium',
    question_type: 'conceptual',
    common_wrong_answer:
      "The cosine is just a mathematical thing, it doesn't mean anything physical.",
    why_wrong:
      'The cosine has a very physical meaning. It represents the fraction of the force that actually contributes to moving the object. Understanding this helps you see why pushing at an angle is less efficient than pushing straight.',
    has_whiteboard: true,
  },
  {
    question: 'Why is power measured in watts and not joules?',
    question_bn: null,
    answer:
      "Because watts measure a rate, and joules measure a quantity. Joules tell you how much energy; watts tell you how fast it's being delivered. Saying 'my battery has 10 watts' is like saying 'my car drove 50 km/h' — it doesn't tell you the total amount, only the rate. The right units are 10 watt-hours (which is actually 36,000 J) or 10 joules. Use watts when time matters; use joules when only total energy matters.",
    answer_bn: null,
    topic_tags: ['power', 'watt', 'joule', 'units', 'misconception'],
    difficulty: 'medium',
    question_type: 'misconception',
    has_whiteboard: false,
  },
  {
    question: 'Why is the potential energy formula m × g × h and not just m × h?',
    question_bn: null,
    answer:
      "Because the gravitational force on the object is m × g, not just m. Gravity pulls down with a force equal to the object's weight, which depends on both mass and the local gravitational field g. To lift the object by height h against that force, you do work equal to force × distance = (m × g) × h. That stored energy is the PE. On the Moon, g is about 1.6 m/s² instead of 9.8, so the same object has much less PE at the same height.",
    answer_bn: null,
    topic_tags: ['potential energy', 'formula', 'gravity', 'mass'],
    difficulty: 'medium',
    question_type: 'conceptual',
    has_whiteboard: false,
  },
  {
    question: 'Why is work a scalar if force and displacement are vectors?',
    question_bn: null,
    answer:
      "Because work is the dot product of force and displacement vectors: W = F · d = |F| × |d| × cos(θ). A dot product takes two vectors and produces a scalar. The cosine captures the angle between them, and the magnitudes give the sizes. The result — work — has no direction, only a signed value. It tells you how much energy was transferred, not in which direction the transfer happened.",
    answer_bn: null,
    topic_tags: ['work', 'vectors', 'scalars', 'dot product'],
    difficulty: 'hard',
    question_type: 'conceptual',
    has_whiteboard: false,
  },
] as const;
