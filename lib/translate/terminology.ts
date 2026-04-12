/**
 * Subject-specific Bangla Terminology Maps
 *
 * Maps English technical terms to their preferred Bangla translations.
 * Used by the Gemini translator to ensure consistent terminology
 * across all translated content.
 *
 * These are curated based on NCTB textbook conventions and common
 * Bangladeshi educational usage.
 */

export const SUBJECT_TERMINOLOGY: Record<string, Record<string, string>> = {
  Physics: {
    force: 'বল',
    velocity: 'বেগ',
    acceleration: 'ত্বরণ',
    displacement: 'সরণ',
    momentum: 'ভরবেগ',
    energy: 'শক্তি',
    'kinetic energy': 'গতিশক্তি',
    'potential energy': 'বিভবশক্তি',
    work: 'কাজ',
    power: 'ক্ষমতা',
    mass: 'ভর',
    weight: 'ওজন',
    friction: 'ঘর্ষণ',
    gravity: 'মহাকর্ষ',
    pressure: 'চাপ',
    density: 'ঘনত্ব',
    temperature: 'তাপমাত্রা',
    heat: 'তাপ',
    wave: 'তরঙ্গ',
    frequency: 'কম্পাঙ্ক',
    wavelength: 'তরঙ্গদৈর্ঘ্য',
    amplitude: 'বিস্তার',
    current: 'তড়িৎ প্রবাহ',
    voltage: 'বিভব পার্থক্য',
    resistance: 'রোধ',
    'electric field': 'তড়িৎ ক্ষেত্র',
    'magnetic field': 'চৌম্বক ক্ষেত্র',
    'Newton\'s law': 'নিউটনের সূত্র',
    equilibrium: 'সাম্যাবস্থা',
    torque: 'টর্ক',
    'angular velocity': 'কৌণিক বেগ',
    'simple harmonic motion': 'সরল দোলন গতি',
  },

  Mathematics: {
    equation: 'সমীকরণ',
    function: 'অপেক্ষক',
    variable: 'চলক',
    constant: 'ধ্রুবক',
    derivative: 'অন্তরজ',
    integral: 'সমাকল',
    limit: 'সীমা',
    'set': 'সেট',
    'subset': 'উপসেট',
    probability: 'সম্ভাবনা',
    statistics: 'পরিসংখ্যান',
    matrix: 'ম্যাট্রিক্স',
    vector: 'ভেক্টর',
    scalar: 'স্কেলার',
    angle: 'কোণ',
    triangle: 'ত্রিভুজ',
    circle: 'বৃত্ত',
    'parallel lines': 'সমান্তরাল রেখা',
    'perpendicular': 'লম্ব',
    theorem: 'উপপাদ্য',
    proof: 'প্রমাণ',
    'quadratic equation': 'দ্বিঘাত সমীকরণ',
    polynomial: 'বহুপদী',
    logarithm: 'লগারিদম',
    trigonometry: 'ত্রিকোণমিতি',
    sine: 'সাইন',
    cosine: 'কোসাইন',
    tangent: 'ট্যানজেন্ট',
    coordinate: 'স্থানাংক',
    graph: 'লেখচিত্র',
    slope: 'ঢাল',
  },

  Chemistry: {
    atom: 'পরমাণু',
    molecule: 'অণু',
    element: 'মৌলিক পদার্থ',
    compound: 'যৌগ',
    mixture: 'মিশ্রণ',
    reaction: 'বিক্রিয়া',
    'chemical equation': 'রাসায়নিক সমীকরণ',
    ion: 'আয়ন',
    electron: 'ইলেকট্রন',
    proton: 'প্রোটন',
    neutron: 'নিউট্রন',
    'periodic table': 'পর্যায় সারণী',
    'atomic number': 'পারমাণবিক সংখ্যা',
    'mass number': 'ভর সংখ্যা',
    bond: 'বন্ধন',
    'covalent bond': 'সমযোজী বন্ধন',
    'ionic bond': 'আয়নিক বন্ধন',
    acid: 'এসিড',
    base: 'ক্ষারক',
    salt: 'লবণ',
    solution: 'দ্রবণ',
    solute: 'দ্রাব',
    solvent: 'দ্রাবক',
    oxidation: 'জারণ',
    reduction: 'বিজারণ',
    catalyst: 'প্রভাবক',
    mole: 'মোল',
    concentration: 'ঘনমাত্রা',
    pH: 'pH',
    electrolysis: 'তড়িৎ বিশ্লেষণ',
  },

  Biology: {
    cell: 'কোষ',
    organism: 'জীব',
    tissue: 'কলা',
    organ: 'অঙ্গ',
    DNA: 'ডিএনএ',
    RNA: 'আরএনএ',
    gene: 'জিন',
    chromosome: 'ক্রোমোসোম',
    protein: 'প্রোটিন',
    enzyme: 'এনজাইম',
    photosynthesis: 'সালোকসংশ্লেষণ',
    respiration: 'শ্বসন',
    mitosis: 'মাইটোসিস',
    meiosis: 'মিয়োসিস',
    evolution: 'বিবর্তন',
    ecology: 'বাস্তুবিদ্যা',
    ecosystem: 'বাস্তুতন্ত্র',
    species: 'প্রজাতি',
    habitat: 'আবাসস্থল',
    nutrition: 'পুষ্টি',
    digestion: 'পরিপাক',
    'nervous system': 'স্নায়ুতন্ত্র',
    hormone: 'হরমোন',
    immunity: 'অনাক্রম্যতা',
    mutation: 'মিউটেশন',
    biodiversity: 'জীববৈচিত্র্য',
  },
};

/**
 * Get the Bangla term for an English term in a given subject.
 * Returns the English term if no Bangla equivalent is found.
 */
export function getBanglaTerm(
  englishTerm: string,
  subject: string,
): string {
  const subjectTerms = SUBJECT_TERMINOLOGY[subject];
  if (!subjectTerms) return englishTerm;

  const lower = englishTerm.toLowerCase();
  for (const [en, bn] of Object.entries(subjectTerms)) {
    if (en.toLowerCase() === lower) return bn;
  }

  return englishTerm;
}
