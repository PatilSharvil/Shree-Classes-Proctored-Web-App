const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class QuestionService {
  /**
   * Add a single question to an exam
   */
  addQuestion(examId, questionData) {
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

    // For TEXT type, ensure image_url is null; for IMAGE type, ensure question_text is null
    const finalQuestionText = questionType === 'TEXT' ? questionData.question_text : null;
    const finalImageUrl = questionType === 'IMAGE' ? questionData.image_url : null;

    // For options, use empty string if no text provided (image-only options)
    db.prepare(`
      INSERT INTO questions (
        id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, negative_marks, difficulty, explanation,
        image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      questionData.explanation,
      finalImageUrl,
      questionData.option_a_image_url || null,
      questionData.option_b_image_url || null,
      questionData.option_c_image_url || null,
      questionData.option_d_image_url || null,
      questionData.explanation_image_url || null
    );

    return this.getQuestionById(questionId);
  }

  /**
   * Add multiple questions (bulk upload)
   */
  addQuestionsBulk(examId, questions) {
    const insertStmt = db.prepare(`
      INSERT INTO questions (
        id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, negative_marks, difficulty, explanation,
        image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((questions) => {
      for (const q of questions) {
        const questionId = uuidv4();
        const questionType = q.question_type || 'TEXT';
        
        // Validate question type
        if (questionType === 'TEXT' && (!q.question_text || !q.question_text.trim())) {
          throw new Error(`Question text is required for text-based questions`);
        }
        
        if (questionType === 'IMAGE' && !q.image_url) {
          throw new Error(`Question image is required for image-based questions`);
        }

        // Validate: each option must have either text or image
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

        insertStmt.run(
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
          q.explanation,
          finalImageUrl,
          q.option_a_image_url || null,
          q.option_b_image_url || null,
          q.option_c_image_url || null,
          q.option_d_image_url || null,
          q.explanation_image_url || null
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
      SELECT id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
             marks, negative_marks, difficulty, explanation,
             image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url
      FROM questions
      WHERE exam_id = ?
    `;

    if (!includeCorrect) {
      // Exclude correct_option and explanation for students
      query = `
        SELECT id, exam_id, question_type, question_text, option_a, option_b, option_c, option_d,
               marks, negative_marks, difficulty,
               image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url
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
    // Maintain option images
    const newCorrectKey = options.find(o => o.value === correctValue)?.key || question.correct_option;

    // We must also swap the corresponding images
    const keyToOriginalMap = {};
    options.forEach((o, index) => {
      const originalKey = o.key === 'A' ? 0 : o.key === 'B' ? 1 : o.key === 'C' ? 2 : 3;
      // Wait, o is the *new* option at this position, NO!
      // `options` array holds the shuffled options.
      // `o.key` is the ORIGINAL key ('A', 'B', 'C', 'D'). So we know where it came from!
    });
    
    // So if options[0] was originally 'C', options[0].key === 'C'.
    // Its image was `question.option_c_image_url`.
    const getImgForOrigKey = (origKey) => {
       return question[`option_${origKey.toLowerCase()}_image_url`];
    };

    return {
      ...question,
      option_a: options[0].value,
      option_b: options[1].value,
      option_c: options[2].value,
      option_d: options[3].value,
      option_a_image_url: getImgForOrigKey(options[0].key),
      option_b_image_url: getImgForOrigKey(options[1].key),
      option_c_image_url: getImgForOrigKey(options[2].key),
      option_d_image_url: getImgForOrigKey(options[3].key),
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
      'question_type', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
      'correct_option', 'marks', 'negative_marks', 'difficulty', 'explanation',
      'image_url', 'option_a_image_url', 'option_b_image_url', 'option_c_image_url', 'option_d_image_url', 'explanation_image_url'
    ];

    // If question_type is being updated, validate
    const newQuestionType = questionData.question_type || question.question_type || 'TEXT';
    
    if (questionData.question_text !== undefined || questionData.image_url !== undefined) {
      if (newQuestionType === 'TEXT' && questionData.question_text === '') {
        throw new Error('Question text is required for text-based questions');
      }
      
      if (newQuestionType === 'IMAGE' && !questionData.image_url && !question.image_url) {
        throw new Error('Question image is required for image-based questions');
      }
    }

    // Enforce mutual exclusivity
    if (newQuestionType === 'TEXT') {
      if (questionData.question_text !== undefined) {
        updateFields.push('question_text = ?');
        values.push(questionData.question_text);
      }
      // Clear image_url if switching to TEXT
      if (questionData.question_type === 'TEXT' && question.question_type !== 'TEXT') {
        updateFields.push('image_url = ?');
        values.push(null);
      }
    } else if (newQuestionType === 'IMAGE') {
      // Clear question_text if switching to IMAGE
      if (questionData.question_type === 'IMAGE' && question.question_type !== 'IMAGE') {
        updateFields.push('question_text = ?');
        values.push(null);
      }
      if (questionData.image_url !== undefined) {
        updateFields.push('image_url = ?');
        values.push(questionData.image_url);
      }
    }

    for (const field of allowedFields) {
      if (field !== 'question_text' && field !== 'image_url' && questionData[field] !== undefined) {
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
