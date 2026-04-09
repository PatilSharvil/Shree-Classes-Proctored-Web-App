const XLSX = require('xlsx');
const path = require('path');

// Create students test file
const studentsData = [
  { Name: 'Test Student 1', Email: 'test1@example.com', Password: 'Password1' },
  { Name: 'Test Student 2', Email: 'test2@example.com', Password: 'Password2' },
  { Name: 'Test Student 3', Email: 'test3@example.com', Password: 'Password3' },
  { Name: 'Test Student 4', Email: 'test4@example.com', Password: 'Password4' },
  { Name: 'Test Student 5', Email: 'test5@example.com', Password: 'Password5' }
];

const studentsWB = XLSX.utils.book_new();
const studentsWS = XLSX.utils.json_to_sheet(studentsData);
XLSX.utils.book_append_sheet(studentsWB, studentsWS, 'Students');
const studentsPath = path.join(__dirname, 'test_students.xlsx');
XLSX.writeFile(studentsWB, studentsPath);
console.log('Created test students file:', studentsPath);

// Create questions test file
const questionsData = [
  { 
    Question: 'What is the capital of France?', 
    OptionA: 'London', 
    OptionB: 'Paris', 
    OptionC: 'Berlin', 
    OptionD: 'Madrid', 
    CorrectOption: 'B',
    Marks: 1,
    NegativeMarks: 0,
    Difficulty: 'EASY',
    Explanation: 'Paris is the capital of France'
  },
  { 
    Question: 'What is 5 * 6?', 
    OptionA: '25', 
    OptionB: '35', 
    OptionC: '30', 
    OptionD: '40', 
    CorrectOption: 'C',
    Marks: 1,
    NegativeMarks: 0,
    Difficulty: 'EASY',
    Explanation: '5 * 6 = 30'
  },
  { 
    Question: 'Which planet is known as the Red Planet?', 
    OptionA: 'Venus', 
    OptionB: 'Mars', 
    OptionC: 'Jupiter', 
    OptionD: 'Saturn', 
    CorrectOption: 'B',
    Marks: 2,
    NegativeMarks: 0.5,
    Difficulty: 'MEDIUM',
    Explanation: 'Mars appears red due to iron oxide on its surface'
  }
];

const questionsWB = XLSX.utils.book_new();
const questionsWS = XLSX.utils.json_to_sheet(questionsData);
XLSX.utils.book_append_sheet(questionsWB, questionsWS, 'Questions');
const questionsPath = path.join(__dirname, 'test_questions.xlsx');
XLSX.writeFile(questionsWB, questionsPath);
console.log('Created test questions file:', questionsPath);
