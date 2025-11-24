import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // sequence name
  seq: { type: Number, default: 0 }
});

export const CounterModel = mongoose.model('Counter', counterSchema);