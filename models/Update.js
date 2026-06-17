import { Schema, model, models } from "mongoose";

const UpdateSchema = new Schema(
  {
    heading: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    news: { type: String, trim: true },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);

const Update = models.Update || model("Update", UpdateSchema);
export default Update;
