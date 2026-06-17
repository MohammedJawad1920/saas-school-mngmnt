import connectToDB from "@/lib/db";
import Article from "@/models/Article";
import Settings from "@/models/Settings";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, User } from "lucide-react";

import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";

export async function generateMetadata({ params }) {
  const { id } = params;
  await connectToDB();
  const article = await Article.findById(id).lean();
  
  if (!article) return { title: "Article Not Found" };

  return {
    title: `${article.title} | Sadiya Dawa College`,
    description: article.content?.substring(0, 160),
    openGraph: {
      title: article.title,
      description: article.content?.substring(0, 160),
      images: article.image?.url ? [{ url: article.image.url }] : [],
    },
  };
}

async function getArticle(id) {
  await connectToDB();
  try {
    const article = await Article.findById(id).lean();
    return article ? JSON.parse(JSON.stringify(article)) : null;
  } catch (error) {
    return null;
  }
}

async function getSettings() {
  await connectToDB();
  const settings = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify(settings));
}

export default async function ArticleDetailPage({ params }) {
  const { id } = params;
  const article = await getArticle(id);
  const settings = await getSettings();

  if (!article) {
    notFound();
  }

  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name || "Sadiya Dawa College";
  const orgLogo = settings?.org?.logo?.url;
  const orgName = settings?.org?.name || "Organisation";

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <PublicHeader 
        logo={institutionLogo} 
        name={institutionName} 
        centerLogo={null}
        rightLogo={orgLogo}
        rightName={orgName}
      />

      <main className="flex-1">
        <article className="max-w-4xl mx-auto py-12 px-6">


          {/* Header Info */}
          <header className="mb-10">
            <div className="flex items-center gap-4 text-purple-600 text-sm font-bold uppercase tracking-widest mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {article.date ? format(new Date(article.date), "MMMM d, yyyy") : "Recent Article"}
              </div>
              {article.author && (
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="w-4 h-4" />
                  {article.author}
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
              {article.title}
            </h1>
          </header>

          {/* Featured Image */}
          {article.image?.url && (
            <div className="w-full rounded-3xl overflow-hidden shadow-2xl mb-12 border border-gray-100">
              <img
                src={article.image.url}
                alt={article.title}
                className="w-full h-auto object-contain"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed text-xl md:text-2xl whitespace-pre-wrap font-medium">
              {article.content}
            </p>
          </div>

          {/* Sharing Section */}
          <div className="mt-16 pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-gray-500 font-medium">
              Shared by {institutionName} Admin
            </div>
            <ShareButton 
              title={article.title} 
              text={article.content} 
              imageUrl={article.image?.url}
            />
          </div>

          {/* Back Button */}
          <div className="mt-12 flex justify-center">
            <Link 
              href="/articles" 
              className="inline-flex items-center gap-2 text-purple-600 font-bold hover:gap-3 transition-all group"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Articles
            </Link>
          </div>
        </article>
      </main>

      <PublicFooter settings={settings} institutionName={institutionName} />
    </div>
  );
}
