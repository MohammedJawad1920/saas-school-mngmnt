"use client";
import * as React from "react";
import Link from "next/link";
import { Newspaper, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function ArticleCard({ article }) {
  const shareArticle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const boldTitle = `*${article.title}*`;
    const shareData = {
      title: article.title,
      text: `${boldTitle}\n\n${article.content || article.title}`,
      url: `${window.location.origin}/articles/${article._id}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") toast.error("Share failed");
      }
    } else {
      navigator.clipboard.writeText(
        `*${article.title}*\n\n${article.content || ""}\n\n${window.location.origin}/articles/${article._id}`
      );
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <Link href={`/articles/${article._id}`} className="block h-full">
      <div className="group overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col bg-white rounded-2xl cursor-pointer h-full">
        {article.image?.url ? (
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={article.image.url}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        ) : (
          <div className="aspect-[16/10] bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Newspaper className="w-12 h-12 text-purple-200 group-hover:text-purple-300 transition-colors" />
          </div>
        )}
        <div className="flex-1 p-5 md:p-6 flex flex-col">
          <div className="flex items-center gap-2 text-purple-600 text-xs font-bold uppercase tracking-widest mb-3">
            <span className="bg-purple-100 px-2 py-0.5 rounded">
              {article.date
                ? new Date(article.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent"}
            </span>
            {article.author && (
              <span className="text-gray-500 font-medium normal-case tracking-normal truncate">
                by {article.author}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors line-clamp-2 leading-tight">
            {article.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 flex-1 mb-4">
            {article.content}
          </p>
          <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600">
              Read Article
            </span>
            <button
              onClick={shareArticle}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-purple-600 transition-colors"
              title="Share this article"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
