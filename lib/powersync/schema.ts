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

export const AppSchema = new Schema({
  Category,
  Question,
});

export type Database = (typeof AppSchema)['types'];
