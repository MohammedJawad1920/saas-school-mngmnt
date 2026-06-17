import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Article from "@/models/Article";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const query = {};

    const articles = await Article.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ date: -1 });

    const total = await Article.countDocuments(query);

    return NextResponse.json(
      {
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Articles fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const data = await req.json();
    const newArticle = await Article.create({
      title: data.title,
      author: data.author,
      date: data.date,
      content: data.content,
      image: data.image,
    });
    return NextResponse.json(
      { newArticle, message: "Article created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { ids, title, author, date, content, image } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedArticles = await Article.updateMany(
        { _id: { $in: ids } },
        { $set: { title, author, date, content, image } }
      );
      return NextResponse.json(
        { updatedArticles, message: "Articles updated successfully!" },
        { status: 200 }
      );
    }

    const updatedArticle = await Article.findOneAndUpdate(
      { _id },
      { title, author, date, content, image },
      { new: true }
    );
    return NextResponse.json(
      { updatedArticle, message: "Article updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedArticles = await Article.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedArticles, message: "Articles deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedArticle = await Article.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedArticle, message: "Article deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
