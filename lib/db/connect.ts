import mongoose from "mongoose";

declare global {
  var __moniMongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const globalForMongoose = globalThis;

const cached = globalForMongoose.__moniMongooseConn ?? {
  conn: null,
  promise: null,
};

globalForMongoose.__moniMongooseConn = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Define it in your environment (.env / .env.local) before connecting to MongoDB."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default connectDB;
