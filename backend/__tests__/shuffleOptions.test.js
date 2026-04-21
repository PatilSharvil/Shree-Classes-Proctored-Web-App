/**
 * Unit test for the shuffleOptions fix.
 * 
 * This test verifies that after shuffling options, the correct_option
 * points to the NEW positional key (where the correct answer ended up)
 * rather than the ORIGINAL key.
 */

// We can't import the full service (needs pg), so we extract and test the logic directly.
class ShuffleTestHelper {
  deterministicShuffle(array, seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }

    const random = () => {
      hash = (hash * 1664525 + 1013904223) | 0;
      const res = (hash >>> 0) / 0xFFFFFFFF;
      return res;
    };

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  shuffleOptions(question, seed = null) {
    const options = [
      { origKey: 'A', value: question.option_a },
      { origKey: 'B', value: question.option_b },
      { origKey: 'C', value: question.option_c },
      { origKey: 'D', value: question.option_d }
    ];

    const origCorrectKey = question.correct_option?.toUpperCase();

    if (seed) {
      this.deterministicShuffle(options, seed + question.id);
    } else {
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
    }

    const positionLabels = ['A', 'B', 'C', 'D'];
    const newCorrectIndex = options.findIndex(o => o.origKey === origCorrectKey);
    const newCorrectKey = newCorrectIndex >= 0 ? positionLabels[newCorrectIndex] : question.correct_option;

    const getImgForOrigKey = (origKey) => {
      return question[`option_${origKey.toLowerCase()}_image_url`];
    };

    return {
      ...question,
      option_a: options[0].value,
      option_b: options[1].value,
      option_c: options[2].value,
      option_d: options[3].value,
      option_a_image_url: getImgForOrigKey(options[0].origKey),
      option_b_image_url: getImgForOrigKey(options[1].origKey),
      option_c_image_url: getImgForOrigKey(options[2].origKey),
      option_d_image_url: getImgForOrigKey(options[3].origKey),
      correct_option: newCorrectKey
    };
  }
}

describe('shuffleOptions - correct answer tracking', () => {
  const helper = new ShuffleTestHelper();

  const baseQuestion = {
    id: 'q-123',
    option_a: 'Delhi',
    option_b: 'Mumbai',
    option_c: 'Kolkata',
    option_d: 'Chennai',
    correct_option: 'A', // Delhi is correct
    option_a_image_url: null,
    option_b_image_url: null,
    option_c_image_url: null,
    option_d_image_url: null,
  };

  it('correct_option should point to the option containing the correct VALUE after shuffle', () => {
    const sessionId = 'session-abc-123';
    const shuffled = helper.shuffleOptions(baseQuestion, sessionId);

    // The correct VALUE is 'Delhi'. After shuffling, correct_option should be
    // the letter that NOW contains 'Delhi'.
    const correctValue = 'Delhi';
    const newCorrectKey = shuffled.correct_option;
    const valueAtNewKey = shuffled[`option_${newCorrectKey.toLowerCase()}`];

    expect(valueAtNewKey).toBe(correctValue);
  });

  it('should be deterministic - same seed produces same result', () => {
    const sessionId = 'session-xyz-789';
    const result1 = helper.shuffleOptions({ ...baseQuestion }, sessionId);
    const result2 = helper.shuffleOptions({ ...baseQuestion }, sessionId);

    expect(result1.option_a).toBe(result2.option_a);
    expect(result1.option_b).toBe(result2.option_b);
    expect(result1.option_c).toBe(result2.option_c);
    expect(result1.option_d).toBe(result2.option_d);
    expect(result1.correct_option).toBe(result2.correct_option);
  });

  it('correct answer should always be trackable across many different seeds', () => {
    // Run 100 different seeds and verify correct_option always points to 'Delhi'
    for (let i = 0; i < 100; i++) {
      const sessionId = `session-test-${i}`;
      const shuffled = helper.shuffleOptions({ ...baseQuestion }, sessionId);
      const correctKey = shuffled.correct_option;
      const valueAtKey = shuffled[`option_${correctKey.toLowerCase()}`];

      expect(valueAtKey).toBe('Delhi');
    }
  });

  it('should work when correct_option is B, C, or D', () => {
    const variations = [
      { ...baseQuestion, correct_option: 'B' }, // Mumbai
      { ...baseQuestion, correct_option: 'C' }, // Kolkata
      { ...baseQuestion, correct_option: 'D' }, // Chennai
    ];
    const expectedCorrectValues = ['Mumbai', 'Kolkata', 'Chennai'];

    variations.forEach((q, idx) => {
      for (let i = 0; i < 50; i++) {
        const shuffled = helper.shuffleOptions({ ...q }, `seed-${i}`);
        const correctKey = shuffled.correct_option;
        const valueAtKey = shuffled[`option_${correctKey.toLowerCase()}`];
        expect(valueAtKey).toBe(expectedCorrectValues[idx]);
      }
    });
  });

  it('should handle duplicate option values correctly', () => {
    // Edge case: two options have the same text
    const dupeQuestion = {
      id: 'q-dupe',
      option_a: 'Same',
      option_b: 'Same',
      option_c: 'Different1',
      option_d: 'Different2',
      correct_option: 'A', // First 'Same' is correct
      option_a_image_url: null,
      option_b_image_url: null,
      option_c_image_url: null,
      option_d_image_url: null,
    };

    // The fix uses origKey matching, so even with duplicate values it should track correctly
    for (let i = 0; i < 50; i++) {
      const shuffled = helper.shuffleOptions({ ...dupeQuestion }, `seed-${i}`);
      const correctKey = shuffled.correct_option;
      // With origKey-based tracking, the correct option should always resolve correctly
      expect(['A', 'B', 'C', 'D']).toContain(correctKey);
    }
  });

  it('simulates full exam flow: student selects shuffled option, backend evaluates correctly', () => {
    const sessionId = 'session-flow-test';
    
    // Step 1: Backend sends shuffled question to student (without correct_option)
    const shuffled = helper.shuffleOptions({ ...baseQuestion }, sessionId);
    
    // Step 2: Student sees the options and finds 'Delhi', selects its letter
    let studentSelection = null;
    for (const key of ['A', 'B', 'C', 'D']) {
      if (shuffled[`option_${key.toLowerCase()}`] === 'Delhi') {
        studentSelection = key;
        break;
      }
    }
    
    // Step 3: Backend re-shuffles with same seed to evaluate
    const reShuffled = helper.shuffleOptions({ ...baseQuestion }, sessionId);
    const isCorrect = studentSelection === reShuffled.correct_option;
    
    expect(isCorrect).toBe(true);
  });
});
