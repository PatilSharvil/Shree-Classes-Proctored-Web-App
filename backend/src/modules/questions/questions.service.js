const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class QuestionService {
  /**
   * Add a single question to an exam
   */
  addQuestion(examId, questionData) {
    const questionId = uuidv4();

    db.prepare(`
      INSERT INTO questions (
        id, exam_id, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, negative_marks, difficulty, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      questionId,
      examId,
      questionData.question_text,
      questionData.option_a,
      questionData.option_b,
      questionData.option_c,
      questionData.option_d,
      questionData.correct_option,
      questionData.marks || 1,
      questionData.negative_marks || 0,
      questionData.difficulty || 'MEDIUM',
      questionData.explanation
    );

    return this.getQuestionById(questionId);
  }

  /**
   * Add multiple questions (bulk upload)
   */
  addQuestionsBulk(examId, questions) {
    const insertStmt = db.prepare(`
      INSERT INTO questions (
        id, exam_id, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, negative_marks, difficulty, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((questions) => {
      for (const q of questions) {
        const questionId = uuidv4();
        insertStmt.run(
          questionId,
          examId,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_option,
          q.marks || 1,
          q.negative_marks || 0,
          q.difficulty || 'MEDIUM',
          q.explanation
        );
      }
    });

    insertMany(questions);
    return { count: questions.length, message: 'Questions added successfully' };
  }

  /**
   * Get question by ID
   */
  getQuestionById(id) {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);

    if (!question) {
      throw new Error('Question not found.');
    }

    return question;
  }

  /**
   * Get all questions for an exam
   */
  getQuestionsByExam(examId, options = {}) {
    const { includeCorrect = false, shuffled = false } = options;

    let query = `
      SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d,
             marks, negative_marks, difficulty, explanation
      FROM questions
      WHERE exam_id = ?
    `;

    if (!includeCorrect) {
      // Exclude correct_option and explanation for students
      query = `
        SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d,
               marks, negative_marks, difficulty
        FROM questions
        WHERE exam_id = ?
      `;
    }

    let questions = db.prepare(query).all(examId);

    if (shuffled) {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    // Shuffle options for each question
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

    // Remember which value was the correct answer
    const correctValue = question[`option_${question.correct_option?.toLowerCase()}`];

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    // Find where the correct value ended up after shuffling
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
  getQuestionWithAnswer(id) {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);

    if (!question) {
      throw new Error('Question not found.');
    }

    return question;
  }

  /**
   * Update question
   */
  updateQuestion(id, questionData) {
    const question = this.getQuestionById(id);

    const updateFields = [];
    const values = [];

    const allowedFields = [
      'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
      'correct_option', 'marks', 'negative_marks', 'difficulty', 'explanation'
    ];

    for (const field of allowedFields) {
      if (questionData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(questionData[field]);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update.');
    }

    values.push(id);

    const query = `UPDATE questions SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    return this.getQuestionWithAnswer(id);
  }

  /**
   * Delete question
   */
  deleteQuestion(id) {
    const question = this.getQuestionById(id);
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    return { message: 'Question deleted successfully.' };
  }

  /**
   * Delete all questions for an exam
   */
  deleteQuestionsByExam(examId) {
    db.prepare('DELETE FROM questions WHERE exam_id = ?').run(examId);
    return { message: 'All questions deleted for this exam.' };
  }

  /**
   * Get question count for an exam
   */
  getQuestionCount(examId) {
    const result = db.prepare('SELECT COUNT(*) as count FROM questions WHERE exam_id = ?').get(examId);
    return result.count;
  }

  /**
   * Import questions from Excel data
   */
  importFromExcelData(examId, excelData) {
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
