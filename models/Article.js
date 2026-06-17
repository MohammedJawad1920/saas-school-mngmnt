import { Schema, model, models } from "mongoose";

const ArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    content: { type: String, trim: true },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);

const Article = models.Article || model("Article", ArticleSchema);
export default Article;
