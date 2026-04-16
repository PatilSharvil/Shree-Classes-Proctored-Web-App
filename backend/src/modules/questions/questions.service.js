const { query } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class QuestionService {
  /**
   * Add a single question to an exam
   */
  async addQuestion(examId, questionData) {
    const questionId = uuidv4();

    await query(
      `INSERT INTO questions (
        id, exam_id, question_text, question_image, option_a, option_a_image,
        option_b, option_b_image, option_c, option_c_image, option_d, option_d_image,
        correct_option, marks, negative_marks, difficulty, explanation, explanation_image
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        questionId,
        examId,
        questionData.question_text,
        questionData.question_image || null,
        questionData.option_a,
        questionData.option_a_image || null,
        questionData.option_b,
        questionData.option_b_image || null,
        questionData.option_c,
        questionData.option_c_image || null,
        questionData.option_d,
        questionData.option_d_image || null,
        questionData.correct_option,
        questionData.marks || 1,
        questionData.negative_marks || 0,
        questionData.difficulty || 'MEDIUM',
        questionData.explanation || null,
        questionData.explanation_image || null
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
      await query(
        `INSERT INTO questions (
          id, exam_id, question_text, question_image, option_a, option_a_image,
          option_b, option_b_image, option_c, option_c_image, option_d, option_d_image,
          correct_option, marks, negative_marks, difficulty, explanation, explanation_image
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          questionId,
          examId,
          q.question_text,
          q.question_image || null,
          q.option_a,
          q.option_a_image || null,
          q.option_b,
          q.option_b_image || null,
          q.option_c,
          q.option_c_image || null,
          q.option_d,
          q.option_d_image || null,
          q.correct_option,
          q.marks || 1,
          q.negative_marks || 0,
          q.difficulty || 'MEDIUM',
          q.explanation || null,
          q.explanation_image || null
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
    const { includeCorrect = false, shuffled = false } = options;

    let sql;
    if (includeCorrect) {
      sql = `SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d,
                    marks, negative_marks, difficulty, explanation
             FROM questions WHERE exam_id = $1`;
    } else {
      sql = `SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d,
                    marks, negative_marks, difficulty
             FROM questions WHERE exam_id = $1`;
    }

    const { rows } = await query(sql, [examId]);
    let questions = rows;

    if (shuffled) {
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    if (options.shuffledOptions) {
      questions = questions.map(q => this.shuffleOptions(q));
    }

    return questions;
  }

  /**
   * Shuffle options for a question
   */
  shuffleOptions(question) {
    const options = [
      { key: 'A', value: question.option_a },
      { key: 'B', value: question.option_b },
      { key: 'C', value: question.option_c },
      { key: 'D', value: question.option_d }
    ];

    const correctValue = question[`option_${question.correct_option?.toLowerCase()}`];

    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    const newCorrectKey = options.find(o => o.value === correctValue)?.key || question.correct_option;

    return {
      ...question,
      option_a: options[0].value,
      option_b: options[1].value,
      option_c: options[2].value,
      option_d: options[3].value,
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
    await this.getQuestionById(id); // ensure exists

    const updateFields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      'question_text', 'question_image', 'option_a', 'option_a_image', 'option_b', 'option_b_image',
      'option_c', 'option_c_image', 'option_d', 'option_d_image',
      'correct_option', 'marks', 'negative_marks', 'difficulty', 'explanation', 'explanation_image'
    ];

    for (const field of allowedFields) {
      if (questionData[field] !== undefined) {
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
    await this.getQuestionById(id); // ensure exists
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
      question_text: row.Question || row.question_text,
      option_a: row.OptionA || row.option_a,
      option_b: row.OptionB || row.option_b,
      option_c: row.OptionC || row.option_c,
      option_d: row.OptionD || row.option_d,
      correct_option: row.CorrectOption || row.correct_option,
      marks: row.Marks || row.marks || 1,
      negative_marks: row.NegativeMarks || row.negative_marks || 0,
      difficulty: row.Difficulty || row.difficulty || 'MEDIUM',
      explanation: row.Explanation || row.explanation
    }));

    return this.addQuestionsBulk(examId, questions);
  }
}

module.exports = new QuestionService();
