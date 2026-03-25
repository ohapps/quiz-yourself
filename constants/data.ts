import { Category } from '../types/quiz';

export const CATEGORIES: Category[] = [
  {
    id: 'general',
    name: 'General Knowledge',
    questions: [
      { id: 'g1', question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctAnswer: 'Paris', difficulty: 'Easy' },
      { id: 'g2', question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 'Mars', difficulty: 'Easy' },
      { id: 'g3', question: 'What is the largest organ in the human body?', options: ['Heart', 'Liver', 'Skin', 'Lungs'], correctAnswer: 'Skin', difficulty: 'Easy' },
      { id: 'g4', question: 'The United Nations was founded in which year?', options: ['1942', '1945', '1950', '1939'], correctAnswer: '1945', difficulty: 'Medium' },
      { id: 'g5', question: 'Which country has the most volcanoes?', options: ['Indonesia', 'Japan', 'USA', 'Iceland'], correctAnswer: 'Indonesia', difficulty: 'Medium' },
      { id: 'g6', question: 'What is the smallest country in the world?', options: ['Monaco', 'Malta', 'Vatican City', 'San Marino'], correctAnswer: 'Vatican City', difficulty: 'Medium' },
      { id: 'g7', question: 'What is the rarest blood type?', options: ['O Negative', 'A Positive', 'AB Negative', 'Rh Null'], correctAnswer: 'Rh Null', difficulty: 'Hard' },
      { id: 'g8', question: 'Which artist painted the "Girl with a Pearl Earring"?', options: ['Rembrandt', 'Vermeer', 'Van Gogh', 'Da Vinci'], correctAnswer: 'Vermeer', difficulty: 'Hard' },
      { id: 'g9', question: 'In which year did the Titanic sink?', options: ['1910', '1911', '1912', '1913'], correctAnswer: '1912', difficulty: 'Hard' },
    ],
  },
  {
    id: 'science',
    name: 'Science',
    questions: [
      { id: 's1', question: 'What is the chemical symbol for water?', options: ['O2', 'H2O', 'CO2', 'NaCl'], correctAnswer: 'H2O', difficulty: 'Easy' },
      { id: 's2', question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Steel'], correctAnswer: 'Diamond', difficulty: 'Easy' },
      { id: 's3', question: 'How many teeth does an adult human have?', options: ['28', '30', '32', '34'], correctAnswer: '32', difficulty: 'Easy' },
      { id: 's4', question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Vacuole'], correctAnswer: 'Mitochondria', difficulty: 'Medium' },
      { id: 's5', question: 'Which element has the atomic number 1?', options: ['Helium', 'Oxygen', 'Carbon', 'Hydrogen'], correctAnswer: 'Hydrogen', difficulty: 'Medium' },
      { id: 's6', question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctAnswer: 'Carbon Dioxide', difficulty: 'Medium' },
      { id: 's7', question: 'What is the speed of light in a vacuum?', options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'], correctAnswer: '300,000 km/s', difficulty: 'Hard' },
      { id: 's8', question: 'What is the most abundant gas in Earth\'s atmosphere?', options: ['Oxygen', 'Argon', 'Nitrogen', 'Carbon Dioxide'], correctAnswer: 'Nitrogen', difficulty: 'Hard' },
      { id: 's9', question: 'Who is known as the father of modern physics?', options: ['Newton', 'Einstein', 'Bohr', 'Tesla'], correctAnswer: 'Einstein', difficulty: 'Hard' },
    ],
  },
  {
    id: 'history',
    name: 'History',
    questions: [
      { id: 'h1', question: 'Who was the first president of the United States?', options: ['Thomas Jefferson', 'Lincoln', 'Washington', 'Adams'], correctAnswer: 'Washington', difficulty: 'Easy' },
      { id: 'h2', question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctAnswer: '1945', difficulty: 'Easy' },
      { id: 'h3', question: 'Who was known as the Maid of Orléans?', options: ['Marie Antoinette', 'Joan of Arc', 'Queen Victoria', 'Catherine the Great'], correctAnswer: 'Joan of Arc', difficulty: 'Easy' },
      { id: 'h4', question: 'The Magna Carta was signed in which year?', options: ['1215', '1066', '1492', '1776'], correctAnswer: '1215', difficulty: 'Medium' },
      { id: 'h5', question: 'Who was the primary author of the Declaration of Independence?', options: ['Franklin', 'Madison', 'Jefferson', 'Hamilton'], correctAnswer: 'Jefferson', difficulty: 'Medium' },
      { id: 'h6', question: 'Which civil rights leader delivered the "I Have a Dream" speech?', options: ['Malcolm X', 'Rosa Parks', 'Martin Luther King Jr.', 'John Lewis'], correctAnswer: 'Martin Luther King Jr.', difficulty: 'Medium' },
      { id: 'h7', question: 'Which empire was ruled by Suleiman the Magnificent?', options: ['Roman', 'Ottoman', 'Byzantine', 'Persian'], correctAnswer: 'Ottoman', difficulty: 'Hard' },
      { id: 'h8', question: 'The Battle of Hastings took place in which year?', options: ['1066', '1086', '1106', '1166'], correctAnswer: '1066', difficulty: 'Hard' },
      { id: 'h9', question: 'Who was the longest-reigning British monarch before Elizabeth II?', options: ['Queen Victoria', 'George III', 'Henry VIII', 'Elizabeth I'], correctAnswer: 'Queen Victoria', difficulty: 'Hard' },
    ],
  },
  {
    id: 'math',
    name: 'Math',
    questions: [
      { id: 'm1', question: 'What is 5 + 7?', options: ['10', '11', '12', '13'], correctAnswer: '12', difficulty: 'Easy' },
      { id: 'm2', question: 'What is the square root of 64?', options: ['6', '7', '8', '9'], correctAnswer: '8', difficulty: 'Easy' },
      { id: 'm3', question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctAnswer: '6', difficulty: 'Easy' },
      { id: 'm4', question: 'What is 15 * 6?', options: ['75', '80', '90', '95'], correctAnswer: '90', difficulty: 'Medium' },
      { id: 'm5', question: 'Solve for x: 2x + 5 = 15', options: ['x = 4', 'x = 5', 'x = 6', 'x = 10'], correctAnswer: 'x = 5', difficulty: 'Medium' },
      { id: 'm6', question: 'What is the sum of angles in a triangle?', options: ['90°', '180°', '270°', '360°'], correctAnswer: '180°', difficulty: 'Medium' },
      { id: 'm7', question: 'What is the value of Pi to two decimal places?', options: ['3.12', '3.14', '3.16', '3.18'], correctAnswer: '3.14', difficulty: 'Hard' },
      { id: 'm8', question: 'What is the derivative of x²?', options: ['x', '2', '2x', 'x³'], correctAnswer: '2x', difficulty: 'Hard' },
      { id: 'm9', question: 'What is the value of 2 to the power of 10?', options: ['512', '1024', '2048', '4096'], correctAnswer: '1024', difficulty: 'Hard' },
    ],
  },
];
