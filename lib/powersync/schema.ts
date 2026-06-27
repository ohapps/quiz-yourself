import { column, Schema, Table } from '@powersync/react-native';

const Category = new Table(
  {
    name: column.text,
    parentId: column.text,
    userId: column.text,
  },
  { indexes: { parent: ['parentId'], user: ['userId'] } }
);

const Question = new Table(
  {
    question: column.text,
    options: column.text,
    correctAnswer: column.text,
    difficulty: column.text,
    type: column.text,
    shownCount: column.integer,
    categoryId: column.text,
    imageUrl: column.text,
    userId: column.text,
  },
  { indexes: { category: ['categoryId'], user: ['userId'] } }
);

const Favorite = new Table(
  {
    userId: column.text,
    categoryId: column.text,
  },
  { indexes: { user: ['userId'], category: ['categoryId'] } }
);

const QuestionReport = new Table(
  {
    questionId: column.text,
    userId: column.text,
    description: column.text,
    createdAt: column.text,
    resolved: column.integer,
  },
  { indexes: { question: ['questionId'], user: ['userId'] } }
);

export const AppSchema = new Schema({
  Category,
  Question,
  Favorite,
  QuestionReport,
});

export type Database = (typeof AppSchema)['types'];
