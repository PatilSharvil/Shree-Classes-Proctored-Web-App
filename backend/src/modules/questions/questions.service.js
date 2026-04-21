const { query } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class QuestionService {
  /**
   * Add a single question to an exam
   */
  async addQuestion(examId, questionData) {
    const questionId = uuidv4();

    // Validate: TEXT type requires question_text, IMAGE type requires image_url
    const questionType = questionData.question_type || 'TEXT';
    
    if (questionType === 'TEXT' && (!questionData.question_text || !questionData.question_text.trim())) {
      throw new Error('Question text is required for text-based questions');
    }
    
    if (questionType === 'IMAGE' && !questionData.image_url) {
      throw new Error('Question image is required for image-based questions');
    }

    // Validate: each option must have either text or image
    const options = ['option_a', 'option_b', 'option_c', 'option_d'];
    for (const opt of options) {
      const hasText = questionData[opt] && questionData[opt].trim();
      const hasImage = questionData[`${opt}_image_url`];
      
      if (!hasText && !hasImage) {
        const optionLabel = opt.replace('option_', '').toUpperCase();
        throw new Error(`Option ${optionLabel} must have either text or an image`);
      }
    }

    const finalQuestionText = questionType === 'TEXT' ? questionData.question_text : null;
    const finalImageUrl = questionType === 'IMAGE' ? questionData.image_url : null;

    await query(
      `INSERT INTO questions (
        id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, negative_marks, difficulty, explanation,
        image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        questionId,
        examId,
        questionType,
        finalQuestionText,
        questionData.option_a || '',
        questionData.option_b || '',
        questionData.option_c || '',
        questionData.option_d || '',
        questionData.correct_option,
        questionData.marks || 1,
        questionData.negative_marks || 0,
        questionData.difficulty || 'MEDIUM',
        questionData.explanation || null,
        finalImageUrl,
        questionData.option_a_image_url || null,
        questionData.option_b_image_url || null,
        questionData.option_c_image_url || null,
        questionData.option_d_image_url || null,
        questionData.explanation_image_url || null
      ]
    );

    return this.getQuestionById(questionId);
  }

  /**
   * Add multiple questions (bulk upload)
   */
  async addQuestionsBulk(examId, questions) {
    for (const q of questions) {
      const questionId = uuidv4();
      const questionType = q.question_type || 'TEXT';
      
      if (questionType === 'TEXT' && (!q.question_text || !q.question_text.trim())) {
        throw new Error('Question text is required for text-based questions');
      }
      if (questionType === 'IMAGE' && !q.image_url) {
        throw new Error('Question image is required for image-based questions');
      }

      const options = ['option_a', 'option_b', 'option_c', 'option_d'];
      for (const opt of options) {
        const hasText = q[opt] && q[opt].trim();
        const hasImage = q[`${opt}_image_url`];
        if (!hasText && !hasImage) {
          const optionLabel = opt.replace('option_', '').toUpperCase();
          throw new Error(`Option ${optionLabel} must have either text or an image`);
        }
      }

      const finalQuestionText = questionType === 'TEXT' ? q.question_text : null;
      const finalImageUrl = questionType === 'IMAGE' ? q.image_url : null;

      await query(
        `INSERT INTO questions (
          id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
          correct_option, marks, negative_marks, difficulty, explanation,
          image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          questionId,
          examId,
          questionType,
          finalQuestionText,
          q.option_a || '',
          q.option_b || '',
          q.option_c || '',
          q.option_d || '',
          q.correct_option,
          q.marks || 1,
          q.negative_marks || 0,
          q.difficulty || 'MEDIUM',
          q.explanation || null,
          finalImageUrl,
          q.option_a_image_url || null,
          q.option_b_image_url || null,
          q.option_c_image_url || null,
          q.option_d_image_url || null,
          q.explanation_image_url || null
        ]
      );
    }
    return { count: questions.length, message: 'Questions added successfully' };
  }

  /**
   * Get question by ID
   */
  async getQuestionById(id) {
    const { rows } = await query('SELECT * FROM questions WHERE id = $1', [id]);
    const question = rows[0];

    if (!question) {
      throw new Error('Question not found.');
    }

    return question;
  }

  /**
   * Get all questions for an exam
   */
  async getQuestionsByExam(examId, options = {}) {
    const { includeCorrect = false, shuffled = false, sessionId = null } = options;

    let sql = `
      SELECT id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
             correct_option, marks, negative_marks, difficulty, explanation,
             image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url
      FROM questions
      WHERE exam_id = $1
    `;

    if (!includeCorrect) {
      sql = `
        SELECT id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
               marks, negative_marks, difficulty,
               image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url
        FROM questions
        WHERE exam_id = $1
      `;
    }

    const { rows } = await query(sql, [examId]);
    let questions = rows;

    // Deterministic question shuffling if sessionId is provided
    if (shuffled && sessionId) {
      questions = this.deterministicShuffle(questions, sessionId);
    } else if (shuffled) {
      // Fallback to random if no session ID (e.g. preview)
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    if (options.shuffledOptions && sessionId) {
      questions = questions.map(q => this.shuffleOptions(q, sessionId));
    } else if (options.shuffledOptions) {
      questions = questions.map(q => this.shuffleOptions(q));
    }

    return questions;
  }

  /**
   * Simple deterministic shuffle using a string seed (shuffles in-place)
   */
  deterministicShuffle(array, seed) {
    // Simple hash function for the seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }

    // Seeded pseudo-random generator
    const random = () => {
      // Use a slightly better LCG or similar for distribution
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

  /**
   * Shuffle options for a question (deterministic if seed provided)
   */
  shuffleOptions(question, seed = null) {
    const options = [
      { origKey: 'A', value: question.option_a },
      { origKey: 'B', value: question.option_b },
      { origKey: 'C', value: question.option_c },
      { origKey: 'D', value: question.option_d }
    ];

    // Original correct key (e.g. 'A', 'B', 'C', or 'D')
    const origCorrectKey = question.correct_option?.toUpperCase();

    if (seed) {
      // Use question ID + session ID as seed for deterministic option shuffle
      // NOTE: array is shuffled in-place now
      this.deterministicShuffle(options, seed + question.id);
    } else {
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
    }

    // Determine the NEW positional key for the correct answer.
    // After shuffling, options[0] is the new 'A', options[1] is the new 'B', etc.
    // We find which index the original correct option ended up at.
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

  /**
   * Get question with correct answer (for review/admin)
   */
  async getQuestionWithAnswer(id) {
    const { rows } = await query('SELECT * FROM questions WHERE id = $1', [id]);
    const question = rows[0];

    if (!question) {
      throw new Error('Question not found.');
    }

    return question;
  }

  /**
   * Update question
   */
  async updateQuestion(id, questionData) {
    const question = await this.getQuestionById(id);

    const updateFields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      'question_type', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
      'correct_option', 'marks', 'negative_marks', 'difficulty', 'explanation',
      'image_url', 'option_a_image_url', 'option_b_image_url', 'option_c_image_url', 'option_d_image_url', 'explanation_image_url'
    ];

    const newQuestionType = questionData.question_type || question.question_type || 'TEXT';
    
    if (questionData.question_text !== undefined || questionData.image_url !== undefined) {
      if (newQuestionType === 'TEXT' && questionData.question_text === '') {
        throw new Error('Question text is required for text-based questions');
      }
      if (newQuestionType === 'IMAGE' && !questionData.image_url && !question.image_url) {
        throw new Error('Question image is required for image-based questions');
      }
    }

    if (newQuestionType === 'TEXT') {
      if (questionData.question_text !== undefined) {
        updateFields.push(`question_text = $${idx++}`);
        values.push(questionData.question_text);
      }
      if (questionData.question_type === 'TEXT' && question.question_type !== 'TEXT') {
        updateFields.push(`image_url = $${idx++}`);
        values.push(null);
      }
    } else if (newQuestionType === 'IMAGE') {
      if (questionData.question_type === 'IMAGE' && question.question_type !== 'IMAGE') {
        updateFields.push(`question_text = $${idx++}`);
        values.push(null);
      }
      if (questionData.image_url !== undefined) {
        updateFields.push(`image_url = $${idx++}`);
        values.push(questionData.image_url);
      }
    }

    for (const field of allowedFields) {
      if (field !== 'question_text' && field !== 'image_url' && questionData[field] !== undefined) {
        updateFields.push(`${field} = $${idx++}`);
        values.push(questionData[field]);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update.');
    }

    values.push(id);

    await query(
      `UPDATE questions SET ${updateFields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getQuestionWithAnswer(id);
  }

  /**
   * Delete question
   */
  async deleteQuestion(id) {
    await this.getQuestionById(id);
    await query('DELETE FROM questions WHERE id = $1', [id]);
    return { message: 'Question deleted successfully.' };
  }

  /**
   * Delete all questions for an exam
   */
  async deleteQuestionsByExam(examId) {
    await query('DELETE FROM questions WHERE exam_id = $1', [examId]);
    return { message: 'All questions deleted for this exam.' };
  }

  /**
   * Get question count for an exam
   */
  async getQuestionCount(examId) {
    const { rows } = await query(
      'SELECT COUNT(*) as count FROM questions WHERE exam_id = $1',
      [examId]
    );
    return parseInt(rows[0].count, 10);
  }

  /**
   * Import questions from Excel data
   */
  async importFromExcelData(examId, excelData) {
    const questions = excelData.map(row => ({
      question_type: row.QuestionType || row.question_type || 'TEXT',
      question_text: row.Question || row.question_text,
      option_a: row.OptionA || row.option_a,
      option_b: row.OptionB || row.option_b,
      option_c: row.OptionC || row.option_c,
      option_d: row.OptionD || row.option_d,
      correct_option: row.CorrectOption || row.correct_option,
      marks: row.Marks || row.marks || 1,
      negative_marks: row.NegativeMarks || row.negative_marks || 0,
      difficulty: row.Difficulty || row.difficulty || 'MEDIUM',
      explanation: row.Explanation || row.explanation,
      image_url: row.ImageUrl || row.image_url,
      option_a_image_url: row.OptionAImageUrl || row.option_a_image_url,
      option_b_image_url: row.OptionBImageUrl || row.option_b_image_url,
      option_c_image_url: row.OptionCImageUrl || row.option_c_image_url,
      option_d_image_url: row.OptionDImageUrl || row.option_d_image_url,
      explanation_image_url: row.ExplanationImageUrl || row.explanation_image_url
    }));

    return this.addQuestionsBulk(examId, questions);
  }
}

module.exports = new QuestionService();
