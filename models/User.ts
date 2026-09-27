import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);

export default User;
